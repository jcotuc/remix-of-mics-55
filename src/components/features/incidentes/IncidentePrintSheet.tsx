import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface IncidentePrintData {
  codigo: string;
  codigoCliente: string;
  nombreCliente: string;
  telefonoCliente?: string;
  direccionCliente?: string;
  tipoCliente?: string;
  codigoProducto: string;
  descripcionProducto: string;
  skuMaquina: string;
  descripcionProblema: string;
  accesorios: string;
  fechaIngreso: Date;
  centroServicio: string;
  personaDejaMaquina: string;
  tipologia: string;
  esReingreso: boolean;
  coberturaGarantia?: boolean;
  firmaClienteDataUrl?: string;
}

interface Props {
  data: IncidentePrintData;
}

// Estilos inline compactos para impresión en UNA sola página
const styles = {
  container: {
    backgroundColor: '#ffffff',
    color: '#000000',
    padding: '8px',
    width: '100%',
    maxWidth: '8.5in',
    margin: '0 auto',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '8px',
    boxSizing: 'border-box' as const,
  },
  section: {
    border: '1.5px solid #000000',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  headerOrange: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 6px',
    backgroundColor: '#000000',
    color: '#ffffff',
  },
  headerDark: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 6px',
    backgroundColor: '#000000',
    color: '#ffffff',
  },
  logo: {
    width: '28px',
    height: '28px',
    backgroundColor: '#ffffff',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #000000',
  },
  logoText: {
    color: '#000000',
    fontWeight: 800,
    fontSize: '10px',
  },
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    fontSize: '8px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    fontSize: '8px',
  },
  cell: {
    borderRight: '1px solid #000000',
    borderBottom: '1px solid #000000',
    padding: '3px 4px',
    backgroundColor: '#ffffff',
  },
  cellLast: {
    borderBottom: '1px solid #000000',
    padding: '3px 4px',
    backgroundColor: '#ffffff',
  },
  label: {
    color: '#000000',
    fontSize: '7px',
    textTransform: 'uppercase' as const,
    marginBottom: '1px',
    fontWeight: 600,
  },
  value: {
    fontWeight: 600,
  },
  valueBold: {
    fontWeight: 700,
    fontSize: '8px',
  },
  cutLine: {
    borderTop: '1.5px dashed #000000',
    margin: '4px 0',
    position: 'relative' as const,
    textAlign: 'center' as const,
  },
  cutText: {
    position: 'absolute' as const,
    left: '50%',
    transform: 'translateX(-50%)',
    top: '-6px',
    backgroundColor: '#ffffff',
    padding: '0 6px',
    fontSize: '7px',
    color: '#000000',
  },
  barcode: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: '28px',
    gap: '1px',
  },
  barcodeBar: {
    backgroundColor: '#000000',
  },
};

// Componente de código de barras más visible para impresión
const CSSBarcode = ({ value }: { value: string }) => {
  const generatePattern = (str: string): number[] => {
    const pattern: number[] = [];
    for (let i = 0; i < str.length * 4; i++) {
      const charCode = str.charCodeAt(i % str.length);
      pattern.push((charCode + i) % 3 + 2);
    }
    return pattern;
  };

  const pattern = generatePattern(value);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'flex-end', 
      justifyContent: 'center', 
      height: '35px', 
      gap: '1px',
      padding: '4px 0'
    }}>
      {pattern.map((width, index) => (
        <div
          key={index}
          style={{
            backgroundColor: '#000000',
            width: `${width}px`,
            height: `${22 + (index % 3) * 4}px`,
          }}
        />
      ))}
    </div>
  );
};

