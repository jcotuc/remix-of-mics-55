-- Create auditorias_calidad table
CREATE TABLE IF NOT EXISTS public.auditorias_calidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID NOT NULL,
  fecha_auditoria TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  auditor_id UUID REFERENCES auth.users(id),
  tecnico_responsable TEXT NOT NULL,
  resultado TEXT NOT NULL CHECK (resultado IN ('aprobado', 'rechazado', 'reingreso')),
  tipo_falla TEXT,
  causa_raiz TEXT,
  proveedor_involucrado TEXT,
  observaciones TEXT,
  evidencias_urls TEXT[],
  
  -- Resultados de prueba técnica
  voltaje_medido NUMERIC,
  presion_medida NUMERIC,
  velocidad_medida NUMERIC,
  temperatura_medida NUMERIC,
  cumple_limpieza BOOLEAN DEFAULT false,
  cumple_sellado BOOLEAN DEFAULT false,
  cumple_ensamblaje BOOLEAN DEFAULT false,
  cumple_presentacion BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create defectos_calidad table
CREATE TABLE IF NOT EXISTS public.defectos_calidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auditoria_id UUID REFERENCES public.auditorias_calidad(id) ON DELETE CASCADE,
  tipo_elemento TEXT NOT NULL CHECK (tipo_elemento IN ('repuesto', 'maquina', 'herramienta')),
  codigo_elemento TEXT NOT NULL,
  descripcion_elemento TEXT,
  tipo_defecto TEXT NOT NULL,
  descripcion_defecto TEXT NOT NULL,
  frecuencia INTEGER DEFAULT 1,
  proveedor TEXT,
  gravedad TEXT CHECK (gravedad IN ('baja', 'media', 'alta', 'critica')),
  comentarios_tecnicos TEXT,
  sugerencias_mejora TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auditorias_calidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defectos_calidad ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auditorias_calidad
CREATE POLICY "Control de calidad puede gestionar auditorías"
ON public.auditorias_calidad
FOR ALL
USING (
  has_role(auth.uid(), 'control_calidad'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'control_calidad'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Otros roles pueden ver auditorías"
ON public.auditorias_calidad
FOR SELECT
USING (
  has_role(auth.uid(), 'taller'::app_role) OR
  has_role(auth.uid(), 'jefe_taller'::app_role) OR
  has_role(auth.uid(), 'bodega'::app_role) OR
  has_role(auth.uid(), 'control_calidad'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for defectos_calidad
CREATE POLICY "Control de calidad puede gestionar defectos"
ON public.defectos_calidad
FOR ALL
USING (
  has_role(auth.uid(), 'control_calidad'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'control_calidad'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Otros roles pueden ver defectos"
ON public.defectos_calidad
FOR SELECT
USING (
  has_role(auth.uid(), 'bodega'::app_role) OR
  has_role(auth.uid(), 'control_calidad'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_auditorias_calidad_updated_at
BEFORE UPDATE ON public.auditorias_calidad
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();