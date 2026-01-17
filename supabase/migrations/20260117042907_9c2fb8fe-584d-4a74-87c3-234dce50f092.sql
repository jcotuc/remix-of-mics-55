-- Create enum for XYZ classification (ABC already exists)
DO $$ BEGIN
  CREATE TYPE clasificacion_xyz AS ENUM ('X', 'Y', 'Z');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for sugerido decision
DO $$ BEGIN
  CREATE TYPE decision_sugerido AS ENUM ('comprar', 'parcial', 'no_comprar', 'revisar');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for sugerido status
DO $$ BEGIN
  CREATE TYPE estado_sugerido AS ENUM ('borrador', 'en_revision', 'aprobado', 'enviado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table for inventory analysis (ABC-XYZ classifications)
CREATE TABLE IF NOT EXISTS public.analisis_inventario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_repuesto TEXT NOT NULL,
  centro_servicio_id UUID NOT NULL REFERENCES public.centros_servicio(id) ON DELETE CASCADE,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  primera_entrada TIMESTAMP WITH TIME ZONE,
  ultimo_movimiento TIMESTAMP WITH TIME ZONE,
  dias_en_inventario INTEGER NOT NULL DEFAULT 0,
  dias_sin_movimiento INTEGER NOT NULL DEFAULT 0,
  total_movimientos INTEGER NOT NULL DEFAULT 0,
  total_salidas INTEGER NOT NULL DEFAULT 0,
  meses_con_movimiento INTEGER NOT NULL DEFAULT 0,
  meses_analizados INTEGER NOT NULL DEFAULT 12,
  clasificacion_abc TEXT,
  clasificacion_xyz TEXT,
  valor_inventario DECIMAL(12,2) NOT NULL DEFAULT 0,
  costo_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(codigo_repuesto, centro_servicio_id)
);

-- Table for Mexico suggested orders
CREATE TABLE IF NOT EXISTS public.sugeridos_mexico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha_importacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  importado_por UUID REFERENCES auth.users(id),
  nombre_archivo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador',
  total_items INTEGER NOT NULL DEFAULT 0,
  valor_total_sugerido DECIMAL(14,2) NOT NULL DEFAULT 0,
  valor_total_aprobado DECIMAL(14,2) NOT NULL DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for Mexico suggested order items
CREATE TABLE IF NOT EXISTS public.sugeridos_mexico_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sugerido_id UUID NOT NULL REFERENCES public.sugeridos_mexico(id) ON DELETE CASCADE,
  codigo_repuesto TEXT NOT NULL,
  descripcion TEXT,
  cantidad_sugerida INTEGER NOT NULL DEFAULT 0,
  precio_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock_actual_zona5 INTEGER NOT NULL DEFAULT 0,
  clasificacion_abc TEXT,
  clasificacion_xyz TEXT,
  dias_inventario INTEGER NOT NULL DEFAULT 0,
  decision TEXT NOT NULL DEFAULT 'revisar',
  cantidad_aprobada INTEGER NOT NULL DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analisis_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sugeridos_mexico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sugeridos_mexico_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for analisis_inventario
CREATE POLICY "Users can view analisis_inventario" 
  ON public.analisis_inventario FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can insert analisis_inventario" 
  ON public.analisis_inventario FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Users can update analisis_inventario" 
  ON public.analisis_inventario FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can delete analisis_inventario" 
  ON public.analisis_inventario FOR DELETE 
  TO authenticated 
  USING (true);

-- RLS policies for sugeridos_mexico
CREATE POLICY "Users can view sugeridos_mexico" 
  ON public.sugeridos_mexico FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can insert sugeridos_mexico" 
  ON public.sugeridos_mexico FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Users can update sugeridos_mexico" 
  ON public.sugeridos_mexico FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can delete sugeridos_mexico" 
  ON public.sugeridos_mexico FOR DELETE 
  TO authenticated 
  USING (true);

-- RLS policies for sugeridos_mexico_items
CREATE POLICY "Users can view sugeridos_mexico_items" 
  ON public.sugeridos_mexico_items FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can insert sugeridos_mexico_items" 
  ON public.sugeridos_mexico_items FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Users can update sugeridos_mexico_items" 
  ON public.sugeridos_mexico_items FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can delete sugeridos_mexico_items" 
  ON public.sugeridos_mexico_items FOR DELETE 
  TO authenticated 
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analisis_inventario_centro ON public.analisis_inventario(centro_servicio_id);
CREATE INDEX IF NOT EXISTS idx_analisis_inventario_clasificacion ON public.analisis_inventario(clasificacion_abc, clasificacion_xyz);
CREATE INDEX IF NOT EXISTS idx_sugeridos_mexico_estado ON public.sugeridos_mexico(estado);
CREATE INDEX IF NOT EXISTS idx_sugeridos_mexico_items_sugerido ON public.sugeridos_mexico_items(sugerido_id);
CREATE INDEX IF NOT EXISTS idx_sugeridos_mexico_items_decision ON public.sugeridos_mexico_items(decision);

-- Trigger for updated_at
CREATE TRIGGER update_analisis_inventario_updated_at
  BEFORE UPDATE ON public.analisis_inventario
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sugeridos_mexico_updated_at
  BEFORE UPDATE ON public.sugeridos_mexico
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sugeridos_mexico_items_updated_at
  BEFORE UPDATE ON public.sugeridos_mexico_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate and update ABC-XYZ classifications for a center
