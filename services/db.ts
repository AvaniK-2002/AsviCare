
import { Patient, Visit, Expense, DoctorMode, Appointment, CreateAppointmentForm } from '../types';
import { supabase } from './supabase';
import { getAuthService } from './authService';
import { globalUserProfile } from '../components/UserProfileContext';

console.log('DB Service initialized with supabase:', !!supabase);

// Helper to get current user profile
const getUserProfile = async (): Promise<{ id: string; clinic_id: string; auth_user_id: string; role: string } | null> => {
  if (globalUserProfile) {
    console.log('getUserProfile: Using cached profile');
    return globalUserProfile;
  }
  if (!supabase) {
    console.log('getUserProfile: Supabase not configured');
    return null;
  }
  console.log('getUserProfile: Getting user profile...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.log('getUserProfile: No user or auth error:', authError);
    return null;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, clinic_id, auth_user_id, role')
    .eq('auth_user_id', user.id)
    .single();

  if (error) {
    console.log('getUserProfile: Profile not found:', error);
    return null;
  }
  console.log('getUserProfile: Returning profile:', data);
  return data;
};

// Helper to get current user ID (for backward compatibility)
const getUserId = async (): Promise<string | null> => {
  const profile = await getUserProfile();
  return profile?.id || null;
};

export const db = {
  createPatient: async (patient: Omit<Patient, 'id' | 'clinic_id' | 'user_id' | 'created_at'>, profile: { id: string; clinic_id: string; auth_user_id: string; role: string }): Promise<Patient> => {
    if (!profile) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('patients')
      .insert({
        ...patient,
        clinic_id: profile.clinic_id,
        user_id: profile.auth_user_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data as Patient;
  },
  getPatients: async (userId: string, profile: { id: string; clinic_id: string; auth_user_id: string; role: string }, mode?: DoctorMode): Promise<Patient[]> => {
    if (!profile) return [];

    let query = supabase
      .from('patients')
      .select('*')
      .eq('user_id', userId);
    if (profile.clinic_id) {
      query = query.eq('clinic_id', profile.clinic_id);
    }
    if (mode) {
      query = query.eq('doctortype', mode);
    }
    const { data, error } = await query.order('name');
    if (error) throw error;
    return data || [];
  },
  getPatientById: async (id: string, userId: string): Promise<Patient | null> => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data as Patient;
  },
  updatePatient: async (id: string, updates: Partial<Patient>, userId: string): Promise<Patient> => {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as Patient;
  },
  deletePatient: async (id: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  },
  savePatient: async (patient: Patient, userId: string): Promise<void> => {
    console.log('db.savePatient called with patient:', patient);
    console.log('userId:', userId);
    const { error } = await supabase
      .from('patients')
      .upsert({
        ...patient,
        user_id: userId
      });
    if (error) throw error;
  },

  getVisits: async (userId: string, profile: { id: string; clinic_id: string; auth_user_id: string; role: string }, mode?: DoctorMode): Promise<Visit[]> => {
    let query = supabase
      .from('visits')
      .select('*')
      .eq('user_id', userId);
    if (mode) {
      query = query.eq('doctortype', mode);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  addVisit: async (visit: Omit<Visit, 'id' | 'created_at' | 'created_by'>, userId: string, profile: { id: string; clinic_id: string; auth_user_id: string; role: string }) => {
    if (!profile) throw new Error('User not authenticated');

    console.log('addVisit called with visit:', visit, 'userId:', userId);
    if (!supabase) {
      throw new Error('Supabase client not configured. Please check your environment variables.');
    }
    console.log('Inserting visit into database...');
    const { error } = await supabase
      .from('visits')
      .insert({
        ...visit,
        user_id: userId
      });
    if (error) {
      console.error('Failed to insert visit:', error);
      throw error;
    }
    console.log('Visit inserted successfully');
  },
  deleteVisit: async (visitId: string, userId: string) => {
    const { error } = await supabase
      .from('visits')
      .delete()
      .eq('id', visitId)
      .eq('user_id', userId);
    if (error) throw error;
  },


  getPatientVisits: (patient_id: string, userId: string, profile: { id: string; clinic_id: string; auth_user_id: string; role: string }): Promise<Visit[]> => {
    return db.getVisits(userId, profile).then(visits =>
      visits.filter(v => v.patient_id === patient_id).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );
  },
  createExpense: async (expense: Omit<Expense, 'id' | 'created_at' | 'created_by'>, userId: string, profile: { id: string; clinic_id: string; auth_user_id: string; role: string }): Promise<Expense> => {
    if (!profile) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        ...expense,
        user_id: userId
      })
      .select()
      .single();
    if (error) throw error;
    return data as Expense;
  },
  getExpenses: async (userId: string, profile: { id: string; clinic_id: string; auth_user_id: string; role: string }, mode?: DoctorMode): Promise<Expense[]> => {
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId);
    if (mode) {
      query = query.eq('doctortype', mode);
    }
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  updateExpense: async (id: string, updates: Partial<Expense>, userId: string): Promise<Expense> => {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as Expense;
  },
  deleteExpense: async (expenseId: string, userId: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  uploadPrescriptionImage: async (file: File, patient_id: string, userId: string): Promise<string> => {
    console.log('uploadPrescriptionImage called with file:', file.name, 'size:', file.size, 'patient_id:', patient_id, 'userId:', userId);
    if (!supabase) {
      throw new Error('Supabase client not configured. Please check your environment variables.');
    }
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${patient_id}/${timestamp}.${fileExt}`;
    console.log('Generated file path:', filePath);
    console.log('Starting upload to Supabase storage...');
    const { data: uploadData, error } = await supabase.storage
      .from('prescriptions')
      .upload(filePath, file);
    if (error) {
      console.error('Upload failed:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
    console.log('Upload to storage successful, data:', uploadData);
    console.log('Generating signed URL...');
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from('prescriptions')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry
    if (signedError) {
      console.error('Signed URL error:', signedError);
      throw new Error(`Signed URL generation failed: ${signedError.message}`);
    }
    console.log('Signed URL generated:', signedUrlData.signedUrl);
    return signedUrlData.signedUrl;
  },
  uploadPatientImage: async (file: File, patient_id: string, userId: string): Promise<string> => {
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${patient_id}/profile_${timestamp}.${fileExt}`;
    const { data: uploadData, error } = await supabase.storage
      .from('prescriptions')
      .upload(filePath, file);
    if (error) {
      console.error('Patient image upload failed:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
    console.log('Patient image upload successful');
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from('prescriptions')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry
    if (signedError) {
      console.error('Signed URL error:', signedError);
      throw new Error(`Signed URL generation failed: ${signedError.message}`);
    }
    return signedUrlData.signedUrl;
  },

  // Dashboard stats
  getDashboardStats: async (userId: string, mode?: DoctorMode) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    // Total patients
    let patientsQuery = supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (mode) patientsQuery = patientsQuery.eq('doctortype', mode);
    const { count: totalPatients, error: patientsError } = await patientsQuery;
    if (patientsError) throw patientsError;

    // Visits today count and sum
    let visitsTodayQuery = supabase
      .from('visits')
      .select('fee')
      .eq('user_id', userId)
      .gte('created_at', startOfToday)
      .lt('created_at', endOfToday);
    if (mode) visitsTodayQuery = visitsTodayQuery.eq('doctortype', mode);
    const { data: visitsTodayData, error: visitsTodayError } = await visitsTodayQuery;
    if (visitsTodayError) throw visitsTodayError;
    const visitsToday = visitsTodayData?.length || 0;
    const todayIncome = visitsTodayData?.reduce((sum, v) => sum + v.fee, 0) || 0;

    // Visits this week count
    let visitsWeekQuery = supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfWeek);
    if (mode) visitsWeekQuery = visitsWeekQuery.eq('doctortype', mode);
    const { count: visitsThisWeek, error: visitsWeekError } = await visitsWeekQuery;
    if (visitsWeekError) throw visitsWeekError;

    // Monthly revenue
    let monthlyRevenueQuery = supabase
      .from('visits')
      .select('fee')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth);
    if (mode) monthlyRevenueQuery = monthlyRevenueQuery.eq('doctortype', mode);
    const { data: monthlyRevenueData, error: monthlyError } = await monthlyRevenueQuery;
    if (monthlyError) throw monthlyError;
    const monthlyIncome = monthlyRevenueData?.reduce((sum, v) => sum + v.fee, 0) || 0;

    // Monthly expenses
    let monthlyExpenseQuery = supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('date', startOfMonth);
    if (mode) monthlyExpenseQuery = monthlyExpenseQuery.eq('doctortype', mode);
    const { data: monthlyExpenseData, error: monthlyExpenseError } = await monthlyExpenseQuery;
    if (monthlyExpenseError) throw monthlyExpenseError;
    const monthlyExpenses = monthlyExpenseData?.reduce((sum, e) => sum + e.amount, 0) || 0;

    // Total revenue
    let revenueQuery = supabase
      .from('visits')
      .select('fee')
      .eq('user_id', userId);
    if (mode) revenueQuery = revenueQuery.eq('doctortype', mode);
    const { data: revenueData, error: revenueError } = await revenueQuery;
    if (revenueError) throw revenueError;
    const totalRevenue = revenueData?.reduce((sum, v) => sum + v.fee, 0) || 0;

    // Total expenses
    let expenseQuery = supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId);
    if (mode) expenseQuery = expenseQuery.eq('doctortype', mode);
    const { data: expenseData, error: expenseError } = await expenseQuery;
    if (expenseError) throw expenseError;
    const totalExpenses = expenseData?.reduce((sum, e) => sum + e.amount, 0) || 0;

    // Recent activity (last 10 visits)
    let recentActivityQuery = supabase
      .from('visits')
      .select(`
        id,
        created_at,
        fee,
        doctortype,
        patients (
          name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (mode) recentActivityQuery = recentActivityQuery.eq('doctortype', mode);
    const { data: recentActivity, error: activityError } = await recentActivityQuery;
    if (activityError) throw activityError;

    return {
      patientCount: totalPatients || 0,
      visitsToday,
      visitsThisWeek: visitsThisWeek || 0,
      todayIncome,
      monthlyIncome,
      monthlyExpenses,
      totalRevenue,
      totalExpenses,
      profit: monthlyIncome - monthlyExpenses,
      recentActivity: recentActivity || []
    };
  },

  // Patient stats
  getPatientStats: async (userId: string, dateRange?: { start: string; end: string }, mode?: DoctorMode) => {
    console.log('getPatientStats called with dateRange:', dateRange, 'mode:', mode);
    console.log('userId:', userId, 'supabase:', !!supabase);
    let query = supabase
      .from('patients')
      .select('*')
      .eq('user_id', userId);

    if (mode) query = query.eq('doctortype', mode);

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);
    }

    const { data: patients, error } = await query;
    if (error) throw error;

    // Get visits to calculate active patients
    let visitsQuery = supabase
      .from('visits')
      .select('patient_id')
      .eq('user_id', userId);
    if (mode) visitsQuery = visitsQuery.eq('doctortype', mode);
    const { data: visits, error: visitsError } = await visitsQuery;
    if (visitsError) throw visitsError;

    const patientVisitCounts: Record<string, number> = {};
    visits?.forEach(v => {
      patientVisitCounts[v.patient_id] = (patientVisitCounts[v.patient_id] || 0) + 1;
    });

    const totalPatients = patients?.length || 0;
    const newPatients = patients?.filter(p => {
      const created = new Date(p.created_at);
      const now = new Date();
      return created >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    }).length || 0;

    const activePatients = Object.keys(patientVisitCounts).length;

    return {
      totalPatients,
      newPatients,
      activePatients,
      patients: patients || []
    };
  },

  // Visit trends
  getVisitTrends: async (userId: string, dateRange?: { start: string; end: string }, mode?: DoctorMode) => {
    console.log('getVisitTrends called with dateRange:', dateRange, 'mode:', mode);
    console.log('userId:', userId, 'supabase:', !!supabase);
    let query = supabase
      .from('visits')
      .select('created_at, fee')
      .eq('user_id', userId)
      .order('created_at');

    if (mode) query = query.eq('doctortype', mode);

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  },

  // Expense breakdown
  getExpenseBreakdown: async (userId: string, dateRange?: { start: string; end: string }, mode?: DoctorMode) => {
    console.log('getExpenseBreakdown called with dateRange:', dateRange, 'mode:', mode);
    console.log('userId:', userId, 'supabase:', !!supabase);
    let query = supabase
      .from('expenses')
      .select('category, amount, date')
      .eq('user_id', userId)
      .order('date');

    if (mode) query = query.eq('doctortype', mode);

    if (dateRange) {
      query = query
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
    }

    const { data, error } = await query;
    if (error) throw error;

    const categories: Record<string, number> = {};
    data?.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });

    return {
      breakdown: Object.entries(categories).map(([category, amount]) => ({ category, amount })),
      expenses: data || []
    };
  },
  resetAllData: async (userId: string, mode?: DoctorMode): Promise<void> => {
    // Delete from Supabase tables for the specified mode
    let patientsQuery = supabase
      .from('patients')
      .delete()
      .eq('user_id', userId);
    if (mode) patientsQuery = patientsQuery.eq('doctortype', mode);
    const { error: patientsError } = await patientsQuery;
    if (patientsError) throw patientsError;

    let visitsQuery = supabase
      .from('visits')
      .delete()
      .eq('user_id', userId);
    if (mode) visitsQuery = visitsQuery.eq('doctortype', mode);
    const { error: visitsError } = await visitsQuery;
    if (visitsError) throw visitsError;

    let expensesQuery = supabase
      .from('expenses')
      .delete()
      .eq('user_id', userId);
    if (mode) expensesQuery = expensesQuery.eq('doctortype', mode);
    const { error: expensesError } = await expensesQuery;
    if (expensesError) throw expensesError;

    let appointmentsQuery = supabase
      .from('appointments')
      .delete()
      .eq('user_id', userId);
    // Note: Appointments delete does not filter by doctortype
    const { error: appointmentsError } = await appointmentsQuery;
    if (appointmentsError) throw appointmentsError;

    // Note: Storage files are not deleted for simplicity
  },

  // Appointments
  getAppointments: async (userId: string, mode?: DoctorMode): Promise<Appointment[]> => {
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId);
    // Note: Appointments are not filtered by doctortype as the column may not exist
    const { data, error } = await query.order('start_time');
    if (error) throw error;
    return (data || []).map(a => ({ ...a, status: a.status || 'scheduled' }));
  },
  createAppointment: async (form: CreateAppointmentForm, userId: string, profile: { id: string; clinic_id: string; auth_user_id: string; role: string; doctortype: DoctorMode }, mode?: DoctorMode): Promise<Appointment> => {
    if (!profile) throw new Error('User not authenticated');
    if (!userId) throw new Error('User ID is required');
    if (!profile.doctortype) throw new Error('Doctor type is required');
    if (!form.start_time) throw new Error('Start time is required');
    if (!form.end_time) throw new Error('End time is required');

    const payload = {
      user_id: userId,
      patient_id: form.patient_id || null,
      title: form.title || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      notes: form.notes || null,
      doctortype: profile.doctortype
    };

    console.log("APPOINTMENT PAYLOAD:", payload);

    const { data, error } = await supabase
      .from("appointments")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    return data as Appointment;
  },
  updateAppointment: async (id: string, updates: Partial<Appointment>, userId: string, mode?: DoctorMode): Promise<Appointment> => {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as Appointment;
  },
  deleteAppointment: async (id: string, userId: string, mode?: DoctorMode): Promise<void> => {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  },

};
