-- Crear tabla de puestos personalizados
CREATE TABLE public.puestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  descripcion text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.puestos ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden gestionar puestos
CREATE POLICY "Admin puede gestionar puestos"
ON public.puestos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Política: Usuarios autenticados pueden ver puestos
CREATE POLICY "Usuarios autenticados pueden ver puestos"
ON public.puestos
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_puestos_updated_at
  BEFORE UPDATE ON public.puestos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();