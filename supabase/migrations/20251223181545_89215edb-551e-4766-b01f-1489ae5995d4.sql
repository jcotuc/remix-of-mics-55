
-- Re-add codigo_producto column for backward compatibility
ALTER TABLE public.repuestos 
ADD COLUMN codigo_producto text;

-- Populate codigo_producto from productos table via producto_id
UPDATE public.repuestos r
SET codigo_producto = p.codigo
FROM public.productos p
WHERE r.producto_id = p.id;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_repuestos_codigo_producto ON public.repuestos(codigo_producto);
