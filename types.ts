
export type DoctorMode = 'GP' | 'GYNO';

export interface Patient {
  id: string;
  clinic_id: string;
  created_by: string;
  user_id: string;
  name: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  doctortype: DoctorMode;
  photo_url?: string;
  lmpDate?: string; // For Gynae mode
  gravida?: number;
  para?: number;
  address?: string;
  allergies?: string;
  bloodgroup?: string;
  notes?: string;
  created_at: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  clinic_id: string;
  created_by: string;
  doctortype: DoctorMode;
  note: string;
  fee: number;
  nextVisit?: string;
  photo_url?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  clinic_id: string;
  created_by: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  doctortype: DoctorMode;
}

export interface ClinicStats {
  todayIncome: number;
  monthlyIncome: number;
  totalExpenses: number;
  profit: number;
  patientCount: number;
}

export interface Appointment {
  id: string;
  patient_id: string;
  clinic_id: string;
  created_by: string;
  doctortype: DoctorMode;
  assigned_to?: string; // User ID of assigned doctor/receptionist
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface PrescriptionTemplate {
  id: string;
  clinic_id: string;
  created_by: string;
  name: string;
  content: string;
  created_at: string;
}

export interface Prescription {
  id: string;
  visit_id: string;
  template_id?: string;
  content: string;
  pdf_url?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  patient_id: string;
  clinic_id: string;
  created_by: string;
  visit_ids: string[];
  total_amount: number;
  status: 'paid' | 'unpaid' | 'overdue';
  pdf_url?: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  appointment_id: string;
  type: 'sms' | 'email';
  scheduled_at: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
}

export type UserRole = 'admin' | 'doctor' | 'receptionist';

export interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  created_at: string;
  owner_id: string;
}

export interface UserProfile {
  id: string;
  clinic_id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  specialization?: string; // For doctors
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: 'patient' | 'visit' | 'expense' | 'appointment' | 'user' | 'clinic';
  entity_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
