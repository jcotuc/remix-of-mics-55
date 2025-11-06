-- Eliminar la política restrictiva actual para INSERT
DROP POLICY IF EXISTS "Technicians can create parts requests" ON public.solicitudes_repuestos;

-- Crear nueva política que permite a cualquier usuario autenticado crear solicitudes
CREATE POLICY "Authenticated users can create parts requests" 
ON public.solicitudes_repuestos 
FOR INSERT 
TO authenticated
WITH CHECK (true);