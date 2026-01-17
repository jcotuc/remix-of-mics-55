-- 1) Fix calcular_analisis_inventario to avoid duplicates from inventario
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
  -- Upsert aggregated inventory per (codigo_repuesto, centro_servicio_id)
  INSERT INTO public.analisis_inventario (
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
    inv.codigo_repuesto,
    inv.centro_servicio_id,
    inv.stock_actual,
    inv.costo_unitario,
    COALESCE(inv.stock_actual * inv.costo_unitario, 0),
    (SELECT MIN(m.created_at)
     FROM public.movimientos_inventario m
     WHERE m.codigo_repuesto = inv.codigo_repuesto
       AND m.centro_servicio_id = inv.centro_servicio_id),
    (SELECT MAX(m.created_at)
     FROM public.movimientos_inventario m
     WHERE m.codigo_repuesto = inv.codigo_repuesto
       AND m.centro_servicio_id = inv.centro_servicio_id),
    COALESCE(
      EXTRACT(DAY FROM NOW() - (
        SELECT MIN(m.created_at)
        FROM public.movimientos_inventario m
        WHERE m.codigo_repuesto = inv.codigo_repuesto
          AND m.centro_servicio_id = inv.centro_servicio_id
      ))::INTEGER,
      0
    ),
    COALESCE(
      EXTRACT(DAY FROM NOW() - (
        SELECT MAX(m.created_at)
        FROM public.movimientos_inventario m
        WHERE m.codigo_repuesto = inv.codigo_repuesto
          AND m.centro_servicio_id = inv.centro_servicio_id
      ))::INTEGER,
      0
    ),
    (SELECT COUNT(*)::INTEGER
     FROM public.movimientos_inventario m
     WHERE m.codigo_repuesto = inv.codigo_repuesto
       AND m.centro_servicio_id = inv.centro_servicio_id),
    (SELECT COUNT(*)::INTEGER
     FROM public.movimientos_inventario m
     WHERE m.codigo_repuesto = inv.codigo_repuesto
       AND m.centro_servicio_id = inv.centro_servicio_id
       AND m.tipo_movimiento IN ('salida', 'transferencia')),
    (SELECT COUNT(DISTINCT DATE_TRUNC('month', m.created_at))::INTEGER
     FROM public.movimientos_inventario m
     WHERE m.codigo_repuesto = inv.codigo_repuesto
       AND m.centro_servicio_id = inv.centro_servicio_id
       AND m.created_at >= NOW() - INTERVAL '12 months'),
    v_meses_analizados
  FROM (
    SELECT
      i.codigo_repuesto,
      i.centro_servicio_id,
      SUM(COALESCE(i.cantidad, 0))::INTEGER AS stock_actual,
      COALESCE(MAX(i.costo_unitario), 0) AS costo_unitario
    FROM public.inventario i
    WHERE i.centro_servicio_id = p_centro_servicio_id
    GROUP BY i.codigo_repuesto, i.centro_servicio_id
  ) inv
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
    meses_analizados = EXCLUDED.meses_analizados,
    updated_at = NOW();

  -- Count total codes for ABC classification
  SELECT COUNT(*) INTO v_total_codigos
  FROM public.analisis_inventario
  WHERE centro_servicio_id = p_centro_servicio_id;

  v_umbral_a := CEIL(v_total_codigos * 0.2);  -- Top 20%
  v_umbral_b := CEIL(v_total_codigos * 0.5);  -- Next 30% (20% + 30% = 50%)

  -- Update ABC classification based on total movements
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY total_movimientos DESC) as rn
    FROM public.analisis_inventario
    WHERE centro_servicio_id = p_centro_servicio_id
  )
  UPDATE public.analisis_inventario ai
  SET clasificacion_abc = CASE
    WHEN r.rn <= v_umbral_a THEN 'A'
    WHEN r.rn <= v_umbral_b THEN 'B'
    ELSE 'C'
  END
  FROM ranked r
  WHERE ai.id = r.id;

  -- Update XYZ classification based on frequency
  UPDATE public.analisis_inventario
  SET clasificacion_xyz = CASE
    WHEN meses_analizados > 0 AND (meses_con_movimiento::DECIMAL / meses_analizados) >= 0.7 THEN 'X'
    WHEN meses_analizados > 0 AND (meses_con_movimiento::DECIMAL / meses_analizados) >= 0.3 THEN 'Y'
    ELSE 'Z'
  END
  WHERE centro_servicio_id = p_centro_servicio_id;
