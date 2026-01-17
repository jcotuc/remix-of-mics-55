-- Corregir la función calcular_analisis_inventario con los tipos de movimiento correctos
CREATE OR REPLACE FUNCTION public.calcular_analisis_inventario(p_centro_servicio_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    (SELECT COUNT(*) FROM movimientos_inventario m WHERE m.codigo_repuesto = i.codigo_repuesto AND m.centro_servicio_id = i.centro_servicio_id AND m.tipo_movimiento IN ('salida', 'transferencia'))::INTEGER,
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
$function$;