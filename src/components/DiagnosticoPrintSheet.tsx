import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const fechaIngresoFormateada = format(data.fechaIngreso, "dd/MM/yyyy", { locale: es });
  const fechaDiagnosticoFormateada = format(data.fechaDiagnostico, "dd/MM/yyyy HH:mm", { locale: es });

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

  return (
    <div ref={ref} className="print-sheet bg-white text-black p-6 w-full max-w-[8.5in] mx-auto font-sans text-[11px]">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            HPC
          </div>
          <div>
            <h1 className="font-bold text-xl">HPC Centro de Servicio</h1>
            <p className="text-sm text-gray-600">{data.centroServicio}</p>
            <p className="text-xs text-gray-500">27 Calle 41-55 Zona 5 | Tel: 2499-5000</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="font-bold text-lg text-orange-600">{getTituloResolucion()}</h2>
          <p className="font-mono text-lg font-bold">{data.codigo}</p>
          <p className="text-xs text-gray-500">Fecha diagnóstico: {fechaDiagnosticoFormateada}</p>
        </div>
      </div>

      {/* Información del Cliente y Equipo */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Cliente */}
        <div className="border border-gray-300 rounded-lg p-3">
          <h3 className="font-bold text-sm mb-2 text-gray-700 uppercase border-b pb-1">Información del Cliente</h3>
          <div className="space-y-1">
            <p><span className="text-gray-500">Código:</span> <span className="font-semibold">{data.codigoCliente}</span></p>
            <p><span className="text-gray-500">Nombre:</span> <span className="font-semibold">{data.nombreCliente}</span></p>
            <p><span className="text-gray-500">Teléfono:</span> {data.telefonoCliente}</p>
            {data.direccionEnvio && (
              <p><span className="text-gray-500">Dirección envío:</span> {data.direccionEnvio}</p>
            )}
          </div>
        </div>

        {/* Equipo */}
        <div className="border border-gray-300 rounded-lg p-3">
          <h3 className="font-bold text-sm mb-2 text-gray-700 uppercase border-b pb-1">Información del Equipo</h3>
          <div className="space-y-1">
            <p><span className="text-gray-500">Código:</span> <span className="font-semibold">{data.codigoProducto}</span></p>
            <p><span className="text-gray-500">Descripción:</span> {data.descripcionProducto}</p>
            <p><span className="text-gray-500">SKU/Serie:</span> <span className="font-mono">{data.skuMaquina || 'N/A'}</span></p>
            <p><span className="text-gray-500">Fecha ingreso:</span> {fechaIngresoFormateada}</p>
          </div>
        </div>
      </div>

      {/* Accesorios */}
      {data.accesorios.length > 0 && (
        <div className="mb-4 border border-gray-300 rounded-lg p-3">
          <h3 className="font-bold text-sm mb-2 text-gray-700 uppercase">Accesorios Ingresados</h3>
          <div className="flex flex-wrap gap-2">
            {data.accesorios.map((acc, idx) => (
              <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-xs">{acc}</span>
            ))}
          </div>
        </div>
      )}

      {/* Diagnóstico Técnico */}
      <div className="mb-4 border-2 border-orange-200 rounded-lg overflow-hidden">
        <div className="bg-orange-100 px-3 py-2">
          <h3 className="font-bold text-sm text-orange-800 uppercase">Diagnóstico Técnico</h3>
        </div>
        <div className="p-3 space-y-3">
          {/* Fallas */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Fallas Detectadas:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {data.fallas.map((falla, idx) => (
                <li key={idx} className="text-sm">{falla}</li>
              ))}
            </ul>
          </div>

          {/* Causas */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Causas Identificadas:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {data.causas.map((causa, idx) => (
                <li key={idx} className="text-sm">{causa}</li>
              ))}
            </ul>
          </div>

          {/* Recomendaciones */}
          {data.recomendaciones && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Recomendaciones:</p>
              <p className="text-sm bg-gray-50 p-2 rounded">{data.recomendaciones}</p>
            </div>
          )}

          {/* Técnico */}
          <div className="pt-2 border-t flex justify-between items-center">
            <p className="text-xs">
              <span className="text-gray-500">Técnico responsable:</span> 
              <span className="font-semibold ml-1">{data.tecnicoNombre}</span>
            </p>
            {data.tipoTrabajo && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                {data.tipoTrabajo === 'mantenimiento' ? 'Mantenimiento' : 'Reparación'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Resolución y Mensaje */}
      <div className="mb-4 border-2 border-green-200 rounded-lg overflow-hidden">
        <div className="bg-green-100 px-3 py-2 flex justify-between items-center">
          <h3 className="font-bold text-sm text-green-800 uppercase">Resolución</h3>
          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
            {data.tipoResolucion}
          </span>
        </div>
        <div className="p-3">
          <p className="text-sm text-gray-700">{getMensajeResolucion()}</p>
        </div>
      </div>

      {/* Producto Alternativo (para Canje) */}
      {data.tipoResolucion === 'Canje' && data.productoAlternativo && (
        <div className="mb-4 border-2 border-purple-200 rounded-lg overflow-hidden">
          <div className="bg-purple-100 px-3 py-2">
            <h3 className="font-bold text-sm text-purple-800 uppercase">Producto Alternativo Sugerido</h3>
          </div>
          <div className="p-3">
            <p><span className="text-gray-500">Código:</span> <span className="font-mono font-semibold">{data.productoAlternativo.codigo}</span></p>
            <p><span className="text-gray-500">Descripción:</span> {data.productoAlternativo.descripcion}</p>
          </div>
        </div>
      )}

      {/* Detalle de Costos */}
      {(data.repuestos.length > 0 || data.costoManoObra > 0) && (
        <div className="mb-4">
          <h3 className="font-bold text-sm mb-2 text-gray-700 uppercase">Detalle de Costos</h3>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Concepto</th>
                <th className="border border-gray-300 px-2 py-2 text-center w-16">Cant.</th>
                <th className="border border-gray-300 px-3 py-2 text-right w-24">Precio Unit.</th>
                <th className="border border-gray-300 px-3 py-2 text-right w-24">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {/* Repuestos */}
              {data.repuestos.map((repuesto, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 px-3 py-1.5">
                    <span className="font-mono text-xs text-gray-500 mr-2">{repuesto.codigo}</span>
                    {repuesto.descripcion}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center">{repuesto.cantidad}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right">{formatCurrency(repuesto.precioUnitario)}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right">{formatCurrency(repuesto.cantidad * repuesto.precioUnitario)}</td>
                </tr>
              ))}
              
              {/* Mano de Obra */}
              {data.costoManoObra > 0 && (
                <tr>
                  <td className="border border-gray-300 px-3 py-1.5">Mano de Obra</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center">1</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right">{formatCurrency(data.costoManoObra)}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right">{formatCurrency(data.costoManoObra)}</td>
                </tr>
              )}

              {/* Envío */}
              {data.costoEnvio && data.costoEnvio > 0 && (
                <tr>
                  <td className="border border-gray-300 px-3 py-1.5">Servicio de Envío</td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center">1</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right">{formatCurrency(data.costoEnvio)}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right">{formatCurrency(data.costoEnvio)}</td>
                </tr>
              )}

              {/* Subtotal */}
              <tr className="bg-gray-50">
                <td colSpan={3} className="border border-gray-300 px-3 py-2 text-right font-semibold">SUBTOTAL</td>
                <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{formatCurrency(subtotalGeneral)}</td>
              </tr>

              {/* Descuento */}
              {descuento > 0 && (
                <tr className="bg-green-50">
                  <td colSpan={3} className="border border-gray-300 px-3 py-2 text-right font-semibold text-green-700">
                    DESCUENTO ({porcentajeDescuentoAplicado}%)
                    {data.aplicaGarantia && <span className="ml-2 text-xs font-normal">(Cubierto por Garantía)</span>}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-green-700">
                    -{formatCurrency(descuento)}
                  </td>
                </tr>
              )}

              {/* Total */}
              <tr className="bg-orange-100">
                <td colSpan={3} className="border border-gray-300 px-3 py-2 text-right font-bold text-lg">TOTAL A PAGAR</td>
                <td className="border border-gray-300 px-3 py-2 text-right font-bold text-lg text-orange-700">
                  {formatCurrency(totalFinal)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Nota de Garantía */}
          {data.aplicaGarantia && data.tipoResolucion === 'Reparar en Garantía' && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              <strong>✓ Reparación cubierta por garantía.</strong> Los costos mostrados representan el valor del servicio que fue cubierto sin costo para el cliente.
            </div>
          )}

          {/* Nota de Presupuesto */}
          {data.tipoResolucion === 'Presupuesto' && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
              <strong>⚠ Presupuesto pendiente de aprobación.</strong> Este presupuesto tiene una vigencia de 15 días. Para aprobar, comuníquese al teléfono 2499-5000.
            </div>
          )}
        </div>
      )}

      {/* Sin costos para Cambio por Garantía o Nota de Crédito */}
      {(data.tipoResolucion === 'Cambio por Garantía' || data.tipoResolucion === 'Nota de Crédito') && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            {data.tipoResolucion === 'Cambio por Garantía' 
              ? 'El equipo será reemplazado sin costo adicional. Se coordinará la entrega del nuevo equipo.'
              : 'Se procesará una nota de crédito por el valor del equipo. Un asesor se comunicará con usted para más detalles.'
            }
          </p>
          {data.costoEnvio && data.costoEnvio > 0 && (
            <p className="text-sm text-blue-700 mt-2">
              <strong>Costo de envío aplicable:</strong> {formatCurrency(data.costoEnvio)}
            </p>
          )}
        </div>
      )}

      {/* Firmas */}
      <div className="grid grid-cols-2 gap-8 mt-8 mb-6">
        <div className="text-center">
          <div className="border-t-2 border-black w-48 mx-auto mb-1 pt-2"></div>
          <p className="text-xs text-gray-600">Técnico Responsable</p>
          <p className="text-sm font-semibold">{data.tecnicoNombre}</p>
        </div>
        <div className="text-center">
          <div className="border-t-2 border-black w-48 mx-auto mb-1 pt-2"></div>
          <p className="text-xs text-gray-600">Cliente / Autorizado</p>
          <p className="text-sm text-gray-400">Firma de recibido</p>
        </div>
      </div>

      {/* Políticas y Notas */}
      <div className="border-t pt-4 text-[10px] text-gray-500 space-y-1">
        <p className="font-semibold text-gray-700">Políticas y Condiciones:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>En toda reparación se garantiza el trabajo realizado sobre el problema reportado, solo en mano de obra por 30 días.</li>
          <li>La garantía no cubre mantenimientos preventivos ni correctivos, daños por mal uso, accidentes o variaciones de voltaje.</li>
          <li>Los presupuestos tienen vigencia de 15 días. Después de este período, los precios pueden variar.</li>
          <li>Para recoger el equipo, presente este documento o su número de incidente.</li>
        </ul>
        <p className="mt-2 text-center text-gray-400">
          Documento generado automáticamente el {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
        </p>
      </div>
    </div>
  );
});

DiagnosticoPrintSheet.displayName = 'DiagnosticoPrintSheet';

export default DiagnosticoPrintSheet;
