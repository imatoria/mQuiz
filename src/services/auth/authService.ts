import { dbService } from '../db';

export interface UserSession {
  id: string;
  email: string;
  role: string;
  fullName: string;
}

const AUTH_STORAGE_KEY = 'mquiz_auth_session';
type AuthListener = (user: UserSession | null) => void;

class AuthService {
  private currentSession: UserSession | null = null;
  private listeners: Set<AuthListener> = new Set();

  constructor() {
    this.loadSession();
  }

  private loadSession() {
    try {
      const data = localStorage.getItem(AUTH_STORAGE_KEY);
      if (data && data !== 'unauthenticated') {
        this.currentSession = JSON.parse(data);
      } else {
        // Unauthenticated by default
        this.currentSession = null;
      }
    } catch (e) {
      console.warn('[AuthService] Failed loading session:', e);
      this.currentSession = null;
    }
  }

  private saveSession() {
    if (this.currentSession) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentSession));
    } else {
      localStorage.setItem(AUTH_STORAGE_KEY, 'unauthenticated');
    }
    this.notifyListeners();
  }

  subscribe(listener: AuthListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.currentSession));
  }

  getCurrentUser(): UserSession | null {
    return this.currentSession;
  }

  async login(email: string): Promise<{ user: UserSession | null; error: Error | null }> {
    const { data: profiles } = await dbService.getProfiles();
    const match = profiles?.find((p: any) => p.email?.toLowerCase() === email.toLowerCase());
    
    if (match) {
      this.currentSession = {
        id: match.user_id || match.id,
        email: match.email || email,
        role: match.role || 'student',
        fullName: match.full_name || 'User'
      };
      this.saveSession();
      return { user: this.currentSession, error: null };
    }

    // Default admin fallback for initial sign in
    if (email.toLowerCase() === 'admin@mquiz.com' || email.toLowerCase() === 'admin@knowledgebuilder.com') {
      this.currentSession = {
        id: 'usr-admin-001',
        email: 'admin@mquiz.com',
        role: 'admin',
        fullName: 'Administrator'
      };
      this.saveSession();
      return { user: this.currentSession, error: null };
    }

    return { user: null, error: new Error('User email not found. Please sign up.') };
  }

  async signUp(details: { email: string; fullName: string; role: string }): Promise<{ user: UserSession | null; error: Error | null }> {
    const userId = crypto.randomUUID();
    const profile = {
      id: crypto.randomUUID(),
      user_id: userId,
      full_name: details.fullName,
      email: details.email,
      role: details.role,
      is_approved: 1,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await dbService.createProfile(profile);

    this.currentSession = {
      id: userId,
      email: details.email,
      role: details.role,
      fullName: details.fullName
    };
    this.saveSession();

    return { user: this.currentSession, error: null };
  }

  async logout() {
    this.currentSession = null;
    this.saveSession();
  }
}

export const authService = new AuthService();
