-- Add familia_producto column to productos table
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS familia_producto TEXT;

-- Add comment to document possible values
COMMENT ON COLUMN productos.familia_producto IS 'Possible values: Electricas, Neumaticas, Hidraulicas, Compresores, Bombas, 2 Tiempos, Estacionarias, Hidrolavadoras, Herramienta Manual';

-- Update products 15679 and 16441 to Electricas family
UPDATE productos 
SET familia_producto = 'Electricas'
WHERE codigo IN ('15679', '16441');