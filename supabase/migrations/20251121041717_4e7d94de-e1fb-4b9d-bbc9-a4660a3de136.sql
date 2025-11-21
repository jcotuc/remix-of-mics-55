-- Eliminar políticas RLS actuales de garantias_manuales
DROP POLICY IF EXISTS "Asesores pueden crear garantías" ON garantias_manuales;
DROP POLICY IF EXISTS "Logistica puede actualizar garantías" ON garantias_manuales;
DROP POLICY IF EXISTS "Logistica y asesores pueden ver garantías" ON garantias_manuales;

-- Crear nuevas políticas RLS

-- Asesores y mostrador pueden crear garantías (INSERT)
CREATE POLICY "Asesores pueden crear garantías"
ON garantias_manuales
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'asesor') OR 
  has_role(auth.uid(), 'mostrador') OR 
  has_role(auth.uid(), 'admin')
);

-- Asesores ven solo SUS garantías (SELECT)
CREATE POLICY "Asesores pueden ver sus propias garantías"
ON garantias_manuales
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'asesor') AND created_by = auth.uid()
);

-- Logística y Admin ven TODAS las garantías (SELECT)
CREATE POLICY "Logistica y Admin pueden ver todas las garantías"
ON garantias_manuales
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'logistica') OR 
  has_role(auth.uid(), 'admin')
);

-- Solo Logística y Admin pueden actualizar (UPDATE)
CREATE POLICY "Logistica puede actualizar garantías"
ON garantias_manuales
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'logistica') OR 
  has_role(auth.uid(), 'admin')
);