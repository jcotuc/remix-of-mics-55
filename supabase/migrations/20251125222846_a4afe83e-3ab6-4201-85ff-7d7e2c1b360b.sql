-- Crear tabla para verificaciones de reincidencia
CREATE TABLE public.verificaciones_reincidencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_actual_id UUID REFERENCES public.incidentes(id) ON DELETE CASCADE NOT NULL,
  incidente_anterior_id UUID REFERENCES public.incidentes(id) ON DELETE SET NULL,
  verificador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_verificacion TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Decisión
  es_reincidencia_valida BOOLEAN NOT NULL,
  aplica_reingreso BOOLEAN NOT NULL DEFAULT false,
  
  -- Justificación
  justificacion TEXT NOT NULL CHECK (LENGTH(justificacion) >= 20),
  codigo_falla_original TEXT,
  codigo_falla_actual TEXT,
  
  -- Evidencia
  fotos_urls TEXT[],
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_verificaciones_incidente_actual ON public.verificaciones_reincidencia(incidente_actual_id);
CREATE INDEX idx_verificaciones_incidente_anterior ON public.verificaciones_reincidencia(incidente_anterior_id);
CREATE INDEX idx_verificaciones_verificador ON public.verificaciones_reincidencia(verificador_id);

-- Habilitar RLS
ALTER TABLE public.verificaciones_reincidencia ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Control de calidad puede gestionar verificaciones"
ON public.verificaciones_reincidencia
FOR ALL
USING (has_role(auth.uid(), 'control_calidad'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'control_calidad'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_verificaciones_reincidencia_updated_at
BEFORE UPDATE ON public.verificaciones_reincidencia
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();