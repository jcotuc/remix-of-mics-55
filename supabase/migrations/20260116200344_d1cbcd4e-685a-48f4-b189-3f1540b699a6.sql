-- Tabla para programar conteos cíclicos
CREATE TABLE public.conteos_programados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_servicio_id UUID NOT NULL REFERENCES public.centros_servicio(id),
  ubicacion TEXT NOT NULL,
  frecuencia TEXT CHECK (frecuencia IN ('diario', 'semanal', 'quincenal', 'mensual')) DEFAULT 'mensual',
  proximo_conteo DATE,
  clasificacion_abc TEXT CHECK (clasificacion_abc IN ('A', 'B', 'C')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agregar columnas a inventario_ciclico
ALTER TABLE public.inventario_ciclico 
ADD COLUMN IF NOT EXISTS supervisor_asignador UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS auxiliar_asignado UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS fecha_programada DATE,
ADD COLUMN IF NOT EXISTS tipo_conteo TEXT CHECK (tipo_conteo IN ('primer_conteo', 'reconteo', 'verificacion')) DEFAULT 'primer_conteo',
ADD COLUMN IF NOT EXISTS requiere_reconteo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reconteo_id UUID REFERENCES public.inventario_ciclico(id),
ADD COLUMN IF NOT EXISTS aprobado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS items_contados INTEGER DEFAULT 0;

-- Agregar columnas a inventario_ciclico_detalle
ALTER TABLE public.inventario_ciclico_detalle 
ADD COLUMN IF NOT EXISTS contado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS fecha_conteo TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS metodo_conteo TEXT CHECK (metodo_conteo IN ('manual', 'escaneo')) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS requiere_aprobacion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS aprobado BOOLEAN,
ADD COLUMN IF NOT EXISTS motivo_diferencia TEXT;

-- Enable RLS
ALTER TABLE public.conteos_programados ENABLE ROW LEVEL SECURITY;

-- Policies for conteos_programados
CREATE POLICY "Usuarios autenticados pueden ver conteos programados"
ON public.conteos_programados FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Supervisores pueden crear conteos programados"
ON public.conteos_programados FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Supervisores pueden actualizar conteos programados"
ON public.conteos_programados FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Supervisores pueden eliminar conteos programados"
ON public.conteos_programados FOR DELETE
TO authenticated
USING (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_conteos_programados_centro ON public.conteos_programados(centro_servicio_id);
CREATE INDEX IF NOT EXISTS idx_conteos_programados_proximo ON public.conteos_programados(proximo_conteo);
CREATE INDEX IF NOT EXISTS idx_inventario_ciclico_auxiliar ON public.inventario_ciclico(auxiliar_asignado);
CREATE INDEX IF NOT EXISTS idx_inventario_ciclico_estado ON public.inventario_ciclico(estado);