-- Normalización: eliminar familia_abuelo_id de productos e incidentes
-- El abuelo se obtiene ahora desde CDS_Familias.Padre usando familia_padre_id

-- Eliminar de productos
ALTER TABLE public.productos DROP COLUMN IF EXISTS familia_abuelo_id;

-- Eliminar de incidentes
ALTER TABLE public.incidentes DROP COLUMN IF EXISTS familia_abuelo_id;

-- También eliminar familia_producto (texto redundante) de incidentes si existe
ALTER TABLE public.incidentes DROP COLUMN IF EXISTS familia_producto;