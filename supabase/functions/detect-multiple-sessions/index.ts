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

    // Set the auth token for the client
    await supabase.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: ''
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { testAttemptId } = await req.json();

    if (!testAttemptId) {
      return new Response(
        JSON.stringify({ error: 'Missing testAttemptId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking for multiple sessions:', testAttemptId);

    // Verify the test attempt belongs to the user
    const { data: attemptData, error: attemptError } = await supabase
      .from('test_attempts')
      .select('user_id')
      .eq('id', testAttemptId)
      .single();

    if (attemptError || !attemptData || attemptData.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Test attempt not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current client info
    const currentIP = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown';
    const currentUserAgent = req.headers.get('User-Agent') || 'unknown';

    // Find active sessions for this test attempt
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const { data: activeSessions, error: sessionsError } = await supabase
      .from('test_sessions')
      .select('*')
      .eq('test_attempt_id', testAttemptId)
      .eq('is_active', true)
      .gte('last_ping', fiveMinutesAgo.toISOString())
      .order('last_ping', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to check sessions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionCount = activeSessions?.length || 0;
    const hasMultiple = sessionCount > 1;

    // If multiple sessions detected, analyze them
    let suspiciousActivity = false;
    const sessionAnalysis = activeSessions?.map(session => {
      // Check for different IPs or user agents
      const ipDifferent = session.ip_address && session.ip_address !== currentIP;
      const userAgentDifferent = session.user_agent && session.user_agent !== currentUserAgent;
      
      if (ipDifferent || userAgentDifferent) {
        suspiciousActivity = true;
      }

      return {
        id: session.id,
        last_ping: session.last_ping,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        is_different_location: ipDifferent,
        is_different_device: userAgentDifferent,
        created_at: session.created_at
      };
    });

    // If multiple suspicious sessions, deactivate older ones
    if (hasMultiple && suspiciousActivity) {
      // Keep only the most recent session active
      const latestSession = activeSessions[0];
      const sessionsToDeactivate = activeSessions.slice(1);

      for (const session of sessionsToDeactivate) {
        await supabase
          .from('test_sessions')
          .update({ is_active: false })
          .eq('id', session.id);
      }

      console.log(`Deactivated ${sessionsToDeactivate.length} suspicious sessions`);
    }

    const result = {
      count: sessionCount,
      hasMultiple: hasMultiple,
      suspiciousActivity: suspiciousActivity,
      sessions: sessionAnalysis,
      currentSession: {
        ip_address: currentIP,
        user_agent: currentUserAgent,
        timestamp: new Date().toISOString()
      }
    };

    console.log('Session check result:', {
      testAttemptId,
      count: sessionCount,
      hasMultiple,
      suspiciousActivity
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-multiple-sessions function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
