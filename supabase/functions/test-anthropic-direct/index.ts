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
    console.log('Direct Anthropic test function called');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    
    const { apiKey } = await req.json();
    
    if (!apiKey) {
      throw new Error('API key is required');
    }
    
    console.log('Testing Anthropic API directly...');
    console.log('API key format:', apiKey.startsWith('sk-ant-') ? 'Valid format' : 'Invalid format');
    console.log('API key length:', apiKey.length);
    
    // Test with the most basic Anthropic API call
    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: 'Hello'
        }
      ]
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Anthropic API error (${response.status}): ${responseText}`);
      }
      
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${responseText}`;
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }
    
    const data = JSON.parse(responseText);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Anthropic API test successful',
      response: data.content[0].text,
      model: 'claude-3-haiku-20240307'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in test-anthropic-direct function:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
