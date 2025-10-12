-- Add digitador assignment fields to diagnosticos table
ALTER TABLE public.diagnosticos
ADD COLUMN digitador_asignado text,
ADD COLUMN fecha_inicio_digitacion timestamp with time zone;

-- Add comment for clarity
COMMENT ON COLUMN public.diagnosticos.digitador_asignado IS 'Código del digitador que está trabajando este diagnóstico';
COMMENT ON COLUMN public.diagnosticos.fecha_inicio_digitacion IS 'Timestamp cuando el digitador empezó a trabajar el diagnóstico';