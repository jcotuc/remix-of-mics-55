-- Agregar campos para gestión de puerta de entrada en stock_departamental
ALTER TABLE stock_departamental
ADD COLUMN IF NOT EXISTS ubicacion_temporal text,
ADD COLUMN IF NOT EXISTS requiere_reubicacion boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_recepcion timestamp with time zone;

-- Agregar tipo de movimiento 'reubicacion' al enum
ALTER TYPE tipo_movimiento_inventario ADD VALUE IF NOT EXISTS 'reubicacion';

-- Crear índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_stock_requiere_reubicacion 
ON stock_departamental(requiere_reubicacion) 
WHERE requiere_reubicacion = true;

CREATE INDEX IF NOT EXISTS idx_stock_ubicacion_temporal 
ON stock_departamental(ubicacion_temporal) 
WHERE ubicacion_temporal IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN stock_departamental.ubicacion_temporal IS 'Ubicación temporal en puerta de entrada antes de reubicar';
COMMENT ON COLUMN stock_departamental.requiere_reubicacion IS 'Indica si el repuesto está en puerta y requiere reubicación';
COMMENT ON COLUMN stock_departamental.fecha_recepcion IS 'Fecha y hora de llegada a puerta de entrada';