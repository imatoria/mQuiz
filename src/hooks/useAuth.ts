import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: 'admin' | 'parent' | 'child';
  is_approved: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (userId: string) => {
    // Prevent loading if already loading or if we already have the profile for this user
    if (loading && profile?.user_id === userId) return;
    
    try {
      console.log('Loading profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        setProfile(null);
      } else if (data) {
        console.log('Profile loaded successfully:', data);
        setProfile(data as UserProfile);
      } else {
        console.log('No profile found for user');
        setProfile(null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [loading, profile?.user_id]);

  useEffect(() => {
    let isSubscribed = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isSubscribed) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isSubscribed) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Only load profile if we don't already have it or user changed
          if (!profile || profile.user_id !== session.user.id) {
            setTimeout(() => {
              if (isSubscribed) {
                loadUserProfile(session.user.id);
              }
            }, 0);
          } else {
            setLoading(false);
          }
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const signOut = async () => {
    try {
      // Clean up any stored auth state
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      // Force page reload for clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return { error: 'No user or profile found' };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data as UserProfile);
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  };

  const isAuthenticated = !!user && !!session;
  const isApproved = profile?.is_approved ?? false;
  const canAccess = isAuthenticated && (profile?.role !== 'admin' || isApproved);

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated,
    isApproved,
    canAccess,
    signOut,
    updateProfile,
    refreshProfile: () => user && loadUserProfile(user.id)
  };
};