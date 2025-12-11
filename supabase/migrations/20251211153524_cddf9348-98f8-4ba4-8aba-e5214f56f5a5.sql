-- Agregar columnas de jerarquía de familias a productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS familia_abuelo_id bigint REFERENCES "CDS_Familias"(id);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS familia_padre_id bigint REFERENCES "CDS_Familias"(id);

-- Agregar columnas de jerarquía de familias a incidentes
ALTER TABLE incidentes ADD COLUMN IF NOT EXISTS familia_abuelo_id bigint REFERENCES "CDS_Familias"(id);
ALTER TABLE incidentes ADD COLUMN IF NOT EXISTS familia_padre_id bigint REFERENCES "CDS_Familias"(id);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_productos_familia_abuelo ON productos(familia_abuelo_id);
CREATE INDEX IF NOT EXISTS idx_productos_familia_padre ON productos(familia_padre_id);
CREATE INDEX IF NOT EXISTS idx_incidentes_familia_abuelo ON incidentes(familia_abuelo_id);
CREATE INDEX IF NOT EXISTS idx_incidentes_familia_padre ON incidentes(familia_padre_id);

-- Migrar datos existentes de productos.familia_producto a familia_abuelo_id
-- Mapeo basado en los datos existentes en CDS_Familias
UPDATE productos SET familia_abuelo_id = 4 WHERE LOWER(familia_producto) LIKE '%electrica%' AND familia_abuelo_id IS NULL;
UPDATE productos SET familia_abuelo_id = 27 WHERE LOWER(familia_producto) LIKE '%2 tiempo%' AND familia_abuelo_id IS NULL;
UPDATE productos SET familia_abuelo_id = 1 WHERE LOWER(familia_producto) LIKE '%compresor%' AND familia_abuelo_id IS NULL;
UPDATE productos SET familia_abuelo_id = 20 WHERE LOWER(familia_producto) LIKE '%hidrolavadora%' AND familia_abuelo_id IS NULL;
UPDATE productos SET familia_abuelo_id = 41 WHERE LOWER(familia_producto) LIKE '%estacionaria%' AND familia_abuelo_id IS NULL;
UPDATE productos SET familia_abuelo_id = 49 WHERE LOWER(familia_producto) LIKE '%hidraulica%' AND familia_abuelo_id IS NULL;
UPDATE productos SET familia_abuelo_id = 53 WHERE LOWER(familia_producto) LIKE '%neumatica%' AND familia_abuelo_id IS NULL;