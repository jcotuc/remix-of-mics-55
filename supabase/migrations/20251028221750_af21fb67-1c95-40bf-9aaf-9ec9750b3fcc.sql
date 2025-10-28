-- Consolidar Bodega Central con Centro de servicio zona 5
-- Primero resolver duplicados en stock_departamental

DO $$
DECLARE
  zona5_id uuid;
  central_id uuid;
BEGIN
  -- Obtener IDs
  SELECT id INTO zona5_id FROM public.centros_servicio WHERE codigo = 'ZONA5';
  SELECT id INTO central_id FROM public.centros_servicio WHERE codigo = 'CENTRAL';
  
  IF central_id IS NOT NULL AND zona5_id IS NOT NULL THEN
    -- Consolidar duplicados en stock_departamental
    -- Para cada repuesto que existe en ambos centros, sumar cantidades
    WITH duplicados AS (
      SELECT 
        codigo_repuesto,
        SUM(cantidad_actual) as total_cantidad,
        MAX(stock_minimo) as max_minimo,
        MAX(stock_maximo) as max_maximo,
        MAX(ubicacion) as ubicacion_final
      FROM public.stock_departamental
      WHERE centro_servicio_id IN (central_id, zona5_id)
      GROUP BY codigo_repuesto
      HAVING COUNT(*) > 1
    )
    UPDATE public.stock_departamental sd
    SET 
      cantidad_actual = d.total_cantidad,
      stock_minimo = d.max_minimo,
      stock_maximo = d.max_maximo,
      ubicacion = d.ubicacion_final,
      ultima_actualizacion = NOW()
    FROM duplicados d
    WHERE sd.codigo_repuesto = d.codigo_repuesto 
      AND sd.centro_servicio_id = zona5_id;
    
    -- Eliminar registros del centro CENTRAL (ya consolidados en ZONA5)
    DELETE FROM public.stock_departamental 
    WHERE centro_servicio_id = central_id 
      AND codigo_repuesto IN (
        SELECT codigo_repuesto 
        FROM public.stock_departamental 
        WHERE centro_servicio_id = zona5_id
      );
    
    -- Actualizar registros únicos del centro CENTRAL a ZONA5
    UPDATE public.stock_departamental 
    SET centro_servicio_id = zona5_id 
    WHERE centro_servicio_id = central_id;
    
    -- Actualizar transitos_bodega (origen)
    UPDATE public.transitos_bodega 
    SET centro_origen_id = zona5_id 
    WHERE centro_origen_id = central_id;
    
    -- Actualizar transitos_bodega (destino)
    UPDATE public.transitos_bodega 
    SET centro_destino_id = zona5_id 
    WHERE centro_destino_id = central_id;
    
    -- Actualizar importaciones
    UPDATE public.importaciones 
    SET centro_destino_id = zona5_id 
    WHERE centro_destino_id = central_id;
    
    -- Actualizar inventario_ciclico
    UPDATE public.inventario_ciclico 
    SET centro_servicio_id = zona5_id 
    WHERE centro_servicio_id = central_id;
    
    -- Actualizar ubicaciones_historicas
    UPDATE public.ubicaciones_historicas 
    SET centro_servicio_id = zona5_id 
    WHERE centro_servicio_id = central_id;
    
    -- Actualizar movimientos_inventario
    UPDATE public.movimientos_inventario 
    SET centro_servicio_id = zona5_id 
    WHERE centro_servicio_id = central_id;
    
    -- Eliminar el centro CENTRAL
    DELETE FROM public.centros_servicio WHERE codigo = 'CENTRAL';
    
    -- Actualizar nombre del centro ZONA5 para reflejar que es central
    UPDATE public.centros_servicio 
    SET 
      nombre = 'Centro de servicio zona 5',
      es_central = true
    WHERE codigo = 'ZONA5';
  END IF;
END $$;