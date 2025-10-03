-- Crear el nuevo enum con todos los estados
CREATE TYPE status_incidente_new AS ENUM (
  'Ingresado',
  'En ruta',
  'Pendiente de diagnostico',
  'En diagnostico',
  'Pendiente por repuestos',
  'Presupuesto',
  'Porcentaje',
  'Reparado',
  'Cambio por garantia',
  'Nota de credito',
  'Bodega pedido',
  'Rechazado'
);

-- Remover el default temporalmente
ALTER TABLE incidentes ALTER COLUMN status DROP DEFAULT;

-- Migrar la columna status al nuevo tipo
ALTER TABLE incidentes 
  ALTER COLUMN status TYPE status_incidente_new 
  USING (
    CASE status::text
      WHEN 'Ingresado' THEN 'Ingresado'::status_incidente_new
      WHEN 'En ruta' THEN 'En ruta'::status_incidente_new
      WHEN 'Pendiente de diagnostico' THEN 'Pendiente de diagnostico'::status_incidente_new
      WHEN 'En diagnostico' THEN 'En diagnostico'::status_incidente_new
      WHEN 'Pendiente repuestos' THEN 'Pendiente por repuestos'::status_incidente_new
      WHEN 'pendiente repuestos' THEN 'Pendiente por repuestos'::status_incidente_new
      WHEN 'Reparacion en garantia' THEN 'Reparado'::status_incidente_new
      WHEN 'Mantenimiento' THEN 'Reparado'::status_incidente_new
      WHEN 'Reparado' THEN 'Reparado'::status_incidente_new
      WHEN 'Presupuesto' THEN 'Presupuesto'::status_incidente_new
      WHEN 'Canje' THEN 'Cambio por garantia'::status_incidente_new
      WHEN 'Nota de credito' THEN 'Nota de credito'::status_incidente_new
      WHEN 'Cambio por garantia' THEN 'Cambio por garantia'::status_incidente_new
      ELSE 'Ingresado'::status_incidente_new
    END
  );

-- Restaurar el default con el nuevo tipo
ALTER TABLE incidentes ALTER COLUMN status SET DEFAULT 'Ingresado'::status_incidente_new;

-- Eliminar el tipo viejo y renombrar el nuevo
DROP TYPE status_incidente;
ALTER TYPE status_incidente_new RENAME TO status_incidente;

-- Agregar campos para herramienta manual y confirmaciones
ALTER TABLE incidentes
  ADD COLUMN IF NOT EXISTS es_herramienta_manual boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS familia_producto text,
  ADD COLUMN IF NOT EXISTS confirmacion_cliente jsonb,
  ADD COLUMN IF NOT EXISTS producto_sugerido_alternativo text;

-- Agregar campos de facturación a clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS direccion_envio text;

-- Agregar campos a repuestos para control de stock y venta en mostrador
ALTER TABLE repuestos
  ADD COLUMN IF NOT EXISTS stock_actual integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ubicacion_bodega text,
  ADD COLUMN IF NOT EXISTS disponible_mostrador boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS es_catalogo_truper boolean DEFAULT false;

-- Crear tabla para cotizaciones de consulta de precios
CREATE TABLE IF NOT EXISTS cotizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_cliente text NOT NULL,
  codigo_producto text NOT NULL,
  cantidad integer NOT NULL DEFAULT 1,
  precio_unitario numeric(10,2),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for cotizaciones" 
ON cotizaciones 
FOR ALL 
USING (true) 
WITH CHECK (true);