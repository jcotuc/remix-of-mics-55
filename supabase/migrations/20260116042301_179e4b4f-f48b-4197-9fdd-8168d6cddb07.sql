-- Add caja column to Ubicación_CDS table
ALTER TABLE "Ubicación_CDS" ADD COLUMN IF NOT EXISTS caja TEXT;

-- Migrate existing data: extract caja from codigo (4th part)
UPDATE "Ubicación_CDS"
SET caja = SPLIT_PART(codigo, '.', 4)
WHERE codigo LIKE '%.%.%.%' AND caja IS NULL;