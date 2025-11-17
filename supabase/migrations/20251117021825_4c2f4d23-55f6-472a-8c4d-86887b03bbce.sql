-- Add date_of_birth column to profiles table
ALTER TABLE public.profiles
ADD COLUMN date_of_birth DATE NOT NULL DEFAULT '2000-01-01';

-- Remove the default after adding the column
ALTER TABLE public.profiles
ALTER COLUMN date_of_birth DROP DEFAULT;