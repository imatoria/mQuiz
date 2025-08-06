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
          content: 'You are an expert educator that creates high-quality educational questions. Always return valid JSON format.'
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Anthropic API error');
  }

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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API error');
  }

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

    const { config } = await req.json();
    console.log('AI Question Generation request:', config);

    // Validate required fields
    if (!config.topic || !config.subject_id || !config.class_level) {
      throw new Error('Missing required fields: topic, subject_id, or class_level');
    }

    // Get subject information
    const { data: subjectData } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', config.subject_id)
      .single();

    const subjectName = subjectData?.name || 'General';

    // Get document information if provided
    let documentContext = '';
    if (config.document_id) {
      const { data: documentData } = await supabase
        .from('documents')
        .select('title, content')
        .eq('id', config.document_id)
        .eq('user_id', user.id)
        .single();

      if (documentData) {
        documentContext = `\nDocument Context: "${documentData.title}"`;
        if (documentData.content) {
          documentContext += `\nContent: ${documentData.content.substring(0, 1000)}...`;
        }
      }
    }

    // Try to get user's API keys in order of preference
    let apiKey = null;
    let providerType = null;

    // Try OpenAI first
    apiKey = await getUserApiKey(supabase, user.id, 'openai');
    if (apiKey) {
      providerType = 'openai';
    } else {
      // Try Anthropic
      apiKey = await getUserApiKey(supabase, user.id, 'anthropic');
      if (apiKey) {
        providerType = 'anthropic';
      } else {
        // Try Gemini
        apiKey = await getUserApiKey(supabase, user.id, 'gemini');
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

    // Build the difficulty instruction
    let difficultyInstruction = '';
    if (config.difficulty === 'mixed') {
      const totalQuestions = config.question_count;
      const easy = Math.ceil(totalQuestions * 0.4);
      const medium = Math.ceil(totalQuestions * 0.4);
      const difficult = totalQuestions - easy - medium;
      difficultyInstruction = `Mix difficulty levels: ${easy} easy, ${medium} medium, ${difficult} difficult questions.`;
    } else {
      difficultyInstruction = `All questions should be ${config.difficulty} difficulty level.`;
    }

    // Build the question type instruction
    let typeInstruction = '';
    switch (config.question_type) {
      case 'multiple_choice':
        typeInstruction = 'Create multiple choice questions with 4 options (A, B, C, D) and one correct answer.';
        break;
      case 'true_false':
        typeInstruction = 'Create true/false questions with 2 options and one correct answer.';
        break;
      case 'fill_blank':
        typeInstruction = 'Create fill-in-the-blank questions with the answer provided.';
        break;
      case 'mixed':
        typeInstruction = 'Create a mix of question types including multiple choice, true/false, and fill-in-the-blank.';
        break;
    }

    // Create the prompt
    const prompt = `Generate ${config.question_count} educational questions for ${config.class_level.replace('grade_', 'Grade ')} level students.

Topic: ${config.topic}
Subject: ${subjectName}
${documentContext}

Requirements:
- ${difficultyInstruction}
- ${typeInstruction}
- Questions should be appropriate for ${config.class_level.replace('grade_', 'Grade ')} students
- Focus on understanding, application, and critical thinking
- Make questions clear and unambiguous
${config.custom_instructions ? `- Additional instructions: ${config.custom_instructions}` : ''}

Return ONLY valid JSON in this exact format:
[
  {
    "question_text": "Your question?",
    "option_a": "Option A",
    "option_b": "Option B", 
    "option_c": "Option C",
    "option_d": "Option D",
    "correct_answer": "A",
    "difficulty": "easy"
  }
]

Note: For true/false questions, use only option_a and option_b. For fill-in-the-blank, put the answer in option_a and leave other options empty.`;

    console.log(`Using ${providerType} provider for question generation`);

    // Call the appropriate AI provider
    let generatedText;
    try {
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
    } catch (aiError) {
      console.error(`${providerType} API error:`, aiError);
      throw new Error(`AI provider error: ${aiError.message}`);
    }

    // Parse the JSON response
    let questions;
    try {
      // Clean the response text
      let cleanText = generatedText.trim();
      
      // Try to extract JSON from markdown code blocks
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
      
      // Validate and clean each question
      questions = questions.filter(q => 
        q.question_text && q.correct_answer
      ).map(q => ({
        ...q,
        option_a: q.option_a || '',
        option_b: q.option_b || '',
        option_c: q.option_c || '',
        option_d: q.option_d || '',
        difficulty: q.difficulty || 'medium'
      }));
      
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
      document_id: config.document_id || null,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer.toLowerCase(),
      difficulty: q.difficulty,
      page_number: 1, // Default for generated questions
      user_id: user.id,
      subject_id: config.subject_id,
      class_level: config.class_level,
      topic: config.topic
    }));

    const { error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to save questions to database');
    }

    console.log(`Successfully generated ${questions.length} questions for topic: ${config.topic}`);

    return new Response(JSON.stringify({ 
      success: true, 
      questionsGenerated: questions.length,
      provider: providerType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-ai-questions function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate questions'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});