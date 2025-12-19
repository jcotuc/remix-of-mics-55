-- Agregar columna responsable_id a centros_servicio
ALTER TABLE public.centros_servicio 
ADD COLUMN responsable_id uuid REFERENCES public.profiles(user_id);

-- Poblar responsable_id automáticamente desde los jefes de taller existentes
UPDATE public.centros_servicio cs
SET responsable_id = p.user_id
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE p.centro_servicio_id = cs.id
  AND ur.role = 'jefe_taller';

-- Eliminar la columna responsable de texto (ya no se usará)
ALTER TABLE public.centros_servicio DROP COLUMN responsable;