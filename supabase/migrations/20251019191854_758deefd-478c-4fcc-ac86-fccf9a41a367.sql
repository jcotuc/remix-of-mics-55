-- Crear tabla de guías de envío
CREATE TABLE IF NOT EXISTS public.guias_envio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_guia TEXT NOT NULL UNIQUE,
  
  -- Fechas
  fecha_guia TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_ingreso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_promesa_entrega TIMESTAMP WITH TIME ZONE,
  fecha_entrega TIMESTAMP WITH TIME ZONE,
  
  -- Remitente
  remitente TEXT NOT NULL DEFAULT 'ZIGO',
  direccion_remitente TEXT,
  
  -- Destinatario
  destinatario TEXT NOT NULL,
  direccion_destinatario TEXT NOT NULL,
  ciudad_destino TEXT NOT NULL,
  
  -- Información del envío
  cantidad_piezas INTEGER NOT NULL DEFAULT 1,
  peso NUMERIC(10,2),
  tarifa NUMERIC(10,2),
  
  -- Referencias
  referencia_1 TEXT,
  referencia_2 TEXT,
  
  -- Seguimiento
  estado TEXT NOT NULL DEFAULT 'pendiente',
  recibido_por TEXT,
  operador_pod TEXT,
  
  -- Incidentes asociados (pueden ser múltiples)
  incidentes_codigos TEXT[],
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_guias_envio_updated_at
  BEFORE UPDATE ON public.guias_envio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para generar número de guía automático
CREATE OR REPLACE FUNCTION public.generar_numero_guia()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ultimo_numero INTEGER;
  nuevo_codigo TEXT;
BEGIN
  -- Obtener el último número usado
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_guia FROM 'GUIA-(\d+)') AS INTEGER)), 0)
  INTO ultimo_numero
  FROM public.guias_envio
  WHERE numero_guia LIKE 'GUIA-%';
  
  -- Generar nuevo código
  nuevo_codigo := 'GUIA-' || LPAD((ultimo_numero + 1)::TEXT, 6, '0');
  
  RETURN nuevo_codigo;
END;
$$;

-- Habilitar RLS
ALTER TABLE public.guias_envio ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para logística
CREATE POLICY "Logistica puede gestionar guías"
  ON public.guias_envio
  FOR ALL
  USING (
    has_role(auth.uid(), 'logistica'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'logistica'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Índices para mejorar rendimiento
CREATE INDEX idx_guias_numero ON public.guias_envio(numero_guia);
CREATE INDEX idx_guias_estado ON public.guias_envio(estado);
CREATE INDEX idx_guias_fecha ON public.guias_envio(fecha_guia);
CREATE INDEX idx_guias_destinatario ON public.guias_envio(destinatario);