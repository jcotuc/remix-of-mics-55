-- Agregar columnas de precios a la tabla productos
ALTER TABLE productos
ADD COLUMN IF NOT EXISTS unidades_disponibles INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS precio_minimo NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS precio_cliente NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS precio_con_descuento NUMERIC(10,2) DEFAULT 0;