-- =====================================================
-- PASO 1: Crear nueva tabla inventario
-- =====================================================

CREATE TABLE public.inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_servicio_id uuid NOT NULL REFERENCES public.centros_servicio(id) ON DELETE CASCADE,
  codigo_repuesto text NOT NULL,
  ubicacion text,
  descripcion text,
  cantidad integer NOT NULL DEFAULT 0,
  costo_unitario numeric(10,2),
  bodega text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventario_centro_codigo_unique UNIQUE(centro_servicio_id, codigo_repuesto)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_inventario_centro_servicio ON public.inventario(centro_servicio_id);
CREATE INDEX idx_inventario_codigo_repuesto ON public.inventario(codigo_repuesto);
CREATE INDEX idx_inventario_ubicacion ON public.inventario(ubicacion);

-- Trigger para updated_at
CREATE TRIGGER update_inventario_updated_at
  BEFORE UPDATE ON public.inventario
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Admin tiene acceso total
CREATE POLICY "Admin puede gestionar inventario"
  ON public.inventario
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Bodega puede gestionar todo el inventario
CREATE POLICY "Bodega puede gestionar inventario"
  ON public.inventario
  FOR ALL
  USING (has_role(auth.uid(), 'bodega'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role));

-- Técnicos solo pueden ver inventario de su centro de servicio
CREATE POLICY "Tecnicos ven inventario de su centro"
  ON public.inventario
  FOR SELECT
  USING (
    has_role(auth.uid(), 'tecnico'::app_role) AND
    centro_servicio_id = (
      SELECT centro_servicio_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Taller puede ver inventario de su centro
CREATE POLICY "Taller ve inventario de su centro"
  ON public.inventario
  FOR SELECT
  USING (
    has_role(auth.uid(), 'taller'::app_role) AND
    centro_servicio_id = (
      SELECT centro_servicio_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Jefe de taller puede ver todo el inventario
CREATE POLICY "Jefe taller ve todo inventario"
  ON public.inventario
  FOR SELECT
  USING (has_role(auth.uid(), 'jefe_taller'::app_role));

-- Mostrador puede ver inventario
CREATE POLICY "Mostrador ve inventario"
  ON public.inventario
  FOR SELECT
  USING (has_role(auth.uid(), 'mostrador'::app_role));

-- =====================================================
-- PASO 2: Limpiar datos existentes
-- =====================================================

-- Eliminar datos de stock_departamental
DELETE FROM public.stock_departamental;

-- Eliminar datos de repuestos
DELETE FROM public.repuestos;

-- =====================================================
-- PASO 3: Eliminar columnas de stock de repuestos
-- =====================================================

ALTER TABLE public.repuestos DROP COLUMN IF EXISTS stock_actual;
ALTER TABLE public.repuestos DROP COLUMN IF EXISTS ubicacion_bodega;

-- =====================================================
-- PASO 4: Eliminar tabla stock_departamental
-- =====================================================

DROP TABLE IF EXISTS public.stock_departamental CASCADE;