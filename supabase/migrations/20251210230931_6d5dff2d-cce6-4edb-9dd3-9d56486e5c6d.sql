-- Enable RLS on CDS_Familias if not already enabled
ALTER TABLE public."CDS_Familias" ENABLE ROW LEVEL SECURITY;

-- Policy for admin to manage all families
CREATE POLICY "Admin puede gestionar familias"
ON public."CDS_Familias"
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy for all authenticated users to view families
CREATE POLICY "Usuarios autenticados pueden ver familias"
ON public."CDS_Familias"
FOR SELECT
USING (auth.uid() IS NOT NULL);