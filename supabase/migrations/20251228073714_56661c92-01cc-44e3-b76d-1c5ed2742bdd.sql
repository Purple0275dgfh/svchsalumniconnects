-- Fix 1: Restrict profiles table to authenticated users only (protects PII)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix 2: Create private bucket for donation proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('donation-proofs', 'donation-proofs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS policies for donation-proofs bucket
-- Allow authenticated users to upload their own proofs
CREATE POLICY "Users can upload donation proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'donation-proofs' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins and treasurers to view all donation proofs
CREATE POLICY "Admins can view donation proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'donation-proofs' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'treasurer'::app_role))
);

-- Allow users to view their own uploaded proofs
CREATE POLICY "Users can view own donation proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'donation-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to delete donation proofs if needed
CREATE POLICY "Admins can delete donation proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'donation-proofs' AND
  has_role(auth.uid(), 'admin'::app_role)
);