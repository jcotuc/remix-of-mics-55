-- Agregar campos necesarios para clientes de SAP/Logística
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'mostrador' CHECK (origen IN ('mostrador', 'sap', 'logistica')),
ADD COLUMN IF NOT EXISTS codigo_sap TEXT,
ADD COLUMN IF NOT EXISTS telefono_secundario TEXT,
ADD COLUMN IF NOT EXISTS nombre_facturacion TEXT,
ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Guatemala',
ADD COLUMN IF NOT EXISTS departamento TEXT,
ADD COLUMN IF NOT EXISTS municipio TEXT,
ADD COLUMN IF NOT EXISTS direccion_envio TEXT;

-- Crear índice para búsquedas por origen
CREATE INDEX IF NOT EXISTS idx_clientes_origen ON clientes(origen);

-- Crear índice para código SAP
CREATE INDEX IF NOT EXISTS idx_clientes_codigo_sap ON clientes(codigo_sap);

-- Actualizar clientes existentes basado en el formato de código
UPDATE clientes 
SET origen = 'mostrador' 
WHERE codigo LIKE 'HPC-%' AND origen IS NULL;

UPDATE clientes 
SET origen = 'sap',
    codigo_sap = codigo
WHERE codigo NOT LIKE 'HPC-%' AND codigo LIKE 'HPC%' AND origen IS NULL;