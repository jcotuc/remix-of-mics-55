-- Crear tabla para pedidos a bodega central
CREATE TABLE public.pedidos_bodega_central (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID NOT NULL REFERENCES public.incidentes(id) ON DELETE CASCADE,
  centro_servicio_id UUID NOT NULL REFERENCES public.centros_servicio(id),
  solicitado_por UUID NOT NULL,
  repuestos JSONB NOT NULL DEFAULT '[]',
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado_jt', 'aprobado_sr', 'en_proceso', 'despachado', 'cancelado')),
  aprobado_jefe_taller_id UUID,
  fecha_aprobacion_jt TIMESTAMPTZ,
  aprobado_supervisor_id UUID,
  fecha_aprobacion_sr TIMESTAMPTZ,
  notas TEXT,
  notas_rechazo TEXT,
  dias_sin_stock INTEGER DEFAULT 0,
  convertido_cxg BOOLEAN DEFAULT false,
  fecha_convertido_cxg TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_pedidos_bodega_incidente ON public.pedidos_bodega_central(incidente_id);
CREATE INDEX idx_pedidos_bodega_centro ON public.pedidos_bodega_central(centro_servicio_id);
CREATE INDEX idx_pedidos_bodega_estado ON public.pedidos_bodega_central(estado);
CREATE INDEX idx_pedidos_bodega_created ON public.pedidos_bodega_central(created_at DESC);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_pedidos_bodega_central_updated_at
  BEFORE UPDATE ON public.pedidos_bodega_central
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.pedidos_bodega_central ENABLE ROW LEVEL SECURITY;

-- Política para lectura: usuarios autenticados pueden ver pedidos de su centro de servicio
CREATE POLICY "Usuarios pueden ver pedidos de su centro"
  ON public.pedidos_bodega_central
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
        AND p.centro_servicio_id = pedidos_bodega_central.centro_servicio_id
      )
      OR EXISTS (
        SELECT 1 FROM public.centros_supervisor cs
        WHERE cs.supervisor_id = auth.uid()
        AND cs.centro_servicio_id = pedidos_bodega_central.centro_servicio_id
      )
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gerente_centro')
      OR public.has_role(auth.uid(), 'supervisor_regional')
      OR public.has_role(auth.uid(), 'jefe_bodega')
    )
  );

-- Política para inserción: jefes de taller y técnicos pueden crear pedidos
CREATE POLICY "Jefes y técnicos pueden crear pedidos"
  ON public.pedidos_bodega_central
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'jefe_taller')
      OR public.has_role(auth.uid(), 'tecnico')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Política para actualización: según el rol pueden actualizar diferentes campos
CREATE POLICY "Usuarios autorizados pueden actualizar pedidos"
  ON public.pedidos_bodega_central
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'jefe_taller')
      OR public.has_role(auth.uid(), 'supervisor_regional')
      OR public.has_role(auth.uid(), 'jefe_bodega')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Comentarios para documentación
COMMENT ON TABLE public.pedidos_bodega_central IS 'Pedidos de repuestos a bodega central desde centros de servicio';
COMMENT ON COLUMN public.pedidos_bodega_central.estado IS 'pendiente: creado, aprobado_jt: aprobado por jefe taller, aprobado_sr: aprobado por supervisor regional, en_proceso: bodega preparando, despachado: enviado, cancelado: rechazado';
COMMENT ON COLUMN public.pedidos_bodega_central.dias_sin_stock IS 'Días transcurridos sin poder despachar. A los 8 días se puede convertir a CXG automático';
COMMENT ON COLUMN public.pedidos_bodega_central.convertido_cxg IS 'Si el pedido se convirtió a Cambio por Garantía después de 8 días sin stock';