import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Placeholder for Productos page
 * This page requires tables that don't exist:
 * - CDS_Familias
 */
export default function Productos() {
  return (
    <div className="container mx-auto p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Página Productos no disponible</strong>
          <p className="mt-2">
            Esta página requiere la tabla CDS_Familias que no existe en la base de datos.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
