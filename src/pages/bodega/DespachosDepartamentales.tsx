import { useState, useEffect } from "react";
import { Package, Truck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function DespachosDepartamentales() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("solicitudes_repuestos")
        .select("*")
        .in("estado", ["pendiente", "asignado"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar solicitudes");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Package className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Truck className="h-8 w-8 text-primary" />
          Despachos Departamentales
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestión de despachos a centros de servicio
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes Pendientes</CardTitle>
          <CardDescription>
            {solicitudes.length} solicitudes requieren atención
          </CardDescription>
        </CardHeader>
        <CardContent>
          {solicitudes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay solicitudes pendientes de despacho
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Incidente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudes.map((sol) => (
                  <TableRow key={sol.id}>
                    <TableCell className="font-mono">{sol.incidente_id?.slice(0, 8) || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={sol.estado === "pendiente" ? "destructive" : "secondary"}>
                        {sol.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>{sol.tecnico_solicitante || '-'}</TableCell>
                    <TableCell>
                      {new Date(sol.created_at).toLocaleDateString()}
                    </TableCell>
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
