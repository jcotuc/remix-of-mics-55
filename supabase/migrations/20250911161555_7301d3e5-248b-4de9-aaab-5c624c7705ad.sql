-- Remove the unique constraint on numero column to allow duplicate part numbers across different products
ALTER TABLE public.repuestos DROP CONSTRAINT IF EXISTS repuestos_numero_key;

-- Create a composite unique constraint on numero and codigo_producto instead
ALTER TABLE public.repuestos ADD CONSTRAINT repuestos_numero_producto_unique UNIQUE (numero, codigo_producto);

-- Now insert the product 15679 if it doesn't exist
INSERT INTO public.productos (codigo, clave, descripcion, descontinuado) 
VALUES ('15679', 'ROTO-1/2A7', 'Rotomartillo 1/2 Pulgada', false)
ON CONFLICT (codigo) DO NOTHING;

-- Then insert spare parts for product 15679
INSERT INTO public.repuestos (numero, codigo, clave, descripcion, codigo_producto) VALUES
('1', '929904', 'R1-ROTO-1/2A7', 'Carcasa izquierda', '15679'),
('36', '929905', 'R36-ROTO-1/2A7', 'Carcasa derecha', '15679'),
('3', '929906', 'R3-ROTO-1/2A7', 'Palanca de interruptor', '15679'),
('5', '929907', 'R5-ROTO-1/2A7', 'Opresor de cable', '15679'),
('6', '929908', 'R6-ROTO-1/2A7', 'Tornillo ST 4x16', '15679'),
('8', '929909', 'R8-ROTO-1/2A7', 'Interruptor', '15679'),
('9', '929910', 'R9-ROTO-1/2A7', 'Protector de cable', '15679'),
('10', '929911', 'R10-ROTO-1/2A7', 'Cable de alimentación', '15679'),
('11', '929912', 'R11-ROTO-1/2A7', 'Escala de profundidad', '15679'),
('12', '929913', 'R12-ROTO-1/2A7', 'Mango auxiliar', '15679'),
('13', '929914', 'R13-ROTO-1/2A7', 'Tornillo M5x25', '15679'),
('14', '929915', 'R14-ROTO-1/2A7', 'Llave de broquero', '15679'),
('15', '929916', 'R15-ROTO-1/2A7', 'Broquero', '15679'),
('16', '929917', 'R16-ROTO-1/2A7', 'Eje', '15679'),
('17', '929918', 'R17-ROTO-1/2A7', 'Resorte', '15679'),
('18', '929919', 'R18-ROTO-1/2A7', 'Balero de bolas 6201', '15679'),
('19', '929920', 'R19-ROTO-1/2A7', 'Seguro 12', '15679'),
('20', '929921', 'R20-ROTO-1/2A7', 'Engrane', '15679'),
('21', '929922', 'R21-ROTO-1/2A7', 'Balín Ø5', '15679'),
('22', '929923', 'R22-ROTO-1/2A7', 'Balero de agujas Ø12xØ8x8', '15679'),
('23', '929924', 'R23-ROTO-1/2A7', 'Perilla', '15679'),
('24', '929925', 'R24-ROTO-1/2A7', 'Soporte con engrane', '15679'),
('25', '929926', 'R25-ROTO-1/2A7', 'Balero 608', '15679'),
('26', '929927', 'R26-ROTO-1/2A7', 'Armadura', '15679'),
('27', '929928', 'R27-ROTO-1/2A7', 'Porta carbón', '15679'),
('28', '929929', 'R28-ROTO-1/2A7', 'Carbones', '15679'),
('29', '929930', 'R29-ROTO-1/2A7', 'Resorte para carbón', '15679'),
('31', '929931', 'R31-ROTO-1/2A7', 'Tornillo ST 3x8', '15679'),
('32', '929932', 'R32-ROTO-1/2A7', 'Balero de bolas 626', '15679'),
('33', '929933', 'R33-ROTO-1/2A7', 'Campo', '15679'),
('34', '929934', 'R34-ROTO-1/2A7', 'Terminal eléctrica', '15679');