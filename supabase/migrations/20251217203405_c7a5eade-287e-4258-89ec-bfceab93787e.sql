-- Create audit action enum type
CREATE TYPE public.audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla_afectada text NOT NULL,
  registro_id text NOT NULL,
  accion audit_action NOT NULL,
  usuario_id uuid,
  usuario_email text,
  valores_anteriores jsonb,
  valores_nuevos jsonb,
  campos_modificados text[],
  motivo text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_tabla ON public.audit_logs(tabla_afectada);
CREATE INDEX idx_audit_logs_registro ON public.audit_logs(registro_id);
CREATE INDEX idx_audit_logs_usuario ON public.audit_logs(usuario_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can read, no one can update/delete
CREATE POLICY "Admins can read audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create the audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_data jsonb;
  v_new_data jsonb;
  v_changed_fields text[];
  v_user_id uuid;
  v_user_email text;
  v_record_id text;
  key_name text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Get user email if authenticated
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email 
    FROM auth.users 
    WHERE id = v_user_id;
  END IF;

  -- Determine record ID and data based on operation
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::text;
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id::text;
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSE -- UPDATE
    v_record_id := NEW.id::text;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    
    -- Calculate changed fields
    SELECT array_agg(n.key) INTO v_changed_fields
    FROM jsonb_each(v_new_data) n
    WHERE n.value IS DISTINCT FROM (v_old_data -> n.key);
  END IF;

  -- Insert audit record
  INSERT INTO public.audit_logs (
    tabla_afectada,
    registro_id,
    accion,
    usuario_id,
    usuario_email,
    valores_anteriores,
    valores_nuevos,
    campos_modificados
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP::audit_action,
    v_user_id,
    v_user_email,
    v_old_data,
    v_new_data,
    v_changed_fields
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers on critical tables

-- 1. incidentes - all operations
CREATE TRIGGER audit_incidentes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.incidentes
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 2. clientes - all operations
CREATE TRIGGER audit_clientes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 3. diagnosticos - all operations
CREATE TRIGGER audit_diagnosticos_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.diagnosticos
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 4. garantias_manuales - all operations
CREATE TRIGGER audit_garantias_manuales_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.garantias_manuales
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 5. user_roles - critical for security
CREATE TRIGGER audit_user_roles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 6. revisiones_stock_cemaco - all operations
CREATE TRIGGER audit_revisiones_stock_cemaco_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.revisiones_stock_cemaco
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 7. guias_envio - INSERT and UPDATE
CREATE TRIGGER audit_guias_envio_trigger
AFTER INSERT OR UPDATE ON public.guias_envio
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 8. solicitudes_repuestos - INSERT and UPDATE
CREATE TRIGGER audit_solicitudes_repuestos_trigger
AFTER INSERT OR UPDATE ON public.solicitudes_repuestos
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 9. solicitudes_cambio - all operations (warranty change requests)
CREATE TRIGGER audit_solicitudes_cambio_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.solicitudes_cambio
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();