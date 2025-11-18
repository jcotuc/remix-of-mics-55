-- 1. Agregar campo identificador en tabla incidentes
ALTER TABLE incidentes 
ADD COLUMN IF NOT EXISTS es_stock_cemaco BOOLEAN DEFAULT false;

-- 2. Crear nueva tabla revisiones_stock_cemaco para auditoría
CREATE TABLE IF NOT EXISTS revisiones_stock_cemaco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID NOT NULL REFERENCES incidentes(id) ON DELETE CASCADE,
  fecha_revision TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revisor_id UUID REFERENCES auth.users(id),
  observaciones TEXT,
  fotos_urls TEXT[],
  decision TEXT NOT NULL CHECK (decision IN ('aprobado', 'rechazado')),
  justificacion TEXT NOT NULL CHECK (LENGTH(justificacion) >= 20),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS en la nueva tabla
ALTER TABLE revisiones_stock_cemaco ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies para seguridad
CREATE POLICY "Control calidad y mostrador pueden crear revisiones"
  ON revisiones_stock_cemaco FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'control_calidad') OR 
    has_role(auth.uid(), 'mostrador') OR 
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Solo jefes pueden aprobar revisiones"
  ON revisiones_stock_cemaco FOR UPDATE
  USING (
    has_role(auth.uid(), 'jefe_taller') OR 
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Ver revisiones stock cemaco"
  ON revisiones_stock_cemaco FOR SELECT
  USING (true);

-- 5. Trigger para validar que solo incidentes de stock cemaco puedan tener revisiones
CREATE OR REPLACE FUNCTION validar_revision_stock_cemaco()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM incidentes 
    WHERE id = NEW.incidente_id AND es_stock_cemaco = true
  ) THEN
    RAISE EXCEPTION 'Solo se pueden crear revisiones para incidentes de stock Cemaco';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_validar_revision_stock
  BEFORE INSERT ON revisiones_stock_cemaco
  FOR EACH ROW EXECUTE FUNCTION validar_revision_stock_cemaco();

-- 6. Trigger para prevenir cambios manuales de status para stock cemaco
CREATE OR REPLACE FUNCTION validar_cambio_status_stock_cemaco()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.es_stock_cemaco = true AND NEW.status != OLD.status THEN
    -- Solo permitir cambios autorizados
    IF NEW.status NOT IN ('Ingresado', 'Pendiente de aprobación NC', 'Nota de credito', 'Rechazado') THEN
      RAISE EXCEPTION 'Status inválido para incidente de stock Cemaco: %', NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_validar_status_stock
  BEFORE UPDATE ON incidentes
  FOR EACH ROW EXECUTE FUNCTION validar_cambio_status_stock_cemaco();

-- 7. Trigger para actualizar updated_at en revisiones_stock_cemaco
CREATE TRIGGER update_revisiones_stock_cemaco_updated_at
  BEFORE UPDATE ON revisiones_stock_cemaco
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();