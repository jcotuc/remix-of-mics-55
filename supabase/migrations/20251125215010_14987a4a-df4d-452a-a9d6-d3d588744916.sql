-- Agregar columnas a incidentes para herramientas manuales
ALTER TABLE incidentes 
ADD COLUMN IF NOT EXISTS estado_fisico_recepcion TEXT,
ADD COLUMN IF NOT EXISTS observaciones_recepcion TEXT,
ADD COLUMN IF NOT EXISTS garantia_manual_id UUID REFERENCES garantias_manuales(id);

-- Agregar columnas a garantias_manuales para vincular con incidentes
ALTER TABLE garantias_manuales 
ADD COLUMN IF NOT EXISTS incidente_id UUID REFERENCES incidentes(id),
ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'asesor';

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_incidentes_garantia_manual ON incidentes(garantia_manual_id);
CREATE INDEX IF NOT EXISTS idx_garantias_manuales_incidente ON garantias_manuales(incidente_id);
CREATE INDEX IF NOT EXISTS idx_garantias_manuales_origen ON garantias_manuales(origen);

-- Comentarios para documentación
COMMENT ON COLUMN incidentes.estado_fisico_recepcion IS 'Estado físico de la herramienta al momento de recepción: Bueno, Regular, Malo, Dañado';
COMMENT ON COLUMN incidentes.observaciones_recepcion IS 'Observaciones adicionales sobre el estado de la herramienta al recibirla';
COMMENT ON COLUMN incidentes.garantia_manual_id IS 'Referencia a garantia_manual si este incidente proviene de una garantía de asesor';
COMMENT ON COLUMN garantias_manuales.incidente_id IS 'Referencia al incidente creado para esta garantía manual';
COMMENT ON COLUMN garantias_manuales.origen IS 'Origen de la garantía: asesor (reportada remotamente) o mostrador (recepción física)';