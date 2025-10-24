-- Consolidar todos los centros de servicio Zona 5 en uno solo
-- Primero, crear o actualizar el centro de servicio unificado
INSERT INTO public.centros_servicio (codigo, nombre, es_central, activo, direccion)
VALUES ('ZONA5', 'Centro de servicio zona 5', true, true, 'Guatemala, Zona 5')
ON CONFLICT (codigo) 
DO UPDATE SET 
  nombre = 'Centro de servicio zona 5',
  es_central = true,
  activo = true;

-- Obtener el ID del centro unificado
DO $$
DECLARE
  zona5_id uuid;
  old_cs_z5_id uuid;
BEGIN
  -- Obtener el ID del centro ZONA5 (el que mantendremos)
  SELECT id INTO zona5_id FROM public.centros_servicio WHERE codigo = 'ZONA5';
  
  -- Obtener el ID del centro CS-Z5 (el que eliminaremos)
  SELECT id INTO old_cs_z5_id FROM public.centros_servicio WHERE codigo = 'CS-Z5';
  
  IF old_cs_z5_id IS NOT NULL THEN
    -- Actualizar todas las referencias en stock_departamental
    UPDATE public.stock_departamental 
    SET centro_servicio_id = zona5_id 
    WHERE centro_servicio_id = old_cs_z5_id;
    
    -- Actualizar todas las referencias en transitos_bodega (origen)
    UPDATE public.transitos_bodega 
    SET centro_origen_id = zona5_id 
    WHERE centro_origen_id = old_cs_z5_id;
    
    -- Actualizar todas las referencias en transitos_bodega (destino)
    UPDATE public.transitos_bodega 
    SET centro_destino_id = zona5_id 
    WHERE centro_destino_id = old_cs_z5_id;
    
    -- Actualizar todas las referencias en importaciones
    UPDATE public.importaciones 
    SET centro_destino_id = zona5_id 
    WHERE centro_destino_id = old_cs_z5_id;
    
    -- Actualizar todas las referencias en inventario_ciclico
    UPDATE public.inventario_ciclico 
    SET centro_servicio_id = zona5_id 
    WHERE centro_servicio_id = old_cs_z5_id;
    
    -- Actualizar todas las referencias en ubicaciones_historicas
    UPDATE public.ubicaciones_historicas 
    SET centro_servicio_id = zona5_id 
    WHERE centro_servicio_id = old_cs_z5_id;
    
    -- Actualizar todas las referencias en movimientos_inventario
    UPDATE public.movimientos_inventario 
    SET centro_servicio_id = zona5_id 
    WHERE centro_servicio_id = old_cs_z5_id;
    
    -- Eliminar el centro de servicio duplicado
    DELETE FROM public.centros_servicio WHERE codigo = 'CS-Z5';
  END IF;
END $$;