-- Tabla para asignar técnicos a familias de productos
CREATE TABLE public.tecnicos_familias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  familia_abuelo_id bigint REFERENCES "CDS_Familias"(id) ON DELETE CASCADE,
  centro_servicio_id uuid REFERENCES centros_servicio(id) ON DELETE CASCADE,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, familia_abuelo_id, centro_servicio_id)
);

-- Tabla para configurar el orden FIFO de colas por centro
CREATE TABLE public.configuracion_fifo_centro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_servicio_id uuid REFERENCES centros_servicio(id) ON DELETE CASCADE NOT NULL,
  familia_abuelo_id bigint REFERENCES "CDS_Familias"(id) ON DELETE CASCADE NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  activo boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid,
  UNIQUE(centro_servicio_id, familia_abuelo_id)
);

-- Tabla para solicitudes de transferencia de máquinas entre centros
CREATE TABLE public.solicitudes_transferencia_maquinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id uuid REFERENCES incidentes(id) ON DELETE CASCADE NOT NULL,
  centro_origen_id uuid REFERENCES centros_servicio(id) ON DELETE CASCADE NOT NULL,
  centro_destino_id uuid REFERENCES centros_servicio(id) ON DELETE CASCADE NOT NULL,
  motivo text NOT NULL,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'en_transito', 'completada')),
  solicitado_por uuid NOT NULL,
  aprobado_por uuid,
  fecha_aprobacion timestamptz,
  notas_aprobacion text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla para asignar centros de servicio a supervisores regionales
CREATE TABLE public.centros_supervisor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL,
  centro_servicio_id uuid REFERENCES centros_servicio(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(supervisor_id, centro_servicio_id)
);

-- Enable RLS on all tables
ALTER TABLE public.tecnicos_familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_fifo_centro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_transferencia_maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centros_supervisor ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tecnicos_familias
CREATE POLICY "Jefe taller puede gestionar asignaciones de técnicos"
ON public.tecnicos_familias
FOR ALL
USING (has_role(auth.uid(), 'jefe_taller') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'jefe_taller') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Técnicos pueden ver sus asignaciones"
ON public.tecnicos_familias
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'taller'));

-- RLS Policies for configuracion_fifo_centro
CREATE POLICY "Jefe taller puede gestionar configuración FIFO"
ON public.configuracion_fifo_centro
FOR ALL
USING (has_role(auth.uid(), 'jefe_taller') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'jefe_taller') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Taller puede ver configuración FIFO"
ON public.configuracion_fifo_centro
FOR SELECT
USING (has_role(auth.uid(), 'taller') OR has_role(auth.uid(), 'jefe_taller') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for solicitudes_transferencia_maquinas
CREATE POLICY "Jefe taller puede gestionar transferencias"
ON public.solicitudes_transferencia_maquinas
FOR ALL
USING (has_role(auth.uid(), 'jefe_taller') OR has_role(auth.uid(), 'supervisor_regional') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'jefe_taller') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisor puede aprobar transferencias"
ON public.solicitudes_transferencia_maquinas
FOR UPDATE
USING (has_role(auth.uid(), 'supervisor_regional') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for centros_supervisor
CREATE POLICY "Admin puede gestionar asignaciones de supervisores"
ON public.centros_supervisor
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisores pueden ver sus centros asignados"
ON public.centros_supervisor
FOR SELECT
USING (auth.uid() = supervisor_id OR has_role(auth.uid(), 'admin'));

-- Triggers para updated_at
CREATE TRIGGER update_tecnicos_familias_updated_at
BEFORE UPDATE ON public.tecnicos_familias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracion_fifo_centro_updated_at
BEFORE UPDATE ON public.configuracion_fifo_centro
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solicitudes_transferencia_maquinas_updated_at
BEFORE UPDATE ON public.solicitudes_transferencia_maquinas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();