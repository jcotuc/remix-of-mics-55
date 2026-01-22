import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiBackendAction } from "@/lib/api-backend";

interface RevisionDisplay {
  id: number;
  incidente_id: number;
  fecha: string;
  observaciones: string;
  incidente_codigo: string;
  cliente_nombre: string;
  producto_descripcion: string;
}

export default function AprobacionesStockCemaco() {
  const [revisiones, setRevisiones] = useState<RevisionDisplay[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<RevisionDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [observacionesRechazo, setObservacionesRechazo] = useState("");

  useEffect(() => {
    fetchRevisiones();
  }, []);

  const fetchRevisiones = async () => {
    try {
      // Fetch incidentes via Registry
      const incidentesRes = await apiBackendAction("incidentes.list", { limit: 2000 });
      const allIncidentes = (incidentesRes as any).results || [];
      
      // Filter by estado ESPERA_APROBACION
      const pendingIncidentes = allIncidentes.filter((inc: any) => 
        inc.estado === "ESPERA_APROBACION"
      );

      // Sort by created_at ascending
      pendingIncidentes.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const formatted: RevisionDisplay[] = pendingIncidentes.map((inc: any) => ({
        id: inc.id,
        incidente_id: inc.id,
        fecha: inc.created_at,
        observaciones: inc.observaciones || "",
        incidente_codigo: inc.codigo,
        cliente_nombre: inc.cliente?.nombre || "Desconocido",
        producto_descripcion: inc.producto?.descripcion || "Sin producto",
      }));

      setRevisiones(formatted);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("No se pudieron cargar las revisiones pendientes");
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async () => {
    if (!selectedRevision) return;

    setSubmitting(true);

    try {
      // Update status via apiBackendAction
      await apiBackendAction("incidentes.update", {
        id: selectedRevision.incidente_id,
        data: { 
          estado: "EN_REPARACION",
          updated_at: new Date().toISOString()
        }
      } as any);

      toast.success(`Incidente ${selectedRevision.incidente_codigo} aprobado`);

      setSelectedRevision(null);
      fetchRevisiones();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "No se pudo aprobar la revisión");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRechazar = async () => {
    if (!selectedRevision) return;

    if (!observacionesRechazo.trim()) {
      toast.error("Debe agregar observaciones para rechazar");
      return;
    }

    setSubmitting(true);

    try {
      // Update via apiBackendAction
      await apiBackendAction("incidentes.update", {
        id: selectedRevision.incidente_id,
        data: { 
          estado: "EN_DIAGNOSTICO",
          observaciones: observacionesRechazo,
          updated_at: new Date().toISOString()
        }
      } as any);

      toast.success(`El incidente ${selectedRevision.incidente_codigo} fue devuelto para revisión`);

      setSelectedRevision(null);
      setObservacionesRechazo("");
      fetchRevisiones();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "No se pudo rechazar");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-center text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Aprobaciones Stock Cemaco</h1>

      {revisiones.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay revisiones pendientes de aprobación</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {revisiones.map((revision) => (
            <Card key={revision.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{revision.incidente_codigo}</span>
                </CardTitle>
                <CardDescription>
                  {new Date(revision.fecha).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Cliente</Label>
                    <p className="font-medium">{revision.cliente_nombre}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Producto</Label>
                    <p className="font-medium">{revision.producto_descripcion}</p>
                  </div>
                </div>

                {revision.observaciones && (
                  <div>
                    <Label className="text-muted-foreground">Observaciones</Label>
                    <p className="bg-muted p-3 rounded-md">{revision.observaciones}</p>
                  </div>
                )}

                {selectedRevision?.id === revision.id ? (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="observaciones-rechazo">
                        Observaciones para Rechazar
                      </Label>
                      <Textarea
                        id="observaciones-rechazo"
                        value={observacionesRechazo}
                        onChange={(e) => setObservacionesRechazo(e.target.value)}
                        placeholder="Indique por qué rechaza esta solicitud..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleAprobar}
                        disabled={submitting}
                        className="flex-1"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleRechazar}
                        disabled={submitting || !observacionesRechazo.trim()}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rechazar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedRevision(null);
                          setObservacionesRechazo("");
                        }}
                        disabled={submitting}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setSelectedRevision(revision)}
                    className="w-full"
                  >
                    Evaluar
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
