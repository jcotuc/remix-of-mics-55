import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// PLACEHOLDER: This page requires tables/columns that don't exist:
// - guias_envio table
// - incidentes.status column (should be estado)
// - incidentes.codigo_cliente column (should be cliente_id)
// - incidentes.codigo_producto column (should be producto_id)
// - incidentes.centro_servicio column
// - incidentes.cobertura_garantia column

export default function DetalleCliente() {
  return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Página no disponible</strong>
          <p className="mt-2">
            Esta página requiere tablas y columnas que no existen en la base de datos actual:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm">
            <li>guias_envio table</li>
            <li>incidentes.status (debería ser estado)</li>
            <li>incidentes.codigo_cliente (debería ser cliente_id)</li>
            <li>incidentes.codigo_producto (debería ser producto_id)</li>
            <li>incidentes.centro_servicio</li>
            <li>incidentes.cobertura_garantia</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
