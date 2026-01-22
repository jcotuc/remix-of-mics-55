-- Permitir que el rol anon/authenticated pueda asignar técnicos (dev-bypass sin sesión)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.incidente_tecnico TO anon, authenticated;

-- Asegurar acceso a la secuencia (si existe) para inserts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
      AND c.relname = 'incidente_tecnico_id_seq'
  ) THEN
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.incidente_tecnico_id_seq TO anon, authenticated;';
  END IF;
END $$;