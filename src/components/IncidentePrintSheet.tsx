import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface IncidentePrintData {
  codigo: string;
  codigoCliente: string;
  nombreCliente: string;
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
}

interface Props {
  data: IncidentePrintData;
}

const IncidentePrintSheet = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const fechaFormateada = format(data.fechaIngreso, "dd/MM/yyyy", { locale: es });
  const horaFormateada = format(data.fechaIngreso, "HH:mm", { locale: es });

  return (
    <div ref={ref} className="print-sheet bg-white text-black p-4 w-full max-w-[8.5in] mx-auto font-sans text-[11px]">
      {/* Sección 1: Copia Centro de Servicio */}
      <div className="border-2 border-black mb-4">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-black p-3 bg-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded flex items-center justify-center text-white font-bold text-lg">
              HPC
            </div>
            <div>
              <p className="font-bold text-base">HPC Centro de Servicio</p>
              <p className="text-xs">{data.centroServicio}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="font-bold text-lg">Incidente de Servicio</h2>
            <p className="text-xs text-gray-600">Copia Centro de Servicio</p>
          </div>
        </div>

        {/* Información del incidente */}
        <div className="grid grid-cols-2 gap-0">
          <div className="border-r border-b border-black p-2">
            <p className="text-xs text-gray-600">Código de Cliente</p>
            <p className="font-bold">{data.codigoCliente}</p>
          </div>
          <div className="border-b border-black p-2">
            <p className="text-xs text-gray-600"># Incidente</p>
            <p className="font-bold">{data.codigo}</p>
          </div>
          <div className="border-r border-b border-black p-2">
            <p className="text-xs text-gray-600">Nombre Cliente</p>
            <p className="font-semibold text-xs">{data.nombreCliente}</p>
          </div>
          <div className="border-b border-black p-2">
            <p className="text-xs text-gray-600">Fecha de Ingreso</p>
            <p className="font-bold">{fechaFormateada} {horaFormateada}</p>
          </div>
          <div className="border-r border-b border-black p-2">
            <p className="text-xs text-gray-600">Artículo</p>
            <p className="font-bold">{data.codigoProducto}</p>
          </div>
          <div className="border-b border-black p-2">
            <p className="text-xs text-gray-600">SKU Máquina</p>
            <p className="font-bold">{data.skuMaquina || 'N/A'}</p>
          </div>
          <div className="col-span-2 border-b border-black p-2">
            <p className="text-xs text-gray-600">Descripción</p>
            <p className="font-semibold">{data.descripcionProducto}</p>
          </div>
          <div className="border-r border-b border-black p-2">
            <p className="text-xs text-gray-600">Tipología</p>
            <p className="font-bold">{data.tipologia}</p>
          </div>
          <div className="border-b border-black p-2">
            <p className="text-xs text-gray-600">Reingreso</p>
            <p className="font-bold">{data.esReingreso ? 'Sí' : 'No'}</p>
          </div>
        </div>

        {/* Comentarios de fallas */}
        <div className="border-b border-black p-2">
          <p className="text-xs text-gray-600 font-bold">Comentarios de fallas de la máquina</p>
          <p className="mt-1">{data.descripcionProblema}</p>
        </div>

        {/* Información de ingreso */}
        <div className="p-2">
          <p className="text-xs text-gray-600 font-bold">Información de ingreso</p>
          <p className="mt-1">INGRESADO POR: {data.personaDejaMaquina || 'N/A'} - {fechaFormateada}</p>
          <p className="mt-1">ACCESORIOS: {data.accesorios || 'Ninguno'}</p>
        </div>
      </div>

      {/* Línea de corte */}
      <div className="border-t-2 border-dashed border-gray-400 my-4 relative">
        <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white px-2 text-xs text-gray-400">✂ Cortar aquí</span>
      </div>

      {/* Sección 2: Contraseña para Cliente */}
      <div className="border-2 border-black mb-4">
        <div className="bg-gray-800 text-white p-2 text-center font-bold">
          Contraseña para Cliente
        </div>
        
        {/* Info del centro */}
        <div className="p-3 border-b border-black bg-gray-50">
          <p className="font-bold">{data.centroServicio}</p>
          <p className="text-xs">27 Calle 41-55 Zona 5</p>
          <p className="text-xs">Teléfono: 2499-5000</p>
          <p className="text-xs">teleservicios@hpc.com.gt</p>
          <p className="text-xs">Horario: Lunes a Viernes 8 AM a 5 PM y Sábado 8 AM a 12 PM</p>
        </div>

        {/* Datos resumidos */}
        <div className="grid grid-cols-2 gap-0 text-xs">
          <div className="border-r border-b border-black p-2">
            <p className="text-gray-600">Código de Cliente</p>
            <p className="font-bold">{data.codigoCliente}</p>
          </div>
          <div className="border-b border-black p-2">
            <p className="text-gray-600"># Incidente</p>
            <p className="font-bold">{data.codigo}</p>
          </div>
          <div className="border-r border-b border-black p-2">
            <p className="text-gray-600">Nombre</p>
            <p className="font-semibold">{data.nombreCliente}</p>
          </div>
          <div className="border-b border-black p-2">
            <p className="text-gray-600">Fecha de Ingreso</p>
            <p className="font-bold">{fechaFormateada} {horaFormateada}</p>
          </div>
          <div className="border-r border-black p-2">
            <p className="text-gray-600">Artículo</p>
            <p className="font-bold">{data.codigoProducto}</p>
          </div>
          <div className="p-2">
            <p className="text-gray-600">Descripción</p>
            <p className="font-semibold">{data.descripcionProducto}</p>
          </div>
        </div>

        {/* Políticas */}
        <div className="p-3 text-xs border-t border-black">
          <p className="font-bold mb-2">Políticas de la Empresa</p>
          <ol className="list-decimal list-inside space-y-1 text-[10px] leading-tight">
            <li>Siendo el propietario o representante de la máquina, estoy en condiciones de autorizar el servicio y acepto las condiciones siguientes.</li>
            <li>Después de 30 días de notificar al cliente sobre los servicios efectuados y sí la herramienta no ha sido recogida; la empresa queda libre de toda responsabilidad y con derecho a disponer del equipo para recuperar el costo.</li>
            <li>El equipo podría ser enviado en la dirección que fue brindada durante la recepción, transcurrido 5 días hábiles de aviso al cliente.</li>
            <li>Para recoger la herramienta deberá presentar la contraseña, en ausencia de esta la herramienta solo puede ser recogida por la persona firmante de la orden, después de su debida identificación con documento legal y dejar una copia completa de la misma.</li>
            <li>Exonerar a la empresa y personal de responsabilidad y efectos que aparezcan durante el período de reparación que sean ajenos a los trabajos realizados.</li>
            <li>En caso de extraviar la contraseña el cliente deberá reportarla a la brevedad, con el fin de que otra persona no recoja la herramienta.</li>
            <li>En toda reparación se garantiza el trabajo realizado sobre el problema reportado en la orden de servicio, solo en mano de obra, no así en partes gastadas o dañadas por el mismo uso.</li>
            <li>Nuestra herramienta tiene garantía contra defectos de naturaleza y operaciones bajo condiciones de uso normal de acuerdo a las características propias de cada herramienta.</li>
            <li>La garantía no cubre mantenimiento preventivos ni correctivos. Daños o fallas debidas a actos de naturaleza, abuso, accidente, uso impropio o normal, sobre la utilización de fallas por no seguir instrucciones, mala instalación, alteraciones de voltaje, desinstalaciones y reinstalación, falta de limpieza después de utilizarla.</li>
          </ol>
        </div>

        {/* Condiciones y firmas */}
        <div className="p-3 border-t border-black">
          <p className="font-bold text-xs mb-2">Condiciones de Servicio</p>
          <p className="text-[10px] mb-4">Estoy de acuerdo en dejar mi herramienta para que se le realice un diagnóstico o reparación según sea necesario.</p>
          
          <div className="flex justify-between mt-6">
            <div className="text-center">
              <div className="border-t border-black w-40 mb-1"></div>
              <p className="text-xs">Autoriza</p>
              <p className="text-[10px] text-gray-600">Firma Cliente</p>
            </div>
            <div className="text-center">
              <div className="border-t border-black w-40 mb-1"></div>
              <p className="text-xs">Recibí conforme</p>
              <p className="text-[10px] text-gray-600">Firma Cliente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Línea de corte */}
      <div className="border-t-2 border-dashed border-gray-400 my-4 relative">
        <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white px-2 text-xs text-gray-400">✂ Cortar aquí</span>
      </div>

      {/* Sección 3: Contraseña para Máquina (etiqueta pequeña) */}
      <div className="border-2 border-black w-64 mx-auto p-3 text-center">
        <p className="font-bold text-sm mb-2">Contraseña para Máquina</p>
        <p className="text-xs text-gray-600"># Incidente</p>
        <p className="font-bold text-lg">{data.codigo}</p>
        <div className="mt-2 pt-2 border-t border-gray-300">
          <p className="text-xs text-gray-600">Fecha de ingreso</p>
          <p className="font-bold">{fechaFormateada} {horaFormateada}</p>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          .print-sheet {
            width: 8.5in !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0.25in !important;
            page-break-after: always;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
});

IncidentePrintSheet.displayName = 'IncidentePrintSheet';

export default IncidentePrintSheet;
