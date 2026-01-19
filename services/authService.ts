import type { AuthError, Session, User } from '@supabase/supabase-js';

// Check if Supabase is properly configured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project-id') && !supabaseAnonKey.includes('your_supabase_anon_key_here');

export const getAuthService = async () => {
  if (isSupabaseConfigured) {
    const { signIn, signUp, signOut, getSession, onAuthStateChange } = await import('./auth');
    return {
      signIn,
      signUp,
      signOut,
      getSession,
      onAuthStateChange,
    };
  } else {
    const { signIn, signUp, signOut, getSession, onAuthStateChange } = await import('./mockAuth');
    return {
      signIn,
      signUp,
      signOut,
      getSession,
      onAuthStateChange,
    };
  }
};