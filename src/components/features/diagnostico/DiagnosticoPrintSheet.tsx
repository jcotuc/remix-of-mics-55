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
}

export interface DiagnosticoPrintData {
  // Incidente
  codigo: string;
  fechaIngreso: Date;
  fechaDiagnostico: Date;
  centroServicio: string;
  
  // Cliente
  codigoCliente: string;
  nombreCliente: string;
  telefonoCliente: string;
  direccionEnvio?: string;
  
  // Producto
  codigoProducto: string;
  descripcionProducto: string;
  skuMaquina: string;
  accesorios: string[];
  
  // Diagnóstico
  fallas: string[];
  causas: string[];
  recomendaciones: string;
  tecnicoNombre: string;
  
  // Resolución
  tipoResolucion: 'Reparar en Garantía' | 'Presupuesto' | 'Canje' | 'Cambio por Garantía' | 'Nota de Crédito' | string;
  aplicaGarantia: boolean;
  tipoTrabajo?: 'mantenimiento' | 'reparacion';
  
  // Costos
  repuestos: RepuestoItem[];
  costoManoObra: number;
  costoEnvio?: number;
  
  // Para Canje
  productoAlternativo?: ProductoAlternativo;
  porcentajeDescuento?: number;
}

interface Props {
  data: DiagnosticoPrintData;
}

