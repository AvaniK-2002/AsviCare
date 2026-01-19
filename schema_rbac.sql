-- Clinics table - multi-user clinic support
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- User profiles table - RBAC support
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gynecologist', 'general_physician', 'receptionist')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialization TEXT, -- For doctors (deprecated, use role)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(auth_user_id),
  UNIQUE(email)
);

-- Audit logs table - track all user actions
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- e.g., 'create_patient', 'update_visit', 'delete_expense'
  entity_type TEXT NOT NULL CHECK (entity_type IN ('patient', 'visit', 'expense', 'appointment', 'user', 'clinic')),
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update existing tables to use clinic_id instead of user_id
ALTER TABLE patients ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE patients ADD COLUMN created_by UUID REFERENCES user_profiles(id);
ALTER TABLE patients ADD COLUMN specialization TEXT CHECK (specialization IN ('general', 'gynecology'));
UPDATE patients SET clinic_id = (SELECT clinic_id FROM user_profiles WHERE user_profiles.id = patients.user_id::uuid);
UPDATE patients SET created_by = user_id::uuid;
UPDATE patients SET specialization = CASE 
  WHEN (SELECT role FROM user_profiles WHERE user_profiles.id = patients.user_id::uuid) = 'gynecologist' THEN 'gynecology'
  ELSE 'general'
END;
ALTER TABLE patients DROP COLUMN user_id;
ALTER TABLE patients ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE patients ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE visits ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE visits ADD COLUMN created_by UUID REFERENCES user_profiles(id);
UPDATE visits SET clinic_id = (SELECT clinic_id FROM user_profiles WHERE user_profiles.id = visits.user_id::uuid);
UPDATE visits SET created_by = user_id::uuid;
ALTER TABLE visits DROP COLUMN user_id;
ALTER TABLE visits ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE visits ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE expenses ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD COLUMN created_by UUID REFERENCES user_profiles(id);
UPDATE expenses SET clinic_id = (SELECT clinic_id FROM user_profiles WHERE user_profiles.id = expenses.user_id::uuid);
UPDATE expenses SET created_by = user_id::uuid;
ALTER TABLE expenses DROP COLUMN user_id;
ALTER TABLE expenses ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE appointments ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE appointments ADD COLUMN created_by UUID REFERENCES user_profiles(id);
ALTER TABLE appointments ADD COLUMN assigned_to UUID REFERENCES user_profiles(id);
UPDATE appointments SET clinic_id = (SELECT clinic_id FROM user_profiles WHERE user_profiles.id = appointments.user_id::uuid);
UPDATE appointments SET created_by = user_id::uuid;
ALTER TABLE appointments DROP COLUMN user_id;
ALTER TABLE appointments ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE prescription_templates ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE prescription_templates ADD COLUMN created_by UUID REFERENCES user_profiles(id);
UPDATE prescription_templates SET clinic_id = (SELECT clinic_id FROM user_profiles WHERE user_profiles.id = prescription_templates.user_id::uuid);
UPDATE prescription_templates SET created_by = user_id::uuid;
ALTER TABLE prescription_templates DROP COLUMN user_id;
ALTER TABLE prescription_templates ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE prescription_templates ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE invoices ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN created_by UUID REFERENCES user_profiles(id);
UPDATE invoices SET clinic_id = (SELECT clinic_id FROM user_profiles WHERE user_profiles.id = invoices.user_id::uuid);
UPDATE invoices SET created_by = user_id::uuid;
ALTER TABLE invoices DROP COLUMN user_id;
ALTER TABLE invoices ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN created_by SET NOT NULL;

-- Create indexes for the new columns
CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX idx_patients_created_by ON patients(created_by);
CREATE INDEX idx_visits_clinic_id ON visits(clinic_id);
CREATE INDEX idx_visits_created_by ON visits(created_by);
CREATE INDEX idx_expenses_clinic_id ON expenses(clinic_id);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX idx_appointments_created_by ON appointments(created_by);
CREATE INDEX idx_appointments_assigned_to ON appointments(assigned_to);
CREATE INDEX idx_prescription_templates_clinic_id ON prescription_templates(clinic_id);
CREATE INDEX idx_prescription_templates_created_by ON prescription_templates(created_by);
CREATE INDEX idx_invoices_clinic_id ON invoices(clinic_id);
CREATE INDEX idx_invoices_created_by ON invoices(created_by);
CREATE INDEX idx_user_profiles_clinic_id ON user_profiles(clinic_id);
CREATE INDEX idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);