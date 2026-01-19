-- Row Level Security Setup for RBAC-enabled ClinicTrack
-- Run these commands in your Supabase SQL Editor or via CLI

-- Enable RLS on all new tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Clinics policies
-- Clinic owners can view/edit their own clinics
CREATE POLICY "Clinic owners can view own clinics" ON clinics
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Clinic owners can insert own clinics" ON clinics
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Clinic owners can update own clinics" ON clinics
    FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- User profiles policies
-- Users can view profiles in their clinic
CREATE POLICY "Users can view clinic member profiles" ON user_profiles
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

-- Users can insert profiles only for their clinic (admin only)
CREATE POLICY "Admins can create user profiles" ON user_profiles
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Users can update their own profile or admins can update any in clinic
CREATE POLICY "Users can update profiles" ON user_profiles
    FOR UPDATE USING (
        auth_user_id = auth.uid() OR
        clinic_id IN (
            SELECT clinic_id FROM user_profiles
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    ) WITH CHECK (
        auth_user_id = auth.uid() OR
        clinic_id IN (
            SELECT clinic_id FROM user_profiles
            WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Audit logs policies
-- Users can view audit logs for their clinic
CREATE POLICY "Users can view clinic audit logs" ON audit_logs
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM user_profiles
            WHERE clinic_id IN (
                SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Only system can insert audit logs (via service role or triggers)

-- Patients policies - updated for clinic-based access with specialization
-- Users can view patients in their clinic, doctors only their specialization
CREATE POLICY "Users can view clinic patients" ON patients
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        ) AND
        (
            (SELECT role FROM user_profiles WHERE auth_user_id = auth.uid()) IN ('admin', 'receptionist') OR
            specialization = CASE 
                WHEN (SELECT role FROM user_profiles WHERE auth_user_id = auth.uid()) = 'gynecologist' THEN 'gynecology'
                ELSE 'general'
            END
        )
    );

-- Users can insert patients for their clinic
CREATE POLICY "Users can insert clinic patients" ON patients
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        ) AND
        created_by IN (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        ) AND
        specialization = CASE 
            WHEN (SELECT role FROM user_profiles WHERE auth_user_id = auth.uid()) = 'gynecologist' THEN 'gynecology'
            ELSE 'general'
        END
    );

-- Users can update patients in their clinic
CREATE POLICY "Users can update clinic patients" ON patients
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        ) AND
        (
            (SELECT role FROM user_profiles WHERE auth_user_id = auth.uid()) IN ('admin', 'receptionist') OR
            specialization = CASE 
                WHEN (SELECT role FROM user_profiles WHERE auth_user_id = auth.uid()) = 'gynecologist' THEN 'gynecology'
                ELSE 'general'
            END
        )
    ) WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        ) AND
        (
            (SELECT role FROM user_profiles WHERE auth_user_id = auth.uid()) IN ('admin', 'receptionist') OR
            specialization = CASE 
                WHEN (SELECT role FROM user_profiles WHERE auth_user_id = auth.uid()) = 'gynecologist' THEN 'gynecology'
                ELSE 'general'
            END
        )
    );

-- Users can delete patients in their clinic (admin/doctor only)
CREATE POLICY "Authorized users can delete clinic patients" ON patients
    FOR DELETE USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles up
            WHERE up.auth_user_id = auth.uid() AND up.role IN ('admin', 'gynecologist', 'general_physician')
        ) AND
        (
            (SELECT role FROM user_profiles WHERE auth_user_id = auth.uid()) IN ('admin') OR
            specialization = CASE 
                WHEN (SELECT role FROM user_profiles WHERE auth_user_id = auth.uid()) = 'gynecologist' THEN 'gynecology'
                ELSE 'general'
            END
        )
    );

-- Similar policies for visits, expenses, appointments, etc.
-- Visits policies
CREATE POLICY "Users can view clinic visits" ON visits
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert clinic visits" ON visits
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        ) AND
        created_by IN (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update clinic visits" ON visits
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Authorized users can delete clinic visits" ON visits
    FOR DELETE USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles up
            WHERE up.auth_user_id = auth.uid() AND up.role IN ('admin', 'doctor')
        )
    );

