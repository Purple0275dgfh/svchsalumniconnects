-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'treasurer', 'alumni');

-- Create enum for batch years
CREATE TYPE public.batch_year AS ENUM (
  '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999',
  '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009',
  '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019',
  '2020', '2021', '2022', '2023', '2024', '2025'
);

-- Profiles table for alumni information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  batch_year batch_year NOT NULL,
  phone TEXT,
  location TEXT,
  occupation TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Donations table
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  payment_method TEXT,
  transaction_id TEXT,
  receipt_url TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Event RSVPs table
CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'attending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Photos table for gallery
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  batch_year batch_year,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Roles are viewable by everyone"
ON public.user_roles FOR SELECT
USING (true);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for donations
CREATE POLICY "Verified donations are viewable by everyone"
ON public.donations FOR SELECT
USING (verified = true OR donor_id = auth.uid());

CREATE POLICY "Users can create donations"
ON public.donations FOR INSERT
WITH CHECK (auth.uid() = donor_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins and treasurers can update donations"
ON public.donations FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'treasurer'));

-- RLS Policies for events
CREATE POLICY "Events are viewable by everyone"
ON public.events FOR SELECT
USING (true);

CREATE POLICY "Admins can manage events"
ON public.events FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for event_rsvps
CREATE POLICY "RSVPs are viewable by event attendees"
ON public.event_rsvps FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own RSVPs"
ON public.event_rsvps FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for photos
CREATE POLICY "Photos are viewable by everyone"
ON public.photos FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can upload photos"
ON public.photos FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Admins can manage photos"
ON public.photos FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own photos"
ON public.photos FOR DELETE
USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, batch_year)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Alumni Member'),
    COALESCE((NEW.raw_user_meta_data->>'batch_year')::batch_year, '2000')
  );
  
  -- Assign default alumni role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'alumni');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();