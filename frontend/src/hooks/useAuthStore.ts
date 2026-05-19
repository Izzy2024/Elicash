import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantName: string;
  currency: string;
  symbol: string;
}

interface AuthState {
  user: User | null;
  role: string | null;
  tenantId: string | null;
  currency: string;
  symbol: string;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  tenantId: null,
  currency: 'USD',
  symbol: '$',
  isAuthenticated: false,
  setUser: (user) => {
    if (user) {
      localStorage.setItem('elicash_user', JSON.stringify(user));
      set({ 
        user, 
        role: user.role, 
        tenantId: user.tenantId,
        currency: user.currency || 'USD',
        symbol: user.symbol || '$',
        isAuthenticated: true 
      });
    } else {
      localStorage.removeItem('elicash_user');
      set({ 
        user: null, 
        role: null, 
        tenantId: null,
        currency: 'USD',
        symbol: '$',
        isAuthenticated: false 
      });
    }
  },
  clearUser: () => {
    localStorage.removeItem('elicash_user');
    set({ 
      user: null, 
      role: null, 
      tenantId: null,
      currency: 'USD',
      symbol: '$',
      isAuthenticated: false 
    });
  },
}));

// Initial hydration from localStorage (as cache)
if (typeof window !== 'undefined') {
  const cached = localStorage.getItem('elicash_user');
  if (cached) {
    try {
      const user = JSON.parse(cached);
      useAuthStore.getState().setUser(user);
    } catch (e) {
      localStorage.removeItem('elicash_user');
    }
  }
}
