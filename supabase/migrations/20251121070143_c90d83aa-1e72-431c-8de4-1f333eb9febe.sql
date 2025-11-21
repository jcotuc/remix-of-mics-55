-- Arreglar warnings de seguridad: Set search_path en funciones

-- Recrear función de búsqueda inteligente con search_path
CREATE OR REPLACE FUNCTION buscar_repuesto_disponible(
  p_codigo_solicitado text,
  p_centro_servicio_id uuid
)
RETURNS TABLE (
  codigo_encontrado text,
  descripcion text,
  stock_disponible integer,
  ubicacion text,
  tipo_coincidencia text,
  prioridad integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Verificar stock del código solicitado
  RETURN QUERY
  SELECT 
    r.codigo,
    r.descripcion,
    COALESCE(sd.cantidad_actual, 0)::integer,
    sd.ubicacion,
    'solicitado'::text,
    1::integer
  FROM repuestos r
  LEFT JOIN stock_departamental sd ON r.codigo = sd.codigo_repuesto 
    AND sd.centro_servicio_id = p_centro_servicio_id
  WHERE r.codigo = p_codigo_solicitado 
    AND COALESCE(sd.cantidad_actual, 0) > 0;
  
  IF FOUND THEN RETURN; END IF;
  
  -- 2. Buscar en el padre (si existe)
  RETURN QUERY
  SELECT 
    r.codigo,
    r.descripcion,
    COALESCE(sd.cantidad_actual, 0)::integer,
    sd.ubicacion,
    'padre'::text,
    2::integer
  FROM repuestos r
  JOIN repuestos hijo ON hijo.codigo = p_codigo_solicitado
  LEFT JOIN stock_departamental sd ON r.codigo = sd.codigo_repuesto 
    AND sd.centro_servicio_id = p_centro_servicio_id
  WHERE r.codigo = hijo.codigo_padre
    AND COALESCE(sd.cantidad_actual, 0) > 0
  LIMIT 1;
  
  IF FOUND THEN RETURN; END IF;
  
  -- 3. Buscar en hermanos (otros hijos del mismo padre)
  RETURN QUERY
  SELECT 
    r.codigo,
    r.descripcion,
    COALESCE(sd.cantidad_actual, 0)::integer,
    sd.ubicacion,
    'hermano'::text,
    3::integer
  FROM repuestos r
  JOIN repuestos solicitado ON solicitado.codigo = p_codigo_solicitado
  LEFT JOIN stock_departamental sd ON r.codigo = sd.codigo_repuesto 
    AND sd.centro_servicio_id = p_centro_servicio_id
  WHERE r.codigo_padre = solicitado.codigo_padre
    AND r.codigo != p_codigo_solicitado
    AND solicitado.codigo_padre IS NOT NULL
    AND COALESCE(sd.cantidad_actual, 0) > 0
  ORDER BY sd.cantidad_actual DESC
  LIMIT 1;
  
  IF FOUND THEN RETURN; END IF;
  
  -- 4. Buscar en equivalentes directos
  RETURN QUERY
  SELECT 
    r.codigo,
    r.descripcion,
    COALESCE(sd.cantidad_actual, 0)::integer,
    sd.ubicacion,
    'equivalente'::text,
    4::integer
  FROM repuestos r
  JOIN repuestos_relaciones rr ON r.codigo = rr.codigo_relacionado
  LEFT JOIN stock_departamental sd ON r.codigo = sd.codigo_repuesto 
    AND sd.centro_servicio_id = p_centro_servicio_id
  WHERE rr.codigo_principal = p_codigo_solicitado
    AND rr.activo = true
    AND COALESCE(sd.cantidad_actual, 0) > 0
  ORDER BY rr.prioridad ASC, sd.cantidad_actual DESC
  LIMIT 1;
END;
$$;

-- Recrear función de validación con search_path
CREATE OR REPLACE FUNCTION validar_no_ciclo_padre()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM repuestos 
    WHERE codigo = NEW.codigo_padre 
    AND codigo_padre = NEW.codigo
  ) THEN
    RAISE EXCEPTION 'No se permite relación circular padre-hijo';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recrear función de updated_at con search_path
CREATE OR REPLACE FUNCTION update_updated_at_repuestos_relaciones()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;