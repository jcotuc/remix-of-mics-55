-- 1) RPC para totales de inventario sin descargar 36k filas al navegador
CREATE OR REPLACE FUNCTION public.inventario_totales(
  p_centro_servicio_id uuid,
  p_search text
)
RETURNS TABLE(
  skus bigint,
  unidades bigint,
  valor numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint AS skus,
    COALESCE(SUM(i.cantidad), 0)::bigint AS unidades,
    COALESCE(SUM(i.cantidad * COALESCE(i.costo_unitario, 0)), 0)::numeric AS valor
  FROM public.inventario i
  WHERE (p_centro_servicio_id IS NULL OR i.centro_servicio_id = p_centro_servicio_id)
    AND (
      p_search IS NULL OR p_search = '' OR
      i.codigo_repuesto ILIKE '%' || p_search || '%' OR
      COALESCE(i.descripcion, '') ILIKE '%' || p_search || '%' OR
      i.ubicacion ILIKE '%' || p_search || '%' OR
      COALESCE(i.bodega, '') ILIKE '%' || p_search || '%'
    );
$$;

-- 2) Fix linter: RLS habilitado sin policies en tablas auxiliares
ALTER TABLE public."Bodega_CDS" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view Bodega_CDS" ON public."Bodega_CDS";
DROP POLICY IF EXISTS "Admin can manage Bodega_CDS" ON public."Bodega_CDS";
CREATE POLICY "Authenticated can view Bodega_CDS"
ON public."Bodega_CDS"
FOR SELECT
USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can manage Bodega_CDS"
ON public."Bodega_CDS"
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public."Ubicación_CDS" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view Ubicación_CDS" ON public."Ubicación_CDS";
DROP POLICY IF EXISTS "Admin can manage Ubicación_CDS" ON public."Ubicación_CDS";
CREATE POLICY "Authenticated can view Ubicación_CDS"
ON public."Ubicación_CDS"
FOR SELECT
USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can manage Ubicación_CDS"
ON public."Ubicación_CDS"
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
