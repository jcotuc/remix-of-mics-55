-- Add telefono_contacto column to direcciones_envio table
ALTER TABLE public.direcciones_envio 
ADD COLUMN IF NOT EXISTS telefono_contacto text;