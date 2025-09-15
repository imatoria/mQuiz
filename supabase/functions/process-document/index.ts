
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getDocumentProxy, extractText } from 'https://esm.sh/unpdf@0.12.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Fallback API keys (admin-configured)
const fallbackGroqKey = Deno.env.get('GROQ_API_KEY');
const fallbackDeepSeekKey = Deno.env.get('DEEPSEEK_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AES-GCM decryption helper (matches the decrypt-api-key function logic)
async function decryptAPIKey(encryptedData: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Derive AES-GCM key from provided secret using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const cryptoKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('supabase-encryption-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Decode base64(iv + ciphertext)
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );

  return decoder.decode(decrypted);
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
    .single();

  if (userKey?.encrypted_api_key) {
    // Proper decryption using AES-GCM with the shared encryption key
    const encryptionKey = Deno.env.get('API_KEY_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured. Please contact the administrator.');
    }
    return await decryptAPIKey(userKey.encrypted_api_key, encryptionKey);
  }

  return null;
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Helper function to call DeepSeek API
async function callDeepSeek(apiKey: string, prompt: string) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let documentId;
  let extractedTotalPages = 0;
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    documentId = body.documentId;
    const onlyExtract = !!body.onlyExtract;

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

    // Try to get user's API keys in order of preference: Groq, DeepSeek
    let apiKey = null;
    let providerType = null;

    // Try Groq first
    apiKey = await getUserApiKey(supabase, document.user_id, 'groq');
    if (apiKey) {
      providerType = 'groq';
    } else {
      // Try DeepSeek
      apiKey = await getUserApiKey(supabase, document.user_id, 'deepseek');
      if (apiKey) {
        providerType = 'deepseek';
      }
    }

    // Fall back to admin keys if user doesn't have any configured
    if (!apiKey) {
      if (fallbackGroqKey) {
        apiKey = fallbackGroqKey;
        providerType = 'groq';
      } else if (fallbackDeepSeekKey) {
        apiKey = fallbackDeepSeekKey;
        providerType = 'deepseek';
      } else {
        throw new Error('No AI provider API key available. Please configure your API keys in settings.');
      }
    }

    // Download PDF from storage and extract text
    console.log('Downloading PDF from storage for extraction');
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('documents')
      .download(document.file_path);

    if (fileError || !fileData) {
      console.error('Storage download error:', fileError);
      throw new Error('Failed to download document file for processing');
    }

    const pdfBuffer = new Uint8Array(await fileData.arrayBuffer());

    console.log('Extracting text from PDF using unpdf');
    let perPageText: string[] = [];
    try {
      const pdf = await getDocumentProxy(pdfBuffer);
      const extraction = await extractText(pdf, { mergePages: false });
      extractedTotalPages = extraction.totalPages || (Array.isArray(extraction.text) ? extraction.text.length : 1);
      perPageText = Array.isArray(extraction.text) ? extraction.text : [extraction.text];
    } catch (e) {
      console.error('PDF extraction error:', e);
      throw new Error('Failed to extract text from PDF');
    }

    // Save extracted pages to database
    try {
      await supabase.from('document_pages').delete().eq('document_id', documentId);
      const pagesToInsert = perPageText.map((content, idx) => ({
        document_id: documentId,
        page_number: idx + 1,
        content: (content || '').trim() || null,
      }));
      if (pagesToInsert.length > 0) {
        const { error: insertPagesError } = await supabase
          .from('document_pages')
          .insert(pagesToInsert);
        if (insertPagesError) {
          console.error('Failed to save extracted pages:', insertPagesError);
        }
      }
    } catch (e) {
      console.error('Error saving extracted pages:', e);
    }

    // If only extracting content, update status and return early
    if (onlyExtract) {
      const { error: updateOnlyExtractError } = await supabase
        .from('documents')
        .update({ 
          processing_status: 'completed',
          total_pages: extractedTotalPages || null
        })
        .eq('id', documentId);
      if (updateOnlyExtractError) {
        console.error('Error updating document status (only extract):', updateOnlyExtractError);
      }
      return new Response(JSON.stringify({ 
        success: true, 
        questionsGenerated: 0,
        onlyExtract: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare content for AI (trim to safe length)
    const mergedContent = perPageText.join('\n\n').trim();
    const MAX_CHARS = 15000;
    const contentForModel = mergedContent.slice(0, MAX_CHARS);

    console.log(`Generating questions from extracted content (chars: ${contentForModel.length})`);

    const prompt = `Based ONLY on the following document content, generate exactly 5 multiple choice questions.

Requirements:
- Create exactly 5 questions total
- Mix of difficulty: 2 easy, 2 medium, 1 difficult
- 4 options each (A, B, C, D)
- Clear correct answer
- Do not include any explanations
- Base questions strictly on the provided content

Document content:
"""${contentForModel}"""

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

    console.log(`Using ${providerType} provider for document processing`);

    // Call the appropriate AI provider
    let generatedText;
    try {
      switch (providerType) {
        case 'groq':
          generatedText = await callGroq(apiKey, prompt);
          break;
        case 'deepseek':
          generatedText = await callDeepSeek(apiKey, prompt);
          break;
        default:
          throw new Error('Unsupported AI provider');
      }
    } catch (aiError) {
      console.error(`${providerType} API error:`, aiError);
      throw new Error(`AI provider error: ${aiError.message}`);
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
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        processing_status: 'completed',
        total_pages: extractedTotalPages || null
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Error updating document status:', updateError);
    }

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
          .update({ 
            processing_status: 'failed'
          })
          .eq('id', documentId);
      } catch (updateError) {
        console.error('Failed to update document status:', updateError);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: error.message,
      documentId: documentId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
