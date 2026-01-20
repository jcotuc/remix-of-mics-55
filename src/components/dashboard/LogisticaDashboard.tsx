import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

interface LogisticaDashboardProps {
  incidentes: IncidenteDB[];
}

export function LogisticaDashboard({ incidentes }: LogisticaDashboardProps) {
  return (
    <div className="p-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Dashboard de Logística no disponible</strong>
          <p className="mt-2">
            Este dashboard requiere tablas adicionales que no existen en la base de datos:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm">
            <li>embarques</li>
          </ul>
          <p className="mt-2 text-sm">
            También utiliza campos de incidentes que no están disponibles (status, embarque_id).
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
