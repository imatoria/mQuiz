import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EncryptKeyRequest {
  providerId: string;
  apiKey: string;
}

// Simple AES-like encryption using Web Crypto API
async function encryptAPIKey(plaintext: string, key: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    
    // Create a key from the provided string
    const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32)); // Ensure 32 bytes
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
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

    const { providerId, apiKey } = await req.json() as EncryptKeyRequest;

    // Validate input
    if (!providerId || !apiKey) {
      throw new Error('Missing required fields');
    }

    // Verify the provider exists and is active
    const { data: provider, error: providerError } = await supabase
      .from('ai_providers')
      .select('id, name, is_active')
      .eq('id', providerId)
      .eq('is_active', true)
      .single();

    if (providerError || !provider) {
      throw new Error('Invalid or inactive provider');
    }

    // Get or create encryption key
    let encryptionKey = Deno.env.get('API_KEY_ENCRYPTION_KEY');
    if (!encryptionKey) {
      // Generate a new encryption key if not set
      encryptionKey = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
      console.warn('Using generated encryption key. Set API_KEY_ENCRYPTION_KEY in production.');
    }

    // Encrypt the API key
    const encryptedApiKey = await encryptAPIKey(apiKey, encryptionKey);

    // Check if user already has a key for this provider
    const { data: existingKey, error: existingError } = await supabase
      .from('user_ai_provider_keys')
      .select('id')
      .eq('user_id', user.id)
      .eq('ai_provider_id', providerId)
      .maybeSingle();

    if (existingError) {
      throw new Error('Failed to check existing keys');
    }

    if (existingKey) {
      // Update existing key
      const { error: updateError } = await supabase
        .from('user_ai_provider_keys')
        .update({ 
          encrypted_api_key: encryptedApiKey,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingKey.id);

      if (updateError) {
        throw new Error('Failed to update API key');
      }
    } else {
      // Insert new key
      const { error: insertError } = await supabase
        .from('user_ai_provider_keys')
        .insert({
          user_id: user.id,
          ai_provider_id: providerId,
          encrypted_api_key: encryptedApiKey
        });

      if (insertError) {
        throw new Error('Failed to save API key');
      }
    }

    // Log the security event
    await supabase
      .from('security_events')
      .insert({
        user_id: user.id,
        event_type: 'API_KEY_UPDATE',
        event_data: {
          provider_id: providerId,
          provider_name: provider.name,
          action: existingKey ? 'updated' : 'created'
        }
      });

    console.log(`API key ${existingKey ? 'updated' : 'created'} for provider ${provider.name} by user ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `API key ${existingKey ? 'updated' : 'saved'} successfully`,
        provider: provider.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('API key encryption error:', error);
    
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