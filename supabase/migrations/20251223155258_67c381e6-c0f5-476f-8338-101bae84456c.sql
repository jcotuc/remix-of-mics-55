-- Eliminar el índice funcional anterior
DROP INDEX IF EXISTS inventario_centro_sku_ubicacion_idx;

-- Primero, asegurarnos de que ubicacion no sea null para registros existentes
UPDATE public.inventario SET ubicacion = '' WHERE ubicacion IS NULL;

-- Modificar la columna para no permitir NULL y tener default ''
ALTER TABLE public.inventario ALTER COLUMN ubicacion SET DEFAULT '';
ALTER TABLE public.inventario ALTER COLUMN ubicacion SET NOT NULL;

-- Crear constraint UNIQUE real (no un índice funcional) que funcione con upsert
ALTER TABLE public.inventario 
ADD CONSTRAINT inventario_centro_sku_ubicacion_unique 
UNIQUE (centro_servicio_id, codigo_repuesto, ubicacion);