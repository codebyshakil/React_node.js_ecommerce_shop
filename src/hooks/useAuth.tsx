import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: string | null;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; blocked?: boolean; blockMessage?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const checkRoles = async (userId: string) => {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    const roles = (data || []).map((r: any) => r.role);
    setIsAdmin(roles.includes('admin'));
    // Determine primary role
    if (roles.includes('admin')) setUserRole('admin');
    else if (roles.includes('sales_manager')) setUserRole('sales_manager');
    else if (roles.includes('account_manager')) setUserRole('account_manager');
    else if (roles.includes('support_assistant')) setUserRole('support_assistant');
    else if (roles.includes('marketing_manager')) setUserRole('marketing_manager');
    else setUserRole(roles[0] || 'user');
  };

  useEffect(() => {
    let initialSessionResolved = false;
    let currentUserId: string | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const newUserId = newSession?.user?.id ?? null;

      // Skip redundant updates on tab focus (TOKEN_REFRESHED) to prevent blink
      if (initialSessionResolved && newUserId === currentUserId && newUserId !== null) {
        // Same user, just a token refresh — update session silently without triggering re-renders
        return;
      }

      currentUserId = newUserId;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        setTimeout(() => {
          checkRoles(newSession.user.id).then(() => {
            if (initialSessionResolved) {
              setLoading(false);
            }
          });
        }, 0);
      } else {
        setIsAdmin(false);
        setUserRole(null);
        if (initialSessionResolved) {
          setLoading(false);
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      initialSessionResolved = true;
      currentUserId = existingSession?.user?.id ?? null;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        checkRoles(existingSession.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    // Check if user is blocked via edge function
    if (data.user) {
      try {
        const { data: accessData, error: accessError } = await supabase.functions.invoke('check-access', {
          body: { user_id: data.user.id }
        });
        if (!accessError && accessData && !accessData.allowed) {
          // Sign out the blocked user immediately
          await supabase.auth.signOut();
          return {
            error: { message: accessData.message },
            blocked: true,
            blockMessage: accessData.message
          };
        }
      } catch (e) {
        // If check fails, allow login (fail open for now)
        console.warn('Access check failed:', e);
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, userRole, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
