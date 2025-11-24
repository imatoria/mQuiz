import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supported providers: Gemini, Groq

// Helper function to test Google Gemini API
async function testGemini(apiKey: string) {
  console.log('Testing Gemini with API key:', apiKey.substring(0, 10) + '...');

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: 'Say "API key is working" if you receive this message.'
          }
        ]
      }
    ],
    generationConfig: {
      maxOutputTokens: 10,
      temperature: 0.1
    }
  };

  console.log('Gemini request body:', JSON.stringify(requestBody, null, 2));

  const apiVersions = ['v1', 'v1beta'];
  const modelCandidates = [
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest'
  ];

  let lastErrorText = '';

  for (const version of apiVersions) {
    for (const model of modelCandidates) {
      try {
        console.log(`Trying Gemini model: ${model} on ${version}`);
        const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('Gemini response status:', response.status);
        console.log('Gemini response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Gemini API error response for ${model} (${version}):`, errorText);
          lastErrorText = errorText;

          // Try next candidate on 404s (model not found/unsupported on this API version)
          if (response.status === 404) continue;

          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (_) {
            throw new Error(`Gemini API test failed with status ${response.status}: ${errorText}`);
          }

          const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${errorText}`;
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Gemini successful response:', JSON.stringify(data, null, 2));

        return {
          success: true,
          response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text found',
          model: `${model} (${version})`,
        };
      } catch (err) {
        // If the error wasn't due to a 404 handled above, and includes 401/403 quota/auth, throw it
        const msg = err instanceof Error ? err.message : String(err);
        if (!/404/.test(msg)) {
          throw err;
        }
        // otherwise continue to next model/version
        continue;
      }
    }
  }

  throw new Error(lastErrorText || 'No compatible Gemini models found for the available API versions.');
}

// Helper function to test Groq API
async function testGroq(apiKey: string) {
  console.log('Testing Groq API...');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'user', content: 'Say "API key is working" if you receive this message.' }
      ],
      max_tokens: 10,
    }),
  });

  console.log('Groq response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API error response:', errorText);

    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch (parseError) {
      throw new Error(`Groq API test failed with status ${response.status}: ${errorText}`);
    }

    const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${errorText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('Groq successful response:', JSON.stringify(data, null, 2));

  return {
    success: true,
    response: data.choices?.[0]?.message?.content ?? 'No response text found',
    model: 'llama-3.1-8b-instant'
  };
}

// Helper function to test DeepSeek API
async function testDeepSeek(apiKey: string) {
  console.log('Testing DeepSeek API...');

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: 'Say "API key is working" if you receive this message.' }
      ],
      max_tokens: 10,
    }),
  });

  console.log('DeepSeek response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DeepSeek API error response:', errorText);

    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch (parseError) {
      throw new Error(`DeepSeek API test failed with status ${response.status}: ${errorText}`);
    }

    const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${errorText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('DeepSeek successful response:', JSON.stringify(data, null, 2));

  return {
    success: true,
    response: data.choices?.[0]?.message?.content ?? 'No response text found',
    model: 'deepseek-chat'
  };
}

Deno.serve(async (req) => {
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

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid request body. Please ensure you are sending valid JSON.');
    }

    const { providerId, apiKey } = requestBody;

    if (!providerId || !apiKey) {
      throw new Error('Provider ID and API key are required');
    }

    console.log('Request received for provider ID:', providerId);

    // Get provider information
    const { data: provider, error: providerError } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    console.log('Provider lookup result:', { provider, providerError });

    if (providerError || !provider) {
      console.error('Provider lookup failed:', providerError);
      throw new Error(`Provider not found: ${providerError?.message || 'Unknown error'}`);
    }

    console.log(`Testing ${provider.name} API key for user ${user.id}`);
    console.log('Provider details:', {
      id: provider.id,
      name: provider.name,
      provider_key: provider.provider_key,
      is_active: provider.is_active
    });

    // Test the API key based on provider
    console.log('Determining test function for provider_key:', provider.provider_key);
    console.log('Provider key lowercase:', provider.provider_key.toLowerCase());

    let testResult;
    switch (provider.provider_key.toLowerCase()) {
      case 'gemini':
        console.log('Calling testGemini function...');
        testResult = await testGemini(apiKey);
        break;
      case 'groq':
        console.log('Calling testGroq function...');
        testResult = await testGroq(apiKey);
        break;
      case 'deepseek':
        console.log('Calling testDeepSeek function...');
        testResult = await testDeepSeek(apiKey);
        break;
      default:
        console.error('Unsupported provider key:', provider.provider_key);
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
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }

    // Provide more specific error messages based on the error type
    const errorMessage = error instanceof Error ? error.message : 'Failed to test API key';
    let statusCode = 400;

    if (errorMessage.includes('quota') || errorMessage.includes('billing') || errorMessage.includes('insufficient_quota')) {
      statusCode = 402; // Payment Required
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('invalid') || errorMessage.includes('authentication') || errorMessage.includes('401')) {
      statusCode = 401; // Unauthorized
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      statusCode = 429; // Too Many Requests
    } else if (errorMessage.includes('model') || errorMessage.includes('404')) {
      statusCode = 403; // Forbidden
    } else if (errorMessage.includes('400')) {
      statusCode = 400;
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      originalError: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
