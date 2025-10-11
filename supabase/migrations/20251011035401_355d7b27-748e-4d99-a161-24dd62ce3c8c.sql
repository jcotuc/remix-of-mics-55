-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  incidente_id UUID REFERENCES public.incidentes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leido BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla de solicitudes de cambio
CREATE TABLE IF NOT EXISTS public.solicitudes_cambio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID REFERENCES public.incidentes(id) ON DELETE CASCADE NOT NULL,
  tipo_cambio TEXT NOT NULL,
  tecnico_solicitante TEXT NOT NULL,
  estado TEXT DEFAULT 'pendiente',
  justificacion TEXT NOT NULL,
  fotos_urls TEXT[],
  aprobado_por UUID,
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  observaciones_aprobacion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla de solicitudes de repuestos
CREATE TABLE IF NOT EXISTS public.solicitudes_repuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID REFERENCES public.incidentes(id) ON DELETE CASCADE NOT NULL,
  tecnico_solicitante TEXT NOT NULL,
  estado TEXT DEFAULT 'pendiente',
  repuestos JSONB NOT NULL,
  notas TEXT,
  entregado_por TEXT,
  fecha_entrega TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla de diagnósticos
CREATE TABLE IF NOT EXISTS public.diagnosticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID REFERENCES public.incidentes(id) ON DELETE CASCADE NOT NULL,
  tecnico_codigo TEXT NOT NULL,
  digitador_codigo TEXT,
  fallas TEXT[] NOT NULL,
  causas TEXT[] NOT NULL,
  repuestos_utilizados JSONB,
  recomendaciones TEXT,
  resolucion TEXT,
  fotos_urls TEXT[],
  accesorios TEXT,
  tiempo_estimado TEXT,
  costo_estimado NUMERIC,
  estado TEXT DEFAULT 'borrador',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_cambio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_repuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosticos ENABLE ROW LEVEL SECURITY;

-- RLS Policies para notificaciones
CREATE POLICY "Users can view their own notifications"
ON public.notificaciones FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notificaciones FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.notificaciones FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies para solicitudes_cambio
CREATE POLICY "Technicians and managers can view change requests"
ON public.solicitudes_cambio FOR SELECT
USING (
  has_role(auth.uid(), 'tecnico') OR 
  has_role(auth.uid(), 'jefe_taller') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians can create change requests"
ON public.solicitudes_cambio FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'tecnico') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Managers can update change requests"
ON public.solicitudes_cambio FOR UPDATE
USING (
  has_role(auth.uid(), 'jefe_taller') OR 
  has_role(auth.uid(), 'admin')
);

-- RLS Policies para solicitudes_repuestos
CREATE POLICY "All authenticated can view parts requests"
ON public.solicitudes_repuestos FOR SELECT
USING (true);

CREATE POLICY "Technicians can create parts requests"
ON public.solicitudes_repuestos FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'tecnico') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Warehouse and technicians can update parts requests"
ON public.solicitudes_repuestos FOR UPDATE
USING (
  has_role(auth.uid(), 'bodega') OR 
  has_role(auth.uid(), 'tecnico') OR 
  has_role(auth.uid(), 'admin')
);

-- RLS Policies para diagnosticos
CREATE POLICY "All authenticated can view diagnostics"
ON public.diagnosticos FOR SELECT
USING (true);

CREATE POLICY "Technicians and digitadores can create diagnostics"
ON public.diagnosticos FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'tecnico') OR 
  has_role(auth.uid(), 'digitador') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and digitadores can update diagnostics"
ON public.diagnosticos FOR UPDATE
USING (
  has_role(auth.uid(), 'tecnico') OR 
  has_role(auth.uid(), 'digitador') OR 
  has_role(auth.uid(), 'admin')
);

-- Triggers para updated_at
CREATE TRIGGER update_notificaciones_updated_at
BEFORE UPDATE ON public.notificaciones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solicitudes_cambio_updated_at
BEFORE UPDATE ON public.solicitudes_cambio
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solicitudes_repuestos_updated_at
BEFORE UPDATE ON public.solicitudes_repuestos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_diagnosticos_updated_at
BEFORE UPDATE ON public.diagnosticos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();