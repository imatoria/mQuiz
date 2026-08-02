import { useState, useEffect, useCallback } from 'react';
import { User, Session, UserProfile } from '@/types/auth';
import { authService, UserSession } from '@/services/auth/authService';
import { dbService } from '@/services/db';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await dbService.getProvider().query('SELECT * FROM profiles WHERE user_id = ? LIMIT 1', [userId]);

      if (error) {
        console.error('Error loading profile:', error);
        setProfile(null);
      } else if (data && data.length > 0) {
        // SQLite stores boolean as 0/1 usually, so ensure boolean cast
        const p = { ...data[0] };
        if (typeof p.is_approved === 'number') {
           p.is_approved = p.is_approved === 1;
        }
        setProfile(p as UserProfile);
      } else {
        const sessionUser = authService.getCurrentUser();
        if (sessionUser && (sessionUser.id === userId || sessionUser.email)) {
          const fallbackProfile: UserProfile = {
            id: userId,
            user_id: userId,
            full_name: sessionUser.fullName || 'User',
            email: sessionUser.email,
            role: sessionUser.role || 'student',
            is_approved: true,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          dbService.createProfile(fallbackProfile);
          setProfile(fallbackProfile);
        } else {
          setProfile(null);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    const handleAuthChange = (currentUser: UserSession | null) => {
      if (!isSubscribed) return;
      
      if (currentUser) {
        // Mock Session/User objects based on UserSession
        const sessionMock = { access_token: 'mock-token', token_type: 'bearer', user: { id: currentUser.id, email: currentUser.email } } as any;
        const userMock = { id: currentUser.id, email: currentUser.email } as any;
        
        setSession(sessionMock);
        setUser(userMock);
        loadUserProfile(currentUser.id);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    const unsubscribe = authService.subscribe(handleAuthChange);
    
    // Initial load
    handleAuthChange(authService.getCurrentUser());

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [loadUserProfile]);

  const signOut = async () => {
    try {
      await authService.logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return { error: 'No user or profile found' };

    try {
      const entries = Object.entries(updates);
      if (entries.length === 0) return { data: profile, error: null };
      
      const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
      const values = entries.map(([, val]) => val);
      
      const { error } = await dbService.getProvider().execute(
        `UPDATE profiles SET ${setClause} WHERE user_id = ?`,
        [...values, user.id]
      );

      if (error) throw error;

      const updatedProfile = { ...profile, ...updates };
      if (updatedProfile.full_name) {
        authService.updateSessionProfile(updatedProfile.full_name);
      }
      setProfile(updatedProfile);
      return { data: updatedProfile, error: null };
    } catch (error: any) {
      console.error('Silenced Error:', error);
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