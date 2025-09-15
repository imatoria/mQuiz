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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Create client that forwards the user's JWT so RLS runs as the caller
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { paperAttemptId } = await req.json();
    if (!paperAttemptId) {
      return new Response(
        JSON.stringify({ error: 'Missing paperAttemptId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking for multiple sessions:', paperAttemptId);

    // Verify the paper attempt belongs to the user (RLS also protects this, but we double-check)
    const { data: attemptData, error: attemptError } = await supabase
      .from('paper_attempts')
      .select('user_id')
      .eq('id', paperAttemptId)
      .single();

    if (attemptError || !attemptData || attemptData.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Paper attempt not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Current client info
    const currentIP = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown';
    const currentUserAgent = req.headers.get('User-Agent') || 'unknown';

    // Find active sessions for this paper attempt
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const { data: activeSessions, error: sessionsError } = await supabase
      .from('paper_sessions')
      .select('*')
      .eq('paper_attempt_id', paperAttemptId)
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

    // Analyze sessions
    let suspiciousActivity = false;
    const sessionAnalysis = activeSessions?.map((session) => {
      const ipDifferent = session.ip_address && session.ip_address !== currentIP;
      const userAgentDifferent = session.user_agent && session.user_agent !== currentUserAgent;
      if (ipDifferent || userAgentDifferent) suspiciousActivity = true;
      return {
        id: session.id,
        last_ping: session.last_ping,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        is_different_location: ipDifferent,
        is_different_device: userAgentDifferent,
        created_at: session.created_at,
      };
    });

    // If multiple suspicious sessions, deactivate older ones (allowed by RLS for the owner)
    if (hasMultiple && suspiciousActivity && activeSessions) {
      const latestSession = activeSessions[0];
      const sessionsToDeactivate = activeSessions.slice(1);

      for (const session of sessionsToDeactivate) {
        const { error } = await supabase
          .from('paper_sessions')
          .update({ is_active: false })
          .eq('id', session.id);
        if (error) {
          console.warn('Failed to deactivate session', session.id, error);
        }
      }

      console.log(`Deactivated ${sessionsToDeactivate.length} suspicious sessions; latest kept: ${latestSession?.id}`);
    }

    const result = {
      count: sessionCount,
      hasMultiple,
      suspiciousActivity,
      sessions: sessionAnalysis,
      currentSession: {
        ip_address: currentIP,
        user_agent: currentUserAgent,
        timestamp: new Date().toISOString(),
      },
    };

    console.log('Session check result:', {
      paperAttemptId,
      count: sessionCount,
      hasMultiple,
      suspiciousActivity,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in detect-multiple-sessions function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
