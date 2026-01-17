-- Tabla principal de listados de abastecimiento
CREATE TABLE public.listados_abastecimiento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_servicio_destino_id UUID NOT NULL REFERENCES public.centros_servicio(id),
  nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'en_picking', 'completado', 'cancelado')),
  fecha_generacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generado_por UUID REFERENCES auth.users(id),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de items en cada listado
CREATE TABLE public.listados_abastecimiento_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listado_id UUID NOT NULL REFERENCES public.listados_abastecimiento(id) ON DELETE CASCADE,
  codigo_repuesto TEXT NOT NULL,
  descripcion TEXT,
  cantidad_sugerida INTEGER NOT NULL DEFAULT 0,
  cantidad_confirmada INTEGER,
  cantidad_pickeada INTEGER DEFAULT 0,
  ubicacion_origen TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_picking', 'pickeado', 'no_disponible')),
  picker_asignado_id UUID REFERENCES auth.users(id),
  picker_asignado_at TIMESTAMP WITH TIME ZONE,
  pickeado_por UUID REFERENCES auth.users(id),
  pickeado_at TIMESTAMP WITH TIME ZONE,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de pickers asignados a cada listado
CREATE TABLE public.listados_abastecimiento_pickers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listado_id UUID NOT NULL REFERENCES public.listados_abastecimiento(id) ON DELETE CASCADE,
  picker_id UUID NOT NULL REFERENCES auth.users(id),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado', 'finalizado')),
  items_pickeados INTEGER DEFAULT 0,
  asignado_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(listado_id, picker_id)
);

-- Índices para mejor rendimiento
CREATE INDEX idx_listados_abastecimiento_centro ON public.listados_abastecimiento(centro_servicio_destino_id);
CREATE INDEX idx_listados_abastecimiento_estado ON public.listados_abastecimiento(estado);
CREATE INDEX idx_listados_items_listado ON public.listados_abastecimiento_items(listado_id);
CREATE INDEX idx_listados_items_picker ON public.listados_abastecimiento_items(picker_asignado_id);
CREATE INDEX idx_listados_items_estado ON public.listados_abastecimiento_items(estado);
CREATE INDEX idx_listados_pickers_listado ON public.listados_abastecimiento_pickers(listado_id);

-- Enable RLS
ALTER TABLE public.listados_abastecimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listados_abastecimiento_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listados_abastecimiento_pickers ENABLE ROW LEVEL SECURITY;

-- Policies para listados_abastecimiento
CREATE POLICY "Bodega puede gestionar listados abastecimiento"
ON public.listados_abastecimiento
FOR ALL
USING (has_role(auth.uid(), 'bodega') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'bodega') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuarios autenticados pueden ver listados"
ON public.listados_abastecimiento
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policies para listados_abastecimiento_items
CREATE POLICY "Bodega puede gestionar items listado"
ON public.listados_abastecimiento_items
FOR ALL
USING (has_role(auth.uid(), 'bodega') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'bodega') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuarios autenticados pueden ver items listado"
ON public.listados_abastecimiento_items
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policies para listados_abastecimiento_pickers
CREATE POLICY "Bodega puede gestionar pickers"
ON public.listados_abastecimiento_pickers
FOR ALL
USING (has_role(auth.uid(), 'bodega') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'bodega') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuarios autenticados pueden ver pickers"
ON public.listados_abastecimiento_pickers
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_listados_abastecimiento_updated_at
BEFORE UPDATE ON public.listados_abastecimiento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para liberar items después de timeout (5 minutos)
CREATE OR REPLACE FUNCTION public.liberar_items_timeout()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listados_abastecimiento_items
  SET 
    picker_asignado_id = NULL,
    picker_asignado_at = NULL,
    estado = 'pendiente'
  WHERE 
    estado = 'en_picking' 
    AND picker_asignado_at < NOW() - INTERVAL '5 minutes';
END;
$$;