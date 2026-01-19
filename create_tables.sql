-- Create tables for ClinicTrack
-- Run this first in Supabase SQL Editor

-- User profiles table for clinic association
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id TEXT NOT NULL,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  doctortype TEXT NOT NULL CHECK (doctortype IN ('GP', 'GYNO')),
  photo_url TEXT,
  lmpDate TEXT,
  gravida INTEGER,
  para INTEGER,
  address TEXT,
  allergies TEXT,
  bloodgroup TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL
);

CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctortype TEXT NOT NULL CHECK (doctortype IN ('GP', 'GYNO')),
  note TEXT NOT NULL,
  fee NUMERIC NOT NULL,
  nextVisit TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  note TEXT,
  date DATE NOT NULL,
  doctortype TEXT NOT NULL CHECK (doctortype IN ('GP', 'GYNO')),
  user_id TEXT NOT NULL
);

-- Appointments table for scheduling
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  doctortype TEXT NOT NULL CHECK (doctortype IN ('GP', 'GYNO')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prescription templates
CREATE TABLE prescription_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prescriptions
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  template_id UUID REFERENCES prescription_templates(id),
  content TEXT NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices for billing
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_ids UUID[] NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'overdue')),
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL
);

-- Reminders for appointments
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sms', 'email')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_doctor_type ON patients(doctortype);
CREATE INDEX idx_visits_patient_id ON visits(patient_id);
CREATE INDEX idx_visits_user_id ON visits(user_id);
CREATE INDEX idx_visits_doctor_type ON visits(doctortype);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_doctor_type ON expenses(doctortype);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_doctor_type ON appointments(doctortype);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_prescription_templates_user_id ON prescription_templates(user_id);
CREATE INDEX idx_prescriptions_visit_id ON prescriptions(visit_id);
CREATE INDEX idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_reminders_appointment_id ON reminders(appointment_id);
CREATE INDEX idx_reminders_scheduled_at ON reminders(scheduled_at);
CREATE INDEX idx_reminders_status ON reminders(status);

-- If tables already exist with UUID user_id, run these ALTER commands in Supabase SQL Editor
-- ALTER TABLE patients DROP CONSTRAINT patients_user_id_fkey;
-- ALTER TABLE visits DROP CONSTRAINT visits_user_id_fkey;
-- ALTER TABLE expenses DROP CONSTRAINT expenses_user_id_fkey;
-- ALTER TABLE patients ALTER COLUMN user_id TYPE TEXT;
-- ALTER TABLE visits ALTER COLUMN user_id TYPE TEXT;
-- ALTER TABLE expenses ALTER COLUMN user_id TYPE TEXT;