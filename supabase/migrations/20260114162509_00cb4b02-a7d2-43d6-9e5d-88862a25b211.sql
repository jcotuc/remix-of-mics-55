-- Agregar el valor 'Entregado' al enum status_incidente
ALTER TYPE status_incidente ADD VALUE IF NOT EXISTS 'Entregado';