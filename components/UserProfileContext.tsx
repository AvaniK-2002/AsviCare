import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

// Global cache for getUserProfile function
export let globalUserProfile: { id: string; clinic_id: string; auth_user_id: string; role: string } | null = null;

export interface UserProfile {
  id: string;
  clinic_id: string;
  auth_user_id: string;
  role: string;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refetchProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

interface UserProfileProviderProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children, isAuthenticated }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchProfile = async () => {
    if (!isAuthenticated || !supabase) {
      console.log('UserProfileProvider: Not authenticated or Supabase not configured');
      setProfile(null);
      setHasFetched(false);
      return;
    }

    if (hasFetched) {
      console.log('UserProfileProvider: Profile already fetched, skipping');
      return;
    }

    setLoading(true);
    setError(null);
    console.log('UserProfileProvider: Fetching user profile...');

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('No authenticated user');
      }

      const { data, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, clinic_id, auth_user_id, role')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(data);
      globalUserProfile = data; // Update global cache
      setHasFetched(true);
      console.log('UserProfileProvider: Profile fetched successfully:', data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('UserProfileProvider: Error fetching profile:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const refetchProfile = async () => {
    setHasFetched(false);
    await fetchProfile();
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setProfile(null);
      globalUserProfile = null; // Clear global cache
      setHasFetched(false);
      setError(null);
    }
  }, [isAuthenticated]);

  const value: UserProfileContextType = {
    profile,
    loading,
    error,
    refetchProfile,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};