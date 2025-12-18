-- Eliminar políticas anteriores de centros_servicio
DROP POLICY IF EXISTS "Admin puede gestionar centros de servicio" ON public.centros_servicio;
DROP POLICY IF EXISTS "Bodega puede ver centros de servicio" ON public.centros_servicio;

-- Crear política para que admin pueda gestionar (CRUD completo)
CREATE POLICY "Admin puede gestionar centros de servicio" 
ON public.centros_servicio 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Crear política para que todos los usuarios autenticados puedan ver centros de servicio
CREATE POLICY "Usuarios autenticados pueden ver centros de servicio" 
ON public.centros_servicio 
FOR SELECT 
USING (auth.uid() IS NOT NULL);