CREATE OR REPLACE FUNCTION public.calcular_analisis_inventario(p_centro_servicio_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_codigos INTEGER;
  v_umbral_a INTEGER;
  v_umbral_b INTEGER;
  v_meses_analizados INTEGER := 12;
BEGIN
  -- First, upsert all inventory items with their basic stats
  INSERT INTO analisis_inventario (
    codigo_repuesto,
    centro_servicio_id,
    stock_actual,
    costo_unitario,
    valor_inventario,
    primera_entrada,
    ultimo_movimiento,
    dias_en_inventario,
    dias_sin_movimiento,
    total_movimientos,
    total_salidas,
    meses_con_movimiento,
    meses_analizados
  )
  SELECT 
    i.codigo_repuesto,
    i.centro_servicio_id,
    COALESCE(i.cantidad, 0),
    COALESCE(i.costo_unitario, 0),
    COALESCE(i.cantidad * i.costo_unitario, 0),
    (SELECT MIN(m.created_at) FROM movimientos_inventario m WHERE m.codigo_repuesto = i.codigo_repuesto AND m.centro_servicio_id = i.centro_servicio_id),
    (SELECT MAX(m.created_at) FROM movimientos_inventario m WHERE m.codigo_repuesto = i.codigo_repuesto AND m.centro_servicio_id = i.centro_servicio_id),
    COALESCE(EXTRACT(DAY FROM NOW() - (SELECT MIN(m.created_at) FROM movimientos_inventario m WHERE m.codigo_repuesto = i.codigo_repuesto AND m.centro_servicio_id = i.centro_servicio_id))::INTEGER, 0),
    COALESCE(EXTRACT(DAY FROM NOW() - (SELECT MAX(m.created_at) FROM movimientos_inventario m WHERE m.codigo_repuesto = i.codigo_repuesto AND m.centro_servicio_id = i.centro_servicio_id))::INTEGER, 0),
    (SELECT COUNT(*) FROM movimientos_inventario m WHERE m.codigo_repuesto = i.codigo_repuesto AND m.centro_servicio_id = i.centro_servicio_id)::INTEGER,
    (SELECT COUNT(*) FROM movimientos_inventario m WHERE m.codigo_repuesto = i.codigo_repuesto AND m.centro_servicio_id = i.centro_servicio_id AND m.tipo_movimiento IN ('salida', 'despacho', 'transferencia_salida'))::INTEGER,
    (SELECT COUNT(DISTINCT DATE_TRUNC('month', m.created_at)) FROM movimientos_inventario m WHERE m.codigo_repuesto = i.codigo_repuesto AND m.centro_servicio_id = i.centro_servicio_id AND m.created_at >= NOW() - INTERVAL '12 months')::INTEGER,
    v_meses_analizados
  FROM inventario i
  WHERE i.centro_servicio_id = p_centro_servicio_id
  ON CONFLICT (codigo_repuesto, centro_servicio_id) 
  DO UPDATE SET
    stock_actual = EXCLUDED.stock_actual,
    costo_unitario = EXCLUDED.costo_unitario,
    valor_inventario = EXCLUDED.valor_inventario,
    primera_entrada = EXCLUDED.primera_entrada,
    ultimo_movimiento = EXCLUDED.ultimo_movimiento,
    dias_en_inventario = EXCLUDED.dias_en_inventario,
    dias_sin_movimiento = EXCLUDED.dias_sin_movimiento,
    total_movimientos = EXCLUDED.total_movimientos,
    total_salidas = EXCLUDED.total_salidas,
    meses_con_movimiento = EXCLUDED.meses_con_movimiento,
    updated_at = NOW();

  -- Count total codes for ABC classification
  SELECT COUNT(*) INTO v_total_codigos 
  FROM analisis_inventario 
  WHERE centro_servicio_id = p_centro_servicio_id;

  v_umbral_a := CEIL(v_total_codigos * 0.2);  -- Top 20%
  v_umbral_b := CEIL(v_total_codigos * 0.5);  -- Next 30% (20% + 30% = 50%)

  -- Update ABC classification based on total movements
  WITH ranked AS (
    SELECT id, 
           ROW_NUMBER() OVER (ORDER BY total_movimientos DESC) as rn
    FROM analisis_inventario
    WHERE centro_servicio_id = p_centro_servicio_id
  )
  UPDATE analisis_inventario ai
  SET clasificacion_abc = CASE 
    WHEN r.rn <= v_umbral_a THEN 'A'
    WHEN r.rn <= v_umbral_b THEN 'B'
    ELSE 'C'
  END
  FROM ranked r
  WHERE ai.id = r.id;

  -- Update XYZ classification based on frequency (meses_con_movimiento / meses_analizados)
  UPDATE analisis_inventario
  SET clasificacion_xyz = CASE 
    WHEN meses_analizados > 0 AND (meses_con_movimiento::DECIMAL / meses_analizados) >= 0.7 THEN 'X'
    WHEN meses_analizados > 0 AND (meses_con_movimiento::DECIMAL / meses_analizados) >= 0.3 THEN 'Y'
    ELSE 'Z'
  END
  WHERE centro_servicio_id = p_centro_servicio_id;
END;
$$;