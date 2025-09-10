-- Create enum for incident status
CREATE TYPE public.status_incidente AS ENUM (
  'Ingresado',
  'Diagnostico', 
  'Repuestos solicitados',
  'Reparado',
  'Documentado',
  'Entregado'
);

-- Create enum for media file types
CREATE TYPE public.media_tipo AS ENUM ('foto', 'video');

-- Create clientes table
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  nit TEXT NOT NULL,
  celular TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create productos table
CREATE TABLE public.productos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  clave TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  descontinuado BOOLEAN NOT NULL DEFAULT false,
  url_foto TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tecnicos table
CREATE TABLE public.tecnicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create repuestos table
CREATE TABLE public.repuestos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  codigo TEXT NOT NULL,
  clave TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  url_foto TEXT,
  codigo_producto TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (codigo_producto) REFERENCES public.productos(codigo)
);

-- Create incidentes table
CREATE TABLE public.incidentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_producto TEXT NOT NULL,
  codigo_cliente TEXT NOT NULL,
  codigo_tecnico TEXT NOT NULL,
  status public.status_incidente NOT NULL DEFAULT 'Ingresado',
  cobertura_garantia BOOLEAN NOT NULL DEFAULT false,
  descripcion_problema TEXT NOT NULL,
  fecha_ingreso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  producto_descontinuado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (codigo_producto) REFERENCES public.productos(codigo),
  FOREIGN KEY (codigo_cliente) REFERENCES public.clientes(codigo),
  FOREIGN KEY (codigo_tecnico) REFERENCES public.tecnicos(codigo)
);

-- Create media_files table
CREATE TABLE public.media_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incidente_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  url TEXT NOT NULL,
  tipo public.media_tipo NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (incidente_id) REFERENCES public.incidentes(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_repuestos_codigo_producto ON public.repuestos(codigo_producto);
CREATE INDEX idx_incidentes_codigo_producto ON public.incidentes(codigo_producto);
CREATE INDEX idx_incidentes_codigo_cliente ON public.incidentes(codigo_cliente);
CREATE INDEX idx_incidentes_codigo_tecnico ON public.incidentes(codigo_tecnico);
CREATE INDEX idx_incidentes_status ON public.incidentes(status);
CREATE INDEX idx_media_files_incidente_id ON public.media_files(incidente_id);

-- Enable Row Level Security
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing all operations for now since auth is not implemented)
-- These should be updated when authentication is added

-- Clientes policies
CREATE POLICY "Enable all operations for clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);

-- Productos policies  
CREATE POLICY "Enable all operations for productos" ON public.productos FOR ALL USING (true) WITH CHECK (true);

-- Tecnicos policies
CREATE POLICY "Enable all operations for tecnicos" ON public.tecnicos FOR ALL USING (true) WITH CHECK (true);

-- Repuestos policies
CREATE POLICY "Enable all operations for repuestos" ON public.repuestos FOR ALL USING (true) WITH CHECK (true);

-- Incidentes policies
CREATE POLICY "Enable all operations for incidentes" ON public.incidentes FOR ALL USING (true) WITH CHECK (true);

-- Media files policies
CREATE POLICY "Enable all operations for media_files" ON public.media_files FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tecnicos_updated_at BEFORE UPDATE ON public.tecnicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_repuestos_updated_at BEFORE UPDATE ON public.repuestos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_incidentes_updated_at BEFORE UPDATE ON public.incidentes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_media_files_updated_at BEFORE UPDATE ON public.media_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();