const DiagnosticoPrintSheet = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const fechaIngresoFormateada = formatFechaCorta(data.fechaIngreso);
  const fechaDiagnosticoFormateada = formatFechaHora(data.fechaDiagnostico);

  // Calcular totales
  const subtotalRepuestos = data.repuestos.reduce((sum, r) => sum + (r.cantidad * r.precioUnitario), 0);
  const subtotalGeneral = subtotalRepuestos + data.costoManoObra + (data.costoEnvio || 0);
  
  // Calcular descuento según tipo de resolución
  let descuento = 0;
  let porcentajeDescuentoAplicado = 0;
  
  if (data.tipoResolucion === 'Reparar en Garantía' && data.aplicaGarantia) {
    descuento = subtotalGeneral;
    porcentajeDescuentoAplicado = 100;
  } else if (data.tipoResolucion === 'Canje' && data.porcentajeDescuento) {
    porcentajeDescuentoAplicado = data.porcentajeDescuento;
    descuento = subtotalGeneral * (data.porcentajeDescuento / 100);
  }
  
  const totalFinal = subtotalGeneral - descuento;

  // Formatear moneda
  const formatCurrency = (amount: number) => `Q ${amount.toFixed(2)}`;

  // Obtener título según tipo de resolución
  const getTituloResolucion = () => {
    switch (data.tipoResolucion) {
      case 'Reparar en Garantía':
        return 'Reparación en Garantía';
      case 'Presupuesto':
        return 'Presupuesto de Reparación';
      case 'Canje':
        return 'Propuesta de Canje';
      case 'Cambio por Garantía':
        return 'Cambio por Garantía';
      case 'Nota de Crédito':
        return 'Nota de Crédito';
      default:
        return 'Diagnóstico Técnico';
    }
  };

  // Obtener mensaje según tipo de resolución
  const getMensajeResolucion = () => {
    switch (data.tipoResolucion) {
      case 'Reparar en Garantía':
        return 'El equipo fue reparado bajo garantía. No tiene costo para el cliente.';
      case 'Presupuesto':
        return 'Presupuesto sujeto a aprobación del cliente. Vigencia: 15 días.';
      case 'Canje':
        return `Se ofrece un ${data.porcentajeDescuento}% de descuento en producto alternativo.`;
      case 'Cambio por Garantía':
        return 'El equipo será reemplazado por uno nuevo bajo garantía.';
      case 'Nota de Crédito':
        return 'Se generará una nota de crédito por el valor del equipo.';
      default:
        return '';
    }
  };

  // Inline styles for print compatibility
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
      backgroundColor: '#f97316',
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
    headerAddress: {
      fontSize: '12px',
      color: '#888',
      margin: '2px 0 0 0',
    } as React.CSSProperties,
    headerRight: {
      textAlign: 'right' as const,
    } as React.CSSProperties,
    resolutionTitle: {
      fontWeight: 'bold',
      fontSize: '18px',
      color: '#ea580c',
      margin: '0',
    } as React.CSSProperties,
    incidentCode: {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontWeight: 'bold',
      margin: '4px 0',
    } as React.CSSProperties,
    dateText: {
      fontSize: '12px',
      color: '#888',
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
      fontSize: '13px',
      marginBottom: '8px',
      color: '#374151',
      textTransform: 'uppercase' as const,
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: '4px',
    } as React.CSSProperties,
    infoRow: {
      marginBottom: '4px',
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
    accesoriosBox: {
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '16px',
    } as React.CSSProperties,
    accesoriosTitle: {
      fontWeight: 'bold',
      fontSize: '13px',
      marginBottom: '8px',
      color: '#374151',
      textTransform: 'uppercase' as const,
    } as React.CSSProperties,
    accesoriosFlex: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '8px',
    } as React.CSSProperties,
    accesorioTag: {
      backgroundColor: '#f3f4f6',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
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
    } as React.CSSProperties,
    diagnosticoTitle: {
      fontWeight: 'bold',
      fontSize: '13px',
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
      fontSize: '13px',
      marginBottom: '2px',
    } as React.CSSProperties,
    recomendacionesBox: {
      backgroundColor: '#f9fafb',
      padding: '8px',
      borderRadius: '4px',
      fontSize: '13px',
    } as React.CSSProperties,
    tecnicoRow: {
      paddingTop: '8px',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '12px',
    } as React.CSSProperties,
    tipoTrabajoBadge: {
      fontSize: '11px',
      backgroundColor: '#dbeafe',
      color: '#1e40af',
      padding: '2px 8px',
      borderRadius: '4px',
    } as React.CSSProperties,
    resolucionBox: {
      border: '2px solid #bbf7d0',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '16px',
    } as React.CSSProperties,
    resolucionHeader: {
      backgroundColor: '#dcfce7',
      padding: '8px 12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    } as React.CSSProperties,
    resolucionHeaderTitle: {
      fontWeight: 'bold',
      fontSize: '13px',
      color: '#166534',
      textTransform: 'uppercase' as const,
      margin: 0,
    } as React.CSSProperties,
    resolucionBadge: {
      backgroundColor: '#16a34a',
      color: '#fff',
      padding: '4px 12px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: '600',
    } as React.CSSProperties,
    resolucionContent: {
      padding: '12px',
    } as React.CSSProperties,
    resolucionMessage: {
      fontSize: '13px',
      color: '#374151',
      margin: 0,
    } as React.CSSProperties,
    productoAltBox: {
      border: '2px solid #e9d5ff',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '16px',
    } as React.CSSProperties,
    productoAltHeader: {
      backgroundColor: '#f3e8ff',
      padding: '8px 12px',
    } as React.CSSProperties,
    productoAltTitle: {
      fontWeight: 'bold',
      fontSize: '13px',
      color: '#6b21a8',
      textTransform: 'uppercase' as const,
      margin: 0,
    } as React.CSSProperties,
    productoAltContent: {
      padding: '12px',
    } as React.CSSProperties,
    costosTitle: {
      fontWeight: 'bold',
      fontSize: '13px',
      marginBottom: '8px',
      color: '#374151',
      textTransform: 'uppercase' as const,
    } as React.CSSProperties,
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      border: '1px solid #d1d5db',
      fontSize: '13px',
    } as React.CSSProperties,
    th: {
      border: '1px solid #d1d5db',
      padding: '8px 12px',
      backgroundColor: '#f3f4f6',
      textAlign: 'left' as const,
      fontWeight: '600',
    } as React.CSSProperties,
    thCenter: {
      border: '1px solid #d1d5db',
      padding: '8px',
      backgroundColor: '#f3f4f6',
      textAlign: 'center' as const,
      fontWeight: '600',
      width: '60px',
    } as React.CSSProperties,
    thRight: {
      border: '1px solid #d1d5db',
      padding: '8px 12px',
      backgroundColor: '#f3f4f6',
      textAlign: 'right' as const,
      fontWeight: '600',
      width: '100px',
    } as React.CSSProperties,
    td: {
      border: '1px solid #d1d5db',
      padding: '6px 12px',
    } as React.CSSProperties,
    tdCenter: {
      border: '1px solid #d1d5db',
      padding: '6px 8px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    tdRight: {
      border: '1px solid #d1d5db',
      padding: '6px 12px',
      textAlign: 'right' as const,
    } as React.CSSProperties,
    subtotalRow: {
      backgroundColor: '#f9fafb',
    } as React.CSSProperties,
    descuentoRow: {
      backgroundColor: '#f0fdf4',
    } as React.CSSProperties,
    totalRow: {
      backgroundColor: '#ffedd5',
    } as React.CSSProperties,
    tdSubtotal: {
      border: '1px solid #d1d5db',
      padding: '8px 12px',
      textAlign: 'right' as const,
      fontWeight: '600',
    } as React.CSSProperties,
    tdDescuento: {
      border: '1px solid #d1d5db',
      padding: '8px 12px',
      textAlign: 'right' as const,
      fontWeight: '600',
      color: '#15803d',
    } as React.CSSProperties,
    tdTotal: {
      border: '1px solid #d1d5db',
      padding: '8px 12px',
      textAlign: 'right' as const,
      fontWeight: 'bold',
      fontSize: '16px',
    } as React.CSSProperties,
    tdTotalValue: {
      border: '1px solid #d1d5db',
      padding: '8px 12px',
      textAlign: 'right' as const,
      fontWeight: 'bold',
      fontSize: '16px',
      color: '#c2410c',
    } as React.CSSProperties,
    noteBox: {
      marginTop: '8px',
      padding: '8px',
      borderRadius: '4px',
      fontSize: '11px',
    } as React.CSSProperties,
    noteGreen: {
      backgroundColor: '#f0fdf4',
      border: '1px solid #bbf7d0',
      color: '#15803d',
    } as React.CSSProperties,
    noteYellow: {
      backgroundColor: '#fefce8',
      border: '1px solid #fef08a',
      color: '#a16207',
    } as React.CSSProperties,
    noteBlue: {
      marginBottom: '16px',
      padding: '16px',
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '8px',
    } as React.CSSProperties,
    noteBlueText: {
      fontSize: '13px',
      color: '#1d4ed8',
      margin: 0,
    } as React.CSSProperties,
    firmasGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '32px',
      marginTop: '32px',
      marginBottom: '24px',
    } as React.CSSProperties,
    firmaBox: {
      textAlign: 'center' as const,
    } as React.CSSProperties,
    firmaLine: {
      borderTop: '2px solid #000',
      width: '192px',
      margin: '0 auto 4px auto',
      paddingTop: '8px',
    } as React.CSSProperties,
    firmaLabel: {
      fontSize: '11px',
      color: '#6b7280',
    } as React.CSSProperties,
    firmaName: {
      fontSize: '13px',
      fontWeight: '600',
    } as React.CSSProperties,
    firmaPlaceholder: {
      fontSize: '13px',
      color: '#9ca3af',
    } as React.CSSProperties,
    footer: {
      borderTop: '1px solid #e5e7eb',
      paddingTop: '16px',
      fontSize: '10px',
      color: '#6b7280',
    } as React.CSSProperties,
    footerTitle: {
      fontWeight: '600',
      color: '#374151',
      marginBottom: '4px',
    } as React.CSSProperties,
    footerList: {
      listStyleType: 'disc',
      listStylePosition: 'inside' as const,
      margin: 0,
      padding: 0,
    } as React.CSSProperties,
    footerItem: {
      marginBottom: '2px',
    } as React.CSSProperties,
    footerDate: {
      marginTop: '8px',
      textAlign: 'center' as const,
      color: '#9ca3af',
    } as React.CSSProperties,
    repuestoCode: {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#6b7280',
      marginRight: '8px',
    } as React.CSSProperties,
  };

  return (
    <div ref={ref} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>HPC</div>
          <div>
            <h1 style={styles.headerTitle}>HPC Centro de Servicio</h1>
            <p style={styles.headerSubtitle}>{data.centroServicio}</p>
            <p style={styles.headerAddress}>27 Calle 41-55 Zona 5 | Tel: 2499-5000</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <h2 style={styles.resolutionTitle}>{getTituloResolucion()}</h2>
          <p style={styles.incidentCode}>{data.codigo}</p>
          <p style={styles.dateText}>Fecha diagnóstico: {fechaDiagnosticoFormateada}</p>
        </div>
      </div>

      {/* Información del Cliente y Equipo */}
      <div style={styles.grid2Col}>
        {/* Cliente */}
        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>Información del Cliente</h3>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Código: </span>
            <span style={styles.infoValue}>{data.codigoCliente}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Nombre: </span>
            <span style={styles.infoValue}>{data.nombreCliente}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Teléfono: </span>
            <span>{data.telefonoCliente}</span>
          </div>
          {data.direccionEnvio && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Dirección envío: </span>
              <span>{data.direccionEnvio}</span>
            </div>
          )}
        </div>

        {/* Equipo */}
        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>Información del Equipo</h3>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Código: </span>
            <span style={styles.infoValue}>{data.codigoProducto}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Descripción: </span>
            <span>{data.descripcionProducto}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>SKU/Serie: </span>
            <span style={styles.monoText}>{data.skuMaquina || 'N/A'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Fecha ingreso: </span>
            <span>{fechaIngresoFormateada}</span>
          </div>
        </div>
      </div>

      {/* Accesorios */}
      {data.accesorios.length > 0 && (
        <div style={styles.accesoriosBox}>
          <h3 style={styles.accesoriosTitle}>Accesorios Ingresados</h3>
          <div style={styles.accesoriosFlex}>
            {data.accesorios.map((acc, idx) => (
              <span key={idx} style={styles.accesorioTag}>{acc}</span>
            ))}
          </div>
        </div>
      )}

      {/* Diagnóstico Técnico */}
      <div style={styles.diagnosticoBox}>
        <div style={styles.diagnosticoHeader}>
          <h3 style={styles.diagnosticoTitle}>Diagnóstico Técnico</h3>
        </div>
        <div style={styles.diagnosticoContent}>
          {/* Fallas */}
          <div>
            <p style={styles.sectionLabel}>Fallas Detectadas:</p>
            <ul style={styles.list}>
              {data.fallas.map((falla, idx) => (
                <li key={idx} style={styles.listItem}>{falla}</li>
              ))}
            </ul>
          </div>

          {/* Causas */}
          <div>
            <p style={styles.sectionLabel}>Causas Identificadas:</p>
            <ul style={styles.list}>
              {data.causas.map((causa, idx) => (
                <li key={idx} style={styles.listItem}>{causa}</li>
              ))}
            </ul>
          </div>

          {/* Recomendaciones */}
          {data.recomendaciones && (
            <div>
              <p style={styles.sectionLabel}>Recomendaciones:</p>
              <p style={styles.recomendacionesBox}>{data.recomendaciones}</p>
            </div>
          )}

          {/* Técnico */}
          <div style={styles.tecnicoRow}>
            <p style={{ margin: 0, fontSize: '12px' }}>
              <span style={styles.infoLabel}>Técnico responsable: </span>
              <span style={styles.infoValue}>{data.tecnicoNombre}</span>
            </p>
            {data.tipoTrabajo && (
              <span style={styles.tipoTrabajoBadge}>
                {data.tipoTrabajo === 'mantenimiento' ? 'Mantenimiento' : 'Reparación'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Resolución y Mensaje */}
      <div style={styles.resolucionBox}>
        <div style={styles.resolucionHeader}>
          <h3 style={styles.resolucionHeaderTitle}>Resolución</h3>
          <span style={styles.resolucionBadge}>{data.tipoResolucion}</span>
        </div>
        <div style={styles.resolucionContent}>
          <p style={styles.resolucionMessage}>{getMensajeResolucion()}</p>
        </div>
      </div>

      {/* Producto Alternativo (para Canje) */}
      {data.tipoResolucion === 'Canje' && data.productoAlternativo && (
        <div style={styles.productoAltBox}>
          <div style={styles.productoAltHeader}>
            <h3 style={styles.productoAltTitle}>Producto Alternativo Sugerido</h3>
          </div>
          <div style={styles.productoAltContent}>
            <p style={styles.infoRow}>
              <span style={styles.infoLabel}>Código: </span>
              <span style={{ ...styles.monoText, fontWeight: '600' }}>{data.productoAlternativo.codigo}</span>
            </p>
            <p style={styles.infoRow}>
              <span style={styles.infoLabel}>Descripción: </span>
              <span>{data.productoAlternativo.descripcion}</span>
            </p>
          </div>
        </div>
      )}

      {/* Detalle de Costos */}
      {(data.repuestos.length > 0 || data.costoManoObra > 0) && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={styles.costosTitle}>Detalle de Costos</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Concepto</th>
                <th style={styles.thCenter}>Cant.</th>
                <th style={styles.thRight}>Precio Unit.</th>
                <th style={styles.thRight}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {/* Repuestos */}
              {data.repuestos.map((repuesto, idx) => (
                <tr key={idx}>
                  <td style={styles.td}>
                    <span style={styles.repuestoCode}>{repuesto.codigo}</span>
                    {repuesto.descripcion}
                  </td>
                  <td style={styles.tdCenter}>{repuesto.cantidad}</td>
                  <td style={styles.tdRight}>{formatCurrency(repuesto.precioUnitario)}</td>
                  <td style={styles.tdRight}>{formatCurrency(repuesto.cantidad * repuesto.precioUnitario)}</td>
                </tr>
              ))}
              
              {/* Mano de Obra */}
              {data.costoManoObra > 0 && (
                <tr>
                  <td style={styles.td}>Mano de Obra</td>
                  <td style={styles.tdCenter}>1</td>
                  <td style={styles.tdRight}>{formatCurrency(data.costoManoObra)}</td>
                  <td style={styles.tdRight}>{formatCurrency(data.costoManoObra)}</td>
                </tr>
              )}

              {/* Envío */}
              {data.costoEnvio && data.costoEnvio > 0 && (
                <tr>
                  <td style={styles.td}>Servicio de Envío</td>
                  <td style={styles.tdCenter}>1</td>
                  <td style={styles.tdRight}>{formatCurrency(data.costoEnvio)}</td>
                  <td style={styles.tdRight}>{formatCurrency(data.costoEnvio)}</td>
                </tr>
              )}

              {/* Subtotal */}
              <tr style={styles.subtotalRow}>
                <td colSpan={3} style={styles.tdSubtotal}>SUBTOTAL</td>
                <td style={styles.tdSubtotal}>{formatCurrency(subtotalGeneral)}</td>
              </tr>

              {/* Descuento */}
              {descuento > 0 && (
                <tr style={styles.descuentoRow}>
                  <td colSpan={3} style={styles.tdDescuento}>
                    DESCUENTO ({porcentajeDescuentoAplicado}%)
                    {data.aplicaGarantia && <span style={{ marginLeft: '8px', fontWeight: 'normal', fontSize: '11px' }}>(Cubierto por Garantía)</span>}
                  </td>
                  <td style={styles.tdDescuento}>-{formatCurrency(descuento)}</td>
                </tr>
              )}

              {/* Total */}
              <tr style={styles.totalRow}>
                <td colSpan={3} style={styles.tdTotal}>TOTAL A PAGAR</td>
                <td style={styles.tdTotalValue}>{formatCurrency(totalFinal)}</td>
              </tr>
            </tbody>
          </table>

          {/* Nota de Garantía */}
          {data.aplicaGarantia && data.tipoResolucion === 'Reparar en Garantía' && (
            <div style={{ ...styles.noteBox, ...styles.noteGreen }}>
              <strong>✓ Reparación cubierta por garantía.</strong> Los costos mostrados representan el valor del servicio que fue cubierto sin costo para el cliente.
            </div>
          )}

          {/* Nota de Presupuesto */}
          {data.tipoResolucion === 'Presupuesto' && (
            <div style={{ ...styles.noteBox, ...styles.noteYellow }}>
              <strong>⚠ Presupuesto pendiente de aprobación.</strong> Este presupuesto tiene una vigencia de 15 días. Para aprobar, comuníquese al teléfono 2499-5000.
            </div>
          )}
        </div>
      )}

      {/* Sin costos para Cambio por Garantía o Nota de Crédito */}
      {(data.tipoResolucion === 'Cambio por Garantía' || data.tipoResolucion === 'Nota de Crédito') && (
        <div style={styles.noteBlue}>
          <p style={styles.noteBlueText}>
            {data.tipoResolucion === 'Cambio por Garantía' 
              ? 'El equipo será reemplazado sin costo adicional. Se coordinará la entrega del nuevo equipo.'
              : 'Se procesará una nota de crédito por el valor del equipo. Un asesor se comunicará con usted para más detalles.'
            }
          </p>
          {data.costoEnvio && data.costoEnvio > 0 && (
            <p style={{ ...styles.noteBlueText, marginTop: '8px' }}>
              <strong>Costo de envío aplicable:</strong> {formatCurrency(data.costoEnvio)}
            </p>
          )}
        </div>
      )}

      {/* Firmas */}
      <div style={styles.firmasGrid}>
        <div style={styles.firmaBox}>
          <div style={styles.firmaLine}></div>
          <p style={styles.firmaLabel}>Técnico Responsable</p>
          <p style={styles.firmaName}>{data.tecnicoNombre}</p>
        </div>
        <div style={styles.firmaBox}>
          <div style={styles.firmaLine}></div>
          <p style={styles.firmaLabel}>Cliente / Autorizado</p>
          <p style={styles.firmaPlaceholder}>Firma de recibido</p>
        </div>
      </div>

      {/* Políticas y Notas */}
      <div style={styles.footer}>
        <p style={styles.footerTitle}>Políticas y Condiciones:</p>
        <ul style={styles.footerList}>
          <li style={styles.footerItem}>En toda reparación se garantiza el trabajo realizado sobre el problema reportado, solo en mano de obra por 30 días.</li>
          <li style={styles.footerItem}>La garantía no cubre mantenimientos preventivos ni correctivos, daños por mal uso, accidentes o variaciones de voltaje.</li>
          <li style={styles.footerItem}>Los presupuestos tienen vigencia de 15 días. Después de este período, los precios pueden variar.</li>
          <li style={styles.footerItem}>Para recoger el equipo, presente este documento o su número de incidente.</li>
        </ul>
        <p style={styles.footerDate}>
          Documento generado automáticamente el {formatFechaHora(new Date())}
        </p>
      </div>
    </div>
  );
});

DiagnosticoPrintSheet.displayName = 'DiagnosticoPrintSheet';

export default DiagnosticoPrintSheet;