// Figuras para identificar máquinas por día de la semana (blanco y negro)
const DayShape = ({ date }: { date: Date }) => {
  const dayOfWeek = date.getDay();
  
  const shapes: Record<number, { shape: React.ReactNode; label: string }> = {
    0: { shape: <circle cx="12" cy="12" r="10" />, label: 'DOM' },
    1: { shape: <rect x="2" y="2" width="20" height="20" />, label: 'LUN' },
    2: { shape: <polygon points="12,2 22,22 2,22" />, label: 'MAR' },
    3: { shape: <polygon points="12,2 22,12 12,22 2,12" />, label: 'MIÉ' },
    4: { shape: <polygon points="12,2 20,8 18,18 6,18 4,8" />, label: 'JUE' },
    5: { shape: <polygon points="12,2 24,10 20,24 4,24 0,10" />, label: 'VIE' },
    6: { shape: <polygon points="12,0 15,8 24,9 17,15 19,24 12,19 5,24 7,15 0,9 9,8" />, label: 'SÁB' },
  };

  const { shape, label } = shapes[dayOfWeek];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#000000" stroke="#000000" strokeWidth="1">
        {shape}
      </svg>
      <span style={{ fontSize: '6px', fontWeight: 700, marginTop: '1px', color: '#000000' }}>{label}</span>
    </div>
  );
};

