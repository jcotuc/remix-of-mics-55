-- Paso 1: Limpiar todas las asignaciones actuales
UPDATE productos SET familia_abuelo_id = NULL, familia_padre_id = NULL;

-- ================================================
-- Paso 2: Asignar familia_abuelo_id por palabras clave
-- ================================================

-- BOMBAS (abuelo = 33)
UPDATE productos SET familia_abuelo_id = 33 
WHERE LOWER(descripcion) LIKE '%bomba%' OR LOWER(descripcion) LIKE '%motobomba%';

-- COMPRESORES (abuelo = 1)
UPDATE productos SET familia_abuelo_id = 1 
WHERE LOWER(descripcion) LIKE '%compresor%';

-- ELÉCTRICAS (abuelo = 4) - Herramientas eléctricas
UPDATE productos SET familia_abuelo_id = 4 
WHERE LOWER(descripcion) LIKE '%esmeril%'
   OR LOWER(descripcion) LIKE '%rotomartillo%'
   OR LOWER(descripcion) LIKE '%martillo demoledor%'
   OR (LOWER(descripcion) LIKE '%taladro%' AND LOWER(descripcion) NOT LIKE '%gasolina%')
   OR (LOWER(descripcion) LIKE '%desbrozadora%' AND LOWER(descripcion) LIKE '%eléctrica%');

-- 2 TIEMPOS (abuelo = 27)
UPDATE productos SET familia_abuelo_id = 27 
WHERE LOWER(descripcion) LIKE '%motosierra%'
   OR LOWER(descripcion) LIKE '%desmalezadora%'
   OR (LOWER(descripcion) LIKE '%desbrozadora%' AND LOWER(descripcion) NOT LIKE '%eléctrica%');

-- 4 TIEMPOS (abuelo = 23)
UPDATE productos SET familia_abuelo_id = 23 
WHERE LOWER(descripcion) LIKE '%generador%'
   OR LOWER(descripcion) LIKE '%podadora%';

-- HIDROLAVADORAS (abuelo = 20)
UPDATE productos SET familia_abuelo_id = 20 
WHERE LOWER(descripcion) LIKE '%hidrolavadora%';

-- SOLDADORAS (abuelo = 60)
UPDATE productos SET familia_abuelo_id = 60 
WHERE LOWER(descripcion) LIKE '%soldadora%';

-- NEUMÁTICAS (abuelo = 53)
UPDATE productos SET familia_abuelo_id = 53 
WHERE LOWER(descripcion) LIKE '%clavadora%'
   OR LOWER(descripcion) LIKE '%engrapadora%';

-- ================================================
-- Paso 3: Asignar familia_padre_id por palabras clave
-- ================================================

-- BOMBAS (abuelo = 33)
UPDATE productos SET familia_padre_id = 99 WHERE familia_abuelo_id = 33 AND LOWER(descripcion) LIKE '%motobomba%';
UPDATE productos SET familia_padre_id = 98 WHERE familia_abuelo_id = 33 AND LOWER(descripcion) LIKE '%periférica%';
UPDATE productos SET familia_padre_id = 92 WHERE familia_abuelo_id = 33 AND LOWER(descripcion) LIKE '%sumergible%';

-- COMPRESORES (abuelo = 1)
UPDATE productos SET familia_padre_id = 62 WHERE familia_abuelo_id = 1 AND (LOWER(descripcion) LIKE '%120 l%' OR LOWER(descripcion) LIKE '%240 l%');
UPDATE productos SET familia_padre_id = 63 WHERE familia_abuelo_id = 1 AND LOWER(descripcion) LIKE '%libre de aceite%';
UPDATE productos SET familia_padre_id = 61 WHERE familia_abuelo_id = 1 AND familia_padre_id IS NULL;

-- ELÉCTRICAS (abuelo = 4)
UPDATE productos SET familia_padre_id = 73 WHERE familia_abuelo_id = 4 AND LOWER(descripcion) LIKE '%desbrozadora%';
UPDATE productos SET familia_padre_id = 65 WHERE familia_abuelo_id = 4 AND LOWER(descripcion) LIKE '%esmeril%';
UPDATE productos SET familia_padre_id = 69 WHERE familia_abuelo_id = 4 AND LOWER(descripcion) LIKE '%martillo demoledor%';
UPDATE productos SET familia_padre_id = 64 WHERE familia_abuelo_id = 4 AND LOWER(descripcion) LIKE '%rotomartillo%';
UPDATE productos SET familia_padre_id = 79 WHERE familia_abuelo_id = 4 AND LOWER(descripcion) LIKE '%taladro%' AND LOWER(descripcion) LIKE '%inalámbrico%';
UPDATE productos SET familia_padre_id = 66 WHERE familia_abuelo_id = 4 AND LOWER(descripcion) LIKE '%taladro%' AND familia_padre_id IS NULL;

-- 2 TIEMPOS (abuelo = 27)
UPDATE productos SET familia_padre_id = 88 WHERE familia_abuelo_id = 27 AND LOWER(descripcion) LIKE '%motosierra%';
UPDATE productos SET familia_padre_id = 87 WHERE familia_abuelo_id = 27 AND (LOWER(descripcion) LIKE '%desbrozadora%' OR LOWER(descripcion) LIKE '%desmalezadora%');

-- 4 TIEMPOS (abuelo = 23)
UPDATE productos SET familia_padre_id = 83 WHERE familia_abuelo_id = 23 AND LOWER(descripcion) LIKE '%generador%';
UPDATE productos SET familia_padre_id = 84 WHERE familia_abuelo_id = 23 AND LOWER(descripcion) LIKE '%podadora%';

-- HIDROLAVADORAS (abuelo = 20)
UPDATE productos SET familia_padre_id = 80 WHERE familia_abuelo_id = 20 AND (LOWER(descripcion) LIKE '%2800%' OR LOWER(descripcion) LIKE '%3300%');
UPDATE productos SET familia_padre_id = 82 WHERE familia_abuelo_id = 20 AND LOWER(descripcion) LIKE '%eléctrica%';
UPDATE productos SET familia_padre_id = 81 WHERE familia_abuelo_id = 20 AND familia_padre_id IS NULL;

-- SOLDADORAS (abuelo = 60)
UPDATE productos SET familia_padre_id = 118 WHERE familia_abuelo_id = 60 AND LOWER(descripcion) LIKE '%inversora%';
UPDATE productos SET familia_padre_id = 117 WHERE familia_abuelo_id = 60 AND familia_padre_id IS NULL;

-- NEUMÁTICAS (abuelo = 53)
UPDATE productos SET familia_padre_id = 111 WHERE familia_abuelo_id = 53;