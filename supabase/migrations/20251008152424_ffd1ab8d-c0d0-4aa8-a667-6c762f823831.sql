-- Actualizar incidentes existentes para asignarles la familia Electricas
UPDATE public.incidentes 
SET familia_producto = 'Electricas'
WHERE familia_producto IS NULL OR familia_producto = '';

-- Asegurar que todos los incidentes futuros tengan una familia asignada
COMMENT ON COLUMN public.incidentes.familia_producto IS 'Familia del producto: Electricas, Hidraulicas, Compresores, 2 Tiempos, Hidrolavadoras, Estacionarias';