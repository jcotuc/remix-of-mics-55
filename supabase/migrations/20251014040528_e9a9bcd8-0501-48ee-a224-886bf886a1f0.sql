-- Asignar clasificación ABC aleatoria a todos los repuestos
INSERT INTO public.repuestos_clasificacion_abc (
  codigo_repuesto,
  clasificacion,
  frecuencia_uso,
  valor_rotacion,
  stock_minimo_sugerido,
  stock_maximo_sugerido
)
SELECT 
  codigo,
  CASE 
    WHEN random() < 0.2 THEN 'A'::clasificacion_abc
    WHEN random() < 0.5 THEN 'B'::clasificacion_abc
    ELSE 'C'::clasificacion_abc
  END as clasificacion,
  floor(random() * 100)::integer as frecuencia_uso,
  random() * 1000 as valor_rotacion,
  floor(random() * 10 + 5)::integer as stock_minimo_sugerido,
  floor(random() * 30 + 20)::integer as stock_maximo_sugerido
FROM public.repuestos
ON CONFLICT DO NOTHING;