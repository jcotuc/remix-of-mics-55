-- Asignar rol admin al usuario actual (jcotuc@hpc.com.gt)
-- Este usuario podrá acceder a todos los módulos del sistema

INSERT INTO public.user_roles (user_id, role)
VALUES ('9353a106-79cd-4bb2-aea0-4828af3630fc', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar roles del usuario
SELECT 
  p.email,
  p.nombre,
  p.apellido,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
WHERE p.user_id = '9353a106-79cd-4bb2-aea0-4828af3630fc';