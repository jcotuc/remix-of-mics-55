-- Tabla para definir los permisos disponibles en el sistema
CREATE TABLE public.permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  modulo TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla para asignar permisos a roles
CREATE TABLE public.permisos_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol app_role NOT NULL,
  permiso_id UUID REFERENCES public.permisos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(rol, permiso_id)
);

-- Tabla para permisos especiales de usuarios específicos
CREATE TABLE public.permisos_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permiso_id UUID REFERENCES public.permisos(id) ON DELETE CASCADE,
  es_denegado BOOLEAN DEFAULT false,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(user_id, permiso_id)
);

-- Enable RLS
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos_usuarios ENABLE ROW LEVEL SECURITY;

-- Policies for permisos
CREATE POLICY "Admin puede gestionar permisos"
ON public.permisos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver permisos"
ON public.permisos FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policies for permisos_roles
CREATE POLICY "Admin puede gestionar permisos_roles"
ON public.permisos_roles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuarios autenticados pueden ver permisos_roles"
ON public.permisos_roles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Policies for permisos_usuarios
CREATE POLICY "Admin puede gestionar permisos_usuarios"
ON public.permisos_usuarios FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuarios pueden ver sus propios permisos especiales"
ON public.permisos_usuarios FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Insertar permisos iniciales por módulo
INSERT INTO public.permisos (codigo, nombre, descripcion, modulo) VALUES
-- Módulo Mostrador
('mostrador_ver', 'Ver Mostrador', 'Acceso al módulo de mostrador', 'mostrador'),
('mostrador_crear_incidente', 'Crear Incidente', 'Puede crear nuevos incidentes', 'mostrador'),
('mostrador_consultar_precios', 'Consultar Precios', 'Puede consultar precios de repuestos', 'mostrador'),
-- Módulo Logística
('logistica_ver', 'Ver Logística', 'Acceso al módulo de logística', 'logistica'),
('logistica_gestionar_guias', 'Gestionar Guías', 'Puede crear y editar guías de envío', 'logistica'),
('logistica_ingresar_maquinas', 'Ingresar Máquinas', 'Puede registrar ingreso de máquinas', 'logistica'),
-- Módulo Taller
('taller_ver', 'Ver Taller', 'Acceso al módulo de taller', 'taller'),
('taller_diagnosticar', 'Realizar Diagnóstico', 'Puede realizar diagnósticos', 'taller'),
('taller_asignar', 'Asignar Técnicos', 'Puede asignar técnicos a incidentes', 'taller'),
-- Módulo Bodega
('bodega_ver', 'Ver Bodega', 'Acceso al módulo de bodega', 'bodega'),
('bodega_gestionar_inventario', 'Gestionar Inventario', 'Puede gestionar inventario', 'bodega'),
('bodega_despachar', 'Despachar Repuestos', 'Puede despachar repuestos', 'bodega'),
-- Módulo SAC
('sac_ver', 'Ver SAC', 'Acceso al módulo de SAC', 'sac'),
('sac_gestionar_incidentes', 'Gestionar Incidentes SAC', 'Puede gestionar incidentes en SAC', 'sac'),
-- Módulo Calidad
('calidad_ver', 'Ver Calidad', 'Acceso al módulo de calidad', 'calidad'),
('calidad_auditar', 'Realizar Auditorías', 'Puede realizar auditorías de calidad', 'calidad'),
-- Módulo Admin
('admin_ver', 'Ver Admin', 'Acceso al módulo de administración', 'admin'),
('admin_gestionar_usuarios', 'Gestionar Usuarios', 'Puede gestionar usuarios', 'admin'),
('admin_gestionar_permisos', 'Gestionar Permisos', 'Puede gestionar permisos y roles', 'admin'),
-- Módulo Gerencia
('gerencia_ver', 'Ver Gerencia', 'Acceso al módulo de gerencia', 'gerencia'),
('gerencia_aprobar', 'Aprobar Garantías', 'Puede aprobar garantías', 'gerencia');