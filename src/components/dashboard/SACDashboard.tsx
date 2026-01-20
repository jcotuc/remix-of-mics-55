import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function SACDashboard() {
  return (
    <div className="p-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Dashboard de SAC no disponible</strong>
          <p className="mt-2">
            Este dashboard requiere tablas adicionales que no existen en la base de datos:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm">
            <li>notificaciones_cliente</li>
            <li>asignaciones_sac</li>
          </ul>
          <p className="mt-2 text-sm">
            También utiliza campos de incidentes que no están disponibles (status).
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
