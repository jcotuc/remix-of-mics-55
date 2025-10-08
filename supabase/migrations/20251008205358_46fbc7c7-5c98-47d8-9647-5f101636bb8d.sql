-- Actualizar familia_producto en incidentes existentes basándose en la tabla productos
UPDATE incidentes i
SET familia_producto = p.familia_producto
FROM productos p
WHERE i.codigo_producto = p.codigo
AND i.familia_producto IS NULL;