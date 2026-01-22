-- Grant full CRUD permissions to anon role for core tables
GRANT INSERT, UPDATE, DELETE ON public.clientes TO anon;
GRANT INSERT, UPDATE, DELETE ON public.incidentes TO anon;
GRANT INSERT, UPDATE, DELETE ON public.direcciones TO anon;
GRANT INSERT, UPDATE, DELETE ON public.incidente_fotos TO anon;
GRANT INSERT, UPDATE, DELETE ON public.incidente_accesorios TO anon;
GRANT INSERT, UPDATE, DELETE ON public.diagnosticos TO anon;
GRANT INSERT, UPDATE, DELETE ON public.comentarios TO anon;
GRANT INSERT, UPDATE, DELETE ON public.incidente_repuesto TO anon;
GRANT INSERT, UPDATE, DELETE ON public.incidente_tecnico TO anon;
GRANT INSERT, UPDATE, DELETE ON public.incidente_participacion TO anon;
GRANT INSERT, UPDATE, DELETE ON public.guias TO anon;
GRANT INSERT, UPDATE, DELETE ON public.garantias_manuales TO anon;
GRANT INSERT, UPDATE, DELETE ON public.auditorias_calidad TO anon;
GRANT INSERT, UPDATE, DELETE ON public.solicitudes_repuestos TO anon;
GRANT INSERT, UPDATE, DELETE ON public.movimientos_inventario TO anon;
GRANT INSERT, UPDATE, DELETE ON public.asignaciones_sac TO anon;
GRANT INSERT, UPDATE, DELETE ON public.cotizaciones TO anon;

-- Ensure sequence permissions for auto-increment IDs
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;