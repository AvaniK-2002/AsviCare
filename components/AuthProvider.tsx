import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getAuthService } from '../services/authService';
import type { UserProfile, Clinic } from '../types';
import { supabase } from '../services/supabase';
import { UserProfileProvider, useUserProfile } from './UserProfileContext';

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

const AuthProviderContent: React.FC<AuthProviderProps> = ({ children }) => {
  const { profile: userProfile } = useUserProfile();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [authService, setAuthService] = useState<any>(null);

  useEffect(() => {
    getAuthService().then(setAuthService);
  }, []);

  const fetchClinic = async (clinicId: string) => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', clinicId)
      .single();

    if (error) {
      console.error('Error fetching clinic:', error);
      return null;
    }

    setClinic(data);
    return data;
  };

  useEffect(() => {
    if (userProfile?.clinic_id) {
      fetchClinic(userProfile.clinic_id);
    } else {
      setClinic(null);
    }
  }, [userProfile]);

  useEffect(() => {
    if (!authService) return;

    // Get initial session
    authService.getSession().then(async ({ session, error }: any) => {
      if (error) {
        console.error('Error getting session:', error);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (_event: string, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
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
    }
    return { error };
  };

  const signup = async (email: string, password: string) => {
    if (!authService) return { error: { message: 'Auth service not loaded' } };
    const { user, session, error } = await authService.signUp(email, password);
    if (!error && user) {
      setUser(user);
      setSession(session);
    }
    return { error };
  };

  const logout = async () => {
    if (!authService) return { error: { message: 'Auth service not loaded' } };
    const { error } = await authService.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setClinic(null);
    }
    return { error };
  };

  const value: AuthContextType = {
    user,
    userId: user?.id || null,
    session,
    profile: userProfile as UserProfile | null, // Cast to match
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

const AuthWrapper: React.FC<AuthProviderProps> = ({ children }) => {
  const [authService, setAuthService] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    getAuthService().then(setAuthService);
  }, []);

  useEffect(() => {
    if (!authService) return;

    // Get initial session
    authService.getSession().then(async ({ session, error }: any) => {
      if (error) {
        console.error('Error getting session:', error);
      } else {
        setIsAuthenticated(!!session?.user);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (_event: string, session: Session | null) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [authService]);

  return (
    <UserProfileProvider isAuthenticated={isAuthenticated}>
      <AuthProviderContent>
        {children}
      </AuthProviderContent>
    </UserProfileProvider>
  );
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => (
  <AuthWrapper>
    {children}
  </AuthWrapper>
);