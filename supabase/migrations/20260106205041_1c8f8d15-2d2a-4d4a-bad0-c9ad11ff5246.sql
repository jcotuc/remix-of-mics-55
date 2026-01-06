
-- 1. Eliminar FK incorrecta en Bodegas_CDS
ALTER TABLE public."Bodegas_CDS" 
DROP CONSTRAINT IF EXISTS "Bodegas_CDS_cds_id_fkey";

-- 2. Hacer cds_id NOT NULL y UNIQUE para poder usarlo como referencia
ALTER TABLE public."Bodegas_CDS" 
ALTER COLUMN cds_id SET NOT NULL,
ALTER COLUMN cds_id SET DEFAULT gen_random_uuid();

ALTER TABLE public."Bodegas_CDS" 
ADD CONSTRAINT bodegas_cds_cds_id_unique UNIQUE (cds_id);

-- 3. Agregar columnas faltantes a Bodegas_CDS
ALTER TABLE public."Bodegas_CDS" 
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS centro_servicio_id UUID REFERENCES public.centros_servicio(id),
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Agregar columnas a Ubicación_CDS con FK a Bodegas_CDS
ALTER TABLE public."Ubicación_CDS" 
ADD COLUMN IF NOT EXISTS bodega_id UUID REFERENCES public."Bodegas_CDS"(cds_id),
ADD COLUMN IF NOT EXISTS codigo TEXT,
ADD COLUMN IF NOT EXISTS pasillo TEXT,
ADD COLUMN IF NOT EXISTS rack TEXT,
ADD COLUMN IF NOT EXISTS nivel TEXT,
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 5. Agregar bodega_id a centros_servicio
ALTER TABLE public.centros_servicio 
ADD COLUMN IF NOT EXISTS bodega_id UUID REFERENCES public."Bodegas_CDS"(cds_id);

-- 6. Migrar datos existentes de centros_servicio a Bodegas_CDS
INSERT INTO public."Bodegas_CDS" (codigo, nombre, centro_servicio_id, activo)
SELECT DISTINCT 
  cs.numero_bodega as codigo,
  'Bodega ' || cs.nombre as nombre,
  cs.id as centro_servicio_id,
  true as activo
FROM public.centros_servicio cs
WHERE cs.numero_bodega IS NOT NULL 
  AND cs.numero_bodega != ''
  AND NOT EXISTS (
    SELECT 1 FROM public."Bodegas_CDS" b WHERE b.codigo = cs.numero_bodega
  );

-- 7. Vincular centros_servicio con bodegas
UPDATE public.centros_servicio cs
SET bodega_id = b.cds_id
FROM public."Bodegas_CDS" b
WHERE b.codigo = cs.numero_bodega
  AND cs.bodega_id IS NULL;

-- 8. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_bodegas_cds_centro_servicio ON public."Bodegas_CDS"(centro_servicio_id);
CREATE INDEX IF NOT EXISTS idx_bodegas_cds_codigo ON public."Bodegas_CDS"(codigo);
CREATE INDEX IF NOT EXISTS idx_ubicacion_cds_bodega ON public."Ubicación_CDS"(bodega_id);
CREATE INDEX IF NOT EXISTS idx_ubicacion_cds_codigo ON public."Ubicación_CDS"(codigo);
CREATE INDEX IF NOT EXISTS idx_centros_servicio_bodega ON public.centros_servicio(bodega_id);

-- 9. RLS para Bodegas_CDS (ya tiene RLS habilitado pero sin policies correctas)
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver bodegas" ON public."Bodegas_CDS";
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar bodegas" ON public."Bodegas_CDS";
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar bodegas" ON public."Bodegas_CDS";

CREATE POLICY "Usuarios autenticados pueden ver bodegas" 
ON public."Bodegas_CDS" FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar bodegas" 
ON public."Bodegas_CDS" FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar bodegas" 
ON public."Bodegas_CDS" FOR UPDATE TO authenticated USING (true);

-- 10. RLS para Ubicación_CDS
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver ubicaciones" ON public."Ubicación_CDS";
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar ubicaciones" ON public."Ubicación_CDS";
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar ubicaciones" ON public."Ubicación_CDS";

CREATE POLICY "Usuarios autenticados pueden ver ubicaciones" 
ON public."Ubicación_CDS" FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar ubicaciones" 
ON public."Ubicación_CDS" FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar ubicaciones" 
ON public."Ubicación_CDS" FOR UPDATE TO authenticated USING (true);

-- 11. Triggers para updated_at
DROP TRIGGER IF EXISTS update_bodegas_cds_updated_at ON public."Bodegas_CDS";
CREATE TRIGGER update_bodegas_cds_updated_at
BEFORE UPDATE ON public."Bodegas_CDS"
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ubicacion_cds_updated_at ON public."Ubicación_CDS";
CREATE TRIGGER update_ubicacion_cds_updated_at
BEFORE UPDATE ON public."Ubicación_CDS"
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
