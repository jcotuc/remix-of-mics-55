import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

interface DiagnosticoTecnicoProps {
  incidente: IncidenteDB;
  onDiagnosticoCompleto: () => void;
}

export function DiagnosticoTecnico({ incidente, onDiagnosticoCompleto }: DiagnosticoTecnicoProps) {
  return (
    <div className="p-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Componente de Diagnóstico Técnico no disponible</strong>
          <p className="mt-2">
            Este componente requiere tablas y campos adicionales que no existen en la base de datos:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm">
            <li>profiles</li>
            <li>solicitudes_repuestos</li>
            <li>solicitudes_cambio</li>
            <li>Campos: codigo_producto, codigo_cliente, codigo_tecnico, status</li>
          </ul>
          <p className="mt-2 text-sm">
            Incidente: {incidente.codigo}
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default DiagnosticoTecnico;
