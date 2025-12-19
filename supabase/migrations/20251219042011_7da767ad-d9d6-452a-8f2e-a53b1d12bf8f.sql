-- Agregar política para que usuarios autenticados puedan ver perfiles (solo lectura)
CREATE POLICY "Usuarios autenticados pueden ver perfiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Agregar política para que usuarios autenticados puedan ver roles (solo lectura)
CREATE POLICY "Usuarios autenticados pueden ver roles"
ON public.user_roles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Agregar política para que usuarios autenticados puedan ver asignaciones de centros-supervisor (solo lectura)
CREATE POLICY "Usuarios autenticados pueden ver asignaciones centros"
ON public.centros_supervisor FOR SELECT
USING (auth.uid() IS NOT NULL);