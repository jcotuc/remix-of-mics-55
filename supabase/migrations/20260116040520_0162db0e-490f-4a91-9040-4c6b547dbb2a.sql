-- Create index to speed up inventario queries
CREATE INDEX IF NOT EXISTS idx_inventario_centro_servicio 
ON public.inventario(centro_servicio_id);

CREATE INDEX IF NOT EXISTS idx_inventario_cantidad 
ON public.inventario(cantidad);

-- Optimize the inventario_totales function with better performance
CREATE OR REPLACE FUNCTION public.inventario_totales(p_centro_servicio_id uuid, p_search text)
 RETURNS TABLE(skus bigint, unidades bigint, valor numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*)::bigint AS skus,
    COALESCE(SUM(i.cantidad), 0)::bigint AS unidades,
    COALESCE(SUM(i.cantidad * COALESCE(i.costo_unitario, 0)), 0)::numeric AS valor
  FROM public.inventario i
  WHERE 
    (p_centro_servicio_id IS NULL OR i.centro_servicio_id = p_centro_servicio_id)
    AND (
      p_search IS NULL OR p_search = '' OR
      i.codigo_repuesto ILIKE '%' || p_search || '%'
    );
$function$;