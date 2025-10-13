-- Agregar campo para bodeguero asignado en solicitudes_repuestos
ALTER TABLE public.solicitudes_repuestos 
ADD COLUMN IF NOT EXISTS asignado_a uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS fecha_asignacion timestamp with time zone;

-- Agregar campo para tracking de repuestos individuales
CREATE TABLE IF NOT EXISTS public.repuestos_solicitud_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id uuid REFERENCES public.solicitudes_repuestos(id) ON DELETE CASCADE NOT NULL,
  codigo_repuesto text NOT NULL,
  cantidad_solicitada integer NOT NULL,
  cantidad_encontrada integer DEFAULT 0,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'encontrado', 'faltante', 'descuadre')),
  notas text,
  verificado_por uuid REFERENCES auth.users(id),
  fecha_verificacion timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.repuestos_solicitud_detalle ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para repuestos_solicitud_detalle
CREATE POLICY "Bodega puede ver detalles de repuestos"
ON public.repuestos_solicitud_detalle
FOR SELECT
USING (
  has_role(auth.uid(), 'bodega'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Bodega puede actualizar detalles de repuestos"
ON public.repuestos_solicitud_detalle
FOR UPDATE
USING (
  has_role(auth.uid(), 'bodega'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Bodega puede insertar detalles de repuestos"
ON public.repuestos_solicitud_detalle
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'bodega'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger para updated_at
CREATE TRIGGER update_repuestos_solicitud_detalle_updated_at
BEFORE UPDATE ON public.repuestos_solicitud_detalle
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();