const IncidentePrintSheet = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const fechaFormateada = format(data.fechaIngreso, "dd/MM/yyyy", { locale: es });
  const horaFormateada = format(data.fechaIngreso, "HH:mm", { locale: es });

  return (
    <div ref={ref} style={styles.container}>
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 1: COPIA CENTRO DE SERVICIO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div style={styles.section}>
        {/* Header con gradiente */}
        <div style={styles.headerOrange}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={styles.logo}>
              <span style={styles.logoText}>HPC</span>
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '11px', lineHeight: 1.1, margin: 0 }}>Centro de Servicio</p>
              <p style={{ fontSize: '8px', opacity: 0.9, margin: 0 }}>{data.centroServicio}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontWeight: 700, fontSize: '14px', lineHeight: 1, margin: 0 }}>{data.codigo}</p>
            <p style={{ fontSize: '7px', opacity: 0.8, marginTop: '1px' }}>Copia Taller</p>
          </div>
        </div>

        {/* Grid de información */}
        <div style={styles.grid4}>
          <div style={styles.cell}>
            <p style={styles.label}>Cliente ({data.tipoCliente || 'Mostrador'})</p>
            <p style={styles.valueBold}>{data.codigoCliente}</p>
          </div>
          <div style={styles.cell}>
            <p style={styles.label}>Nombre</p>
            <p style={styles.value}>{data.nombreCliente}</p>
          </div>
          <div style={styles.cell}>
            <p style={styles.label}>Teléfono</p>
            <p style={styles.valueBold}>{data.telefonoCliente || 'N/A'}</p>
          </div>
          <div style={styles.cellLast}>
            <p style={styles.label}>Fecha/Hora</p>
            <p style={styles.valueBold}>{fechaFormateada} {horaFormateada}</p>
          </div>
        </div>

        <div style={styles.grid4}>
          <div style={{ ...styles.cell, gridColumn: 'span 2' }}>
            <p style={styles.label}>Dirección</p>
            <p style={styles.value}>{data.direccionCliente || 'N/A'}</p>
          </div>
          <div style={styles.cell}>
            <p style={styles.label}>Tipología</p>
            <p style={styles.valueBold}>{data.tipologia}</p>
          </div>
          <div style={styles.cellLast}>
            <p style={styles.label}>SKU Producto</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '8px' }}>{data.codigoProducto}</p>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid #000000', padding: '3px 4px' }}>
          <p style={styles.label}>Descripción Producto</p>
          <p style={styles.value}>{data.descripcionProducto}</p>
        </div>

        {/* Badge de reingreso */}
        {data.esReingreso && (
          <div style={{ padding: '3px 4px', borderBottom: '1px solid #000000', backgroundColor: '#ffffff' }}>
            <span style={{ 
              padding: '1px 6px', 
              borderRadius: '9999px', 
              fontSize: '7px', 
              fontWeight: 700, 
              backgroundColor: '#ffffff', 
              color: '#000000',
              border: '1.5px solid #000000'
            }}>
              ⚠ REINGRESO
            </span>
          </div>
        )}

        {/* Problema reportado */}
        <div style={{ padding: '4px', borderBottom: '1px solid #000000' }}>
          <p style={{ ...styles.label, fontWeight: 700, marginBottom: '2px' }}>Problema Reportado</p>
          <p style={{ 
            fontSize: '8px', 
            lineHeight: 1.2, 
            backgroundColor: '#ffffff', 
            padding: '3px', 
            borderRadius: '2px',
            border: '1px solid #000000',
            maxHeight: '28px',
            overflow: 'hidden'
          }}>{data.descripcionProblema}</p>
        </div>

        {/* Footer con accesorios e ingresado por */}
        <div style={styles.grid2}>
          <div style={{ borderRight: '1px solid #000000', padding: '3px 4px' }}>
            <p style={{ ...styles.label, fontWeight: 700 }}>Accesorios</p>
            <p style={{ marginTop: '1px', fontSize: '7px' }}>{data.accesorios || 'Ninguno especificado'}</p>
          </div>
          <div style={{ padding: '3px 4px' }}>
            <p style={{ ...styles.label, fontWeight: 700 }}>Ingresado Por</p>
            <p style={{ marginTop: '1px' }}>{data.personaDejaMaquina || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Línea de corte */}
      <div style={styles.cutLine}>
        <span style={styles.cutText}>✂ CORTAR</span>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 2: CONTRASEÑA PARA CLIENTE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div style={styles.section}>
        {/* Header oscuro */}
        <div style={styles.headerDark}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ ...styles.logo, backgroundColor: '#ffffff', width: '24px', height: '24px' }}>
              <span style={{ color: '#000000', fontWeight: 800, fontSize: '8px' }}>HPC</span>
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '10px', margin: 0 }}>CONTRASEÑA DE SERVICIO</p>
              <p style={{ fontSize: '7px', color: '#ffffff', margin: 0 }}>Conserve este documento</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', margin: 0 }}>{data.codigo}</p>
          </div>
        </div>
        
        {/* Info del centro */}
        <div style={{ 
          padding: '3px 6px', 
          borderBottom: '1px solid #000000', 
          backgroundColor: '#ffffff', 
          fontSize: '7px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontWeight: 700 }}>{data.centroServicio}</span>
            <span style={{ margin: '0 4px', color: '#000000' }}>|</span>
            <span>27 Calle 41-55 Zona 5, Guatemala</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontWeight: 700 }}>Tel: 2499-5000</span>
          </div>
        </div>

        {/* Datos del cliente y producto en 2 columnas */}
        <div style={styles.grid2}>
          <div style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '4px' }}>
            <p style={{ ...styles.label, marginBottom: '2px' }}>Datos del Cliente</p>
            <div style={{ lineHeight: 1.3, fontSize: '7px' }}>
              <p style={{ margin: '1px 0' }}><span style={{ fontWeight: 600 }}>Código:</span> <span style={{ fontWeight: 700 }}>{data.codigoCliente}</span></p>
              <p style={{ margin: '1px 0' }}><span style={{ fontWeight: 600 }}>Nombre:</span> <span style={{ fontWeight: 600 }}>{data.nombreCliente}</span></p>
              {data.telefonoCliente && (
                <p style={{ margin: '1px 0' }}><span style={{ fontWeight: 600 }}>Tel:</span> {data.telefonoCliente}</p>
              )}
            </div>
          </div>
          <div style={{ borderBottom: '1px solid #000000', padding: '4px' }}>
            <p style={{ ...styles.label, marginBottom: '2px' }}>Datos del Equipo</p>
            <div style={{ lineHeight: 1.3, fontSize: '7px' }}>
              <p style={{ margin: '1px 0' }}><span style={{ fontWeight: 600 }}>SKU:</span> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{data.codigoProducto}</span></p>
              <p style={{ margin: '1px 0' }}><span style={{ fontWeight: 600 }}>Ingreso:</span> <span style={{ fontWeight: 700 }}>{fechaFormateada} {horaFormateada}</span></p>
              <p style={{ margin: '1px 0' }}><span style={{ fontWeight: 600 }}>Accesorios:</span> {data.accesorios || 'Ninguno'}</p>
            </div>
          </div>
        </div>

        {/* Código de barras */}
        <div style={{ padding: '4px', borderBottom: '1px solid #000000', backgroundColor: '#ffffff', textAlign: 'center' }}>
          <CSSBarcode value={data.codigo} />
          <p style={{ textAlign: 'center', fontSize: '8px', color: '#000000', marginTop: '2px', fontFamily: 'monospace', fontWeight: 700 }}>{data.codigo}</p>
        </div>

        {/* Políticas compactas */}
        <div style={{ padding: '4px', fontSize: '6px', lineHeight: 1.2 }}>
          <p style={{ fontWeight: 700, fontSize: '7px', marginBottom: '2px', color: '#000000' }}>TÉRMINOS Y CONDICIONES</p>
          <div style={{ color: '#000000', columnCount: 2, columnGap: '8px' }}>
            <p style={{ marginBottom: '1px' }}>• Después de 30 días sin recoger, HPC puede disponer del equipo.</p>
            <p style={{ marginBottom: '1px' }}>• Se requiere esta contraseña para recoger la herramienta.</p>
            <p style={{ marginBottom: '1px' }}>• Garantía en mano de obra por 30 días.</p>
            <p style={{ marginBottom: '1px' }}>• No cubre daños por mal uso o accidentes.</p>
          </div>
        </div>

        {/* Firma Digital del Cliente - Compacta */}
        <div style={{ padding: '4px', borderTop: '1px solid #000000', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end' }}>
            <div style={{ textAlign: 'center' }}>
              {data.firmaClienteDataUrl ? (
                <div style={{ border: '1px solid #000000', borderRadius: '2px', backgroundColor: '#ffffff', padding: '2px', marginBottom: '2px' }}>
                  <img 
                    src={data.firmaClienteDataUrl} 
                    alt="Firma del cliente" 
                    style={{ height: '32px', width: '100px', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div style={{ borderBottom: '1.5px solid #000000', height: '32px', width: '100px', marginBottom: '2px' }}></div>
              )}
              <p style={{ fontSize: '6px', fontWeight: 700 }}>FIRMA CLIENTE</p>
            </div>
            <div style={{ textAlign: 'center', fontSize: '7px', color: '#000000' }}>
              <p style={{ fontWeight: 700 }}>{fechaFormateada}</p>
              <p>{horaFormateada}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Línea de corte */}
      <div style={styles.cutLine}>
        <span style={styles.cutText}>✂ CORTAR</span>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 3: ETIQUETA PARA MÁQUINA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ ...styles.section, width: '220px', marginBottom: 0 }}>
          {/* Header */}
          <div style={{ 
            padding: '4px 6px', 
            backgroundColor: '#000000', 
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: 800, fontSize: '10px' }}>HPC</span>
              <span style={{ fontSize: '7px', opacity: 0.9 }}>Etiqueta Máquina</span>
            </div>
            <DayShape date={data.fechaIngreso} />
          </div>

          {/* Código grande */}
          <div style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #000000' }}>
            <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '18px', margin: 0 }}>{data.codigo}</p>
            <p style={{ fontSize: '6px', color: '#000000', marginTop: '2px' }}>{fechaFormateada}</p>
          </div>

          {/* Info producto */}
          <div style={{ padding: '4px', fontSize: '7px' }}>
            <p style={{ margin: '1px 0' }}><span style={{ fontWeight: 600 }}>SKU:</span> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{data.codigoProducto}</span></p>
            <p style={{ margin: '1px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.descripcionProducto}</p>
          </div>

          {/* Barcode pequeño */}
          <div style={{ padding: '4px', backgroundColor: '#ffffff', textAlign: 'center', borderTop: '1px solid #000000' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '24px', gap: '1px' }}>
              {[...Array(25)].map((_, i) => (
                <div key={i} style={{ backgroundColor: '#000000', width: '2px', height: `${14 + (i % 3) * 4}px` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

IncidentePrintSheet.displayName = 'IncidentePrintSheet';

export default IncidentePrintSheet;
