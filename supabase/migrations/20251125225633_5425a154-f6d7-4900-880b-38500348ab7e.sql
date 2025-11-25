-- Agregar el estado "Pendiente de aprobación NC" al enum status_incidente
ALTER TYPE status_incidente ADD VALUE IF NOT EXISTS 'Pendiente de aprobación NC';