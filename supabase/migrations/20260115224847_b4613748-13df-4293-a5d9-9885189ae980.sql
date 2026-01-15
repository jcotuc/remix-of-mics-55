-- Función para contar asignaciones activas de un técnico
CREATE OR REPLACE FUNCTION public.contar_asignaciones_tecnico(tecnico_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM incidentes
  WHERE tecnico_asignado_id = tecnico_id
    AND status = 'En diagnostico'
$$;