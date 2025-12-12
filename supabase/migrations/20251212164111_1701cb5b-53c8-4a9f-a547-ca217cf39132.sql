-- Add UNIQUE constraint to Código column for upsert to work
ALTER TABLE public.repuestos_relaciones
ADD CONSTRAINT repuestos_relaciones_codigo_unique UNIQUE ("Código");