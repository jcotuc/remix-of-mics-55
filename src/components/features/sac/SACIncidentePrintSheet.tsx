import React, { forwardRef } from 'react';
import { formatFechaCorta, formatFechaHora } from '@/utils/dateFormatters';

interface RepuestoItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

interface ProductoAlternativo {
  codigo: string;
  descripcion: string;
  precio: number;
}

interface FotoItem {
  url: string;
  tipo?: string;
}

interface GuiaInfo {
  numero_guia?: string;
  tracking_number?: string;
  estado?: string;
  destinatario?: string;
}

export interface SACPrintData {
  // Incidente
  codigo: string;
  fechaIngreso: Date;
  estado: string;
  centroServicio: string;
  diasEnTaller: number;
  
  // Cliente
  codigoCliente: string;
  nombreCliente: string;
  nitCliente: string;
  telefonoCliente: string;
  celularCliente: string;
  correoCliente: string;
  direccionCliente: string;
  municipio: string;
  departamento: string;
  
  // Producto
  codigoProducto: string;
  descripcionProducto: string;
  problemaReportado: string;
  accesorios: string[];
  
  // Diagnóstico (opcional)
  tieneDiagnostico: boolean;
  fallas: string[];
  causas: string[];
  recomendaciones: string;
  tecnicoNombre: string;
  
  // Resolución
  tipoResolucion: string;
  aplicaGarantia: boolean;
  
  // Costos
  repuestos: RepuestoItem[];
  costoManoObra: number;
  porcentajeDescuento: number;
  subtotalGeneral: number;
  descuento: number;
  totalFinal: number;
  
  // Para Canje
  productoAlternativo?: ProductoAlternativo;
  
  // Fotos
  fotos: FotoItem[];
  
  // Guía
  quiereEnvio: boolean;
  guia?: GuiaInfo;
}

interface Props {
  data: SACPrintData;
}

