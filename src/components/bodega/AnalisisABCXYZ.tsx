import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const AnalisisABCXYZ = () => {
  return (
    <div className="p-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Funcionalidad no disponible</strong>
          <p className="mt-2">
            El análisis ABC-XYZ requiere tablas adicionales en la base de datos que aún no han sido creadas:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm">
            <li>analisis_inventario</li>
          </ul>
          <p className="mt-2 text-sm">
            Por favor, cree estas tablas para habilitar esta característica.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AnalisisABCXYZ;
