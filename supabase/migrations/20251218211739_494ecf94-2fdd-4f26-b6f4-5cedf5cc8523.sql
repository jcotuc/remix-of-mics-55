-- Agregar centro_servicio_id a profiles para vincular usuarios con centros
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS centro_servicio_id uuid REFERENCES public.centros_servicio(id);

-- Agregar costo_unitario y bodega a stock_departamental
ALTER TABLE public.stock_departamental 
ADD COLUMN IF NOT EXISTS costo_unitario numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bodega text;

-- Crear tabla de recomendaciones vinculadas a familias hijas
CREATE TABLE IF NOT EXISTS public.recomendaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_hija_id bigint NOT NULL REFERENCES public."CDS_Familias"(id),
  titulo text NOT NULL,
  descripcion text,
  tipo text DEFAULT 'general',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS en recomendaciones
ALTER TABLE public.recomendaciones ENABLE ROW LEVEL SECURITY;

-- Política: Admin puede gestionar recomendaciones
CREATE POLICY "Admin puede gestionar recomendaciones"
ON public.recomendaciones
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Política: Usuarios autenticados pueden ver recomendaciones
CREATE POLICY "Usuarios autenticados pueden ver recomendaciones"
ON public.recomendaciones
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Política para que admin pueda gestionar centros de servicio (INSERT, UPDATE, DELETE)
CREATE POLICY "Admin puede gestionar centros de servicio"
ON public.centros_servicio
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Política para que admin pueda actualizar profiles (para cambiar centro_servicio_id)
CREATE POLICY "Admin puede actualizar profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Política para que admin pueda ver todos los profiles
CREATE POLICY "Admin puede ver todos los profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Trigger para updated_at en recomendaciones
CREATE TRIGGER update_recomendaciones_updated_at
BEFORE UPDATE ON public.recomendaciones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();