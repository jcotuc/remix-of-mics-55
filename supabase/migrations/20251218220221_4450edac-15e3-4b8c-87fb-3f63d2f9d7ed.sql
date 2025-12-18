-- Agregar campo numero_bodega y supervisor_id a centros_servicio
ALTER TABLE public.centros_servicio 
ADD COLUMN numero_bodega text,
ADD COLUMN supervisor_id uuid REFERENCES public.profiles(id);

-- Crear índice para búsquedas por supervisor
CREATE INDEX idx_centros_servicio_supervisor ON public.centros_servicio(supervisor_id);

-- Agregar el rol supervisor_regional si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'supervisor_regional' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'supervisor_regional';
  END IF;
END $$;