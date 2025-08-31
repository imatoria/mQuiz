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
      testAttemptId,
      violationType,
      severity = 'medium',
      details = {},
      timestamp
    } = await req.json();

    if (!testAttemptId || !violationType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Logging violation:', {
      testAttemptId,
      violationType,
      severity,
      user: user.id
    });

    // Verify the test attempt belongs to the user
    const { data: attemptData, error: attemptError } = await supabase
      .from('test_attempts')
      .select('user_id, scheduled_test_id')
      .eq('id', testAttemptId)
      .single();

    if (attemptError || !attemptData || attemptData.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Test attempt not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add additional security context
    const violationDetails = {
      ...details,
      userAgent: req.headers.get('User-Agent'),
      ipAddress: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown',
      timestamp: timestamp || new Date().toISOString(),
      userId: user.id,
      scheduledTestId: attemptData.scheduled_test_id
    };

    // Log the violation
    const { data: violationData, error: violationError } = await supabase
      .from('test_violations')
      .insert({
        test_attempt_id: testAttemptId,
        violation_type: violationType,
        severity: severity,
        details: violationDetails,
        occurred_at: violationDetails.timestamp
      })
      .select()
      .single();

    if (violationError) {
      console.error('Error logging violation:', violationError);
      return new Response(
        JSON.stringify({ error: 'Failed to log violation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count total violations for this attempt
    const { data: violationCount, error: countError } = await supabase
      .from('test_violations')
      .select('id')
      .eq('test_attempt_id', testAttemptId);

    if (countError) {
      console.error('Error counting violations:', countError);
    }

    const totalViolations = violationCount?.length || 0;

    // Check if we need to notify admins/parents for severe violations
    if (severity === 'critical' || severity === 'high') {
      try {
        // Get test creator (parent) information
        const { data: testData } = await supabase
          .from('scheduled_tests')
          .select('creator_id, title')
          .eq('id', attemptData.scheduled_test_id)
          .single();

        if (testData) {
          // Create notification for the test creator
          await supabase
            .from('notifications')
            .insert({
              user_id: testData.creator_id,
              title: 'Security Violation Alert',
              message: `Security violation detected in test "${testData.title}". Type: ${violationType}, Severity: ${severity}`,
              type: 'security_alert',
              related_id: testAttemptId
            });
        }
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the main request if notification fails
      }
    }

    console.log('Violation logged successfully:', violationData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        violationId: violationData.id,
        totalViolations: totalViolations,
        severity: severity
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-test-violation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});