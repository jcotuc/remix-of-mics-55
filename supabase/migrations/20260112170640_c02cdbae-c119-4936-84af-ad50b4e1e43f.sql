-- Create table for FIFO queue groups per service center
CREATE TABLE public.grupos_cola_fifo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_servicio_id UUID NOT NULL REFERENCES public.centros_servicio(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL,
  activo BOOLEAN DEFAULT true,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(centro_servicio_id, nombre),
  UNIQUE(centro_servicio_id, orden)
);

-- Create junction table for groups and families (many-to-many)
CREATE TABLE public.grupos_cola_fifo_familias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos_cola_fifo(id) ON DELETE CASCADE,
  familia_abuelo_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(grupo_id, familia_abuelo_id)
);

-- Enable RLS
ALTER TABLE public.grupos_cola_fifo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_cola_fifo_familias ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grupos_cola_fifo
CREATE POLICY "Authenticated users can view grupos_cola_fifo"
ON public.grupos_cola_fifo FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert grupos_cola_fifo"
ON public.grupos_cola_fifo FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update grupos_cola_fifo"
ON public.grupos_cola_fifo FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete grupos_cola_fifo"
ON public.grupos_cola_fifo FOR DELETE
TO authenticated
USING (true);

-- RLS Policies for grupos_cola_fifo_familias
CREATE POLICY "Authenticated users can view grupos_cola_fifo_familias"
ON public.grupos_cola_fifo_familias FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert grupos_cola_fifo_familias"
ON public.grupos_cola_fifo_familias FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update grupos_cola_fifo_familias"
ON public.grupos_cola_fifo_familias FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete grupos_cola_fifo_familias"
ON public.grupos_cola_fifo_familias FOR DELETE
TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_grupos_cola_fifo_updated_at
BEFORE UPDATE ON public.grupos_cola_fifo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();