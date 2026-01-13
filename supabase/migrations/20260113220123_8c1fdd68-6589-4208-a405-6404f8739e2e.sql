-- Agregar campos para controlar el flujo de presupuestos en solicitudes_repuestos
ALTER TABLE public.solicitudes_repuestos 
ADD COLUMN IF NOT EXISTS tipo_resolucion TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS presupuesto_aprobado BOOLEAN DEFAULT NULL;

-- Comentarios para documentar
COMMENT ON COLUMN public.solicitudes_repuestos.tipo_resolucion IS 'Tipo de resolución del diagnóstico: Garantía, Presupuesto, etc.';
COMMENT ON COLUMN public.solicitudes_repuestos.presupuesto_aprobado IS 'NULL = no aplica, false = pendiente aprobación, true = aprobado por cliente';