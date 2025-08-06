import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to test OpenAI API
async function testOpenAI(apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'user',
          content: 'Say "API key is working" if you receive this message.'
        }
      ],
      max_tokens: 10,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API test failed');
  }

  const data = await response.json();
  return {
    success: true,
    response: data.choices[0].message.content,
    model: 'gpt-4.1-2025-04-14'
  };
}

// Helper function to test Anthropic API
async function testAnthropic(apiKey: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-20250514',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: 'Say "API key is working" if you receive this message.'
        }
      ]
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Anthropic API test failed');
  }

  const data = await response.json();
  return {
    success: true,
    response: data.content[0].text,
    model: 'claude-opus-4-20250514'
  };
}

// Helper function to test Google Gemini API
async function testGemini(apiKey: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: 'Say "API key is working" if you receive this message.'
            }
          ]
        }
      ]
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API test failed');
  }

  const data = await response.json();
  return {
    success: true,
    response: data.candidates[0].content.parts[0].text,
    model: 'gemini-2.0-flash-exp'
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { providerId, apiKey } = await req.json();

    if (!providerId || !apiKey) {
      throw new Error('Provider ID and API key are required');
    }

    // Get provider information
    const { data: provider, error: providerError } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (providerError || !provider) {
      throw new Error('Provider not found');
    }

    console.log(`Testing ${provider.name} API key for user ${user.id}`);

    // Test the API key based on provider
    let testResult;
    switch (provider.provider_key.toLowerCase()) {
      case 'openai':
        testResult = await testOpenAI(apiKey);
        break;
      case 'anthropic':
        testResult = await testAnthropic(apiKey);
        break;
      case 'gemini':
        testResult = await testGemini(apiKey);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider.provider_key}`);
    }

    console.log(`API key test successful for ${provider.name}`);

    return new Response(JSON.stringify({
      success: true,
      provider: provider.name,
      model: testResult.model,
      message: 'API key is valid and working correctly'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in test-api-key function:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Failed to test API key'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});