END;
$function$;

-- 2) Tighten RLS policies for the new tables (avoid USING/WITH CHECK = true)
DO $$
BEGIN
  -- analisis_inventario
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analisis_inventario' AND policyname='Users can view analisis_inventario') THEN
    DROP POLICY "Users can view analisis_inventario" ON public.analisis_inventario;
  END IF;
  CREATE POLICY "Users can view analisis_inventario" ON public.analisis_inventario
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analisis_inventario' AND policyname='Users can insert analisis_inventario') THEN
    DROP POLICY "Users can insert analisis_inventario" ON public.analisis_inventario;
  END IF;
  CREATE POLICY "Users can insert analisis_inventario" ON public.analisis_inventario
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analisis_inventario' AND policyname='Users can update analisis_inventario') THEN
    DROP POLICY "Users can update analisis_inventario" ON public.analisis_inventario;
  END IF;
  CREATE POLICY "Users can update analisis_inventario" ON public.analisis_inventario
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analisis_inventario' AND policyname='Users can delete analisis_inventario') THEN
    DROP POLICY "Users can delete analisis_inventario" ON public.analisis_inventario;
  END IF;
  CREATE POLICY "Users can delete analisis_inventario" ON public.analisis_inventario
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

  -- sugeridos_mexico
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sugeridos_mexico' AND policyname='Users can view sugeridos_mexico') THEN
    DROP POLICY "Users can view sugeridos_mexico" ON public.sugeridos_mexico;
  END IF;
  CREATE POLICY "Users can view sugeridos_mexico" ON public.sugeridos_mexico
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sugeridos_mexico' AND policyname='Users can insert sugeridos_mexico') THEN
    DROP POLICY "Users can insert sugeridos_mexico" ON public.sugeridos_mexico;
  END IF;
  CREATE POLICY "Users can insert sugeridos_mexico" ON public.sugeridos_mexico
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sugeridos_mexico' AND policyname='Users can update sugeridos_mexico') THEN
    DROP POLICY "Users can update sugeridos_mexico" ON public.sugeridos_mexico;
  END IF;
  CREATE POLICY "Users can update sugeridos_mexico" ON public.sugeridos_mexico
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sugeridos_mexico' AND policyname='Users can delete sugeridos_mexico') THEN
    DROP POLICY "Users can delete sugeridos_mexico" ON public.sugeridos_mexico;
  END IF;
  CREATE POLICY "Users can delete sugeridos_mexico" ON public.sugeridos_mexico
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

  -- sugeridos_mexico_items
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sugeridos_mexico_items' AND policyname='Users can view sugeridos_mexico_items') THEN
    DROP POLICY "Users can view sugeridos_mexico_items" ON public.sugeridos_mexico_items;
  END IF;
  CREATE POLICY "Users can view sugeridos_mexico_items" ON public.sugeridos_mexico_items
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sugeridos_mexico_items' AND policyname='Users can insert sugeridos_mexico_items') THEN
    DROP POLICY "Users can insert sugeridos_mexico_items" ON public.sugeridos_mexico_items;
  END IF;
  CREATE POLICY "Users can insert sugeridos_mexico_items" ON public.sugeridos_mexico_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sugeridos_mexico_items' AND policyname='Users can update sugeridos_mexico_items') THEN
    DROP POLICY "Users can update sugeridos_mexico_items" ON public.sugeridos_mexico_items;
  END IF;
  CREATE POLICY "Users can update sugeridos_mexico_items" ON public.sugeridos_mexico_items
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sugeridos_mexico_items' AND policyname='Users can delete sugeridos_mexico_items') THEN
    DROP POLICY "Users can delete sugeridos_mexico_items" ON public.sugeridos_mexico_items;
  END IF;
  CREATE POLICY "Users can delete sugeridos_mexico_items" ON public.sugeridos_mexico_items
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);
END $$;