
-- 1. Add producto_id column
ALTER TABLE public.repuestos 
ADD COLUMN producto_id uuid NULL;

-- 2. Migrate existing data from codigo_producto to producto_id
UPDATE public.repuestos r
SET producto_id = p.id
FROM public.productos p
WHERE r.codigo_producto = p.codigo;

-- 3. Add foreign key constraint
ALTER TABLE public.repuestos
ADD CONSTRAINT repuestos_producto_id_fkey 
FOREIGN KEY (producto_id) REFERENCES public.productos(id);

-- 4. Create index for performance
CREATE INDEX idx_repuestos_producto_id ON public.repuestos(producto_id);

-- 5. Drop old foreign key if exists
ALTER TABLE public.repuestos DROP CONSTRAINT IF EXISTS repuestos_codigo_producto_fkey;
