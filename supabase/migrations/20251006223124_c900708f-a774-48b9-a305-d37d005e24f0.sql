-- Add RLS policies for soap_records table to protect sensitive medical data

-- Policy 1: Patients can view their own SOAP records
DROP POLICY IF EXISTS "Patients can view own soap records" ON public.soap_records;
CREATE POLICY "Patients can view own soap records"
ON public.soap_records
FOR SELECT
USING (
  patient_id IN (
    SELECT p.id
    FROM patients p
    JOIN profiles pr ON pr.id = p.profile_id
    WHERE pr.user_id = auth.uid()
  )
);

-- Policy 2: Therapists can view all SOAP records
DROP POLICY IF EXISTS "Therapists can view soap records" ON public.soap_records;
CREATE POLICY "Therapists can view soap records"
ON public.soap_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Policy 3: Therapists can create SOAP records
DROP POLICY IF EXISTS "Therapists can create soap records" ON public.soap_records;
CREATE POLICY "Therapists can create soap records"
ON public.soap_records
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Policy 4: Therapists can update unsigned SOAP records
DROP POLICY IF EXISTS "Therapists can update unsigned soap records" ON public.soap_records;
CREATE POLICY "Therapists can update unsigned soap records"
ON public.soap_records
FOR UPDATE
USING (
  signed_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- Policy 5: Only admins can delete SOAP records (for compliance/audit purposes)
DROP POLICY IF EXISTS "Admins can delete soap records" ON public.soap_records;
CREATE POLICY "Admins can delete soap records"
ON public.soap_records
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
  )
);

-- Add comment for documentation
COMMENT ON TABLE public.soap_records IS 'SOAP (Subjective, Objective, Assessment, Plan) medical records with RLS policies protecting patient privacy';