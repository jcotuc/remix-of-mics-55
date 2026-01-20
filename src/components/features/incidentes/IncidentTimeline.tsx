import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface IncidentTimelineProps {
  incidenteId: string;
}

export function IncidentTimeline({ incidenteId }: IncidentTimelineProps) {
  // This component is disabled because it requires tables that don't exist:
  // - audit_logs
  // - solicitudes_repuestos
  // - incidente_fotos
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Historial de Eventos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Timeline no disponible</strong>
            <p className="mt-2 text-sm">
              Este componente requiere tablas adicionales que no existen:
            </p>
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>audit_logs</li>
              <li>solicitudes_repuestos</li>
              <li>incidente_fotos</li>
            </ul>
            <p className="mt-2 text-sm">
              Incidente ID: {incidenteId}
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
