-- Crear bucket de storage para fotos de incidentes
INSERT INTO storage.buckets (id, name, public)
VALUES ('incidente-fotos', 'incidente-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Crear tabla para almacenar referencias a fotos de incidentes
CREATE TABLE IF NOT EXISTS public.incidente_fotos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incidente_id UUID NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso', 'salida', 'diagnostico', 'reparacion')),
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS en la tabla
ALTER TABLE public.incidente_fotos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para incidente_fotos
CREATE POLICY "Usuarios autenticados pueden ver fotos"
ON public.incidente_fotos
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden insertar fotos"
ON public.incidente_fotos
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Usuarios pueden actualizar sus fotos"
ON public.incidente_fotos
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Usuarios pueden eliminar sus fotos"
ON public.incidente_fotos
FOR DELETE
USING (auth.uid() = created_by);

-- Políticas de Storage para el bucket incidente-fotos
CREATE POLICY "Usuarios autenticados pueden subir fotos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'incidente-fotos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Fotos de incidentes son públicamente visibles"
ON storage.objects
FOR SELECT
USING (bucket_id = 'incidente-fotos');

CREATE POLICY "Usuarios pueden actualizar sus fotos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'incidente-fotos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Usuarios pueden eliminar sus fotos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'incidente-fotos' 
  AND auth.uid() IS NOT NULL
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_incidente_fotos_incidente_id ON public.incidente_fotos(incidente_id);
CREATE INDEX IF NOT EXISTS idx_incidente_fotos_tipo ON public.incidente_fotos(tipo);
CREATE INDEX IF NOT EXISTS idx_incidente_fotos_created_at ON public.incidente_fotos(created_at);