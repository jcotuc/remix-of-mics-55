import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Placeholder for AuditLogs page
 * This page requires the audit_logs table which doesn't exist
 */
export default function AuditLogs() {
  return (
    <div className="container mx-auto p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Página Audit Logs no disponible</strong>
          <p className="mt-2">
            Esta página requiere la tabla audit_logs que no existe en la base de datos.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
