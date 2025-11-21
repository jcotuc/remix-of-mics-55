-- Fase 1: Modificar tabla repuestos
ALTER TABLE repuestos ADD COLUMN IF NOT EXISTS codigo_padre text NULL;
ALTER TABLE repuestos ADD COLUMN IF NOT EXISTS prefijo_clasificacion text NULL;
ALTER TABLE repuestos ADD COLUMN IF NOT EXISTS es_codigo_padre boolean DEFAULT false;

-- Crear índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_repuestos_codigo_padre ON repuestos(codigo_padre);
CREATE INDEX IF NOT EXISTS idx_repuestos_prefijo ON repuestos(prefijo_clasificacion);

-- Agregar foreign key para código padre
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_repuestos_codigo_padre'
  ) THEN
    ALTER TABLE repuestos 
    ADD CONSTRAINT fk_repuestos_codigo_padre 
    FOREIGN KEY (codigo_padre) 
    REFERENCES repuestos(codigo) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Crear tabla repuestos_relaciones (Equivalencias N:N)
CREATE TABLE IF NOT EXISTS repuestos_relaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_principal text NOT NULL,
  codigo_relacionado text NOT NULL,
  tipo_relacion text NOT NULL CHECK (tipo_relacion IN ('equivalente', 'sustituye_a')),
  prioridad integer DEFAULT 1,
  bidireccional boolean DEFAULT true,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT fk_codigo_principal FOREIGN KEY (codigo_principal) 
    REFERENCES repuestos(codigo) ON DELETE CASCADE,
  CONSTRAINT fk_codigo_relacionado FOREIGN KEY (codigo_relacionado) 
    REFERENCES repuestos(codigo) ON DELETE CASCADE,
  CONSTRAINT unique_relacion UNIQUE (codigo_principal, codigo_relacionado)
);

CREATE INDEX IF NOT EXISTS idx_relaciones_principal ON repuestos_relaciones(codigo_principal);
CREATE INDEX IF NOT EXISTS idx_relaciones_relacionado ON repuestos_relaciones(codigo_relacionado);

-- Crear tabla repuestos_productos (Compatibilidad N:N)
CREATE TABLE IF NOT EXISTS repuestos_productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_repuesto text NOT NULL,
  codigo_producto text NOT NULL,
  es_original boolean DEFAULT true,
  notas text NULL,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT fk_repuesto FOREIGN KEY (codigo_repuesto) 
    REFERENCES repuestos(codigo) ON DELETE CASCADE,
  CONSTRAINT fk_producto FOREIGN KEY (codigo_producto) 
    REFERENCES productos(codigo) ON DELETE CASCADE,
  CONSTRAINT unique_repuesto_producto UNIQUE (codigo_repuesto, codigo_producto)
);

CREATE INDEX IF NOT EXISTS idx_repuestos_productos_repuesto ON repuestos_productos(codigo_repuesto);
CREATE INDEX IF NOT EXISTS idx_repuestos_productos_producto ON repuestos_productos(codigo_producto);

