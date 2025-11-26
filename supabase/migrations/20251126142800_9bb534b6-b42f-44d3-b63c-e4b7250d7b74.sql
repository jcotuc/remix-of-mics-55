-- Agregar nuevos roles al enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'gerente_centro';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'supervisor_regional';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'jefe_logistica';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'jefe_bodega';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'supervisor_bodega';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'supervisor_calidad';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'supervisor_sac';