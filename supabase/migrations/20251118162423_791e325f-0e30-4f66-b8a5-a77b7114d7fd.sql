-- Crear tabla para auditoría de ingresos en logística
CREATE TABLE ingresos_logistica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID NOT NULL REFERENCES incidentes(id) ON DELETE CASCADE,
  recibido_por UUID REFERENCES auth.users(id),
  fecha_recepcion TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sku_original TEXT NOT NULL,
  sku_corregido TEXT,
  fotos_urls TEXT[] NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE ingresos_logistica ENABLE ROW LEVEL SECURITY;

-- Política: Solo logística y admin pueden gestionar ingresos
CREATE POLICY "Logistica puede gestionar ingresos"
  ON ingresos_logistica FOR ALL
  USING (
    has_role(auth.uid(), 'logistica'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'logistica'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );