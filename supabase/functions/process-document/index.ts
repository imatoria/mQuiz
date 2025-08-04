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
      model: 'gpt-4.1-2025-04-14',
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
      model: 'claude-opus-4-20250514',
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

  let documentId;
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    documentId = body.documentId;

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

    // Skip file processing for now - just generate sample questions based on title and subject
    console.log(`Generating questions for document: ${document.title}`);

    // Create prompt for AI based on document metadata
    const prompt = `Generate 3 multiple choice questions for a document titled "${document.title}". 

Requirements:
- Create exactly 3 questions total
- Mix of difficulty: 1 easy, 1 medium, 1 difficult  
- 4 options each (A, B, C, D)
- Clear correct answer
- Make questions relevant to the document title

Return ONLY valid JSON in this exact format:
[
  {
    "page_number": 1,
    "question_text": "Your question?",
    "option_a": "Option A",
    "option_b": "Option B", 
    "option_c": "Option C",
    "option_d": "Option D",
    "correct_answer": "A",
    "difficulty": "easy"
  }
]`;

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

    // Parse the JSON response with better error handling
    let questions;
    try {
      // Clean the response text
      let cleanText = generatedText.trim();
      
      // Try to extract JSON from markdown code blocks first
      const jsonMatch = cleanText.match(/```json\n([\s\S]*?)\n```/) || cleanText.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        cleanText = jsonMatch[1].trim();
      }
      
      // Remove any non-JSON content before/after the array
      const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        cleanText = arrayMatch[0];
      }
      
      questions = JSON.parse(cleanText);
      
      // Validate the structure
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid questions format - not an array or empty');
      }
      
      // Validate each question has required fields
      questions = questions.filter(q => 
        q.question_text && q.option_a && q.option_b && q.option_c && q.option_d && q.correct_answer
      );
      
      if (questions.length === 0) {
        throw new Error('No valid questions found in response');
      }
      
    } catch (e) {
      console.error('JSON parsing error:', e);
      console.error('Raw response:', generatedText);
      throw new Error(`Failed to parse AI response: ${e.message}`);
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
    
    // Update document status to failed if we have the documentId
    if (documentId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('documents')
          .update({ processing_status: 'failed' })
          .eq('id', documentId);
      } catch (updateError) {
        console.error('Failed to update document status:', updateError);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});