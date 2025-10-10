-- Add unique constraint to repuestos codigo column
ALTER TABLE public.repuestos
ADD CONSTRAINT repuestos_codigo_unique UNIQUE (codigo);