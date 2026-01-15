-- Fase 1: Agregar nuevos estados al ENUM status_incidente
ALTER TYPE status_incidente ADD VALUE IF NOT EXISTS 'NC Autorizada';
ALTER TYPE status_incidente ADD VALUE IF NOT EXISTS 'NC Emitida';

-- Fase 6: Crear tabla de presupuestos
CREATE TABLE IF NOT EXISTS public.presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID NOT NULL REFERENCES incidentes(id) ON DELETE CASCADE,
  repuestos JSONB DEFAULT '[]'::jsonb,
  mano_obra DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  aprobado_por TEXT,
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- Habilitar RLS
ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para presupuestos
CREATE POLICY "Usuarios autenticados pueden ver presupuestos"
ON public.presupuestos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden crear presupuestos"
ON public.presupuestos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar presupuestos"
ON public.presupuestos FOR UPDATE
TO authenticated
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_presupuestos_updated_at
BEFORE UPDATE ON public.presupuestos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para búsquedas por incidente
CREATE INDEX IF NOT EXISTS idx_presupuestos_incidente_id ON public.presupuestos(incidente_id);

-- Agregar columna para vincular incidentes de reincidencia
ALTER TABLE public.incidentes 
ADD COLUMN IF NOT EXISTS incidente_reingreso_de UUID REFERENCES incidentes(id);

-- Índice para reincidencias
CREATE INDEX IF NOT EXISTS idx_incidentes_reingreso ON public.incidentes(incidente_reingreso_de) WHERE incidente_reingreso_de IS NOT NULL;