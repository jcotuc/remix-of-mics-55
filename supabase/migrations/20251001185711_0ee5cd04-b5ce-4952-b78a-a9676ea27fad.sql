-- Add codigo column to incidentes table
ALTER TABLE incidentes ADD COLUMN codigo TEXT;

-- Create function to generate incident codes (INC-000001, INC-000002, etc.)
CREATE OR REPLACE FUNCTION generar_codigo_incidente()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ultimo_numero INTEGER;
  nuevo_codigo TEXT;
BEGIN
  -- Get the last incident number used
  SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 'INC-(\d+)') AS INTEGER)), 0)
  INTO ultimo_numero
  FROM public.incidentes
  WHERE codigo LIKE 'INC-%';
  
  -- Generate new code
  nuevo_codigo := 'INC-' || LPAD((ultimo_numero + 1)::TEXT, 6, '0');
  
  RETURN nuevo_codigo;
END;
$$;

-- Add unique constraint to codigo
ALTER TABLE incidentes ADD CONSTRAINT incidentes_codigo_key UNIQUE (codigo);

-- Update existing records to have codes (if any exist)
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  FOR rec IN SELECT id FROM incidentes WHERE codigo IS NULL ORDER BY fecha_ingreso
  LOOP
    UPDATE incidentes 
    SET codigo = 'INC-' || LPAD(counter::TEXT, 6, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Make codigo NOT NULL after setting values
ALTER TABLE incidentes ALTER COLUMN codigo SET NOT NULL;