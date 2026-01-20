import { Wrench } from "lucide-react";
import { formatFechaCorta, formatHora } from "@/utils/dateFormatters";

interface GuiaHPCLabelProps {
  guia: {
    numero_guia: string;
    fecha_guia: string;
    destinatario: string;
    direccion_destinatario: string;
    ciudad_destino: string;
    cantidad_piezas: number;
    referencia_1?: string | null; // # Llamada (código incidente)
    referencia_2?: string | null; // SKU/Serie del producto
    empacador?: string | null;
  };
}

// Extraer código de departamento de la ciudad (ej: "SOLOLA (SOL)" -> "SOL")
const extractDepartmentCode = (ciudad: string): string => {
  const match = ciudad.match(/\(([A-Z]{2,4})\)/);
  return match ? match[1] : ciudad.slice(0, 3).toUpperCase();
};

// Componente de código de barras CSS simulado
const CSSBarcode = ({ value }: { value: string }) => {
  // Generar patrón pseudo-aleatorio basado en el valor
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
    <div className="flex items-end justify-center h-12 gap-[1px]">
      {pattern.map((width, index) => (
        <div
          key={index}
          className="bg-black"
          style={{
            width: `${width}px`,
            height: `${30 + (index % 3) * 5}px`,
          }}
        />
      ))}
    </div>
  );
};

export function GuiaHPCLabel({ guia }: GuiaHPCLabelProps) {
  const departmentCode = extractDepartmentCode(guia.ciudad_destino);
  const fechaFormateada = formatFechaCorta(guia.fecha_guia);
  const horaFormateada = formatHora(guia.fecha_guia);

  return (
    <div className="print-sheet guia-label bg-white border-2 border-black p-4 font-mono text-sm max-w-md mx-auto print:border-black print:max-w-none">
      {/* Header con logo y número de guía */}
      <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-2 rounded">
            <Wrench className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg">HPC</span>
        </div>
        <div className="text-right">
          <span className="font-bold text-base">{guia.numero_guia}</span>
        </div>
      </div>

      {/* Bulto y código departamento */}
      <div className="flex items-start justify-between border-b border-dashed border-gray-400 pb-3 mb-3">
        <div className="space-y-1">
          <div className="text-xs text-gray-600">
            Bulto ({guia.cantidad_piezas}/{guia.cantidad_piezas})
          </div>
          {guia.referencia_1 && (
            <div>
              <span className="text-xs text-gray-600"># Llamada:</span>
              <div className="font-bold text-base">{guia.referencia_1}</div>
            </div>
          )}
          {guia.referencia_2 && (
            <div className="text-xs">{guia.referencia_2}</div>
          )}
          <div className="text-xs text-gray-500">
            {fechaFormateada} {horaFormateada}
          </div>
          <div className="text-xs">
            Empacador: <span className="border-b border-black inline-block w-24">{guia.empacador || ""}</span>
          </div>
        </div>
        
        {/* Código departamento grande */}
        <div className="border-2 border-black px-4 py-2 text-center min-w-[70px]">
          <span className="font-bold text-xl">{departmentCode}</span>
        </div>
      </div>

      {/* Destinatario */}
      <div className="border-b border-dashed border-gray-400 pb-3 mb-3">
        <div className="text-xs text-gray-600 mb-1">Destinatario:</div>
        <div className="font-bold text-sm leading-tight mb-1">
          {guia.destinatario}
        </div>
        <div className="text-xs leading-tight text-gray-700">
          {guia.direccion_destinatario}
        </div>
      </div>

      {/* Código de barras */}
      <div className="pt-2">
        <CSSBarcode value={guia.numero_guia} />
        <div className="text-center text-xs mt-1 text-gray-600">
          {guia.numero_guia}
        </div>
      </div>
    </div>
  );
}
