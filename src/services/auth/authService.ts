import { dbService } from '../db';

export interface UserSession {
  id: string;
  email: string;
  role: string;
  fullName: string;
}

const AUTH_STORAGE_KEY = 'mquiz_auth_session';

class AuthService {
  private currentSession: UserSession | null = null;

  constructor() {
    this.loadSession();
  }

  private loadSession() {
    try {
      const data = localStorage.getItem(AUTH_STORAGE_KEY);
      if (data) {
        this.currentSession = JSON.parse(data);
      } else {
        // Default admin session
        this.currentSession = {
          id: 'usr-admin-001',
          email: 'admin@mquiz.com',
          role: 'admin',
          fullName: 'Administrator'
        };
        this.saveSession();
      }
    } catch (e) {
      console.warn('[AuthService] Failed loading session:', e);
    }
  }

  private saveSession() {
    if (this.currentSession) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentSession));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  getCurrentUser(): UserSession | null {
    return this.currentSession;
  }

  async login(email: string): Promise<{ user: UserSession | null; error: Error | null }> {
    const { data: profiles } = await dbService.getProfiles();
    const match = profiles?.find((p: any) => p.email === email);
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
    return { user: null, error: new Error('User not found') };
  }

  async logout() {
    this.currentSession = null;
    this.saveSession();
  }
}

export const authService = new AuthService();
