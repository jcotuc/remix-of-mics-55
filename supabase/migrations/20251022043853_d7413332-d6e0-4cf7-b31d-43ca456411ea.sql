-- Crear tabla para garantías manuales
CREATE TABLE public.garantias_manuales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_cliente TEXT NOT NULL,
  sku_reportado TEXT NOT NULL,
  descripcion_sku TEXT NOT NULL,
  cantidad_sku INTEGER NOT NULL DEFAULT 1,
  descripcion_problema TEXT NOT NULL,
  estatus TEXT NOT NULL DEFAULT 'pendiente_resolucion',
  comentarios_logistica TEXT,
  numero_incidente TEXT,
  fotos_urls TEXT[],
  created_by UUID REFERENCES auth.users(id),
  modified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.garantias_manuales ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Logistica y asesores pueden ver garantías"
ON public.garantias_manuales
FOR SELECT
USING (
  has_role(auth.uid(), 'logistica'::app_role) OR 
  has_role(auth.uid(), 'mostrador'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Asesores pueden crear garantías"
ON public.garantias_manuales
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'mostrador'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Logistica puede actualizar garantías"
ON public.garantias_manuales
FOR UPDATE
USING (
  has_role(auth.uid(), 'logistica'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_garantias_manuales_updated_at
BEFORE UPDATE ON public.garantias_manuales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();