-- Eliminar la restricción única actual (centro_servicio_id, codigo_repuesto)
ALTER TABLE public.inventario DROP CONSTRAINT IF EXISTS inventario_centro_servicio_id_codigo_repuesto_key;

-- Crear nueva restricción única que incluye ubicacion
-- Usamos COALESCE para manejar ubicaciones NULL
CREATE UNIQUE INDEX inventario_centro_sku_ubicacion_idx 
ON public.inventario (centro_servicio_id, codigo_repuesto, COALESCE(ubicacion, ''));