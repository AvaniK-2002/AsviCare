import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getAuthService } from '../services/authService';
import type { UserProfile, Clinic } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  userId: string | null;
  session: Session | null;
  profile: UserProfile | null;
  clinic: Clinic | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signup: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [authService, setAuthService] = useState<any>(null);

  useEffect(() => {
    getAuthService().then(setAuthService);
  }, []);

  const fetchUserProfile = async (user: User) => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        clinics (*)
      `)
      .eq('auth_user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    setProfile(data);
    setClinic(data.clinics);
    return data;
  };

  useEffect(() => {
    if (!authService) return;

    // Get initial session
    authService.getSession().then(async ({ session, error }: any) => {
      if (error) {
        console.error('Error getting session:', error);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setProfile(null);
          setClinic(null);
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (_event: string, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setProfile(null);
        setClinic(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [authService]);

  const login = async (email: string, password: string) => {
    if (!authService) return { error: { message: 'Auth service not loaded' } };
    const { user, session, error } = await authService.signIn(email, password);
    if (!error && user) {
      setUser(user);
      setSession(session);
      await fetchUserProfile(user);
    }
    return { error };
  };

  const signup = async (email: string, password: string) => {
    if (!authService) return { error: { message: 'Auth service not loaded' } };
    const { user, session, error } = await authService.signUp(email, password);
    if (!error && user) {
      setUser(user);
      setSession(session);
      await fetchUserProfile(user);
    }
    return { error };
  };

  const logout = async () => {
    if (!authService) return { error: { message: 'Auth service not loaded' } };
    const { error } = await authService.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setClinic(null);
    }
    return { error };
  };

  const value: AuthContextType = {
    user,
    userId: user?.id || null,
    session,
    profile,
    clinic,
    loading,
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};