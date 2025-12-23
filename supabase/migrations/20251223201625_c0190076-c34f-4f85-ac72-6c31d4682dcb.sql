-- Agregar campo tipo_despacho a solicitudes_repuestos
ALTER TABLE solicitudes_repuestos 
ADD COLUMN IF NOT EXISTS tipo_despacho TEXT DEFAULT 'bodega';

-- Comentario para documentar valores válidos
COMMENT ON COLUMN solicitudes_repuestos.tipo_despacho IS 'Tipo de despacho: bodega | autoservicio';