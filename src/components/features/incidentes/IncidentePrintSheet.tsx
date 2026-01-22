import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface IncidentePrintData {
  codigo: string;
  codigoCliente: string;
  nombreCliente: string;
  telefonoCliente?: string;
  tipoCliente?: string; // alianza, mostrador, canal
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
}

interface Props {
  data: IncidentePrintData;
}

// Componente de código de barras CSS simulado
const CSSBarcode = ({ value }: { value: string }) => {
  const generatePattern = (str: string): number[] => {
    const pattern: number[] = [];
    for (let i = 0; i < str.length * 3; i++) {
      const charCode = str.charCodeAt(i % str.length);
      pattern.push((charCode + i) % 4 + 1);
    }
    return pattern;
  };

  const pattern = generatePattern(value);

  return (
    <div className="flex items-end justify-center h-10 gap-[1px]">
      {pattern.map((width, index) => (
        <div
          key={index}
          className="bg-black"
          style={{
            width: `${width}px`,
            height: `${24 + (index % 3) * 4}px`,
          }}
        />
      ))}
    </div>
  );
};

const IncidentePrintSheet = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const fechaFormateada = format(data.fechaIngreso, "dd/MM/yyyy", { locale: es });
  const horaFormateada = format(data.fechaIngreso, "HH:mm", { locale: es });

  return (
    <div ref={ref} className="print-sheet bg-white text-black p-3 w-full max-w-[8.5in] mx-auto font-sans text-[10px]">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 1: COPIA CENTRO DE SERVICIO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="border-2 border-black rounded-sm overflow-hidden mb-3">
        {/* Header con gradiente */}
        <div className="flex justify-between items-center p-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
              <span className="text-orange-500 font-black text-sm">HPC</span>
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">Centro de Servicio</p>
              <p className="text-[10px] opacity-90">{data.centroServicio}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg leading-none">{data.codigo}</p>
            <p className="text-[9px] opacity-80 mt-0.5">Copia Taller</p>
          </div>
        </div>

        {/* Grid de información compacto */}
        <div className="grid grid-cols-4 text-[9px]">
          <div className="border-r border-b border-gray-300 p-1.5 bg-gray-50">
            <p className="text-gray-500 text-[8px] uppercase">Cliente ({data.tipoCliente || 'Mostrador'})</p>
            <p className="font-bold text-[10px]">{data.codigoCliente}</p>
          </div>
          <div className="border-r border-b border-gray-300 p-1.5 bg-gray-50">
            <p className="text-gray-500 text-[8px] uppercase">Nombre</p>
            <p className="font-semibold truncate">{data.nombreCliente}</p>
          </div>
          <div className="border-r border-b border-gray-300 p-1.5 bg-gray-50">
            <p className="text-gray-500 text-[8px] uppercase">Fecha/Hora</p>
            <p className="font-bold">{fechaFormateada} {horaFormateada}</p>
          </div>
          <div className="border-b border-gray-300 p-1.5 bg-gray-50">
            <p className="text-gray-500 text-[8px] uppercase">Tipología</p>
            <p className="font-bold">{data.tipologia}</p>
          </div>
          
          <div className="border-r border-b border-gray-300 p-1.5">
            <p className="text-gray-500 text-[8px] uppercase">SKU Producto</p>
            <p className="font-mono font-bold text-[10px]">{data.codigoProducto}</p>
          </div>
          <div className="col-span-3 border-b border-gray-300 p-1.5">
            <p className="text-gray-500 text-[8px] uppercase">Descripción</p>
            <p className="font-semibold truncate">{data.descripcionProducto}</p>
          </div>
        </div>

        {/* Badge de reingreso */}
        {data.esReingreso && (
          <div className="flex gap-2 p-1.5 border-b border-gray-300 bg-white">
            <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-red-100 text-red-700 border border-red-300">
              ⚠ REINGRESO
            </span>
          </div>
        )}

        {/* Problema reportado */}
        <div className="p-2 border-b border-gray-300">
          <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Problema Reportado</p>
          <p className="text-[10px] leading-tight bg-gray-50 p-1.5 rounded border border-gray-200">{data.descripcionProblema}</p>
        </div>

        {/* Footer con accesorios e ingresado por */}
        <div className="grid grid-cols-2 text-[9px]">
          <div className="border-r border-gray-300 p-1.5">
            <p className="text-gray-500 text-[8px] uppercase font-bold">Accesorios</p>
            <p className="mt-0.5">{data.accesorios || 'Ninguno especificado'}</p>
          </div>
          <div className="p-1.5">
            <p className="text-gray-500 text-[8px] uppercase font-bold">Ingresado Por</p>
            <p className="mt-0.5">{data.personaDejaMaquina || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Línea de corte */}
      <div className="border-t-2 border-dashed border-gray-400 my-2 relative">
        <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white px-2 text-[9px] text-gray-400">✂ CORTAR AQUÍ</span>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 2: CONTRASEÑA PARA CLIENTE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="border-2 border-black rounded-sm overflow-hidden mb-3">
        {/* Header oscuro */}
        <div className="bg-gray-900 text-white p-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
              <span className="text-white font-black text-[10px]">HPC</span>
            </div>
            <div>
              <p className="font-bold text-xs">CONTRASEÑA DE SERVICIO</p>
              <p className="text-[9px] text-gray-400">Conserve este documento</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono font-bold text-base">{data.codigo}</p>
          </div>
        </div>
        
        {/* Info del centro en una fila */}
        <div className="p-2 border-b border-gray-300 bg-gray-50 text-[9px] flex justify-between items-center">
          <div>
            <span className="font-bold">{data.centroServicio}</span>
            <span className="mx-2 text-gray-400">|</span>
            <span>27 Calle 41-55 Zona 5, Guatemala</span>
          </div>
          <div className="text-right">
            <span className="font-bold">Tel: 2499-5000</span>
            <span className="mx-2 text-gray-400">|</span>
            <span>L-V 8AM-5PM, S 8AM-12PM</span>
          </div>
        </div>

        {/* Datos del cliente y producto en 2 columnas */}
        <div className="grid grid-cols-2 text-[9px]">
          <div className="border-r border-b border-gray-300 p-2">
            <p className="text-gray-500 text-[8px] uppercase mb-1">Datos del Cliente</p>
            <div className="space-y-0.5">
              <p><span className="text-gray-500">Código:</span> <span className="font-bold">{data.codigoCliente}</span></p>
              <p><span className="text-gray-500">Nombre:</span> <span className="font-semibold">{data.nombreCliente}</span></p>
              {data.telefonoCliente && (
                <p><span className="text-gray-500">Tel:</span> {data.telefonoCliente}</p>
              )}
            </div>
          </div>
          <div className="border-b border-gray-300 p-2">
            <p className="text-gray-500 text-[8px] uppercase mb-1">Datos del Equipo</p>
            <div className="space-y-0.5">
              <p><span className="text-gray-500">SKU:</span> <span className="font-mono font-bold">{data.codigoProducto}</span></p>
              <p className="truncate"><span className="text-gray-500">Desc:</span> {data.descripcionProducto}</p>
              <p><span className="text-gray-500">Ingreso:</span> <span className="font-bold">{fechaFormateada} {horaFormateada}</span></p>
            </div>
          </div>
        </div>

        {/* Código de barras */}
        <div className="p-2 border-b border-gray-300 bg-white flex justify-center">
          <div>
            <CSSBarcode value={data.codigo} />
            <p className="text-center text-[8px] text-gray-500 mt-0.5 font-mono">{data.codigo}</p>
          </div>
        </div>

        {/* Políticas en formato más compacto */}
        <div className="p-2 text-[8px] leading-tight">
          <p className="font-bold text-[9px] mb-1 text-gray-700">TÉRMINOS Y CONDICIONES</p>
          <div className="columns-2 gap-3 text-gray-600">
            <p className="mb-0.5">• Después de 30 días sin recoger, HPC puede disponer del equipo.</p>
            <p className="mb-0.5">• Se requiere esta contraseña para recoger la herramienta.</p>
            <p className="mb-0.5">• Garantía en mano de obra por 30 días sobre el problema reportado.</p>
            <p className="mb-0.5">• No cubre daños por mal uso, accidentes o variaciones de voltaje.</p>
            <p className="mb-0.5">• Presupuestos vigentes por 15 días.</p>
            <p className="mb-0.5">• Reporte extravío de contraseña inmediatamente.</p>
          </div>
        </div>

        {/* Firmas */}
        <div className="p-2 border-t border-gray-300 bg-gray-50">
          <p className="text-[8px] text-gray-500 mb-3">Autorizo el diagnóstico/reparación y acepto los términos y condiciones.</p>
          <div className="flex justify-around">
            <div className="text-center w-36">
              <div className="border-b-2 border-black h-6 mb-0.5"></div>
              <p className="text-[8px] font-bold">ENTREGA EQUIPO</p>
              <p className="text-[7px] text-gray-500">Firma Cliente</p>
            </div>
            <div className="text-center w-36">
              <div className="border-b-2 border-black h-6 mb-0.5"></div>
              <p className="text-[8px] font-bold">RECIBE CONFORME</p>
              <p className="text-[7px] text-gray-500">Firma Cliente (al recoger)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Línea de corte */}
      <div className="border-t-2 border-dashed border-gray-400 my-2 relative">
        <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white px-2 text-[9px] text-gray-400">✂ CORTAR AQUÍ</span>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 3: ETIQUETA PARA MÁQUINA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex justify-center">
        <div className="border-2 border-black rounded-sm w-56 overflow-hidden">
          <div className="bg-orange-500 text-white p-1.5 text-center">
            <p className="font-bold text-[10px]">ETIQUETA PARA MÁQUINA</p>
          </div>
          <div className="p-2 text-center">
            <p className="text-[8px] text-gray-500 uppercase">Incidente</p>
            <p className="font-mono font-black text-lg leading-none">{data.codigo}</p>
            <div className="mt-2">
              <CSSBarcode value={data.codigo} />
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 text-[9px]">
              <p><span className="text-gray-500">SKU:</span> <span className="font-mono font-bold">{data.codigoProducto}</span></p>
              <p><span className="text-gray-500">Ingreso:</span> <span className="font-bold">{fechaFormateada}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

IncidentePrintSheet.displayName = 'IncidentePrintSheet';

export default IncidentePrintSheet;