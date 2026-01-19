import { supabase } from './supabase';
import type { AuthError, Session, User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export const signUp = async (email: string, password: string): Promise<AuthResult> => {
  console.log('Attempting signUp with email length:', email.length);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) {
    console.error('SignUp error:', error.message, 'Status:', error.status);
    console.error('Full error:', error);
  } else {
    console.log('SignUp successful');
  }
  return {
    user: data.user,
    session: data.session,
    error,
  };
};

export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  console.log('Attempting signIn with email length:', email.length);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    console.error('SignIn error:', error.message, 'Status:', error.status);
    console.error('Full error:', error);
  } else {
    console.log('SignIn successful');
  }
  return {
    user: data.user,
    session: data.session,
    error,
  };
};

export const signOut = async (): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getSession = async (): Promise<{ session: Session | null; error: AuthError | null }> => {
  const { data, error } = await supabase.auth.getSession();
  return {
    session: data.session,
    error,
  };
};

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};