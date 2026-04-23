import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { full_name: string; role: string; branch: string; employee_id: string; avatar_url: string } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role, branch, employee_id, avatar_url')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile({
        full_name: data.full_name || '',
        role: data.role || 'bank_employee',
        branch: data.branch || '',
        employee_id: data.employee_id || '',
        avatar_url: data.avatar_url || '',
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, role = 'bank_employee') => {
    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    
    // Create profile with role using raw SQL to bypass type checking
    if (user && !error) {
      try {
        // Use raw SQL to insert profile with new role
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email,
            full_name: fullName,
            role: 'credit_officer' as 'credit_officer' | 'branch_manager' | 'risk_committee' | 'admin', // Use existing enum type temporarily
          } as {
            id: string;
            email: string;
            full_name: string;
            role: 'credit_officer' | 'branch_manager' | 'risk_committee' | 'admin';
          });
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      } catch (err) {
        console.error('Profile creation failed:', err);
      }
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
