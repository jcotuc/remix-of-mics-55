import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { IncidenteSchema } from "@/generated/actions.d";

interface TallerDashboardProps {
  incidentes: IncidenteSchema[];
}

export function TallerDashboard({ incidentes }: TallerDashboardProps) {
  return (
    <div className="p-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Dashboard de Taller no disponible</strong>
          <p className="mt-2">
            Este dashboard utiliza campos de incidentes que no están disponibles en el esquema actual (status, codigo_producto).
          </p>
          <p className="mt-2 text-sm">
            Total incidentes: {incidentes.length}
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
