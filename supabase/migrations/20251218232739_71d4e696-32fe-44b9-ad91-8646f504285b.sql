-- Agregar nuevos roles al ENUM app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'auxiliar_bodega';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'auxiliar_logistica';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'supervisor_inventarios';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'capacitador';