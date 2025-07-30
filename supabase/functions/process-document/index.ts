import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Fallback API keys (admin-configured)
const fallbackOpenAIKey = Deno.env.get('OPENAI_API_KEY');
const fallbackAnthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
const fallbackGeminiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get user's API key for a provider
async function getUserApiKey(supabase: any, userId: string, providerKey: string) {
  const { data: userKey } = await supabase
    .from('user_ai_provider_keys')
    .select(`
      encrypted_api_key,
      ai_providers!inner(provider_key)
    `)
    .eq('user_id', userId)
    .eq('ai_providers.provider_key', providerKey)
    .single();

  if (userKey?.encrypted_api_key) {
    // Simple decryption (base64 decode)
    return atob(userKey.encrypted_api_key);
  }

  return null;
}

// Helper function to call OpenAI API
async function callOpenAI(apiKey: string, prompt: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educator that creates high-quality multiple choice questions from educational documents.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// Helper function to call Anthropic API
async function callAnthropic(apiKey: string, prompt: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }),
  });

  const data = await response.json();
  return data.content[0].text;
}

// Helper function to call Google Gemini API
async function callGemini(apiKey: string, prompt: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    }),
  });

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { documentId } = await req.json();

    console.log('Processing document:', documentId);

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError) {
      throw new Error('Document not found');
    }

    // Try to get user's API keys in order of preference: OpenAI, Anthropic, Gemini
    let apiKey = null;
    let providerType = null;

    // Try OpenAI first
    apiKey = await getUserApiKey(supabase, document.user_id, 'openai');
    if (apiKey) {
      providerType = 'openai';
    } else {
      // Try Anthropic
      apiKey = await getUserApiKey(supabase, document.user_id, 'anthropic');
      if (apiKey) {
        providerType = 'anthropic';
      } else {
        // Try Gemini
        apiKey = await getUserApiKey(supabase, document.user_id, 'gemini');
        if (apiKey) {
          providerType = 'gemini';
        }
      }
    }

    // Fall back to admin keys if user doesn't have any configured
    if (!apiKey) {
      if (fallbackOpenAIKey) {
        apiKey = fallbackOpenAIKey;
        providerType = 'openai';
      } else if (fallbackAnthropicKey) {
        apiKey = fallbackAnthropicKey;
        providerType = 'anthropic';
      } else if (fallbackGeminiKey) {
        apiKey = fallbackGeminiKey;
        providerType = 'gemini';
      } else {
        throw new Error('No AI provider API key available. Please configure your API keys in settings.');
      }
    }

    // Get the file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (fileError) {
      throw new Error('Failed to download file');
    }

    // Convert file to base64 for OpenAI
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Create prompt for OpenAI
    const prompt = `Please analyze this PDF document and generate 5 multiple choice questions (MCQs) per page. For each question:
1. Create questions of varying difficulty levels: easy, medium, and difficult
2. Provide 4 options labeled A, B, C, D
3. Indicate the correct answer
4. Base questions on the content of each page

Format your response as a JSON array with this structure:
[
  {
    "page_number": 1,
    "question_text": "Question here?",
    "option_a": "First option",
    "option_b": "Second option", 
    "option_c": "Third option",
    "option_d": "Fourth option",
    "correct_answer": "A",
    "difficulty": "easy"
  }
]

Ensure you create exactly 5 questions per page with a mix of difficulty levels.`;

    // Call the appropriate AI provider
    let generatedText;
    switch (providerType) {
      case 'openai':
        generatedText = await callOpenAI(apiKey, prompt);
        break;
      case 'anthropic':
        generatedText = await callAnthropic(apiKey, prompt);
        break;
      case 'gemini':
        generatedText = await callGemini(apiKey, prompt);
        break;
      default:
        throw new Error('Unsupported AI provider');
    }

    // Parse the JSON response
    let questions;
    try {
      questions = JSON.parse(generatedText);
    } catch (e) {
      // If JSON parsing fails, extract JSON from markdown code blocks
      const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse OpenAI response');
      }
    }

    // Insert questions into database
    const questionsToInsert = questions.map((q: any) => ({
      document_id: documentId,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      difficulty: q.difficulty,
      page_number: q.page_number,
    }));

    const { error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (insertError) {
      throw new Error('Failed to save questions');
    }

    // Update document processing status
    await supabase
      .from('documents')
      .update({ 
        processing_status: 'completed',
        total_pages: Math.max(...questions.map((q: any) => q.page_number))
      })
      .eq('id', documentId);

    console.log(`Successfully processed ${questions.length} questions for document ${documentId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      questionsGenerated: questions.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-document function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});