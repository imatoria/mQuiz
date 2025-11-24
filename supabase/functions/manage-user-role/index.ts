import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RoleChangeRequest {
  targetUserId: string;
  newRole: string;
  reason?: string;
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

    const { targetUserId, newRole, reason } = await req.json() as RoleChangeRequest;

    // Validate input
    if (!targetUserId || !newRole) {
      throw new Error('Missing required fields');
    }

    if (!['admin', 'parent', 'child'].includes(newRole)) {
      throw new Error('Invalid role');
    }

    // Get current user's profile
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('profiles')
      .select('role, is_approved')
      .eq('user_id', user.id)
      .single();

    if (currentUserError || !currentUserProfile) {
      throw new Error('Current user profile not found');
    }

    // Check if current user is an approved admin
    if (currentUserProfile.role !== 'admin' || !currentUserProfile.is_approved) {
      throw new Error('Insufficient permissions');
    }

    // Get target user's current profile
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('id, user_id, role, email, full_name')
      .eq('user_id', targetUserId)
      .single();

    if (targetError || !targetProfile) {
      throw new Error('Target user not found');
    }

    // Additional security checks for admin role promotion
    if (newRole === 'admin' && targetProfile.role !== 'admin') {
      // Check current admin count
      const { data: adminCount, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'admin')
        .eq('is_approved', true);

      if (countError) {
        throw new Error('Failed to check admin count');
      }

      // Limit to maximum 3 approved admins
      if ((adminCount || []).length >= 3) {
        throw new Error('Maximum number of administrators reached (3)');
      }
    }

    // Prevent self-demotion from admin
    if (user.id === targetUserId && currentUserProfile.role === 'admin' && newRole !== 'admin') {
      throw new Error('Cannot demote yourself from admin role');
    }

    // Update the role using the validation function
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetProfile.id);

    if (updateError) {
      console.error('Role update error:', updateError);
      throw new Error(`Failed to update role: ${updateError.message}`);
    }

    // Log the security event
    await supabase
      .from('security_events')
      .insert({
        user_id: user.id,
        event_type: 'ROLE_CHANGE',
        event_data: {
          target_user_id: targetUserId,
          old_role: targetProfile.role,
          new_role: newRole,
          reason: reason || 'No reason provided',
          target_user_email: targetProfile.email,
          target_user_name: targetProfile.full_name
        }
      });

    console.log(`Role change successful: ${targetProfile.email} (${targetProfile.role} -> ${newRole}) by ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Role updated to ${newRole}`,
        oldRole: targetProfile.role,
        newRole: newRole
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Role management error:', error);
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