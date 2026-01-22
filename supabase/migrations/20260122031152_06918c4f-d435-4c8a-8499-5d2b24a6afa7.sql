-- Secuencia para códigos de incidente
CREATE SEQUENCE IF NOT EXISTS public.incidente_codigo_seq START WITH 1;

-- Sincronizar con el máximo código existente
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(codigo, '[^0-9]', '', 'g'), '')::INTEGER), 0)
  INTO max_num
  FROM public.incidentes
  WHERE codigo IS NOT NULL;
  
  IF max_num > 0 THEN
    PERFORM setval('public.incidente_codigo_seq', max_num);
  END IF;
END $$;

-- Secuencia para códigos HPC de clientes
CREATE SEQUENCE IF NOT EXISTS public.cliente_hpc_seq START WITH 1;

-- Sincronizar con el máximo código HPC existente
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(codigo, '[^0-9]', '', 'g'), '')::INTEGER), 0)
  INTO max_num
  FROM public.clientes
  WHERE codigo LIKE 'HPC%';
  
  IF max_num > 0 THEN
    PERFORM setval('public.cliente_hpc_seq', max_num);
  END IF;
END $$;

-- Función para generar código de incidente
CREATE OR REPLACE FUNCTION public.generar_codigo_incidente()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  next_val := nextval('public.incidente_codigo_seq');
  RETURN 'INC' || LPAD(next_val::TEXT, 6, '0');
END;
$$;

-- Función para generar código HPC
CREATE OR REPLACE FUNCTION public.generar_codigo_hpc()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  next_val := nextval('public.cliente_hpc_seq');
  RETURN 'HPC' || LPAD(next_val::TEXT, 6, '0');
END;
$$;

-- Permisos para las secuencias
GRANT USAGE, SELECT ON SEQUENCE public.incidente_codigo_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.cliente_hpc_seq TO anon, authenticated;

-- Permisos para ejecutar las funciones
GRANT EXECUTE ON FUNCTION public.generar_codigo_incidente() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generar_codigo_hpc() TO anon, authenticated;