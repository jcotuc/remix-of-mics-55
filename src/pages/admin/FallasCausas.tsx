import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function FallasCausas() {
  return (
    <div className="container mx-auto p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Página en desarrollo</strong>
          <p className="mt-2">
            Esta página administra las tablas: <code>fallas</code>, <code>causas</code>, <code>familias_producto</code>
          </p>
          <p className="mt-1 text-sm">
            Las tablas existen en la base de datos. Esta página requiere implementación del CRUD.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
