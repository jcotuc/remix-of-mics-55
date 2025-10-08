-- Actualizar incidentes INC-000014 y INC-000015 con sus familias
UPDATE incidentes i
SET familia_producto = p.familia_producto
FROM productos p
WHERE i.codigo_producto = p.codigo
AND i.familia_producto IS NULL;