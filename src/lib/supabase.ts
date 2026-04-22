'use client';

// Lightweight auth client that wraps our custom auth API
// Swap this out when migrating to Supabase

export interface User {
  id?: string;
  email: string;
}

interface AuthResponse {
  data?: { user: User | null };
  error: Error | null;
}

class AuthClient {
  private user: User | null = null;
  private listeners: ((event: string, session: { user: User | null }) => void)[] = [];

  async getUser(): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      this.user = data.user;
      return { data: { user: this.user }, error: null };
    } catch (error) {
      return { data: { user: null }, error: error as Error };
    }
  }

  async signInWithPassword(credentials: { email: string; password: string }): Promise<{ error: Error | null }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok) return { error: new Error(data.error || '登录失败') };
      this.user = { email: credentials.email };
      this.notifyListeners();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async signUp(credentials: { email: string; password: string }): Promise<{ error: Error | null }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok) return { error: new Error(data.error || '注册失败') };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async signOut(): Promise<{ error: Error | null }> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      this.user = null;
      this.notifyListeners();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  onAuthStateChange(callback: (event: string, session: { user: User | null }) => void): { data: { subscription: { unsubscribe: () => void } } } {
    this.listeners.push(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter(l => l !== callback);
          },
        },
      },
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l('AUTH_STATE_CHANGE', { user: this.user }));
  }
}

let _authClient: AuthClient | null = null;

export function getSupabase() {
  if (typeof window === 'undefined') return null;
  if (!_authClient) {
    _authClient = new AuthClient();
  }
  return _authClient;
}

// Export as supabase for compatibility with existing code
export const supabase = {
  auth: {
    getUser: () => getSupabase()?.getUser() || Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: (credentials: { email: string; password: string }) =>
      getSupabase()?.signInWithPassword(credentials) || Promise.resolve({ error: new Error('Not initialized') }),
    signUp: (credentials: { email: string; password: string }) =>
      getSupabase()?.signUp(credentials) || Promise.resolve({ error: new Error('Not initialized') }),
    signOut: () => getSupabase()?.signOut() || Promise.resolve({ error: new Error('Not initialized') }),
    onAuthStateChange: (callback: (event: string, session: { user: User | null }) => void) =>
      getSupabase()?.onAuthStateChange(callback) || { data: { subscription: { unsubscribe: () => {} } } },
  },
};
