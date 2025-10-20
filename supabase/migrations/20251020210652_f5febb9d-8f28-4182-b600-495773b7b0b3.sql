-- Borrar todos los clientes que no tienen incidentes asociados
DELETE FROM clientes 
WHERE codigo NOT IN (
  SELECT DISTINCT codigo_cliente 
  FROM incidentes 
  WHERE codigo_cliente IS NOT NULL
);