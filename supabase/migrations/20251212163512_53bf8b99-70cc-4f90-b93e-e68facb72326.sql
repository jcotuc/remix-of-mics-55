-- Add RLS policy for repuestos_relaciones table to allow all operations
CREATE POLICY "Enable all operations for repuestos_relaciones"
ON public.repuestos_relaciones
FOR ALL
USING (true)
WITH CHECK (true);