-- Crear tabla para despieces de máquinas
CREATE TABLE public.despieces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku_maquina TEXT NOT NULL,
  codigo_producto TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  fecha_ingreso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'en_uso', 'agotado')),
  repuestos_disponibles JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.despieces ENABLE ROW LEVEL SECURITY;

-- Políticas para bodega
CREATE POLICY "Bodega puede gestionar despieces"
ON public.despieces
FOR ALL
USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_despieces_updated_at
BEFORE UPDATE ON public.despieces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejor rendimiento
CREATE INDEX idx_despieces_sku ON public.despieces(sku_maquina);
CREATE INDEX idx_despieces_estado ON public.despieces(estado);
CREATE INDEX idx_despieces_producto ON public.despieces(codigo_producto);