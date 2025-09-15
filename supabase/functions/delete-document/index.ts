import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: 'document_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User-scoped client to verify ownership via RLS
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    // Admin client for privileged deletes
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Verify the requester owns the document
    const { data: doc, error: docErr } = await supabaseUser
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Note: Questions are no longer linked to documents via document_id
    // This function now only handles document-related data

    // Remove related records
    const deletions = [
      supabaseAdmin.from('document_page_selections').delete().eq('document_id', document_id),
      supabaseAdmin.from('document_pages').delete().eq('document_id', document_id),
      supabaseAdmin.from('document_versions').delete().eq('document_id', document_id),
      supabaseAdmin.from('document_tags').delete().eq('document_id', document_id),
      supabaseAdmin.from('document_shares').delete().eq('document_id', document_id),
      supabaseAdmin.from('book_documents').delete().eq('document_id', document_id),
    ];

    for (const p of deletions) {
      const { error } = await p;
      if (error) throw error;
    }

    // Delete the document row last
    const { error: delDocErr } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', document_id);
    if (delDocErr) throw delDocErr;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
