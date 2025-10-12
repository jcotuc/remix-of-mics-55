-- Actualizar todos los repuestos para que tengan stock disponible
-- Esto facilita el flujo de trabajo durante el desarrollo

UPDATE repuestos 
SET 
  stock_actual = 50, 
  disponible_mostrador = true,
  ubicacion_bodega = CASE 
    WHEN ubicacion_bodega IS NULL THEN 'Bodega A - Estante ' || (random() * 20 + 1)::int
    ELSE ubicacion_bodega
  END
WHERE stock_actual = 0 OR stock_actual IS NULL;

-- Verificar actualización
SELECT 
  COUNT(*) as total_repuestos,
  SUM(CASE WHEN stock_actual > 0 THEN 1 ELSE 0 END) as con_stock,
  SUM(CASE WHEN disponible_mostrador THEN 1 ELSE 0 END) as disponibles_mostrador
FROM repuestos;