DO $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- 1) Seleccionar el profile a “mover” (prioridad: código empleado)
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE codigo_empleado = '8969'
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2) Fallback por email
  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id
    FROM public.profiles
    WHERE email = 'jcotuc@hpc.com.gt'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No existe profile para codigo_empleado=8969 ni email=jcotuc@hpc.com.gt';
  END IF;

  -- 3) Actualizar profile con el user_id actual y asignar Zona 5
  UPDATE public.profiles
  SET
    user_id = '9353a106-79cd-4bb2-aea0-4828af3630fc',
    email = 'jcotuc@hpc.com.gt',
    nombre = 'Joshua Steven',
    apellido = 'Cotuc Juárez',
    codigo_empleado = '8969',
    centro_servicio_id = 'd9dbbd74-80d7-4eb3-a5eb-297c08365e01',
    updated_at = now()
  WHERE id = v_profile_id;
END $$;
