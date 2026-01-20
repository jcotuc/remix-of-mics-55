import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function ImportarDespieces() {
  return (
    <div className="container mx-auto p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Página no disponible</strong>
          <p className="mt-2">Requiere tabla: despieces</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
