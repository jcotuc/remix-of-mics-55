-- Crear enum para tipos de movimiento de inventario
CREATE TYPE tipo_movimiento_inventario AS ENUM (
  'entrada',
  'salida',
  'transferencia',
  'ajuste',
  'devolucion'
);

-- Crear enum para clasificación ABC
CREATE TYPE clasificacion_abc AS ENUM ('A', 'B', 'C');

-- Tabla de centros de servicio / bodegas departamentales
CREATE TABLE public.centros_servicio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  direccion TEXT,
  responsable TEXT,
  telefono TEXT,
  email TEXT,
  es_central BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de importaciones/embarques
CREATE TABLE public.importaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_embarque TEXT NOT NULL UNIQUE,
  origen TEXT NOT NULL, -- 'Mexico' o 'China'
  fecha_llegada TIMESTAMP WITH TIME ZONE NOT NULL,
  centro_destino_id UUID REFERENCES public.centros_servicio(id),
  notas TEXT,
  estado TEXT DEFAULT 'pendiente', -- pendiente, procesando, completado
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabla de detalle de importaciones
CREATE TABLE public.importaciones_detalle (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  importacion_id UUID NOT NULL REFERENCES public.importaciones(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  ubicacion_asignada TEXT,
  procesado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de ubicaciones históricas de repuestos
CREATE TABLE public.ubicaciones_historicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_repuesto TEXT NOT NULL,
  ubicacion TEXT NOT NULL,
  centro_servicio_id UUID REFERENCES public.centros_servicio(id),
  fecha_asignacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cantidad_asignada INTEGER,
  usuario_asigno UUID REFERENCES auth.users(id)
);

-- Tabla de clasificación ABC de repuestos
CREATE TABLE public.repuestos_clasificacion_abc (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_repuesto TEXT NOT NULL UNIQUE,
  clasificacion clasificacion_abc NOT NULL,
  valor_rotacion NUMERIC,
  frecuencia_uso INTEGER DEFAULT 0,
  stock_minimo_sugerido INTEGER,
  stock_maximo_sugerido INTEGER,
  ultima_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de stock por centro de servicio
CREATE TABLE public.stock_departamental (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_servicio_id UUID NOT NULL REFERENCES public.centros_servicio(id),
  codigo_repuesto TEXT NOT NULL,
  cantidad_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  stock_maximo INTEGER DEFAULT 0,
  ubicacion TEXT,
  ultima_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(centro_servicio_id, codigo_repuesto)
);

-- Tabla de tránsitos entre bodegas
CREATE TABLE public.transitos_bodega (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_transito TEXT NOT NULL UNIQUE,
  centro_origen_id UUID NOT NULL REFERENCES public.centros_servicio(id),
  centro_destino_id UUID NOT NULL REFERENCES public.centros_servicio(id),
  fecha_envio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_recepcion TIMESTAMP WITH TIME ZONE,
  estado TEXT DEFAULT 'en_transito', -- en_transito, recibido, con_faltantes
  enviado_por UUID REFERENCES auth.users(id),
  recibido_por UUID REFERENCES auth.users(id),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de detalle de tránsitos
CREATE TABLE public.transitos_detalle (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transito_id UUID NOT NULL REFERENCES public.transitos_bodega(id) ON DELETE CASCADE,
  codigo_repuesto TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad_enviada INTEGER NOT NULL,
  cantidad_recibida INTEGER,
  ubicacion_destino TEXT,
  verificado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de reclamos de faltantes
CREATE TABLE public.reclamos_faltantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transito_id UUID NOT NULL REFERENCES public.transitos_bodega(id),
  codigo_repuesto TEXT NOT NULL,
  cantidad_faltante INTEGER NOT NULL,
  estado TEXT DEFAULT 'pendiente', -- pendiente, en_revision, resuelto
  descripcion TEXT,
  fecha_reclamo TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reclamado_por UUID REFERENCES auth.users(id),
  resuelto_por UUID,
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  notas_resolucion TEXT
);

-- Tabla de inventario cíclico
CREATE TABLE public.inventario_ciclico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_conteo TEXT NOT NULL UNIQUE,
  centro_servicio_id UUID NOT NULL REFERENCES public.centros_servicio(id),
  ubicacion TEXT NOT NULL,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_completado TIMESTAMP WITH TIME ZONE,
  estado TEXT DEFAULT 'en_proceso', -- en_proceso, completado, cancelado
  realizado_por UUID REFERENCES auth.users(id),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de detalle de inventario cíclico
CREATE TABLE public.inventario_ciclico_detalle (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventario_id UUID NOT NULL REFERENCES public.inventario_ciclico(id) ON DELETE CASCADE,
  codigo_repuesto TEXT NOT NULL,
  descripcion TEXT,
  cantidad_sistema INTEGER NOT NULL,
  cantidad_fisica INTEGER,
  diferencia INTEGER,
  ajustado BOOLEAN DEFAULT false,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de movimientos de inventario
CREATE TABLE public.movimientos_inventario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_servicio_id UUID REFERENCES public.centros_servicio(id),
  codigo_repuesto TEXT NOT NULL,
  tipo_movimiento tipo_movimiento_inventario NOT NULL,
  cantidad INTEGER NOT NULL,
  stock_anterior INTEGER,
  stock_nuevo INTEGER,
  ubicacion TEXT,
  referencia TEXT, -- Número de incidente, importación, etc.
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.centros_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importaciones_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ubicaciones_historicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repuestos_clasificacion_abc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_departamental ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transitos_bodega ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transitos_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamos_faltantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_ciclico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_ciclico_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para bodega
CREATE POLICY "Bodega puede ver centros de servicio"
  ON public.centros_servicio FOR SELECT
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bodega puede gestionar importaciones"
  ON public.importaciones FOR ALL
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bodega puede gestionar detalle importaciones"
  ON public.importaciones_detalle FOR ALL
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bodega puede ver ubicaciones históricas"
  ON public.ubicaciones_historicas FOR ALL
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bodega puede gestionar clasificación ABC"
  ON public.repuestos_clasificacion_abc FOR ALL
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bodega puede gestionar stock departamental"
  ON public.stock_departamental FOR ALL
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bodega puede gestionar tránsitos"
  ON public.transitos_bodega FOR ALL
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bodega puede gestionar detalle tránsitos"
  ON public.transitos_detalle FOR ALL
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bodega puede gestionar reclamos"
  ON public.reclamos_faltantes FOR ALL
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bodega puede gestionar inventario cíclico"
  ON public.inventario_ciclico FOR ALL
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bodega puede gestionar detalle inventario cíclico"
  ON public.inventario_ciclico_detalle FOR ALL
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Bodega puede gestionar movimientos"
  ON public.movimientos_inventario FOR ALL
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Triggers para updated_at
CREATE TRIGGER update_centros_servicio_updated_at
  BEFORE UPDATE ON public.centros_servicio
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_importaciones_updated_at
  BEFORE UPDATE ON public.importaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para optimizar consultas
CREATE INDEX idx_importaciones_detalle_importacion ON public.importaciones_detalle(importacion_id);
CREATE INDEX idx_ubicaciones_historicas_repuesto ON public.ubicaciones_historicas(codigo_repuesto);
CREATE INDEX idx_stock_departamental_centro ON public.stock_departamental(centro_servicio_id);
CREATE INDEX idx_stock_departamental_repuesto ON public.stock_departamental(codigo_repuesto);
CREATE INDEX idx_transitos_detalle_transito ON public.transitos_detalle(transito_id);
CREATE INDEX idx_inventario_ciclico_detalle_inventario ON public.inventario_ciclico_detalle(inventario_id);
CREATE INDEX idx_movimientos_inventario_repuesto ON public.movimientos_inventario(codigo_repuesto);
CREATE INDEX idx_movimientos_inventario_centro ON public.movimientos_inventario(centro_servicio_id);

-- Insertar centro de servicio central por defecto
INSERT INTO public.centros_servicio (codigo, nombre, es_central, activo)
VALUES ('CENTRAL', 'Bodega Central', true, true);