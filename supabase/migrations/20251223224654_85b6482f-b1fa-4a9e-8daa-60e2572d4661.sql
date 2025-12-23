-- Agregar columna tecnico_asignado_id a incidentes para referenciar directamente al user_id del técnico
ALTER TABLE public.incidentes 
ADD COLUMN tecnico_asignado_id UUID REFERENCES auth.users(id);

-- Crear índice para búsquedas rápidas por técnico asignado
CREATE INDEX idx_incidentes_tecnico_asignado_id ON public.incidentes(tecnico_asignado_id);

-- Comentario descriptivo
COMMENT ON COLUMN public.incidentes.tecnico_asignado_id IS 'UUID del técnico asignado, referencia directa a auth.users';