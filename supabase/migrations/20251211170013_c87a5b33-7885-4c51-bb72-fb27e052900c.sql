-- Corregir familia_id de las causas de Hidrolavadoras
-- Cambiar de familia_id 81 (Hidrolavadora 4000) a familia_id 20 (Hidrolavadoras - categoría padre)
UPDATE "CDS_Causas" 
SET familia_id = 20 
WHERE familia_id = 81;