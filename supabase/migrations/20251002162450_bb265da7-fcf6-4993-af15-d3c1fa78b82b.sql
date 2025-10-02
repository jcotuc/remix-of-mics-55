-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'mostrador', 'logistica', 'taller', 'bodega');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create embarques table for Logistica
CREATE TABLE public.embarques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_embarque TEXT NOT NULL UNIQUE,
  fecha_llegada TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transportista TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.embarques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logistica can view embarques"
ON public.embarques
FOR SELECT
USING (
  public.has_role(auth.uid(), 'logistica') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Logistica can insert embarques"
ON public.embarques
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'logistica') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Logistica can update embarques"
ON public.embarques
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'logistica') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER update_embarques_updated_at
BEFORE UPDATE ON public.embarques
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add embarque_id to incidentes table
ALTER TABLE public.incidentes
ADD COLUMN embarque_id UUID REFERENCES public.embarques(id) ON DELETE SET NULL;