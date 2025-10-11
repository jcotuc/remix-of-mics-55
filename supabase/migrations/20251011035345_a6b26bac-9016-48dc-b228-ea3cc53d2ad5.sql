-- Agregar nuevos roles al enum (en transacciones separadas)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'digitador') THEN
    ALTER TYPE app_role ADD VALUE 'digitador';
  END IF;
END $$;