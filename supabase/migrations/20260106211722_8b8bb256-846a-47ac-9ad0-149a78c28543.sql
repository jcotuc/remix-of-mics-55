-- Actualizar función inventario_totales para usar ubicacion_legacy
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
  WHERE (p_centro_servicio_id IS NULL OR i.centro_servicio_id = p_centro_servicio_id)
    AND (
      p_search IS NULL OR p_search = '' OR
      i.codigo_repuesto ILIKE '%' || p_search || '%' OR
      COALESCE(i.descripcion, '') ILIKE '%' || p_search || '%' OR
      i.ubicacion_legacy ILIKE '%' || p_search || '%' OR
      COALESCE(i.bodega, '') ILIKE '%' || p_search || '%'
    );
$function$;