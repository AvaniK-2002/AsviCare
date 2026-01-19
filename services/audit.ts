import { supabase } from './supabase';
import type { AuditLog, UserProfile } from '../types';

export const auditService = {
  // Get audit logs for current clinic
  getAuditLogs: async (options?: {
    entity_type?: string;
    entity_id?: string;
    user_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> => {
    const profile = await getCurrentUserProfile();
    if (!profile) return [];

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user_profiles (
          name,
          email
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (options?.entity_type) {
      query = query.eq('entity_type', options.entity_type);
    }

    if (options?.entity_id) {
      query = query.eq('entity_id', options.entity_id);
    }

    if (options?.user_id) {
      query = query.eq('user_id', options.user_id);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get audit logs for a specific entity
  getEntityAuditLogs: async (entityType: string, entityId: string): Promise<AuditLog[]> => {
    return auditService.getAuditLogs({
      entity_type: entityType,
      entity_id: entityId
    });
  },

  // Get recent activity for dashboard
  getRecentActivity: async (limit = 20): Promise<AuditLog[]> => {
    return auditService.getAuditLogs({ limit });
  },

  // Search audit logs
  searchAuditLogs: async (searchTerm: string, options?: {
    entity_type?: string;
    limit?: number;
  }): Promise<AuditLog[]> => {
    const profile = await getCurrentUserProfile();
    if (!profile) return [];

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user_profiles (
          name,
          email
        )
      `)
      .eq('user_id', profile.id)
      .or(`action.ilike.%${searchTerm}%,entity_type.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (options?.entity_type) {
      query = query.eq('entity_type', options.entity_type);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get audit statistics
  getAuditStats: async (days = 30): Promise<{
    totalLogs: number;
    entityBreakdown: Record<string, number>;
    actionBreakdown: Record<string, number>;
    userActivity: { user_id: string; count: number; name: string }[];
  }> => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return {
        totalLogs: 0,
        entityBreakdown: {},
        actionBreakdown: {},
        userActivity: []
      };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all logs for the period
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select(`
        action,
        entity_type,
        user_id,
        user_profiles (
          name
        )
      `)
      .eq('user_id', profile.id)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const entityBreakdown: Record<string, number> = {};
    const actionBreakdown: Record<string, number> = {};
    const userActivityMap: Record<string, { count: number; name: string }> = {};

    logs?.forEach(log => {
      // Entity breakdown
      entityBreakdown[log.entity_type] = (entityBreakdown[log.entity_type] || 0) + 1;

      // Action breakdown
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;

      // User activity
      const userKey = log.user_id;
      if (!userActivityMap[userKey]) {
        userActivityMap[userKey] = {
          count: 0,
          name: (log.user_profiles as any)?.name || 'Unknown'
        };
      }
      userActivityMap[userKey].count += 1;
    });

    const userActivity = Object.entries(userActivityMap).map(([user_id, data]) => ({
      user_id,
      count: data.count,
      name: data.name
    }));

    return {
      totalLogs: logs?.length || 0,
      entityBreakdown,
      actionBreakdown,
      userActivity
    };
  },

  // Export audit logs (for admin purposes)
  exportAuditLogs: async (startDate: string, endDate: string): Promise<AuditLog[]> => {
    const profile = await getCurrentUserProfile();
    if (!profile) return [];

    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user_profiles (
          name,
          email
        )
      `)
      .eq('user_id', profile.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at');

    if (error) throw error;
    return data || [];
  }
};

// Helper function to get current user profile
const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (error) return null;
  return data as UserProfile;
};