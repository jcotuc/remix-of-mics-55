import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Revision {
  id: string;
  incidente_id: string;
  fecha_revision: string;
  observaciones: string;
  fotos_urls: string[];
  decision: "aprobado" | "rechazado";
  justificacion: string;
  revisor_id: string;
  incidente: {
    codigo: string;
    descripcion_problema: string;
    cliente: {
      nombre: string;
    };
    producto: {
      descripcion: string;
    };
  };
  revisor: {
    nombre: string;
    apellido: string;
  };
}

export default function AprobacionesStockCemaco() {
  const [revisiones, setRevisiones] = useState<Revision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [observacionesRechazo, setObservacionesRechazo] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchRevisiones();
  }, []);

  const fetchRevisiones = async () => {
    try {
      const { data, error } = await supabase
        .from("revisiones_stock_cemaco")
        .select(`
          id,
          incidente_id,
          fecha_revision,
          observaciones,
          fotos_urls,
          decision,
          justificacion,
          revisor_id,
          incidentes!inner (
            codigo,
            descripcion_problema,
            status,
            clientes:codigo_cliente (nombre),
            productos:codigo_producto (descripcion)
          ),
          profiles:revisor_id (nombre, apellido)
        `)
        .is("aprobado_por", null)
        .order("fecha_revision", { ascending: true });

      if (error) throw error;

      const formatted = data?.map(rev => ({
        id: rev.id,
        incidente_id: rev.incidente_id,
        fecha_revision: rev.fecha_revision,
        observaciones: rev.observaciones,
        fotos_urls: rev.fotos_urls || [],
        decision: rev.decision as "aprobado" | "rechazado",
        justificacion: rev.justificacion,
        revisor_id: rev.revisor_id,
        incidente: {
          codigo: Array.isArray(rev.incidentes) ? rev.incidentes[0]?.codigo : rev.incidentes?.codigo,
          descripcion_problema: Array.isArray(rev.incidentes) ? rev.incidentes[0]?.descripcion_problema : rev.incidentes?.descripcion_problema,
          cliente: Array.isArray(rev.incidentes) ? rev.incidentes[0]?.clientes?.[0] : rev.incidentes?.clientes?.[0],
          producto: Array.isArray(rev.incidentes) ? rev.incidentes[0]?.productos?.[0] : rev.incidentes?.productos?.[0],
        },
        revisor: Array.isArray(rev.profiles) ? rev.profiles[0] : rev.profiles,
      })) || [];

      setRevisiones(formatted);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las revisiones pendientes",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async () => {
    if (!selectedRevision) return;

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Actualizar revisión
      const { error: revisionError } = await supabase
        .from("revisiones_stock_cemaco")
        .update({
          aprobado_por: user.id,
          fecha_aprobacion: new Date().toISOString(),
        })
        .eq("id", selectedRevision.id);

      if (revisionError) throw revisionError;

      // Actualizar status del incidente según decisión
      const nuevoStatus = selectedRevision.decision === "aprobado" ? "Nota de credito" : "Rechazado";
      
      const { error: updateError } = await supabase
        .from("incidentes")
        .update({ status: nuevoStatus as any })
        .eq("id", selectedRevision.incidente_id);

      if (updateError) throw updateError;

      toast({
        title: "Éxito",
        description: `Revisión aprobada. Incidente ${selectedRevision.incidente.codigo} actualizado a ${nuevoStatus}`,
      });

      setSelectedRevision(null);
      fetchRevisiones();
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo aprobar la revisión",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRechazar = async () => {
    if (!selectedRevision) return;

    if (!observacionesRechazo.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe agregar observaciones para rechazar la propuesta",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Eliminar revisión rechazada
      const { error: deleteError } = await supabase
        .from("revisiones_stock_cemaco")
        .delete()
        .eq("id", selectedRevision.id);

      if (deleteError) throw deleteError;

      // Devolver incidente a Ingresado
      const { error: updateError } = await supabase
        .from("incidentes")
        .update({ 
          status: "Ingresado" as any,
          log_observaciones: observacionesRechazo 
        })
        .eq("id", selectedRevision.incidente_id);

      if (updateError) throw updateError;

      toast({
        title: "Propuesta Rechazada",
        description: `El incidente ${selectedRevision.incidente.codigo} fue devuelto para nueva revisión`,
      });

      setSelectedRevision(null);
      setObservacionesRechazo("");
      fetchRevisiones();
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo rechazar la propuesta",
      });
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
                  <span>{revision.incidente.codigo}</span>
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    revision.decision === "aprobado" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {revision.decision === "aprobado" ? "Autorizar NC" : "Rechazar NC"}
                  </span>
                </CardTitle>
                <CardDescription>
                  Revisado por: {revision.revisor?.nombre} {revision.revisor?.apellido} el{" "}
                  {new Date(revision.fecha_revision).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Cliente</Label>
                    <p className="font-medium">{revision.incidente.cliente?.nombre}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Producto</Label>
                    <p className="font-medium">{revision.incidente.producto?.descripcion}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Problema Reportado</Label>
                  <p>{revision.incidente.descripcion_problema}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Justificación del Revisor</Label>
                  <p className="bg-muted p-3 rounded-md">{revision.justificacion}</p>
                </div>

                {revision.observaciones && (
                  <div>
                    <Label className="text-muted-foreground">Observaciones</Label>
                    <p>{revision.observaciones}</p>
                  </div>
                )}

                {revision.fotos_urls.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">
                      Evidencia Fotográfica ({revision.fotos_urls.length})
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {revision.fotos_urls.map((url, idx) => (
                        <div
                          key={idx}
                          className="aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border"
                          onClick={() => setSelectedImage(url)}
                        >
                          <img
                            src={url}
                            alt={`Evidencia ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRevision?.id === revision.id ? (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="observaciones-rechazo">
                        Observaciones para Rechazar Propuesta
                      </Label>
                      <Textarea
                        id="observaciones-rechazo"
                        value={observacionesRechazo}
                        onChange={(e) => setObservacionesRechazo(e.target.value)}
                        placeholder="Indique por qué rechaza esta propuesta..."
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
                        Aprobar Decisión
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleRechazar}
                        disabled={submitting || !observacionesRechazo.trim()}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rechazar Propuesta
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
                    Evaluar Propuesta
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Evidencia Fotográfica</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Evidencia ampliada"
              className="w-full h-auto rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
