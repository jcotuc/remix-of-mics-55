-- Add new status values to the status_incidente enum
ALTER TYPE status_incidente ADD VALUE 'Pendiente entrega';
ALTER TYPE status_incidente ADD VALUE 'Logistica envio';