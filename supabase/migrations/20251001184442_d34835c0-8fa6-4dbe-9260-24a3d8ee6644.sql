-- Delete all existing incidents and media files
DELETE FROM media_files;
DELETE FROM incidentes;

-- Delete all existing clients
DELETE FROM clientes;

-- Drop the foreign key constraint that's causing the error
ALTER TABLE incidentes DROP CONSTRAINT IF EXISTS incidentes_codigo_tecnico_fkey;

-- Make codigo_tecnico nullable since we don't have technicians yet
ALTER TABLE incidentes ALTER COLUMN codigo_tecnico DROP NOT NULL;

-- Add some default technicians for testing
INSERT INTO tecnicos (codigo, nombre, apellido, email) VALUES
('TEC-001', 'Juan', 'Pérez', 'juan.perez@example.com'),
('TEC-002', 'María', 'García', 'maria.garcia@example.com'),
('TEC-003', 'Carlos', 'López', 'carlos.lopez@example.com');