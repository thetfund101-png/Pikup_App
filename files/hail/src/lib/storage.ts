// Web / SSR-safe session storage. Native uses storage.native.ts (SecureStore).
import type { SupportedStorage } from '@supabase/supabase-js';

const available = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const authStorage: SupportedStorage = {
  getItem: async (key) => (available() ? window.localStorage.getItem(key) : null),
  setItem: async (key, value) => {
    if (available()) window.localStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (available()) window.localStorage.removeItem(key);
  },
};