const SACIncidentePrintSheet = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const fechaIngresoFormateada = formatFechaCorta(data.fechaIngreso);
  const fechaActual = formatFechaHora(new Date());

  const formatCurrency = (amount: number) => `Q ${amount.toFixed(2)}`;

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      INGRESADO: 'Ingresado',
      EN_DIAGNOSTICO: 'En Diagnóstico',
      ESPERA_APROBACION: 'Espera Aprobación',
      EN_REPARACION: 'En Reparación',
      EN_ENTREGA: 'En Entrega',
      ENTREGADO: 'Entregado',
      CANCELADO: 'Cancelado',
    };
    return labels[estado] || estado;
  };

  const styles = {
    container: {
      backgroundColor: '#ffffff',
      color: '#000000',
      padding: '24px',
      width: '100%',
      maxWidth: '8.5in',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      lineHeight: '1.4',
    } as React.CSSProperties,
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottom: '2px solid #000',
      paddingBottom: '16px',
      marginBottom: '16px',
    } as React.CSSProperties,
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    } as React.CSSProperties,
    logo: {
      width: '64px',
      height: '64px',
      backgroundColor: '#ea580c',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '20px',
    } as React.CSSProperties,
    headerTitle: {
      fontWeight: 'bold',
      fontSize: '20px',
      margin: '0',
    } as React.CSSProperties,
    headerSubtitle: {
      fontSize: '14px',
      color: '#666',
      margin: '4px 0 0 0',
    } as React.CSSProperties,
    headerRight: {
      textAlign: 'right' as const,
    } as React.CSSProperties,
    incidentCode: {
      fontFamily: 'monospace',
      fontSize: '20px',
      fontWeight: 'bold',
      margin: '0',
      color: '#ea580c',
    } as React.CSSProperties,
    estadoBadge: {
      display: 'inline-block',
      backgroundColor: '#fed7aa',
      color: '#9a3412',
      padding: '4px 12px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: '600',
      marginTop: '4px',
    } as React.CSSProperties,
    dateText: {
      fontSize: '11px',
      color: '#888',
      marginTop: '4px',
    } as React.CSSProperties,
    grid2Col: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      marginBottom: '16px',
    } as React.CSSProperties,
    infoBox: {
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      padding: '12px',
    } as React.CSSProperties,
    infoTitle: {
      fontWeight: 'bold',
      fontSize: '12px',
      marginBottom: '8px',
      color: '#374151',
      textTransform: 'uppercase' as const,
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: '4px',
    } as React.CSSProperties,
    infoRow: {
      marginBottom: '4px',
      fontSize: '11px',
    } as React.CSSProperties,
    infoLabel: {
      color: '#6b7280',
    } as React.CSSProperties,
    infoValue: {
      fontWeight: '600',
    } as React.CSSProperties,
    monoText: {
      fontFamily: 'monospace',
    } as React.CSSProperties,
    diagnosticoBox: {
      border: '2px solid #fed7aa',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '16px',
    } as React.CSSProperties,
    diagnosticoHeader: {
      backgroundColor: '#ffedd5',
      padding: '8px 12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    } as React.CSSProperties,
    diagnosticoTitle: {
      fontWeight: 'bold',
      fontSize: '12px',
      color: '#9a3412',
      textTransform: 'uppercase' as const,
      margin: 0,
    } as React.CSSProperties,
    diagnosticoContent: {
      padding: '12px',
    } as React.CSSProperties,
    sectionLabel: {
      fontSize: '11px',
      fontWeight: '600',
      color: '#6b7280',
      textTransform: 'uppercase' as const,
      marginBottom: '4px',
    } as React.CSSProperties,
    list: {
      listStyleType: 'disc',
      listStylePosition: 'inside' as const,
      margin: '0 0 12px 0',
      padding: 0,
    } as React.CSSProperties,
    listItem: {
      fontSize: '12px',
      marginBottom: '2px',
    } as React.CSSProperties,
    costosBox: {
      border: '2px solid #bfdbfe',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '16px',
    } as React.CSSProperties,
    costosHeader: {
      backgroundColor: '#dbeafe',
      padding: '8px 12px',
    } as React.CSSProperties,
    costosTitle: {
      fontWeight: 'bold',
      fontSize: '12px',
      color: '#1e40af',
      textTransform: 'uppercase' as const,
      margin: 0,
    } as React.CSSProperties,
    costosContent: {
      padding: '12px',
    } as React.CSSProperties,
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      border: '1px solid #d1d5db',
      fontSize: '11px',
    } as React.CSSProperties,
    th: {
      border: '1px solid #d1d5db',
      padding: '6px 10px',
      backgroundColor: '#f3f4f6',
      textAlign: 'left' as const,
      fontWeight: '600',
    } as React.CSSProperties,
    thCenter: {
      border: '1px solid #d1d5db',
      padding: '6px',
      backgroundColor: '#f3f4f6',
      textAlign: 'center' as const,
      fontWeight: '600',
      width: '50px',
    } as React.CSSProperties,
    thRight: {
      border: '1px solid #d1d5db',
      padding: '6px 10px',
      backgroundColor: '#f3f4f6',
      textAlign: 'right' as const,
      fontWeight: '600',
      width: '80px',
    } as React.CSSProperties,
    td: {
      border: '1px solid #d1d5db',
      padding: '5px 10px',
    } as React.CSSProperties,
    tdCenter: {
      border: '1px solid #d1d5db',
      padding: '5px 6px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    tdRight: {
      border: '1px solid #d1d5db',
      padding: '5px 10px',
      textAlign: 'right' as const,
    } as React.CSSProperties,
    totalRow: {
      backgroundColor: '#ffedd5',
    } as React.CSSProperties,
    tdTotal: {
      border: '1px solid #d1d5db',
      padding: '8px 10px',
      textAlign: 'right' as const,
      fontWeight: 'bold',
      fontSize: '14px',
    } as React.CSSProperties,
    tdTotalValue: {
      border: '1px solid #d1d5db',
      padding: '8px 10px',
      textAlign: 'right' as const,
      fontWeight: 'bold',
      fontSize: '14px',
      color: '#c2410c',
    } as React.CSSProperties,
    fotosBox: {
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '16px',
    } as React.CSSProperties,
    fotosGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px',
    } as React.CSSProperties,
    fotoThumb: {
      width: '100%',
      aspectRatio: '1',
      objectFit: 'cover' as const,
      borderRadius: '4px',
      border: '1px solid #e5e7eb',
    } as React.CSSProperties,
    envioBox: {
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '16px',
      backgroundColor: '#f9fafb',
    } as React.CSSProperties,
    accesoriosBox: {
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '16px',
    } as React.CSSProperties,
    accesoriosFlex: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '6px',
    } as React.CSSProperties,
    accesorioTag: {
      backgroundColor: '#f3f4f6',
      padding: '3px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      border: '1px solid #e5e7eb',
    } as React.CSSProperties,
    footer: {
      marginTop: '24px',
      paddingTop: '16px',
      borderTop: '2px solid #000',
      textAlign: 'center' as const,
      fontSize: '10px',
      color: '#6b7280',
    } as React.CSSProperties,
    canjeBox: {
      border: '2px solid #e9d5ff',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '16px',
    } as React.CSSProperties,
    canjeHeader: {
      backgroundColor: '#f3e8ff',
      padding: '8px 12px',
    } as React.CSSProperties,
    canjeTitle: {
      fontWeight: 'bold',
      fontSize: '12px',
      color: '#6b21a8',
      textTransform: 'uppercase' as const,
      margin: 0,
    } as React.CSSProperties,
    canjeContent: {
      padding: '12px',
    } as React.CSSProperties,
  };

  return (
    <div ref={ref} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>CS</div>
          <div>
            <h1 style={styles.headerTitle}>Centro de Servicio</h1>
            <p style={styles.headerSubtitle}>Ficha de Incidente SAC</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <p style={styles.incidentCode}>{data.codigo}</p>
          <div style={styles.estadoBadge}>{getEstadoLabel(data.estado)}</div>
          <p style={styles.dateText}>
            {data.diasEnTaller} días en taller • Generado: {fechaActual}
          </p>
        </div>
      </div>

      {/* Cliente y Producto */}
      <div style={styles.grid2Col}>
        {/* Cliente */}
        <div style={styles.infoBox}>
          <div style={styles.infoTitle}>Información del Cliente</div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Nombre: </span>
            <span style={styles.infoValue}>{data.nombreCliente}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Código: </span>
            <span style={{ ...styles.infoValue, ...styles.monoText }}>{data.codigoCliente}</span>
            <span style={styles.infoLabel}> | NIT: </span>
            <span style={styles.infoValue}>{data.nitCliente || 'C/F'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Teléfono: </span>
            <span style={styles.infoValue}>{data.telefonoCliente}</span>
            {data.celularCliente && data.celularCliente !== data.telefonoCliente && (
              <>
                <span style={styles.infoLabel}> | Cel: </span>
                <span style={styles.infoValue}>{data.celularCliente}</span>
              </>
            )}
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Correo: </span>
            <span style={styles.infoValue}>{data.correoCliente || 'N/A'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Dirección: </span>
            <span style={styles.infoValue}>{data.direccionCliente || 'Sin registrar'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoValue}>{data.municipio}, {data.departamento}</span>
          </div>
        </div>

        {/* Producto */}
        <div style={styles.infoBox}>
          <div style={styles.infoTitle}>Producto</div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Código: </span>
            <span style={{ ...styles.infoValue, ...styles.monoText, fontSize: '14px' }}>{data.codigoProducto}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Descripción: </span>
            <span style={styles.infoValue}>{data.descripcionProducto}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Fecha Ingreso: </span>
            <span style={styles.infoValue}>{fechaIngresoFormateada}</span>
          </div>
          <div style={{ ...styles.infoRow, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
            <span style={styles.infoLabel}>Problema Reportado: </span>
          </div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            {data.problemaReportado || 'Sin descripción'}
          </div>
        </div>
      </div>

      {/* Accesorios */}
      <div style={styles.accesoriosBox}>
        <div style={styles.infoTitle}>Accesorios de Ingreso</div>
        {data.accesorios.length > 0 ? (
          <div style={styles.accesoriosFlex}>
            {data.accesorios.map((acc, idx) => (
              <span key={idx} style={styles.accesorioTag}>{acc}</span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic', margin: 0 }}>
            Ingresó sin accesorios
          </p>
        )}
      </div>

      {/* Diagnóstico (si existe) */}
      {data.tieneDiagnostico && (
        <div style={styles.diagnosticoBox}>
          <div style={styles.diagnosticoHeader}>
            <h3 style={styles.diagnosticoTitle}>Diagnóstico Técnico</h3>
            <span style={{
              backgroundColor: data.aplicaGarantia ? '#16a34a' : '#f97316',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
            }}>
              {data.aplicaGarantia ? 'GARANTÍA' : data.tipoResolucion}
            </span>
          </div>
          <div style={styles.diagnosticoContent}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={styles.sectionLabel}>Fallas Encontradas</div>
                {data.fallas.length > 0 ? (
                  <ul style={styles.list}>
                    {data.fallas.map((falla, idx) => (
                      <li key={idx} style={styles.listItem}>{falla}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '11px', color: '#6b7280' }}>Sin fallas registradas</p>
                )}
              </div>
              <div>
                <div style={styles.sectionLabel}>Causas</div>
                {data.causas.length > 0 ? (
                  <ul style={styles.list}>
                    {data.causas.map((causa, idx) => (
                      <li key={idx} style={styles.listItem}>{causa}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '11px', color: '#6b7280' }}>Sin causas registradas</p>
                )}
              </div>
            </div>
            {data.recomendaciones && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                <div style={styles.sectionLabel}>Recomendaciones</div>
                <p style={{ fontSize: '12px', margin: 0 }}>{data.recomendaciones}</p>
              </div>
            )}
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280' }}>
              Técnico: <strong>{data.tecnicoNombre}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Producto Alternativo (para Canje) */}
      {data.productoAlternativo && (
        <div style={styles.canjeBox}>
          <div style={styles.canjeHeader}>
            <h3 style={styles.canjeTitle}>Producto Alternativo (Canje)</h3>
          </div>
          <div style={styles.canjeContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ ...styles.monoText, fontSize: '14px', fontWeight: 'bold', margin: 0 }}>
                  {data.productoAlternativo.codigo}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  {data.productoAlternativo.descripcion}
                </p>
              </div>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#6b21a8', margin: 0 }}>
                {formatCurrency(data.productoAlternativo.precio)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Costos */}
      <div style={styles.costosBox}>
        <div style={styles.costosHeader}>
          <h3 style={styles.costosTitle}>Resumen de Costos - {data.tipoResolucion}</h3>
        </div>
        <div style={styles.costosContent}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Concepto</th>
                <th style={styles.thCenter}>Cant.</th>
                <th style={styles.thRight}>P. Unit.</th>
                <th style={styles.thRight}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.repuestos.length > 0 ? (
                data.repuestos.map((r, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>
                      <span style={styles.monoText}>{r.codigo}</span> - {r.descripcion}
                    </td>
                    <td style={styles.tdCenter}>{r.cantidad}</td>
                    <td style={styles.tdRight}>{formatCurrency(r.precioUnitario)}</td>
                    <td style={styles.tdRight}>{formatCurrency(r.cantidad * r.precioUnitario)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: '#6b7280' }}>
                    Sin repuestos registrados
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={3} style={styles.td}>Consumibles</td>
                <td style={styles.tdRight}>{formatCurrency(data.costoManoObra)}</td>
              </tr>
              {data.porcentajeDescuento > 0 && (
                <>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <td colSpan={3} style={{ ...styles.td, textAlign: 'right', fontWeight: '600' }}>Subtotal:</td>
                    <td style={{ ...styles.tdRight, fontWeight: '600' }}>{formatCurrency(data.subtotalGeneral)}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0fdf4' }}>
                    <td colSpan={3} style={{ ...styles.td, textAlign: 'right', color: '#15803d' }}>
                      Descuento ({data.porcentajeDescuento}%):
                    </td>
                    <td style={{ ...styles.tdRight, color: '#15803d' }}>- {formatCurrency(data.descuento)}</td>
                  </tr>
                </>
              )}
              <tr style={styles.totalRow}>
                <td colSpan={3} style={styles.tdTotal}>TOTAL A PAGAR:</td>
                <td style={styles.tdTotalValue}>{formatCurrency(data.totalFinal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Fotos */}
      {data.fotos.length > 0 && (
        <div style={styles.fotosBox}>
          <div style={styles.infoTitle}>Evidencia Fotográfica ({data.fotos.length})</div>
          <div style={styles.fotosGrid}>
            {data.fotos.slice(0, 8).map((foto, idx) => (
              <img key={idx} src={foto.url} alt={`Foto ${idx + 1}`} style={styles.fotoThumb} />
            ))}
          </div>
          {data.fotos.length > 8 && (
            <p style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center', marginTop: '8px' }}>
              +{data.fotos.length - 8} fotos adicionales
            </p>
          )}
        </div>
      )}

      {/* Envío/Recolección */}
      <div style={styles.envioBox}>
        <div style={styles.infoTitle}>
          {data.quiereEnvio ? 'Información de Envío' : 'Recolección en Centro'}
        </div>
        {!data.quiereEnvio ? (
          <p style={{ fontSize: '12px', margin: 0 }}>
            El cliente recogerá el equipo en: <strong>{data.centroServicio}</strong>
          </p>
        ) : data.guia ? (
          <div>
            <p style={{ fontSize: '12px', margin: '0 0 4px 0' }}>
              <span style={styles.infoLabel}>No. Guía: </span>
              <span style={{ ...styles.monoText, fontWeight: 'bold' }}>
                {data.guia.numero_guia || data.guia.tracking_number || 'Pendiente'}
              </span>
            </p>
            <p style={{ fontSize: '12px', margin: 0 }}>
              <span style={styles.infoLabel}>Estado: </span>
              <span style={styles.infoValue}>{data.guia.estado || 'Pendiente'}</span>
            </p>
          </div>
        ) : (
          <p style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic', margin: 0 }}>
            Guía de envío pendiente de generar
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p style={{ margin: 0 }}>
          Documento generado por el Sistema de Servicio al Cliente • {data.centroServicio}
        </p>
        <p style={{ margin: '4px 0 0 0' }}>
          {fechaActual} • Incidente: {data.codigo}
        </p>
      </div>
    </div>
  );
});

SACIncidentePrintSheet.displayName = 'SACIncidentePrintSheet';

export default SACIncidentePrintSheet;
