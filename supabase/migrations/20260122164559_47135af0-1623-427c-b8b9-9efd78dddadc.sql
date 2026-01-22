-- Grant permissions on diagnosticos table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnosticos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnosticos TO authenticated;

-- Grant permissions on junction tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostico_fallas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostico_fallas TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostico_causas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostico_causas TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostico_repuestos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostico_repuestos TO authenticated;

-- Grant sequence usage for auto-generated IDs
GRANT USAGE, SELECT ON SEQUENCE public.diagnosticos_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.diagnosticos_id_seq TO authenticated;