-- Primero eliminar el constraint existente
ALTER TABLE incidentes 
DROP CONSTRAINT IF EXISTS incidentes_codigo_cliente_fkey;

-- Recrear el constraint con ON UPDATE CASCADE
ALTER TABLE incidentes 
ADD CONSTRAINT incidentes_codigo_cliente_fkey 
FOREIGN KEY (codigo_cliente) 
REFERENCES clientes(codigo) 
ON UPDATE CASCADE 
ON DELETE RESTRICT;