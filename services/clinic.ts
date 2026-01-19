import { supabase } from './supabase';
import type { Clinic, UserProfile, UserRole } from '../types';

export const clinicService = {
  // Clinic management
  createClinic: async (clinic: Omit<Clinic, 'id' | 'created_at' | 'owner_id'>): Promise<Clinic> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('clinics')
      .insert({
        ...clinic,
        owner_id: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as Clinic;
  },

  getClinic: async (clinicId: string): Promise<Clinic | null> => {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', clinicId)
      .single();

    if (error) return null;
    return data as Clinic;
  },

  updateClinic: async (clinicId: string, updates: Partial<Clinic>): Promise<Clinic> => {
    const { data, error } = await supabase
      .from('clinics')
      .update(updates)
      .eq('id', clinicId)
      .select()
      .single();

    if (error) throw error;
    return data as Clinic;
  },

  // User profile management
  createUserProfile: async (profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> => {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        ...profile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  },

  getUserProfiles: async (clinicId: string): Promise<UserProfile[]> => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  updateUserProfile: async (profileId: string, updates: Partial<UserProfile>): Promise<UserProfile> => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  },

  deleteUserProfile: async (profileId: string): Promise<void> => {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', profileId);

    if (error) throw error;
  },

  // Get current user's profile
  getCurrentUserProfile: async (): Promise<UserProfile | null> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (error) return null;
    return data as UserProfile;
  },

  // Role-based access control helpers
  hasPermission: (userRole: UserRole, requiredRoles: UserRole[]): boolean => {
    return requiredRoles.includes(userRole);
  },

  canManageUsers: (userRole: UserRole): boolean => {
    return userRole === 'admin';
  },

  canAccessPatientData: (userRole: UserRole): boolean => {
    return ['admin', 'gynecologist', 'general_physician', 'receptionist'].includes(userRole);
  },

  canModifyPatientData: (userRole: UserRole): boolean => {
    return ['admin', 'gynecologist', 'general_physician'].includes(userRole);
  },

  canDeleteData: (userRole: UserRole): boolean => {
    return userRole === 'admin';
  },

  // Clinic membership check
  isInClinic: async (userId: string, clinicId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', userId)
      .eq('clinic_id', clinicId)
      .single();

    return !error && !!data;
  },

  // Get clinic members
  getClinicMembers: async (clinicId: string): Promise<UserProfile[]> => {
    return clinicService.getUserProfiles(clinicId);
  }
};