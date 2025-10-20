-- Agregar constraint único al campo codigo de clientes
ALTER TABLE clientes 
ADD CONSTRAINT clientes_codigo_unique UNIQUE (codigo);