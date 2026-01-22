-- Allow the frontend (anon/authenticated) to manage FIFO queue groups
-- RLS is not used in this project, but ensure it stays disabled for these tables.
ALTER TABLE public.grupos_cola_fifo DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_cola_fifo_familias DISABLE ROW LEVEL SECURITY;

-- Table privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.grupos_cola_fifo TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.grupos_cola_fifo_familias TO anon, authenticated;

-- Sequence privileges (required for inserts with serial/identity)
GRANT USAGE, SELECT ON SEQUENCE public.grupos_cola_fifo_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.grupos_cola_fifo_familias_id_seq TO anon, authenticated;