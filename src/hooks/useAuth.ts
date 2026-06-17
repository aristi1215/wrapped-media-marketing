import { useState, useEffect } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const role = session ? await fetchRole(session.user.id) : null;
      setState({ user: session?.user ?? null, session, role, loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const role = session ? await fetchRole(session.user.id) : null;
      setState({ user: session?.user ?? null, session, role, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchRole(userId: string): Promise<UserRole> {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    return (data?.role as UserRole) ?? 'admin';
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return {
    ...state,
    signIn,
    signOut,
    isAdmin: state.role === 'admin' || state.role === null,
  };
}
