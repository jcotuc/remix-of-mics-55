-- Add missing fields to clientes table
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS correo TEXT,
ADD COLUMN IF NOT EXISTS telefono_principal TEXT,
ADD COLUMN IF NOT EXISTS telefono_secundario TEXT,
ADD COLUMN IF NOT EXISTS nombre_facturacion TEXT,
ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Guatemala',
ADD COLUMN IF NOT EXISTS departamento TEXT,
ADD COLUMN IF NOT EXISTS municipio TEXT;

-- Add missing fields to incidentes table
ALTER TABLE public.incidentes
ADD COLUMN IF NOT EXISTS sku_maquina TEXT,
ADD COLUMN IF NOT EXISTS accesorios TEXT,
ADD COLUMN IF NOT EXISTS centro_servicio TEXT,
ADD COLUMN IF NOT EXISTS quiere_envio BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ingresado_en_mostrador BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS es_reingreso BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS log_observaciones TEXT,
ADD COLUMN IF NOT EXISTS tipologia TEXT;

-- Create function to generate HPC code
CREATE OR REPLACE FUNCTION public.generar_codigo_hpc()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ultimo_numero INTEGER;
  nuevo_codigo TEXT;
BEGIN
  -- Get the last HPC number used
  SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 'HPC-(\d+)') AS INTEGER)), 0)
  INTO ultimo_numero
  FROM public.clientes
  WHERE codigo LIKE 'HPC-%';
  
  -- Generate new code
  nuevo_codigo := 'HPC-' || LPAD((ultimo_numero + 1)::TEXT, 6, '0');
  
  RETURN nuevo_codigo;
END;
$$;