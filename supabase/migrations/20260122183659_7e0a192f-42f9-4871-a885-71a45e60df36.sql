-- Grant full CRUD permissions on all taller-related tables to anon and authenticated roles

-- grupos_cola_fifo
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos_cola_fifo TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.grupos_cola_fifo_id_seq TO anon, authenticated;

-- grupos_cola_fifo_familias
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos_cola_fifo_familias TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.grupos_cola_fifo_familias_id_seq TO anon, authenticated;

-- configuracion_fifo_centro
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracion_fifo_centro TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.configuracion_fifo_centro_id_seq TO anon, authenticated;

-- incidente_tecnico
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidente_tecnico TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.incidente_tecnico_id_seq TO anon, authenticated;

-- diagnosticos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnosticos TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.diagnosticos_id_seq TO anon, authenticated;

-- diagnostico_causas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostico_causas TO anon, authenticated;

-- diagnostico_fallas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostico_fallas TO anon, authenticated;

-- diagnostico_repuestos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostico_repuestos TO anon, authenticated;

-- incidente_repuesto
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidente_repuesto TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.incidente_repuesto_id_seq TO anon, authenticated;

-- solicitudes_repuestos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitudes_repuestos TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.solicitudes_repuestos_id_seq TO anon, authenticated;

-- pedidos_bodega_central
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos_bodega_central TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.pedidos_bodega_central_id_seq TO anon, authenticated;

-- familias_producto
GRANT SELECT, INSERT, UPDATE, DELETE ON public.familias_producto TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.familias_producto_id_seq TO anon, authenticated;

-- causas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.causas TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.causas_id_seq TO anon, authenticated;

-- fallas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fallas TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.fallas_id_seq TO anon, authenticated;

-- centros_de_servicio
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centros_de_servicio TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.centros_de_servicio_id_seq TO anon, authenticated;

-- usuarios (for technician assignments)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.usuarios_id_seq TO anon, authenticated;

-- incidentes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidentes TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.incidentes_id_seq TO anon, authenticated;