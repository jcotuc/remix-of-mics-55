import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Placeholder for AccesoriosFamilias page
 * This page requires tables that don't exist:
 * - CDS_Accesorios
 * - CDS_Familias
 */
export default function AccesoriosFamilias() {
  return (
    <div className="container mx-auto p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Página Accesorios y Familias no disponible</strong>
          <p className="mt-2">
            Esta página requiere tablas adicionales que no existen en la base de datos:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm">
            <li>CDS_Accesorios</li>
            <li>CDS_Familias</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
