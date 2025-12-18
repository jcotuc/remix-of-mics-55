-- Add codigo_empleado column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS codigo_empleado TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_codigo_empleado ON public.profiles(codigo_empleado);