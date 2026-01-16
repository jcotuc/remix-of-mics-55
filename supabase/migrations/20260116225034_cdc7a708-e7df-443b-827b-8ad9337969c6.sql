-- Add new columns to importaciones_detalle for reception tracking
ALTER TABLE public.importaciones_detalle 
ADD COLUMN IF NOT EXISTS cantidad_esperada integer,
ADD COLUMN IF NOT EXISTS cantidad_recibida integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS recibido_por uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS recibido_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'recibido', 'faltante', 'excedente', 'parcial'));

-- Update existing rows to have cantidad_esperada = cantidad
UPDATE public.importaciones_detalle SET cantidad_esperada = cantidad WHERE cantidad_esperada IS NULL;

-- Add estado column to importaciones table if not exists
ALTER TABLE public.importaciones 
ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_recepcion', 'completado', 'cancelado'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_importaciones_detalle_estado ON public.importaciones_detalle(estado);
CREATE INDEX IF NOT EXISTS idx_importaciones_detalle_importacion_estado ON public.importaciones_detalle(importacion_id, estado);