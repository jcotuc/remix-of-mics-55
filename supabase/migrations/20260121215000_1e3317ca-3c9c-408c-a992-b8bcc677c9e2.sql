-- =====================================================
-- RESTAURAR PERMISOS DE ACCESO AL SCHEMA PUBLIC
-- Este script NO modifica estructuras ni datos
-- Solo otorga permisos de lectura/escritura a los roles
-- =====================================================

-- 1. Otorgar USAGE en el schema public (necesario para acceder)
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 2. Otorgar SELECT en todas las tablas existentes (lectura)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- 3. Otorgar escritura solo a usuarios autenticados
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- 4. Otorgar uso de secuencias (necesario para INSERT con IDs auto-generados)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. Configurar defaults para tablas que se creen en el futuro
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;