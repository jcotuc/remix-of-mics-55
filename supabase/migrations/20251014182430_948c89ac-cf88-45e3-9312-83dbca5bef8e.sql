-- Permitir a SAC ver los detalles de repuestos para poder mostrar información completa del incidente
DROP POLICY IF EXISTS "SAC puede ver detalles de repuestos" ON repuestos_solicitud_detalle;

CREATE POLICY "SAC puede ver detalles de repuestos"
ON repuestos_solicitud_detalle
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'sac'::app_role) OR 
  has_role(auth.uid(), 'bodega'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);