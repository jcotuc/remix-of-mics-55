import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Placeholder for CentrosServicio page
 * This page requires tables that don't exist:
 * - centros_servicio (actual is centros_de_servicio)
 * - profiles
 * - user_roles
 * - centros_supervisor
 */
export default function CentrosServicio() {
  return (
    <div className="container mx-auto p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Página Centros de Servicio no disponible</strong>
          <p className="mt-2">
            Esta página requiere tablas adicionales que no existen en la base de datos:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm">
            <li>centros_servicio (actual: centros_de_servicio)</li>
            <li>profiles</li>
            <li>user_roles</li>
            <li>centros_supervisor</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
