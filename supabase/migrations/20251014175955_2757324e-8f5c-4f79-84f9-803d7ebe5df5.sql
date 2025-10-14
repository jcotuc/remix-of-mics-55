-- Tabla para asignaciones de SAC (evita que dos personas tomen el mismo incidente)
CREATE TABLE IF NOT EXISTS public.asignaciones_sac (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID NOT NULL REFERENCES public.incidentes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_asignacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear constraint único para solo una asignación activa por incidente
CREATE UNIQUE INDEX IF NOT EXISTS idx_asignaciones_sac_unico 
ON public.asignaciones_sac(incidente_id) 
WHERE activo = true;

-- Tabla para control de notificaciones a clientes (sistema de 3 notificaciones)
CREATE TABLE IF NOT EXISTS public.notificaciones_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID NOT NULL REFERENCES public.incidentes(id) ON DELETE CASCADE,
  numero_notificacion INTEGER NOT NULL CHECK (numero_notificacion BETWEEN 1 AND 3),
  fecha_envio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  canal TEXT NOT NULL,
  mensaje TEXT,
  respondido BOOLEAN DEFAULT false,
  fecha_respuesta TIMESTAMP WITH TIME ZONE,
  enviado_por UUID REFERENCES auth.users(id),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.asignaciones_sac ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones_cliente ENABLE ROW LEVEL SECURITY;

-- Políticas para asignaciones_sac
CREATE POLICY "SAC puede gestionar asignaciones"
ON public.asignaciones_sac
FOR ALL
USING (has_role(auth.uid(), 'sac'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'sac'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Políticas para notificaciones_cliente
CREATE POLICY "SAC puede gestionar notificaciones"
ON public.notificaciones_cliente
FOR ALL
USING (has_role(auth.uid(), 'sac'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'sac'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_asignaciones_sac_incidente ON public.asignaciones_sac(incidente_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_sac_user ON public.asignaciones_sac(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_cliente_incidente ON public.notificaciones_cliente(incidente_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_cliente_numero ON public.notificaciones_cliente(numero_notificacion);