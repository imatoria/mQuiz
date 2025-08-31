import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token and get user info
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      testAttemptId,
      completionType,
      completionReason,
      answers,
      flaggedQuestions,
      currentQuestionIndex,
      progressPercentage,
      timeRemaining,
      scheduledTestId
    } = await req.json();

    console.log('Completing test attempt:', testAttemptId, 'type:', completionType, 'user:', user.id);

    // Get current server time
    const currentTime = new Date();
    
    // Validate test attempt exists and belongs to user
    const { data: attemptData, error: attemptError } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('id', testAttemptId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (attemptError || !attemptData) {
      console.error('Error fetching attempt data:', attemptError);
      return new Response(
        JSON.stringify({ error: 'Test attempt not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if attempt is already completed
    if (attemptData.completed_at) {
      return new Response(
        JSON.stringify({ 
          error: 'Test attempt already completed',
          completedAt: attemptData.completed_at,
          score: attemptData.score
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get questions to calculate score
    const { data: questionsData, error: questionsError } = await supabase
      .from('question_paper_questions')
      .select(`
        questions (id, correct_answer)
      `)
      .eq('question_paper_id', scheduledTestId);

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch questions for scoring' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate score
    let score = 0;
    const totalQuestions = questionsData?.length || 0;
    
    if (answers && Object.keys(answers).length > 0 && questionsData) {
      const correctAnswers = questionsData.reduce((acc, item) => {
        if (item.questions) {
          acc[item.questions.id] = item.questions.correct_answer;
        }
        return acc;
      }, {} as Record<string, string>);

      let correct = 0;
      Object.entries(answers).forEach(([questionId, answer]) => {
        if (correctAnswers[questionId] === answer) {
          correct++;
        }
      });
      score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    }

    // Prepare completion data - store metadata in answers JSONB field
    const answersData = {
      userAnswers: answers || {},
      flaggedQuestions: flaggedQuestions || [],
      metadata: {
        completionType: completionType,
        completionReason: completionReason,
        questionsAnswered: Object.keys(answers || {}).length,
        questionsFlagged: (flaggedQuestions || []).length,
        completedAt: currentTime.toISOString(),
        finalProgressPercentage: progressPercentage || 0,
        finalTimeRemaining: Math.max(0, timeRemaining || 0)
      }
    };

    const completionData = {
      answers: answersData,
      score: score,
      total_questions: totalQuestions,
      completed_at: currentTime.toISOString(),
      current_question_index: currentQuestionIndex || 0,
      progress_percentage: progressPercentage || 0,
      time_remaining: Math.max(0, timeRemaining || 0),
      last_activity_at: currentTime.toISOString(),
      is_paused: false
    };

    // Update test attempt
    const { error: updateError } = await supabase
      .from('test_attempts')
      .update(completionData)
      .eq('id', testAttemptId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating test attempt:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to complete test attempt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log completion event for auditing
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'TEST_COMPLETED',
          resource_type: 'test_attempts',
          resource_id: testAttemptId,
          details: {
            completion_type: completionType,
            completion_reason: completionReason,
            score: score,
            questions_answered: Object.keys(answers || {}).length,
            total_questions: totalQuestions,
            time_remaining: timeRemaining,
            scheduled_test_id: scheduledTestId
          }
        });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
      // Don't fail the completion if audit logging fails
    }

    // Create response message based on completion type
    const getCompletionMessage = () => {
      switch (completionType) {
        case 'manual':
          return {
            title: "Test Submitted Successfully",
            message: `Your test has been submitted. Score: ${score}% (${Object.keys(answers || {}).length}/${totalQuestions} questions answered)`,
            success: true
          };
        case 'auto':
          return {
            title: "Test Auto-Submitted",
            message: `Test automatically submitted due to time expiration. Score: ${score}%`,
            success: true
          };
        case 'force':
          return {
            title: "Test Force Completed",
            message: `Test completed due to security violations. Score: ${score}%`,
            success: true
          };
        case 'partial':
          return {
            title: "Test Partially Saved",
            message: `Test progress saved due to technical issues. Score: ${score}%`,
            success: true
          };
        default:
          return {
            title: "Test Completed",
            message: `Score: ${score}%`,
            success: true
          };
      }
    };

    const response = getCompletionMessage();
    
    return new Response(
      JSON.stringify({
        success: true,
        ...response,
        data: {
          score: score,
          totalQuestions: totalQuestions,
          questionsAnswered: Object.keys(answers || {}).length,
          questionsFlagged: (flaggedQuestions || []).length,
          completionType: completionType,
          completionReason: completionReason,
          completedAt: currentTime.toISOString(),
          timeRemaining: timeRemaining
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in complete-test function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});