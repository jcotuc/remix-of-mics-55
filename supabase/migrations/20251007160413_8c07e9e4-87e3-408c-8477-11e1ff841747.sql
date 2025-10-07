-- Add created_by to incidentes to track who created the incident
ALTER TABLE public.incidentes
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Add persona_deja_maquina to track who is dropping off the machine
ALTER TABLE public.incidentes
ADD COLUMN persona_deja_maquina text;

-- Create table for multiple shipping addresses per client
CREATE TABLE public.direcciones_envio (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_cliente text NOT NULL,
  direccion text NOT NULL,
  nombre_referencia text,
  es_principal boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.direcciones_envio ENABLE ROW LEVEL SECURITY;

-- Create policy for direcciones_envio
CREATE POLICY "Enable all operations for direcciones_envio" 
ON public.direcciones_envio 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_direcciones_envio_updated_at
BEFORE UPDATE ON public.direcciones_envio
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add selected shipping address to incidentes
ALTER TABLE public.incidentes
ADD COLUMN direccion_envio_id uuid REFERENCES public.direcciones_envio(id);