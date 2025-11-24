
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DecryptKeyRequest {
  providerId: string;
}

// Simple AES decryption using Web Crypto API
async function decryptAPIKey(encryptedData: string, key: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
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
      ['decrypt']
    );
    
    // Decode the base64 data
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt API key');
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

    const { providerId } = await req.json() as DecryptKeyRequest;

    // Validate input
    if (!providerId) {
      throw new Error('Missing provider ID');
    }

    // Get the user's encrypted API key for this provider
    const { data: userKey, error: keyError } = await supabase
      .from('user_ai_provider_keys')
      .select('encrypted_api_key')
      .eq('user_id', user.id)
      .eq('ai_provider_id', providerId)
      .single();

    if (keyError || !userKey) {
      throw new Error('API key not found for this provider');
    }

    // Get encryption key
    const encryptionKey = Deno.env.get('API_KEY_ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('API_KEY_ENCRYPTION_KEY environment variable not set');
      throw new Error('Encryption key not configured. Please contact your administrator to set up the API_KEY_ENCRYPTION_KEY environment variable.');
    }

    console.log('Encryption key found, proceeding with decryption...');

    // Decrypt the API key
    const decryptedApiKey = await decryptAPIKey(userKey.encrypted_api_key, encryptionKey);

    console.log(`API key decrypted successfully for provider ${providerId} by user ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        apiKey: decryptedApiKey
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('API key decryption error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
