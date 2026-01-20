import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppStyleMediaCapture, MediaFile } from "@/components/features/media";
import { uploadMediaToStorage } from "@/lib/uploadMedia";

interface IncidenteStockCemaco {
  id: string;
  codigo: string;
  fecha_ingreso: string;
  codigo_cliente: string;
  codigo_producto: string;
  descripcion_problema: string;
  cliente?: {
    nombre: string;
    celular: string;
  };
  producto?: {
    descripcion: string;
  };
}

export default function RevisionStockCemaco() {
  const [incidentes, setIncidentes] = useState<IncidenteStockCemaco[]>([]);
  const [selectedIncidente, setSelectedIncidente] = useState<IncidenteStockCemaco | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<"aprobado" | "rechazado">("aprobado");
  const [observaciones, setObservaciones] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

  useEffect(() => {
    fetchIncidentes();
  }, []);

  const fetchIncidentes = async () => {
    try {
      const { data, error } = await supabase
        .from("incidentes")
        .select(`
          id,
          codigo,
          fecha_ingreso,
          codigo_cliente,
          codigo_producto,
          descripcion_problema,
          clientes:codigo_cliente (nombre, celular),
          productos:codigo_producto (descripcion)
        `)
        .eq("es_stock_cemaco", true)
        .eq("status", "Ingresado")
        .order("fecha_ingreso", { ascending: true });

      if (error) throw error;

      const formatted = data?.map(inc => ({
        id: inc.id,
        codigo: inc.codigo,
        fecha_ingreso: inc.fecha_ingreso,
        codigo_cliente: inc.codigo_cliente,
        codigo_producto: inc.codigo_producto,
        descripcion_problema: inc.descripcion_problema,
        cliente: Array.isArray(inc.clientes) ? inc.clientes[0] : inc.clientes,
        producto: Array.isArray(inc.productos) ? inc.productos[0] : inc.productos,
      })) || [];

      setIncidentes(formatted);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los incidentes",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRevision = async () => {
    if (!selectedIncidente) return;
    
    if (justificacion.length < 20) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La justificación debe tener al menos 20 caracteres",
      });
      return;
    }

    if (mediaFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe agregar al menos 1 foto como evidencia",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload fotos
      const uploadedMedia = await uploadMediaToStorage(mediaFiles, selectedIncidente.id);
      const uploadedUrls = uploadedMedia.map(m => m.url);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Crear revisión
      const { error: revisionError } = await supabase
        .from("revisiones_stock_cemaco")
        .insert({
          incidente_id: selectedIncidente.id,
          revisor_id: user.id,
          observaciones,
          fotos_urls: uploadedUrls,
          decision,
          justificacion,
        });

      if (revisionError) throw revisionError;

      // Actualizar status del incidente
      const { error: updateError } = await supabase
        .from("incidentes")
        .update({ status: "Pendiente de aprobación NC" as any })
        .eq("id", selectedIncidente.id);

      if (updateError) throw updateError;

      toast({
        title: "Éxito",
        description: "Revisión enviada para aprobación del jefe de taller",
      });

      setSelectedIncidente(null);
      setObservaciones("");
      setJustificacion("");
      setMediaFiles([]);
      fetchIncidentes();
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo guardar la revisión",
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

  if (selectedIncidente) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedIncidente(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold">Revisión Stock Cemaco - {selectedIncidente.codigo}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información del Incidente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-semibold">Cliente:</span> {selectedIncidente.cliente?.nombre}
            </div>
            <div>
              <span className="font-semibold">Producto:</span> {selectedIncidente.producto?.descripcion}
            </div>
            <div>
              <span className="font-semibold">Problema:</span> {selectedIncidente.descripcion_problema}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Decisión de Revisión</CardTitle>
            <CardDescription>
              Esta máquina solo requiere revisión, no reparación. Seleccione la decisión apropiada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Decisión *</Label>
              <RadioGroup value={decision} onValueChange={(v) => setDecision(v as "aprobado" | "rechazado")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="aprobado" id="aprobado" />
                  <Label htmlFor="aprobado" className="flex items-center gap-2 cursor-pointer">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Autorizar Nota de Crédito
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rechazado" id="rechazado" />
                  <Label htmlFor="rechazado" className="flex items-center gap-2 cursor-pointer">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Rechazar Nota de Crédito
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Detalles adicionales de la revisión..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="justificacion">
                Justificación * (mínimo 20 caracteres)
              </Label>
              <Textarea
                id="justificacion"
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                placeholder="Explique detalladamente la razón de su decisión..."
                rows={4}
                className={justificacion.length > 0 && justificacion.length < 20 ? "border-destructive" : ""}
              />
              <p className="text-sm text-muted-foreground">
                {justificacion.length}/20 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label>Evidencia Fotográfica * (mínimo 1 foto)</Label>
              <WhatsAppStyleMediaCapture
                media={mediaFiles}
                onMediaChange={setMediaFiles}
                maxFiles={10}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSubmitRevision}
                disabled={submitting || justificacion.length < 20 || mediaFiles.length === 0}
                className="flex-1"
              >
                {submitting ? "Enviando..." : "Enviar Revisión para Aprobación"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedIncidente(null)}
                disabled={submitting}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Revisión Stock Cemaco</h1>

      {incidentes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay incidentes de stock Cemaco pendientes de revisión</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {incidentes.map((incidente) => (
            <Card key={incidente.id} className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedIncidente(incidente)}>
              <CardContent className="py-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{incidente.codigo}</h3>
                    <p className="text-sm text-muted-foreground">
                      {incidente.cliente?.nombre} - {incidente.producto?.descripcion}
                    </p>
                    <p className="text-sm">{incidente.descripcion_problema}</p>
                    <p className="text-xs text-muted-foreground">
                      Ingreso: {new Date(incidente.fecha_ingreso).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm">
                    Revisar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
