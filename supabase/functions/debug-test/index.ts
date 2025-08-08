import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Debug test function called');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const encryptionKey = Deno.env.get('API_KEY_ENCRYPTION_KEY');
    
    console.log('Environment variables check:');
    console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');
    console.log('API_KEY_ENCRYPTION_KEY:', encryptionKey ? 'SET' : 'NOT SET');
    
    // Test authentication
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', authHeader ? 'YES' : 'NO');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      console.log('Auth result:', {
        user: user ? { id: user.id, email: user.email } : null,
        error: authError?.message
      });
    }
    
    // Test database connection
    try {
      const { data: providers, error: dbError } = await supabase
        .from('ai_providers')
        .select('id, name, provider_key')
        .limit(3);
        
      console.log('Database test:', {
        providers: providers?.length || 0,
        error: dbError?.message
      });
    } catch (dbError) {
      console.error('Database connection error:', dbError);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Debug test completed',
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: supabaseUrl ? 'SET' : 'NOT SET',
        serviceKey: supabaseServiceKey ? 'SET' : 'NOT SET',
        encryptionKey: encryptionKey ? 'SET' : 'NOT SET'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in debug-test function:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
