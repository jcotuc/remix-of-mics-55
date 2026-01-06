-- Crear tabla de accesorios por familia
CREATE TABLE "CDS_Accesorios" (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  familia_id BIGINT REFERENCES "CDS_Familias"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas por familia
CREATE INDEX idx_accesorios_familia ON "CDS_Accesorios"(familia_id);

-- Habilitar RLS
ALTER TABLE "CDS_Accesorios" ENABLE ROW LEVEL SECURITY;

-- Política para que admin pueda gestionar accesorios
CREATE POLICY "Admin puede gestionar accesorios"
ON "CDS_Accesorios"
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Política para que usuarios autenticados puedan ver accesorios
CREATE POLICY "Usuarios autenticados pueden ver accesorios"
ON "CDS_Accesorios"
FOR SELECT
USING (auth.uid() IS NOT NULL);