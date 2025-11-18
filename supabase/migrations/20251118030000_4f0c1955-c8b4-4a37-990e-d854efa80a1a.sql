-- Add screenshot_url column to donations table for payment proof
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS screenshot_url text;

-- Create a table for birthday wishes
CREATE TABLE IF NOT EXISTS public.birthday_wishes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  year integer NOT NULL
);

-- Enable RLS on birthday_wishes
ALTER TABLE public.birthday_wishes ENABLE ROW LEVEL SECURITY;

-- Policy to view birthday wishes
CREATE POLICY "Users can view their own birthday wishes"
ON public.birthday_wishes
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for efficient birthday queries
CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth ON public.profiles(date_of_birth);

-- Create a function to check today's birthdays
CREATE OR REPLACE FUNCTION public.get_todays_birthdays()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  batch_year batch_year
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id as user_id, full_name, batch_year
  FROM public.profiles
  WHERE EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE);
$$;