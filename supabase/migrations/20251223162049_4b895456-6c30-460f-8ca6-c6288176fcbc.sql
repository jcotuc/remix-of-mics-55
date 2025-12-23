-- Primero eliminar el CONSTRAINT (no el índice)
-- Este constraint antiguo solo permite 1 SKU por centro, sin considerar ubicación
ALTER TABLE public.inventario DROP CONSTRAINT IF EXISTS inventario_centro_codigo_unique;