-- Crear tabla para equivalencias entre padres (padre-padre)
CREATE TABLE public.repuestos_equivalentes (
  id SERIAL PRIMARY KEY,
  padre_id_1 INTEGER NOT NULL,
  padre_id_2 INTEGER NOT NULL,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  
  -- Asegurar que padre_id_1 < padre_id_2 para evitar duplicados
  CONSTRAINT check_orden_padres CHECK (padre_id_1 < padre_id_2),
  CONSTRAINT unique_equivalencia UNIQUE (padre_id_1, padre_id_2),
  
  -- Foreign keys a repuestos_relaciones
  CONSTRAINT fk_padre_1 FOREIGN KEY (padre_id_1) 
    REFERENCES repuestos_relaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_padre_2 FOREIGN KEY (padre_id_2) 
    REFERENCES repuestos_relaciones(id) ON DELETE CASCADE
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_equiv_padre_1 ON public.repuestos_equivalentes(padre_id_1);
CREATE INDEX idx_equiv_padre_2 ON public.repuestos_equivalentes(padre_id_2);

-- Habilitar RLS
ALTER TABLE public.repuestos_equivalentes ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden ver equivalencias"
ON public.repuestos_equivalentes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden crear equivalencias"
ON public.repuestos_equivalentes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar equivalencias"
ON public.repuestos_equivalentes FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar equivalencias"
ON public.repuestos_equivalentes FOR DELETE
TO authenticated
USING (true);

-- Comentarios
COMMENT ON TABLE public.repuestos_equivalentes IS 'Relaciona padres equivalentes entre sí para sugerencias cuando uno no está disponible';
COMMENT ON COLUMN public.repuestos_equivalentes.padre_id_1 IS 'ID del primer padre (siempre menor que padre_id_2)';
COMMENT ON COLUMN public.repuestos_equivalentes.padre_id_2 IS 'ID del segundo padre (siempre mayor que padre_id_1)';
COMMENT ON COLUMN public.repuestos_equivalentes.notas IS 'Notas sobre la equivalencia';