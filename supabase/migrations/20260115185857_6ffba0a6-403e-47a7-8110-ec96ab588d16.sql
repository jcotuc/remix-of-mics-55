-- Insertar guía de ingreso mock (tipo Zigo) para INC-000084
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
  '1400377',
  '2026-01-13 14:26:05+00',
  'FERRETERIA EL FARO SOCIEDAD ANÓNIMA',
  '12 AVE 2-32 ZONA 1, CHIQUIMULA',
  'Centro de Servicio Guatemala Z5',
  '27 Calle Bodega C 41-55 Zona 5, Guatemala',
  'GUATEMALA (GUA)',
  '2499-5068',
  1,
  'INC-000084',
  'GARANTIA - BODEGA SEGURIDAD ELECTRICA',
  'entregado',
  'APINEDA-R',
  ARRAY['INC-000084']
);