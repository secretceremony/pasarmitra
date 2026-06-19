import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/use-auth-store';
import { UserRole } from '../features/auth/types/auth.types';

const AuthContext = createContext({});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { setUser, setSession, setLoading, setError } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    
    // Listen for changes on auth state (logged in, signed out, etc.)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setSession({ user: { id: firebaseUser.uid, email: firebaseUser.email } });
          
          // Fetch the profile from the "profiles" collection in Firestore
          const profileDoc = await getDoc(doc(db, 'profiles', firebaseUser.uid));
          
          if (profileDoc.exists()) {
            setUser(profileDoc.data() as any);
          } else {
            // Fallback for new signups where profile might not be ready yet
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: UserRole.UMKM,
              is_verified: firebaseUser.emailVerified,
              created_at: new Date().toISOString(),
            });
          }
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication error');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [setUser, setSession, setLoading, setError]);

  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

