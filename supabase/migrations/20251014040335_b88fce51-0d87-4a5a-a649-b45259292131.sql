-- Update existing repuestos with random stock
UPDATE public.repuestos
SET stock_actual = floor(random() * 100)::integer;

-- Insert random stock for each repuesto in each service center
INSERT INTO public.stock_departamental (codigo_repuesto, centro_servicio_id, cantidad_actual, stock_minimo, stock_maximo, ubicacion)
SELECT 
  r.codigo,
  cs.id,
  floor(random() * 50)::integer as cantidad_actual,
  floor(random() * 10 + 5)::integer as stock_minimo,
  floor(random() * 30 + 20)::integer as stock_maximo,
  CASE 
    WHEN random() < 0.3 THEN 'Pasillo A'
    WHEN random() < 0.6 THEN 'Pasillo B'
    ELSE 'Pasillo C'
  END as ubicacion
FROM public.repuestos r
CROSS JOIN public.centros_servicio cs
WHERE cs.activo = true
ON CONFLICT DO NOTHING;