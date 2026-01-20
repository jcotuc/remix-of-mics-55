import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HistorialConObservacionesProps {
  incidenteId: string;
  logObservaciones: string | null;
  headerVariant?: "default" | "clean";
}

export function HistorialConObservaciones({ incidenteId, logObservaciones, headerVariant = "default" }: HistorialConObservacionesProps) {
  // This component is disabled because it requires tables that don't exist:
  // - audit_logs
  // - solicitudes_repuestos
  // - incidente_fotos
  
  return (
    <Card>
      <CardHeader className="pb-3">
        {headerVariant === "default" ? (
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historial y Observaciones
          </CardTitle>
        ) : (
          <Clock className="w-5 h-5 text-primary" />
        )}
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Historial no disponible</strong>
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
            {logObservaciones && (
              <div className="mt-2 p-2 bg-muted rounded text-xs">
                <strong>Observaciones:</strong>
                <pre className="whitespace-pre-wrap mt-1">{logObservaciones}</pre>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
