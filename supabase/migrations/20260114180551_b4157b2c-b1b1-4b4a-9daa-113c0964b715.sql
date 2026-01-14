-- Add column to track if client approved the budget
ALTER TABLE incidentes ADD COLUMN presupuesto_cliente_aprobado boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN incidentes.presupuesto_cliente_aprobado IS 'Indica si el cliente aprobó el presupuesto y el incidente regresa a cola de reparación';