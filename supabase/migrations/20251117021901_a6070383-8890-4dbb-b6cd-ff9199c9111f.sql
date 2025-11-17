-- Update handle_new_user function to extract date_of_birth from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, batch_year, date_of_birth)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Alumni Member'),
    COALESCE((NEW.raw_user_meta_data->>'batch_year')::batch_year, '2000'),
    COALESCE((NEW.raw_user_meta_data->>'date_of_birth')::date, '2000-01-01')
  );
  
  -- Assign default alumni role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'alumni');
  
  RETURN NEW;
END;
$function$;