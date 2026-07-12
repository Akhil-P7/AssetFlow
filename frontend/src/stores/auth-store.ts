import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Employee, AuthTokens, Role } from '@/types';

interface AuthState {
  user: Employee | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;

  login: (user: Employee, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (user: Partial<Employee>) => void;
  setTokens: (tokens: AuthTokens) => void;
  hasRole: (...roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,

      login: (user, tokens) =>
        set({ user, tokens, isAuthenticated: true }),

      logout: () =>
        set({ user: null, tokens: null, isAuthenticated: false }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      setTokens: (tokens) => set({ tokens }),

      hasRole: (...roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },
    }),
    {
      name: 'assetflow-auth',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
