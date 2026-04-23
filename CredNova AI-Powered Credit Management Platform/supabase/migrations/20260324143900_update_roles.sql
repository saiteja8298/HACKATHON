-- =============================================
-- Update user roles for CredNova
-- =============================================

-- First, create new enum type
CREATE TYPE public.app_role_new AS ENUM ('bank_employee', 'normal_user', 'admin');

-- Update existing profiles to use new roles (default existing users to bank_employee)
UPDATE public.profiles 
SET role = 'bank_employee'::app_role_new 
WHERE role IN ('credit_officer', 'branch_manager', 'risk_committee');

-- Update user_roles table with new roles
UPDATE public.user_roles 
SET role = 'bank_employee'::app_role_new 
WHERE role IN ('credit_officer', 'branch_manager', 'risk_committee');

-- Drop old constraints and policies
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;

-- Drop and recreate the enum type
DROP TYPE IF EXISTS public.app_role CASCADE;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Create RPC function for user profile creation
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  email_param TEXT,
  full_name_param TEXT,
  role_param TEXT DEFAULT 'bank_employee'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (user_id, email_param, full_name_param, role_param::app_role);
  
  -- Insert role mapping
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id, role_param::app_role);
END;
$$;

-- Update role-based policies for assessments
DROP POLICY IF EXISTS "Users can view own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users can insert assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users can update own assessments" ON public.assessments;

-- Create policy for normal users to only view their own assessments
CREATE POLICY "Normal users can view own assessments only"
  ON public.assessments FOR SELECT
  USING (
    auth.uid() = created_by AND 
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'normal_user'
    )
  );

-- Create policy for bank employees to view all assessments
CREATE POLICY "Bank employees can view all assessments"
  ON public.assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('bank_employee', 'admin')
    )
  );

-- Create policy for bank employees to create assessments
CREATE POLICY "Bank employees can insert assessments"
  ON public.assessments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('bank_employee', 'admin')
    )
  );

-- Create policy for bank employees to update assessments
CREATE POLICY "Bank employees can update assessments"
  ON public.assessments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('bank_employee', 'admin')
    )
  );

-- Update storage policies for different roles
CREATE POLICY "Bank employees can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'crednova-documents' AND
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('bank_employee', 'admin')
    )
  );

CREATE POLICY "All authenticated users can view documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'crednova-documents');
