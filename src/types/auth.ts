export interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  created_at?: string;
}

export interface Session {
  user: User;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: 'admin' | 'teacher' | 'student';
  is_approved: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