-- Crear función de búsqueda inteligente
CREATE OR REPLACE FUNCTION buscar_repuesto_disponible(
  p_codigo_solicitado text,
  p_centro_servicio_id uuid
)
RETURNS TABLE (
  codigo_encontrado text,
  descripcion text,
  stock_disponible integer,
  ubicacion text,
  tipo_coincidencia text,
  prioridad integer
) AS $$
BEGIN
  -- 1. Verificar stock del código solicitado
  RETURN QUERY
  SELECT 
    r.codigo,
    r.descripcion,
    COALESCE(sd.cantidad_actual, 0)::integer,
    sd.ubicacion,
    'solicitado'::text,
    1::integer
  FROM repuestos r
  LEFT JOIN stock_departamental sd ON r.codigo = sd.codigo_repuesto 
    AND sd.centro_servicio_id = p_centro_servicio_id
  WHERE r.codigo = p_codigo_solicitado 
    AND COALESCE(sd.cantidad_actual, 0) > 0;
  
  -- Si hay stock, terminar
  IF FOUND THEN RETURN; END IF;
  
  -- 2. Buscar en el padre (si existe)
  RETURN QUERY
  SELECT 
    r.codigo,
    r.descripcion,
    COALESCE(sd.cantidad_actual, 0)::integer,
    sd.ubicacion,
    'padre'::text,
    2::integer
  FROM repuestos r
  JOIN repuestos hijo ON hijo.codigo = p_codigo_solicitado
  LEFT JOIN stock_departamental sd ON r.codigo = sd.codigo_repuesto 
    AND sd.centro_servicio_id = p_centro_servicio_id
  WHERE r.codigo = hijo.codigo_padre
    AND COALESCE(sd.cantidad_actual, 0) > 0
  LIMIT 1;
  
  IF FOUND THEN RETURN; END IF;
  
  -- 3. Buscar en hermanos (otros hijos del mismo padre)
  RETURN QUERY
  SELECT 
    r.codigo,
    r.descripcion,
    COALESCE(sd.cantidad_actual, 0)::integer,
    sd.ubicacion,
    'hermano'::text,
    3::integer
  FROM repuestos r
  JOIN repuestos solicitado ON solicitado.codigo = p_codigo_solicitado
  LEFT JOIN stock_departamental sd ON r.codigo = sd.codigo_repuesto 
    AND sd.centro_servicio_id = p_centro_servicio_id
  WHERE r.codigo_padre = solicitado.codigo_padre
    AND r.codigo != p_codigo_solicitado
    AND solicitado.codigo_padre IS NOT NULL
    AND COALESCE(sd.cantidad_actual, 0) > 0
  ORDER BY sd.cantidad_actual DESC
  LIMIT 1;
  
  IF FOUND THEN RETURN; END IF;
  
  -- 4. Buscar en equivalentes directos
  RETURN QUERY
  SELECT 
    r.codigo,
    r.descripcion,
    COALESCE(sd.cantidad_actual, 0)::integer,
    sd.ubicacion,
    'equivalente'::text,
    4::integer
  FROM repuestos r
  JOIN repuestos_relaciones rr ON r.codigo = rr.codigo_relacionado
  LEFT JOIN stock_departamental sd ON r.codigo = sd.codigo_repuesto 
    AND sd.centro_servicio_id = p_centro_servicio_id
  WHERE rr.codigo_principal = p_codigo_solicitado
    AND rr.activo = true
    AND COALESCE(sd.cantidad_actual, 0) > 0
  ORDER BY rr.prioridad ASC, sd.cantidad_actual DESC
  LIMIT 1;
  
END;
$$ LANGUAGE plpgsql;

-- Políticas RLS para repuestos_relaciones
ALTER TABLE repuestos_relaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver relaciones" ON repuestos_relaciones;
CREATE POLICY "Todos pueden ver relaciones" ON repuestos_relaciones 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Bodega puede gestionar relaciones" ON repuestos_relaciones;
CREATE POLICY "Bodega puede gestionar relaciones" ON repuestos_relaciones 
  FOR ALL 
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para repuestos_productos
ALTER TABLE repuestos_productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver compatibilidad" ON repuestos_productos;
CREATE POLICY "Todos pueden ver compatibilidad" ON repuestos_productos 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Bodega puede gestionar compatibilidad" ON repuestos_productos;
CREATE POLICY "Bodega puede gestionar compatibilidad" ON repuestos_productos 
  FOR ALL 
  USING (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'bodega'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Validación: No ciclos en padre-hijo
CREATE OR REPLACE FUNCTION validar_no_ciclo_padre()
RETURNS TRIGGER AS $$
BEGIN
  -- Evitar que un hijo sea padre de su propio padre
  IF EXISTS (
    SELECT 1 FROM repuestos 
    WHERE codigo = NEW.codigo_padre 
    AND codigo_padre = NEW.codigo
  ) THEN
    RAISE EXCEPTION 'No se permite relación circular padre-hijo';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validar_ciclo ON repuestos;
CREATE TRIGGER trigger_validar_ciclo
BEFORE INSERT OR UPDATE ON repuestos
FOR EACH ROW EXECUTE FUNCTION validar_no_ciclo_padre();

-- Trigger para updated_at en repuestos_relaciones
CREATE OR REPLACE FUNCTION update_updated_at_repuestos_relaciones()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_updated_at_repuestos_relaciones ON repuestos_relaciones;
CREATE TRIGGER trigger_updated_at_repuestos_relaciones
BEFORE UPDATE ON repuestos_relaciones
FOR EACH ROW EXECUTE FUNCTION update_updated_at_repuestos_relaciones();