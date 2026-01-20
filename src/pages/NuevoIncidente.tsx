import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Placeholder for NuevoIncidente page
 * This page requires tables that don't exist:
 * - CDS_Accesorios
 * - CDS_Familias
 * - centros_servicio (actual table is centros_de_servicio)
 * - profiles
 */
export default function NuevoIncidente() {
  return (
    <div className="container mx-auto p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Página Nuevo Incidente no disponible</strong>
          <p className="mt-2">
            Esta página requiere tablas adicionales que no existen en la base de datos:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm">
            <li>CDS_Accesorios</li>
            <li>CDS_Familias</li>
            <li>centros_servicio (actual: centros_de_servicio)</li>
            <li>profiles</li>
          </ul>
          <p className="mt-2 text-sm">
            Por favor, cree estas tablas o importe el componente desde la aplicación prototipo.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
