import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function FamiliasProductos() {
  return (
    <div className="container mx-auto p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Página en desarrollo</strong>
          <p className="mt-2">
            Esta página administra la tabla: <code>familias_producto</code>
          </p>
          <p className="mt-1 text-sm">
            La tabla existe en la base de datos con estructura jerárquica (parent_id). Requiere implementación del CRUD.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
