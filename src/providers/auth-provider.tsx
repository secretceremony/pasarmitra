import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/use-auth-store';
import { UserRole } from '../features/auth/types/auth.types';

const AuthContext = createContext({});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { setUser, setSession, setLoading, setError } = useAuthStore();

  useEffect(() => {
    // Check active sessions and sets the user
    const initAuth = async () => {
      try {
        setLoading(true);
        if (!supabase.auth) {
           setLoading(false);
           return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setSession(session);
          // Fetch the profile from the "profiles" table
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser(profile);
          } else if (profileError) {
             // Fallback for new signups where profile might not be ready yet
             setUser({
                id: session.user.id,
                email: session.user.email || '',
                role: session.user.user_metadata?.role || UserRole.UMKM,
                is_verified: session.user.email_confirmed_at ? true : false,
                created_at: session.user.created_at,
             });
          }
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Authentication error');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: session.user.user_metadata?.role || UserRole.UMKM,
          is_verified: true,
          created_at: session.user.created_at,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setSession, setLoading, setError]);

  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
