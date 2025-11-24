import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the requesting user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user is a parent
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role, is_approved')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'parent' || !profile.is_approved) {
      return new Response(JSON.stringify({ error: 'Not authorized to create child accounts' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, fullName } = await req.json()

    if (!email || !fullName) {
      return new Response(JSON.stringify({ error: 'Email and full name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user already exists
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    let childUserId: string

    if (existingProfile) {
      // User exists, check if they're already a child
      if (existingProfile.role !== 'child') {
        return new Response(JSON.stringify({ error: 'This user is not registered as a child account.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      childUserId = existingProfile.user_id
    } else {
      // Create new child account
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
      
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'child'
        }
      })

      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      childUserId = authData.user.id

      // Create profile for the new child user
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          user_id: childUserId,
          email: email,
          full_name: fullName,
          role: 'child',
          is_approved: true
        })

      if (profileError) {
        return new Response(JSON.stringify({ error: `Failed to create profile: ${profileError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Check if relationship already exists
    const { data: existingRelationship } = await supabaseClient
      .from('parent_child_relationships')
      .select('id')
      .eq('parent_id', user.id)
      .eq('child_id', childUserId)
      .maybeSingle()

    if (existingRelationship) {
      return new Response(JSON.stringify({ error: 'This child is already associated with your account.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create parent-child relationship
    const { error: relationshipError } = await supabaseClient
      .from('parent_child_relationships')
      .insert({
        parent_id: user.id,
        child_id: childUserId
      })

    if (relationshipError) {
      return new Response(JSON.stringify({ error: relationshipError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Child account created and linked successfully',
      childUserId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})