-- Expenses policies
CREATE POLICY "Users can view clinic expenses" ON expenses
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert clinic expenses" ON expenses
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        ) AND
        created_by IN (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Authorized users can update clinic expenses" ON expenses
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles up
            WHERE up.auth_user_id = auth.uid() AND up.role IN ('admin', 'doctor')
        )
    );

CREATE POLICY "Admins can delete clinic expenses" ON expenses
    FOR DELETE USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles up
            WHERE up.auth_user_id = auth.uid() AND up.role = 'admin'
        )
    );

-- Appointments policies
CREATE POLICY "Users can view clinic appointments" ON appointments
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert clinic appointments" ON appointments
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        ) AND
        created_by IN (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update clinic appointments" ON appointments
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Authorized users can delete clinic appointments" ON appointments
    FOR DELETE USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles up
            WHERE up.auth_user_id = auth.uid() AND up.role IN ('admin', 'receptionist', 'doctor')
        )
    );

-- Prescription templates policies (clinic-wide)
CREATE POLICY "Users can view clinic prescription templates" ON prescription_templates
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can create prescription templates" ON prescription_templates
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        ) AND
        created_by IN (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can update own prescription templates" ON prescription_templates
    FOR UPDATE USING (
        created_by IN (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Doctors can delete own prescription templates" ON prescription_templates
    FOR DELETE USING (
        created_by IN (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

-- Invoices policies
CREATE POLICY "Users can view clinic invoices" ON invoices
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Authorized users can create invoices" ON invoices
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()
        ) AND
        created_by IN (
            SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Authorized users can update invoices" ON invoices
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM user_profiles up
            WHERE up.auth_user_id = auth.uid() AND up.role IN ('admin', 'receptionist')
        )
    );

-- Create a function to automatically create audit logs
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    user_profile_id UUID;
    action_text TEXT;
    old_vals JSONB;
    new_vals JSONB;
BEGIN
    -- Get the user profile ID
    SELECT id INTO user_profile_id
    FROM user_profiles
    WHERE auth_user_id = auth.uid();

    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_text := 'create_' || TG_TABLE_NAME;
        old_vals := NULL;
        new_vals := row_to_json(NEW)::JSONB;
    ELSIF TG_OP = 'UPDATE' THEN
        action_text := 'update_' || TG_TABLE_NAME;
        old_vals := row_to_json(OLD)::JSONB;
        new_vals := row_to_json(NEW)::JSONB;
    ELSIF TG_OP = 'DELETE' THEN
        action_text := 'delete_' || TG_TABLE_NAME;
        old_vals := row_to_json(OLD)::JSONB;
        new_vals := NULL;
    END IF;

    -- Insert audit log
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
    VALUES (user_profile_id, action_text, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), old_vals, new_vals, inet_client_addr(), current_setting('request.headers')::json->>'user-agent');

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for key tables
CREATE TRIGGER audit_patients_trigger
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_visits_trigger
    AFTER INSERT OR UPDATE OR DELETE ON visits
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_expenses_trigger
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_appointments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Storage policies remain similar but now check clinic membership
-- Update prescriptions bucket policies to work with clinic-based access
DROP POLICY IF EXISTS "Users can upload prescription images" ON storage.objects;
CREATE POLICY "Clinic users can upload prescription images" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'prescriptions' AND
    (storage.foldername(name))[1] IN (
        SELECT clinic_id::text FROM user_profiles WHERE auth_user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete own prescription images" ON storage.objects;
CREATE POLICY "Clinic users can delete prescription images" ON storage.objects FOR DELETE USING (
    bucket_id = 'prescriptions' AND
    (storage.foldername(name))[1] IN (
        SELECT clinic_id::text FROM user_profiles WHERE auth_user_id = auth.uid()
    )
);