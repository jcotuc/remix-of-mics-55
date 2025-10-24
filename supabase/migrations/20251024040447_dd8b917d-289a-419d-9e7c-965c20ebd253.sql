-- Insertar centro de servicio ZONA 5 si no existe
INSERT INTO public.centros_servicio (codigo, nombre, es_central, activo, direccion)
VALUES ('ZONA5', 'CS ZONA 5', false, true, 'Guatemala, Zona 5')
ON CONFLICT (codigo) DO NOTHING;