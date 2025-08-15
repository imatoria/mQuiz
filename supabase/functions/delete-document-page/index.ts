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
    const { document_id, page_number } = await req.json();
    if (!document_id || !page_number) {
      return new Response(JSON.stringify({ error: 'document_id and page_number are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User-scoped client to verify ownership via RLS
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Verify the requester owns the document
    const { data: doc, error: docErr } = await supabaseUser
      .from('documents')
      .select('id')
      .eq('id', document_id)
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Questions for this page
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('id')
      .eq('document_id', document_id)
      .eq('page_number', page_number)
      .eq('is_deleted', false);

    if (qErr) throw qErr;

    const questionIds = (questions || []).map((q: any) => q.id);

    let referencedIds: string[] = [];
    if (questionIds.length > 0) {
      const { data: refs, error: rErr } = await supabaseAdmin
        .from('question_paper_questions')
        .select('question_id')
        .in('question_id', questionIds);
      if (rErr) throw rErr;
      referencedIds = (refs || []).map((r: any) => r.question_id);
    }

    const referencedSet = new Set(referencedIds);
    const toSoftDelete = questionIds.filter((id) => referencedSet.has(id));
    const toHardDelete = questionIds.filter((id) => !referencedSet.has(id));

    let softDeleted = 0, hardDeleted = 0;

    if (toHardDelete.length > 0) {
      const { error } = await supabaseAdmin
        .from('questions')
        .delete()
        .in('id', toHardDelete);
      if (error) throw error;
      hardDeleted = toHardDelete.length;
    }

    if (toSoftDelete.length > 0) {
      const { error } = await supabaseAdmin
        .from('questions')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .in('id', toSoftDelete);
      if (error) throw error;
      softDeleted = toSoftDelete.length;
    }

    // Delete page-specific records
    const { error: delSelErr } = await supabaseAdmin
      .from('document_page_selections')
      .delete()
      .eq('document_id', document_id)
      .eq('page_number', page_number);
    if (delSelErr) throw delSelErr;

    const { error: delPageErr } = await supabaseAdmin
      .from('document_pages')
      .delete()
      .eq('document_id', document_id)
      .eq('page_number', page_number);
    if (delPageErr) throw delPageErr;

    return new Response(
      JSON.stringify({ success: true, softDeletedQuestions: softDeleted, hardDeletedQuestions: hardDeleted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
