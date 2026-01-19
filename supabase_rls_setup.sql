-- Supabase Row Level Security (RLS) Setup for ClinicTrack
-- Run these commands in your Supabase SQL Editor or via CLI

-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for patients table
-- Allow users to view patients in their clinic
CREATE POLICY "Users can view clinic patients" ON patients
    FOR SELECT USING (auth.uid()::text IN (SELECT auth_user_id FROM user_profiles WHERE clinic_id = patients.clinic_id));

-- Allow users to insert patients in their clinic
CREATE POLICY "Users can insert clinic patients" ON patients
    FOR INSERT WITH CHECK (auth.uid()::text IN (SELECT auth_user_id FROM user_profiles WHERE clinic_id = (SELECT clinic_id FROM user_profiles WHERE auth_user_id = auth.uid()::text)));

-- Allow users to update patients in their clinic
CREATE POLICY "Users can update clinic patients" ON patients
    FOR UPDATE USING (auth.uid()::text IN (SELECT auth_user_id FROM user_profiles WHERE clinic_id = patients.clinic_id)) WITH CHECK (auth.uid()::text IN (SELECT auth_user_id FROM user_profiles WHERE clinic_id = patients.clinic_id));

-- Allow users to delete patients in their clinic
CREATE POLICY "Users can delete clinic patients" ON patients
    FOR DELETE USING (auth.uid()::text IN (SELECT auth_user_id FROM user_profiles WHERE clinic_id = patients.clinic_id));

-- Create policies for visits table
-- Allow users to view only visits for their patients
CREATE POLICY "Users can view own visits" ON visits
    FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM patients WHERE id = patient_id)
    );

-- Allow users to insert visits for their patients
CREATE POLICY "Users can insert own visits" ON visits
    FOR INSERT WITH CHECK (
        auth.uid() = (SELECT user_id FROM patients WHERE id = patient_id)
    );

-- Allow users to update their own visits
CREATE POLICY "Users can update own visits" ON visits
    FOR UPDATE USING (
        auth.uid() = (SELECT user_id FROM patients WHERE id = patient_id)
    ) WITH CHECK (
        auth.uid() = (SELECT user_id FROM patients WHERE id = patient_id)
    );

-- Allow users to delete their own visits
CREATE POLICY "Users can delete own visits" ON visits
    FOR DELETE USING (
        auth.uid() = (SELECT user_id FROM patients WHERE id = patient_id)
    );

-- Create policies for expenses table
-- Allow users to view only their own expenses
CREATE POLICY "Users can view own expenses" ON expenses
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own expenses
CREATE POLICY "Users can insert own expenses" ON expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own expenses
CREATE POLICY "Users can update own expenses" ON expenses
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own expenses
CREATE POLICY "Users can delete own expenses" ON expenses
    FOR DELETE USING (auth.uid() = user_id);

-- Create prescriptions bucket if it doesn't exist and make it public
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for prescriptions bucket
-- Allow authenticated users to upload to prescriptions bucket
CREATE POLICY "Users can upload prescription images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'prescriptions' AND auth.role() = 'authenticated');

-- Allow public access to view prescription images
CREATE POLICY "Public can view prescription images" ON storage.objects FOR SELECT USING (bucket_id = 'prescriptions');

-- Allow users to delete their own prescription images
CREATE POLICY "Users can delete own prescription images" ON storage.objects FOR DELETE USING (bucket_id = 'prescriptions' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Note: Ensure all tables have a user_id column of type uuid that references auth.users(id)
-- When inserting records, always set user_id = auth.uid()