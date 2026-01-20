-- Agregar timestamps de trazabilidad a la tabla incidentes
ALTER TABLE public.incidentes 
ADD COLUMN IF NOT EXISTS fecha_asignacion_tecnico TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fecha_inicio_diagnostico TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fecha_inicio_reparacion TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fecha_reparacion TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fecha_entrega TIMESTAMPTZ;

-- Agregar timestamp de fin de diagnóstico a la tabla diagnosticos
ALTER TABLE public.diagnosticos 
ADD COLUMN IF NOT EXISTS fecha_fin_diagnostico TIMESTAMPTZ;

-- Agregar timestamp de despacho a la tabla solicitudes_repuestos
ALTER TABLE public.solicitudes_repuestos 
ADD COLUMN IF NOT EXISTS fecha_despacho TIMESTAMPTZ;

-- Comentarios para documentación
COMMENT ON COLUMN public.incidentes.fecha_asignacion_tecnico IS 'Timestamp cuando el técnico toma el incidente de la cola FIFO';
COMMENT ON COLUMN public.incidentes.fecha_inicio_diagnostico IS 'Timestamp cuando el técnico inicia el diagnóstico';
COMMENT ON COLUMN public.incidentes.fecha_inicio_reparacion IS 'Timestamp cuando inicia la reparación (después del diagnóstico)';
COMMENT ON COLUMN public.incidentes.fecha_reparacion IS 'Timestamp cuando se completa la reparación';
COMMENT ON COLUMN public.incidentes.fecha_entrega IS 'Timestamp cuando se entrega la máquina al cliente';
COMMENT ON COLUMN public.diagnosticos.fecha_fin_diagnostico IS 'Timestamp cuando se completa el diagnóstico técnico';
COMMENT ON COLUMN public.solicitudes_repuestos.fecha_despacho IS 'Timestamp cuando bodega despacha los repuestos al técnico';