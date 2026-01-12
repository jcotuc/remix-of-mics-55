import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type RepuestoSolicitado = {
  codigo: string;
  descripcion: string;
  cantidad: number;
  ubicacion?: string;
};

export default function DetalleSolicitud() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState<any>(null);
  const [repuestos, setRepuestos] = useState<RepuestoSolicitado[]>([]);
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

      // Parse repuestos from JSON field
      if (sol?.repuestos && Array.isArray(sol.repuestos)) {
        setRepuestos(sol.repuestos as RepuestoSolicitado[]);
      }

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar solicitud");
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "entregado":
        return <Badge variant="default">Entregado</Badge>;
      case "en_proceso":
        return <Badge variant="secondary">En Proceso</Badge>;
      case "pendiente":
        return <Badge variant="outline">Pendiente</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
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

      {/* Información de la solicitud */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Información General</CardTitle>
              <CardDescription>
                Solicitado por: {solicitud?.tecnico_solicitante || "N/A"}
              </CardDescription>
            </div>
            {getEstadoBadge(solicitud?.estado || "pendiente")}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Tipo despacho</p>
            <p className="font-medium capitalize">{solicitud?.tipo_despacho || "N/A"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Fecha solicitud</p>
            <p className="font-medium">
              {solicitud?.created_at 
                ? new Date(solicitud.created_at).toLocaleDateString("es-GT")
                : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Fecha asignación</p>
            <p className="font-medium">
              {solicitud?.fecha_asignacion 
                ? new Date(solicitud.fecha_asignacion).toLocaleDateString("es-GT")
                : "Pendiente"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Fecha entrega</p>
            <p className="font-medium">
              {solicitud?.fecha_entrega 
                ? new Date(solicitud.fecha_entrega).toLocaleDateString("es-GT")
                : "Pendiente"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Repuestos */}
      <Card>
        <CardHeader>
          <CardTitle>Repuestos Solicitados</CardTitle>
          <CardDescription>
            {repuestos.length} items en esta solicitud
          </CardDescription>
        </CardHeader>
        <CardContent>
          {repuestos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay repuestos en esta solicitud
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repuestos.map((rep, index) => (
                  <TableRow key={`${rep.codigo}-${index}`}>
                    <TableCell className="font-mono">{rep.codigo}</TableCell>
                    <TableCell>{rep.descripcion}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {rep.ubicacion || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">{rep.cantidad}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Notas */}
      {solicitud?.notas && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{solicitud.notas}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
