import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to test OpenAI API
async function testOpenAI(apiKey: string) {
  console.log('Testing OpenAI API...');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Say "API key is working" if you receive this message.'
        }
      ],
      max_tokens: 10,
    }),
  });

  console.log('OpenAI response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error response:', errorText);

    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch (parseError) {
      throw new Error(`OpenAI API test failed with status ${response.status}: ${errorText}`);
    }

    const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${errorText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('OpenAI successful response:', JSON.stringify(data, null, 2));

  return {
    success: true,
    response: data.choices[0].message.content,
    model: 'gpt-4o-mini'
  };
}

// Helper function to test Anthropic API
async function testAnthropic(apiKey: string) {
  console.log('Testing Anthropic API...');
  console.log('API key format check:', apiKey.startsWith('sk-ant-') ? 'Valid format' : 'Invalid format - should start with sk-ant-');

  const requestBody = {
    model: 'claude-3-haiku-20240307',
    max_tokens: 10,
    messages: [
      {
        role: 'user',
        content: 'Say "API key is working" if you receive this message.'
      }
    ]
  };

  console.log('Anthropic request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(requestBody),
  });

  console.log('Anthropic response status:', response.status);
  console.log('Anthropic response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Anthropic API error response:', errorText);

    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch (parseError) {
      throw new Error(`Anthropic API test failed with status ${response.status}: ${errorText}`);
    }

    const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${errorText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('Anthropic successful response:', JSON.stringify(data, null, 2));

  return {
    success: true,
    response: data.content[0].text,
    model: 'claude-3-haiku-20240307'
  };
}

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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
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
    console.error('Gemini API error response:', errorText);

    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch (parseError) {
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
    model: 'gemini-1.5-flash-latest'
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
      case 'openai':
        console.log('Calling testOpenAI function...');
        testResult = await testOpenAI(apiKey);
        break;
      case 'anthropic':
        console.log('Calling testAnthropic function...');
        testResult = await testAnthropic(apiKey);
        break;
      case 'gemini':
        console.log('Calling testGemini function...');
        testResult = await testGemini(apiKey);
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
    console.error('Error stack:', error.stack);

    // Provide more specific error messages based on the error type
    let errorMessage = error.message || 'Failed to test API key';
    let statusCode = 400;

    if (errorMessage.includes('quota') || errorMessage.includes('billing') || errorMessage.includes('insufficient_quota')) {
      errorMessage = 'API quota exceeded. Please check your billing and usage limits.';
      statusCode = 402; // Payment Required
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('invalid') || errorMessage.includes('authentication') || errorMessage.includes('401')) {
      errorMessage = 'Invalid API key. Please check your API key is correct and has the necessary permissions.';
      statusCode = 401; // Unauthorized
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      statusCode = 429; // Too Many Requests
    } else if (errorMessage.includes('model') || errorMessage.includes('404')) {
      errorMessage = 'Model not available or access denied. Please check your API key permissions.';
      statusCode = 403; // Forbidden
    } else if (errorMessage.includes('400')) {
      errorMessage = 'Bad request. Please check your API key format and try again.';
      statusCode = 400;
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      originalError: error.message, // Keep original for debugging
      stack: error.stack // Add stack trace for debugging
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});