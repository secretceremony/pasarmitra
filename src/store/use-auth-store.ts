import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, UserProfile } from '../features/auth/types/auth.types';

interface AuthStore extends AuthState {
  setUser: (user: UserProfile | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,
      error: null,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      logout: () => set({ user: null, session: null, error: null }),
    }),
    {
      name: 'pasarmitra-auth',
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
);
