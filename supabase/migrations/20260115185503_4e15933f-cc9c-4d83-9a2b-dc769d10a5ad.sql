-- Agregar campos adicionales para guías de envío
ALTER TABLE guias_envio 
  ADD COLUMN IF NOT EXISTS telefono_destinatario text,
  ADD COLUMN IF NOT EXISTS empacador text;

-- Insertar guía mock para pruebas (asociada a INC-000084)
INSERT INTO guias_envio (
  numero_guia,
  fecha_guia,
  remitente,
  direccion_remitente,
  destinatario,
  direccion_destinatario,
  ciudad_destino,
  telefono_destinatario,
  cantidad_piezas,
  referencia_1,
  referencia_2,
  estado,
  empacador,
  incidentes_codigos
) VALUES (
  'ZG26A00053139',
  '2026-01-14 16:43:00+00',
  'Centro de Servicio Guatemala Z5',
  '27 Calle Bodega C 41-55 Zona 5, Guatemala',
  'GRUPO BUENA VISTA SOCIEDAD ANÓNIMA',
  'BARRIO EL CALVARIO ZONA 2 SOLOLA SOLOLÁ (SOL) SOLOLA',
  'SOLOLA (SOL)',
  '56976304',
  1,
  'INC-000084',
  '16441',
  'creado',
  NULL,
  ARRAY['INC-000084']
);