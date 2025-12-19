import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Package, ArrowLeft, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Detalle = {
  id: string;
  codigo_repuesto: string;
  cantidad_solicitada: number;
  cantidad_encontrada: number | null;
  estado: string | null;
};

export default function DetalleSolicitud() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState<any>(null);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchSolicitud();
  }, [id]);

  const fetchSolicitud = async () => {
    try {
      setLoading(true);
      
      const { data: sol, error: solError } = await supabase
        .from("solicitudes_repuestos")
        .select("*")
        .eq("id", id)
        .single();

      if (solError) throw solError;
      setSolicitud(sol);

      const { data: det, error: detError } = await supabase
        .from("repuestos_solicitud_detalle")
        .select("*")
        .eq("solicitud_id", id);

      if (detError) throw detError;
      setDetalles(det || []);

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar solicitud");
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Detalle de Solicitud</h1>
          <p className="text-muted-foreground">
            {solicitud?.incidente_id?.slice(0, 8)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repuestos Solicitados</CardTitle>
          <CardDescription>
            {detalles.length} items en esta solicitud
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detalles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay detalles para esta solicitud
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Cant. Solicitada</TableHead>
                  <TableHead className="text-right">Cant. Encontrada</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalles.map((det) => (
                  <TableRow key={det.id}>
                    <TableCell className="font-mono">{det.codigo_repuesto}</TableCell>
                    <TableCell className="text-right">{det.cantidad_solicitada}</TableCell>
                    <TableCell className="text-right">{det.cantidad_encontrada ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={det.estado === "entregado" ? "default" : "secondary"}>
                        {det.estado || "pendiente"}
                      </Badge>
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
