import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FixEncryptionRequest {
  providerId: string;
  newApiKey: string;
}

// Simple AES encryption using Web Crypto API
async function encryptAPIKey(plaintext: string, key: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    
    // Create a consistent key from the provided string using SHA-256
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
      ['encrypt']
    );
    
    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encoder.encode(plaintext)
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Return base64 encoded result
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt API key');
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { providerId, newApiKey } = await req.json() as FixEncryptionRequest;

    // Validate input
    if (!providerId || !newApiKey) {
      throw new Error('Missing required fields');
    }

    // Get encryption key
    const encryptionKey = Deno.env.get('API_KEY_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured. Please contact your administrator.');
    }

    // Encrypt the new API key
    const encryptedApiKey = await encryptAPIKey(newApiKey, encryptionKey);

    // Update the user's API key
    const { error: updateError } = await supabase
      .from('user_ai_provider_keys')
      .update({
        encrypted_api_key: encryptedApiKey,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('ai_provider_id', providerId);

    if (updateError) {
      throw new Error(`Failed to update API key: ${updateError.message}`);
    }

    console.log(`API key re-encrypted for provider ${providerId} by user ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'API key re-encrypted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fix encryption error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
