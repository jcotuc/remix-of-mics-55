-- Actualizar política RLS para que sea taller quien crea revisiones
DROP POLICY IF EXISTS "Control calidad y mostrador pueden crear revisiones" ON revisiones_stock_cemaco;

CREATE POLICY "Taller puede crear revisiones"
  ON revisiones_stock_cemaco FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'taller'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );