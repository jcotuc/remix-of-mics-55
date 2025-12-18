-- Corregir productos importados sin categoría asignándoles "Herramienta manual" (id=130)
UPDATE productos 
SET familia_padre_id = 130, updated_at = now()
WHERE familia_padre_id IS NULL;