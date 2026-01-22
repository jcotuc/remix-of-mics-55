-- Permisos para tabla clientes
GRANT SELECT, INSERT, UPDATE ON public.clientes TO anon;
GRANT SELECT, INSERT, UPDATE ON public.clientes TO authenticated;

-- Permisos para tabla incidentes  
GRANT SELECT, INSERT, UPDATE ON public.incidentes TO anon;
GRANT SELECT, INSERT, UPDATE ON public.incidentes TO authenticated;

-- Permisos para tabla direcciones_envio
GRANT SELECT, INSERT, UPDATE ON public.direcciones_envio TO anon;
GRANT SELECT, INSERT, UPDATE ON public.direcciones_envio TO authenticated;

-- Permisos para tabla incidente_fotos
GRANT SELECT, INSERT ON public.incidente_fotos TO anon;
GRANT SELECT, INSERT ON public.incidente_fotos TO authenticated;

-- Permisos para tabla incidente_accesorios
GRANT SELECT, INSERT ON public.incidente_accesorios TO anon;
GRANT SELECT, INSERT ON public.incidente_accesorios TO authenticated;

-- Permisos para secuencias (auto-increment IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Tablas de solo lectura para el formulario
GRANT SELECT ON public.centros_de_servicio TO anon, authenticated;
GRANT SELECT ON public.productos TO anon, authenticated;
GRANT SELECT ON public.accesorios TO anon, authenticated;
GRANT SELECT ON public.direcciones TO anon, authenticated;
GRANT SELECT ON public.familias_producto TO anon, authenticated;
GRANT SELECT ON public.usuarios TO anon, authenticated;