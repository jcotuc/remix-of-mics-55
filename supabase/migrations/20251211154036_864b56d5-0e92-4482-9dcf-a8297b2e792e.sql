-- Migración automática de familia_padre_id usando palabras clave en descripción

-- Electricas (familia_abuelo_id = 4)
UPDATE productos SET familia_padre_id = 65 WHERE LOWER(descripcion) LIKE '%esmeriladora%' AND familia_abuelo_id = 4 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 64 WHERE LOWER(descripcion) LIKE '%rotomartillo%' AND familia_abuelo_id = 4 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 78 WHERE LOWER(descripcion) LIKE '%taladro%' AND familia_abuelo_id = 4 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 73 WHERE LOWER(descripcion) LIKE '%desbrozadora%' AND familia_abuelo_id = 4 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 69 WHERE LOWER(descripcion) LIKE '%demoledor%' AND familia_abuelo_id = 4 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 77 WHERE LOWER(descripcion) LIKE '%sierra%' AND familia_abuelo_id = 4 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 74 WHERE LOWER(descripcion) LIKE '%lijadora%' AND familia_abuelo_id = 4 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 75 WHERE LOWER(descripcion) LIKE '%router%' OR LOWER(descripcion) LIKE '%rebajador%' AND familia_abuelo_id = 4 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 66 WHERE LOWER(descripcion) LIKE '%cepillo%' AND familia_abuelo_id = 4 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 76 WHERE LOWER(descripcion) LIKE '%pistola%calor%' AND familia_abuelo_id = 4 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 70 WHERE LOWER(descripcion) LIKE '%pulidora%' AND familia_abuelo_id = 4 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 72 WHERE LOWER(descripcion) LIKE '%atornillador%' AND familia_abuelo_id = 4 AND familia_padre_id IS NULL;

-- 2 Tiempos (familia_abuelo_id = 27)
UPDATE productos SET familia_padre_id = 87 WHERE (LOWER(descripcion) LIKE '%desbrozadora%' OR LOWER(descripcion) LIKE '%desmalezadora%') AND familia_abuelo_id = 27 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 88 WHERE LOWER(descripcion) LIKE '%motosierra%' AND familia_abuelo_id = 27 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 89 WHERE LOWER(descripcion) LIKE '%sopladora%' AND familia_abuelo_id = 27 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 90 WHERE LOWER(descripcion) LIKE '%fumigadora%' AND familia_abuelo_id = 27 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 91 WHERE LOWER(descripcion) LIKE '%podadora%' AND familia_abuelo_id = 27 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 92 WHERE LOWER(descripcion) LIKE '%cortaseto%' AND familia_abuelo_id = 27 AND familia_padre_id IS NULL;

-- Compresores (familia_abuelo_id = 1)
UPDATE productos SET familia_padre_id = 61 WHERE LOWER(descripcion) LIKE '%lubricado%' AND familia_abuelo_id = 1 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 63 WHERE (LOWER(descripcion) LIKE '%libre de aceite%' OR LOWER(descripcion) LIKE '%libre%aceite%') AND familia_abuelo_id = 1 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 62 WHERE LOWER(descripcion) LIKE '%dental%' AND familia_abuelo_id = 1 AND familia_padre_id IS NULL;

-- Hidrolavadoras (familia_abuelo_id = 20)
UPDATE productos SET familia_padre_id = 82 WHERE LOWER(descripcion) LIKE '%electrica%' AND familia_abuelo_id = 20 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 80 WHERE (LOWER(descripcion) LIKE '%2800%' OR LOWER(descripcion) LIKE '%3300%') AND familia_abuelo_id = 20 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 81 WHERE LOWER(descripcion) LIKE '%4000%' AND familia_abuelo_id = 20 AND familia_padre_id IS NULL;

-- Estacionarias (familia_abuelo_id = 41)
UPDATE productos SET familia_padre_id = 101 WHERE LOWER(descripcion) LIKE '%inglete%' AND familia_abuelo_id = 41 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 102 WHERE LOWER(descripcion) LIKE '%taladro%' AND familia_abuelo_id = 41 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 103 WHERE LOWER(descripcion) LIKE '%cortadora%' AND familia_abuelo_id = 41 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 104 WHERE LOWER(descripcion) LIKE '%torno%' AND familia_abuelo_id = 41 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 105 WHERE LOWER(descripcion) LIKE '%esmeril%' AND familia_abuelo_id = 41 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 106 WHERE LOWER(descripcion) LIKE '%sierra%' AND familia_abuelo_id = 41 AND familia_padre_id IS NULL;

-- Hidraulicas (familia_abuelo_id = 49)
UPDATE productos SET familia_padre_id = 107 WHERE LOWER(descripcion) LIKE '%gato%' AND familia_abuelo_id = 49 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 108 WHERE (LOWER(descripcion) LIKE '%prensa%' OR LOWER(descripcion) LIKE '%pluma%') AND familia_abuelo_id = 49 AND familia_padre_id IS NULL;

-- Neumaticas (familia_abuelo_id = 53)
UPDATE productos SET familia_padre_id = 111 WHERE (LOWER(descripcion) LIKE '%engrapadora%' OR LOWER(descripcion) LIKE '%clavadora%') AND familia_abuelo_id = 53 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 112 WHERE LOWER(descripcion) LIKE '%impacto%' AND familia_abuelo_id = 53 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 113 WHERE LOWER(descripcion) LIKE '%ratchet%' OR LOWER(descripcion) LIKE '%matraca%' AND familia_abuelo_id = 53 AND familia_padre_id IS NULL;

-- Soldadoras (familia_abuelo_id = 35)
UPDATE productos SET familia_padre_id = 94 WHERE LOWER(descripcion) LIKE '%inversor%' AND familia_abuelo_id = 35 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 95 WHERE LOWER(descripcion) LIKE '%microalambre%' OR LOWER(descripcion) LIKE '%mig%' AND familia_abuelo_id = 35 AND familia_padre_id IS NULL;
UPDATE productos SET familia_padre_id = 96 WHERE LOWER(descripcion) LIKE '%multiproceso%' AND familia_abuelo_id = 35 AND familia_padre_id IS NULL;

-- Generadores (familia_abuelo_id = 13)
UPDATE productos SET familia_padre_id = 79 WHERE familia_abuelo_id = 13 AND familia_padre_id IS NULL;