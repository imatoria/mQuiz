import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to call Lovable AI Gateway
async function callLovableAI(prompt: string) {
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates educational questions. Return ONLY valid JSON arrays without any markdown formatting or additional text.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    if (response.status === 402) {
      throw new Error('Lovable AI credits depleted. Please add credits in your workspace settings.');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Lovable AI error');
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Lovable AI returned empty response');
  return text;
}

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
    .maybeSingle();

  if (userKey?.encrypted_api_key) {
    // Simple decryption (base64 decode)
    return atob(userKey.encrypted_api_key);
  }

  return null;
}

// Helper function to call Google Gemini API (fallback)
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

// Helper function to call Groq API
async function callGroq(apiKey: string, prompt: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that strictly returns valid JSON arrays of questions as requested. Do not include any prose or markdown.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Groq API error');
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned empty response');
  return text;
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

    const { config, mode } = await req.json();
    console.log('AI Question Generation request:', config);

    // Validate required fields based on mode
    if (!config.subject_parent_id || !config.class_parent_id) {
      throw new Error('Missing required fields: subject_parent_id or class_parent_id');
    }
    
    // In independent mode, topic is required
    if (mode === 'independent' && !config.topic) {
      throw new Error('Topic is required for independent mode');
    }

    // Get subject information
    const { data: subjectData } = await supabase
      .from('subjects_parent')
      .select('subject_name')
      .eq('id', config.subject_parent_id)
      .maybeSingle();

    const subjectName = subjectData?.subject_name || 'General';

    // Get class information
    const { data: classData } = await supabase
      .from('classes_parent')
      .select('class_name')
      .eq('id', config.class_parent_id)
      .maybeSingle();

    const className = classData?.class_name || 'General';

    // Get document information if provided
    let documentContext = '';
    if (config.document_id) {
      // Fetch document title
      const { data: docMeta } = await supabase
        .from('documents')
        .select('title')
        .eq('id', config.document_id)
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch first pages' content to use as context
      const { data: pages } = await supabase
        .from('document_pages')
        .select('content, page_number')
        .eq('document_id', config.document_id)
        .order('page_number', { ascending: true })
        .limit(20);

      const combined = (pages || [])
        .map(p => p.content || '')
        .filter(Boolean)
        .join('\n')
        .slice(0, 4000);

      if (docMeta || combined) {
        documentContext = `\nDocument Context: "${docMeta?.title || 'Selected Document'}"`;
        if (combined) {
          documentContext += `\nContent: ${combined}...`;
        }
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
    const topicText = config.topic ? config.topic : 'General questions from the document';
    const prompt = `Generate ${config.question_count} educational questions for ${className} level students.

Topic: ${topicText}
Subject: ${subjectName}
${documentContext}

Requirements:
- ${difficultyInstruction}
- ${typeInstruction}
- Questions should be appropriate for ${className} students
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

    // Try Lovable AI first (most reliable), then fallback to user-configured providers
    let generatedText: string | undefined;
    let providerTypeUsed: 'lovable' | 'gemini' | 'groq' | undefined;
    let lastError: any;

    // Try Lovable AI first
    if (lovableApiKey) {
      try {
        console.log('Trying Lovable AI Gateway');
        generatedText = await callLovableAI(prompt);
        providerTypeUsed = 'lovable';
        console.log('Lovable AI succeeded');
      } catch (aiError: any) {
        console.error('Lovable AI error:', aiError);
        lastError = aiError;
      }
    }

    // If Lovable AI failed, try user-configured providers
    if (!generatedText) {
      const candidates: Array<{ type: 'gemini' | 'groq'; key: string }> = [];
      
      const userGeminiKey = await getUserApiKey(supabase, user.id, 'gemini');
      if (userGeminiKey) candidates.push({ type: 'gemini', key: userGeminiKey });

      const userGroqKey = await getUserApiKey(supabase, user.id, 'groq');
      if (userGroqKey) candidates.push({ type: 'groq', key: userGroqKey });

      console.log(`Trying fallback providers: ${candidates.map(c => c.type).join(', ')}`);

      for (const candidate of candidates) {
        try {
          console.log(`Trying provider: ${candidate.type}`);
          if (candidate.type === 'gemini') {
            generatedText = await callGemini(candidate.key, prompt);
          } else if (candidate.type === 'groq') {
            generatedText = await callGroq(candidate.key, prompt);
          }
          providerTypeUsed = candidate.type;
          console.log(`Provider ${candidate.type} succeeded`);
          break;
        } catch (aiError: any) {
          console.error(`${candidate.type} API error:`, aiError);
          lastError = aiError;
          continue;
        }
      }
    }

    if (!generatedText || !providerTypeUsed) {
      throw new Error(`AI provider error: ${lastError?.message || 'All providers failed'}`);
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
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer.toLowerCase(),
      difficulty: q.difficulty,
      page_number: 1, // Default for generated questions
      user_id: user.id,
      subject_parent_id: config.subject_parent_id,
      class_parent_id: config.class_parent_id,
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
      provider: providerTypeUsed
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