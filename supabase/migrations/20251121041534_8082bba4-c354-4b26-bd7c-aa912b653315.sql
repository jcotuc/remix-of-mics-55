-- Agregar rol 'asesor' al enum existente
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'asesor';