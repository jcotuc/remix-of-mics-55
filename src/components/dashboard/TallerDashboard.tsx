import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

interface TallerDashboardProps {
  incidentes: IncidenteDB[];
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
