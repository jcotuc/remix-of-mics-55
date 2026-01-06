-- =====================================================
-- MIGRACIÓN: Normalizar ubicaciones de inventario
-- =====================================================

-- Paso 1: Insertar ubicaciones únicas en Ubicación_CDS
INSERT INTO "Ubicación_CDS" (bodega_id, codigo, pasillo, rack, nivel, activo)
SELECT DISTINCT
    b.cds_id as bodega_id,
    UPPER(TRIM(i.ubicacion)) as codigo,
    SPLIT_PART(UPPER(TRIM(i.ubicacion)), '.', 1) as pasillo,
    SPLIT_PART(UPPER(TRIM(i.ubicacion)), '.', 2) as rack,
    SPLIT_PART(UPPER(TRIM(i.ubicacion)), '.', 3) as nivel,
    true as activo
FROM inventario i
JOIN centros_servicio cs ON i.centro_servicio_id = cs.id
JOIN "Bodegas_CDS" b ON cs.bodega_id = b.cds_id
WHERE i.ubicacion IS NOT NULL 
  AND TRIM(i.ubicacion) != ''
  AND NOT EXISTS (
    SELECT 1 FROM "Ubicación_CDS" u 
    WHERE u.bodega_id = b.cds_id 
    AND u.codigo = UPPER(TRIM(i.ubicacion))
  );

-- Paso 2: Agregar columna ubicacion_id a inventario
ALTER TABLE inventario 
ADD COLUMN IF NOT EXISTS ubicacion_id bigint REFERENCES "Ubicación_CDS"(id);

-- Paso 3: Crear índice para performance
CREATE INDEX IF NOT EXISTS idx_inventario_ubicacion_id ON inventario(ubicacion_id);

-- Paso 4: Actualizar inventario con los IDs de ubicación
UPDATE inventario i
SET ubicacion_id = u.id
FROM "Ubicación_CDS" u
JOIN "Bodegas_CDS" b ON u.bodega_id = b.cds_id
WHERE b.centro_servicio_id = i.centro_servicio_id
  AND UPPER(TRIM(i.ubicacion)) = u.codigo
  AND i.ubicacion IS NOT NULL 
  AND TRIM(i.ubicacion) != ''
  AND i.ubicacion_id IS NULL;

-- Paso 5: Renombrar columna original como respaldo
ALTER TABLE inventario 
RENAME COLUMN ubicacion TO ubicacion_legacy;