-- Sequences for code generation
CREATE SEQUENCE IF NOT EXISTS public.incidente_codigo_seq;
CREATE SEQUENCE IF NOT EXISTS public.cliente_codigo_hpc_seq;

-- Align sequences with existing data (if any)
DO $$
DECLARE
  max_inc BIGINT;
  max_cli BIGINT;
BEGIN
  SELECT MAX((substring(codigo from 5))::bigint)
    INTO max_inc
  FROM public.incidentes
  WHERE codigo ~ '^INC-[0-9]+$';

  IF max_inc IS NULL OR max_inc < 1 THEN
    PERFORM setval('public.incidente_codigo_seq', 1, false);
  ELSE
    PERFORM setval('public.incidente_codigo_seq', max_inc, true);
  END IF;

  SELECT MAX((substring(codigo from 4))::bigint)
    INTO max_cli
  FROM public.clientes
  WHERE codigo ~ '^HPC[0-9]+$';

  IF max_cli IS NULL OR max_cli < 1 THEN
    PERFORM setval('public.cliente_codigo_hpc_seq', 1, false);
  ELSE
    PERFORM setval('public.cliente_codigo_hpc_seq', max_cli, true);
  END IF;
END $$;

-- RPC: Generar código de incidente (INC-000001)
CREATE OR REPLACE FUNCTION public.generar_codigo_incidente()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n BIGINT;
BEGIN
  n := nextval('public.incidente_codigo_seq');
  RETURN 'INC-' || lpad(n::text, 6, '0');
END;
$$;

-- RPC: Generar código HPC para cliente (HPC000001)
CREATE OR REPLACE FUNCTION public.generar_codigo_hpc()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n BIGINT;
BEGIN
  n := nextval('public.cliente_codigo_hpc_seq');
  RETURN 'HPC' || lpad(n::text, 6, '0');
END;
$$;

-- Grants (required for anon/authenticated to call rpc + use sequences)
GRANT USAGE, SELECT ON SEQUENCE public.incidente_codigo_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.cliente_codigo_hpc_seq TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.generar_codigo_incidente() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generar_codigo_hpc() TO anon, authenticated;