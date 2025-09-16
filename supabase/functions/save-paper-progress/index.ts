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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create supabase client with service role for database operations
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

    // Create client with anon key for user verification
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      paperAttemptId,
      answers,
      currentQuestionIndex,
      progressPercentage,
      timeRemaining,
      flaggedQuestions,
      paperId
    } = await req.json();

    // Handle time sync requests
    if (paperAttemptId === 'sync-time') {
      const currentTime = new Date();
      return new Response(
        JSON.stringify({ 
          success: true, 
          serverTime: currentTime.toISOString(),
          timestamp: currentTime.getTime()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Saving progress for attempt:', paperAttemptId, 'user:', user.id);

    // Get current server time and validate paper is still active
    const currentTime = new Date();
    
    // Enhanced time validation - check paper data
    const { data: paperData, error: paperError } = await supabase
      .from('question_papers')
      .select(`
        end_time,
        start_time,
        time_limit_minutes,
        id
      `)
      .eq('id', paperId)
      .single();

    if (paperError) {
      console.error('Error fetching paper data:', paperError);
      return new Response(
        JSON.stringify({ error: 'Paper not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get attempt start time for individual time limit validation
    const { data: attemptData, error: attemptError } = await supabase
      .from('paper_attempts')
      .select('started_at, completed_at, time_remaining, last_activity_at, current_question_index, progress_percentage')
      .eq('id', paperAttemptId)
      .eq('user_id', user.id)
      .single();

    if (attemptError || !attemptData) {
      console.error('Error fetching attempt data:', attemptError);
      return new Response(
        JSON.stringify({ error: 'Paper attempt not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already completed
    if (attemptData.completed_at) {
      return new Response(
        JSON.stringify({ error: 'Paper attempt already completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paperEndTime = paperData.end_time ? new Date(paperData.end_time) : null;
    const paperStartTime = paperData.start_time ? new Date(paperData.start_time) : null;
    const attemptStartTime = new Date(attemptData.started_at);
    
    // Determine effective time limit: prefer paper override, fallback to paper
    const scheduledMinutes = (paperData.time_limit_minutes ?? 0);
    const effectiveMinutes = scheduledMinutes > 0 ? scheduledMinutes : 0;
    const timeLimitMs = effectiveMinutes * 60 * 1000;
    const attemptEndTime = timeLimitMs > 0 ? new Date(attemptStartTime.getTime() + timeLimitMs) : null;
    
    // Multiple time validation layers
    const timeValidation = {
      paperExpired: paperEndTime ? currentTime > paperEndTime : false,
      paperNotStarted: paperStartTime ? currentTime < paperStartTime : false,
      attemptTimeExpired: attemptEndTime ? currentTime > attemptEndTime : false,
      timeRemainingExpired: timeRemaining <= 0
    };

    // Auto-submit if any time limit is exceeded
    if (timeValidation.paperExpired || timeValidation.attemptTimeExpired || timeValidation.timeRemainingExpired) {
      console.log('Time limit exceeded, auto-submitting:', timeValidation);
      
      // Calculate final score before submission
      let score = 0;
      let totalQuestions = 0;
      
      if (answers && Object.keys(answers).length > 0) {
        const { data: questionsData } = await supabase
          .from('question_paper_questions')
          .select(`
            questions (id, correct_answer)
          `)
          .eq('question_paper_id', paperId);

        if (questionsData && questionsData.length > 0) {
          totalQuestions = questionsData.length;
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
      }

      // Auto-submit with calculated score
      const { error: submitError } = await supabase
        .from('paper_attempts')
        .update({
          answers: {
            encrypted: btoa(JSON.stringify(answers)),
            flagged: btoa(JSON.stringify(flaggedQuestions || [])),
            lastSaved: currentTime.toISOString(),
            autoSubmitted: true,
            submitReason: timeValidation.paperExpired ? 'paper_expired' : 
                         timeValidation.attemptTimeExpired ? 'attempt_time_expired' : 
                         'time_remaining_expired'
          },
          current_question_index: currentQuestionIndex,
          progress_percentage: progressPercentage,
          last_activity_at: currentTime.toISOString(),
          completed_at: currentTime.toISOString(),
          time_remaining: 0,
          is_paused: false,
          score: score,
          total_questions: totalQuestions
        })
        .eq('id', paperAttemptId)
        .eq('user_id', user.id);

      if (submitError) {
        console.error('Error auto-submitting paper:', submitError);
        return new Response(
          JSON.stringify({ error: 'Failed to auto-submit paper' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          autoSubmitted: true,
          message: 'Paper automatically submitted due to time expiration',
          score: score,
          submitReason: timeValidation.paperExpired ? 'Paper time window expired' : 
                      timeValidation.attemptTimeExpired ? 'Individual attempt time expired' :
                      'Time remaining reached zero'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (timeValidation.paperNotStarted) {
      return new Response(
        JSON.stringify({ error: 'Paper has not started yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduplicate rapid identical saves within 2s to avoid recursion/thrashing
    const lastActivityAt = attemptData.last_activity_at ? new Date(attemptData.last_activity_at) : null;
    const isDuplicateSave =
      !!lastActivityAt &&
      (currentTime.getTime() - lastActivityAt.getTime()) < 2000 &&
      attemptData.current_question_index === currentQuestionIndex &&
      ((attemptData.progress_percentage ?? null) === (progressPercentage ?? null)) &&
      (attemptData.time_remaining === timeRemaining);

    if (isDuplicateSave) {
      console.log('Duplicate save skipped for attempt:', paperAttemptId);
      return new Response(
        JSON.stringify({ success: true, deduped: true, serverTime: currentTime.toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Additional integrity checks
    if (timeRemaining < 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid time remaining value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encrypt sensitive data (answers) - simple base64 encoding for now
    // In production, you would use proper encryption
    const encryptedAnswers = btoa(JSON.stringify(answers));
    const encryptedFlags = btoa(JSON.stringify(flaggedQuestions || []));

    // Update paper attempt with progress
    const { data: updateData, error: updateError } = await supabase
      .from('paper_attempts')
      .update({
        answers: {
          encrypted: encryptedAnswers,
          flagged: encryptedFlags,
          lastSaved: currentTime.toISOString()
        },
        current_question_index: currentQuestionIndex,
        progress_percentage: progressPercentage,
        time_remaining: timeRemaining,
        last_activity_at: currentTime.toISOString(),
        is_paused: false
      })
      .eq('id', paperAttemptId)
      .eq('user_id', user.id)
      .select();

    if (updateError) {
      console.error('Error updating paper attempt:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save progress' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!updateData || updateData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Paper attempt not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Progress saved successfully for attempt:', paperAttemptId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        serverTime: currentTime.toISOString(),
        savedAt: currentTime.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-paper-progress function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});