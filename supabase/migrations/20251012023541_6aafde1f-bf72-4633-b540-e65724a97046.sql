-- Crear usuarios de prueba con sus roles
-- Nota: La contraseña para todos es "password123"

-- Insertar usuarios en auth.users (Supabase maneja esto automáticamente al hacer signup)
-- Pero podemos insertar directamente en user_roles y profiles

-- Usuario Mostrador
DO $$
DECLARE
  mostrador_id uuid;
  taller_id uuid;
  bodega_id uuid;
  logistica_id uuid;
  digitador_id uuid;
  sac_id uuid;
BEGIN
  -- Generar UUIDs para los usuarios
  mostrador_id := gen_random_uuid();
  taller_id := gen_random_uuid();
  bodega_id := gen_random_uuid();
  logistica_id := gen_random_uuid();
  digitador_id := gen_random_uuid();
  sac_id := gen_random_uuid();

  -- Insertar en auth.users usando la extensión de Supabase
  -- Usuario Mostrador
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    mostrador_id,
    'mostrador1@hpc.com.gt',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"nombre": "Usuario", "apellido": "Mostrador"}'::jsonb,
    now(),
    now()
  );

  -- Usuario Taller
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    taller_id,
    'taller1@hpc.com.gt',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"nombre": "Usuario", "apellido": "Taller"}'::jsonb,
    now(),
    now()
  );

  -- Usuario Bodega
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    bodega_id,
    'bodega1@hpc.com.gt',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"nombre": "Usuario", "apellido": "Bodega"}'::jsonb,
    now(),
    now()
  );

  -- Usuario Logística
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    logistica_id,
    'logistica1@hpc.com.gt',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"nombre": "Usuario", "apellido": "Logistica"}'::jsonb,
    now(),
    now()
  );

  -- Usuario Digitador
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    digitador_id,
    'digitador1@hpc.com.gt',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"nombre": "Usuario", "apellido": "Digitador"}'::jsonb,
    now(),
    now()
  );

  -- Usuario SAC (admin)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    sac_id,
    'sac1@hpc.com.gt',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"nombre": "Usuario", "apellido": "SAC"}'::jsonb,
    now(),
    now()
  );

  -- Insertar roles en user_roles
  INSERT INTO public.user_roles (user_id, role) VALUES
    (mostrador_id, 'mostrador'),
    (taller_id, 'taller'),
    (bodega_id, 'bodega'),
    (logistica_id, 'logistica'),
    (digitador_id, 'digitador'),
    (sac_id, 'admin');

  -- Insertar perfiles en profiles
  INSERT INTO public.profiles (user_id, nombre, apellido, email) VALUES
    (mostrador_id, 'Usuario', 'Mostrador', 'mostrador1@hpc.com.gt'),
    (taller_id, 'Usuario', 'Taller', 'taller1@hpc.com.gt'),
    (bodega_id, 'Usuario', 'Bodega', 'bodega1@hpc.com.gt'),
    (logistica_id, 'Usuario', 'Logistica', 'logistica1@hpc.com.gt'),
    (digitador_id, 'Usuario', 'Digitador', 'digitador1@hpc.com.gt'),
    (sac_id, 'Usuario', 'SAC', 'sac1@hpc.com.gt');

END $$;

-- Verificar creación
SELECT 
  p.email,
  ur.role,
  p.nombre,
  p.apellido
FROM profiles p
JOIN user_roles ur ON p.user_id = ur.user_id
WHERE p.email LIKE '%@hpc.com.gt'
ORDER BY p.email;