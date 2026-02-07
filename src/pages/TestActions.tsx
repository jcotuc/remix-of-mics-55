import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { mycsapi } from "@/mics-api";

export default function TestActions() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchClientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await mycsapi.get("/api/v1/clientes", { query: { skip: 0, limit: 10 } });
      setClientes(result.results || []);
      toast.success(`Loaded ${result.results?.length || 0} clientes`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error("Error: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Actions API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleFetchClientes} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...
              </>
            ) : (
              "Fetch Clientes (clientes.list)"
            )}
          </Button>

          {error && <p className="text-destructive">Error: {error}</p>}

          {clientes.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Teléfono</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-mono text-xs">{cliente.id}</TableCell>
                    <TableCell>{cliente.codigo}</TableCell>
                    <TableCell>{cliente.nombre}</TableCell>
                    <TableCell>{cliente.nit}</TableCell>
                    <TableCell>{cliente.telefono_principal || cliente.celular || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
