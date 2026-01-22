import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppStyleMediaCapture, MediaFile } from "@/components/features/media";
import { uploadMediaToStorage } from "@/lib/uploadMedia";
import { apiBackendAction } from "@/lib/api-backend";

type IncidenteDB = {
  id: number;
  codigo: string;
  estado: string;
  producto_id: number | null;
  fecha_ingreso: string | null;
  descripcion_problema: string | null;
  observaciones: string | null;
  tipologia: string | null;
};

interface IncidenteStockCemaco extends IncidenteDB {
  cliente?: {
    nombre: string;
    celular: string | null;
  } | null;
  producto?: {
    descripcion: string;
  } | null;
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
      // Fetch incidentes via apiBackendAction
      const { results } = await apiBackendAction("incidentes.list", { limit: 2000 });
      
      // Filter by tipologia and estado
      const filtered = (results || []).filter((inc: any) => 
        inc.tipologia === "REPARACION" && inc.estado === "REGISTRADO"
      );

      // Sort by fecha_ingreso ascending
      filtered.sort((a: any, b: any) => 
        new Date(a.fecha_ingreso || a.created_at).getTime() - new Date(b.fecha_ingreso || b.created_at).getTime()
      );

      const formatted: IncidenteStockCemaco[] = filtered.map((inc: any) => ({
        ...inc,
        cliente: inc.cliente as { nombre: string; celular: string | null } | null,
        producto: inc.producto as { descripcion: string } | null,
      }));

      setIncidentes(formatted);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("No se pudieron cargar los incidentes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRevision = async () => {
    if (!selectedIncidente) return;
    
    if (justificacion.length < 20) {
      toast.error("La justificación debe tener al menos 20 caracteres");
      return;
    }

    if (mediaFiles.length === 0) {
      toast.error("Debe agregar al menos 1 foto como evidencia");
      return;
    }

    setSubmitting(true);

    try {
      // Upload fotos
      const uploadedMedia = await uploadMediaToStorage(mediaFiles, selectedIncidente.id.toString());
      const uploadedUrls = uploadedMedia.map(m => m.url);

      // Get usuario_id via apiBackendAction
      const { results: usuarioResults } = await apiBackendAction("usuarios.list", {});
      // Note: We'll use a fallback approach since we don't have direct auth access here
      const usuario = (usuarioResults as any)?.[0] as { id: number } | undefined;

      // Add observaciones with revision info
      const revisionLog = `[${new Date().toISOString()}] Revisión Stock Cemaco - Decisión: ${decision}. Justificación: ${justificacion}`;
      const currentObs = selectedIncidente.observaciones || "";
      const newObs = currentObs ? `${currentObs}\n${revisionLog}` : revisionLog;

      // Actualizar estado del incidente via apiBackendAction
      await apiBackendAction("incidentes.update", {
        id: selectedIncidente.id,
        data: { 
          estado: "EN_DIAGNOSTICO",
          observaciones: newObs,
        }
      } as any);

      // Upload photos to incidente_fotos via apiBackendAction
      if (uploadedUrls.length > 0 && usuario) {
        const fotosToInsert = uploadedUrls.map((url, idx) => ({
          incidente_id: selectedIncidente.id,
          url,
          storage_path: url,
          tipo: "revision_stock",
          orden: idx,
          created_by: usuario.id,
        }));

        await apiBackendAction("incidente_fotos.create", fotosToInsert as any);
      }

      toast.success("Revisión enviada para aprobación del jefe de taller");

      setSelectedIncidente(null);
      setObservaciones("");
      setJustificacion("");
      setMediaFiles([]);
      fetchIncidentes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "No se pudo guardar la revisión");
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
              <span className="font-semibold">Cliente:</span> {selectedIncidente.cliente?.nombre || "N/A"}
            </div>
            <div>
              <span className="font-semibold">Producto:</span> {selectedIncidente.producto?.descripcion || `#${selectedIncidente.producto_id}`}
            </div>
            <div>
              <span className="font-semibold">Problema:</span> {selectedIncidente.descripcion_problema || "Sin descripción"}
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
                      {incidente.cliente?.nombre || "Sin cliente"} - {incidente.producto?.descripcion || `Producto #${incidente.producto_id}`}
                    </p>
                    <p className="text-sm">{incidente.descripcion_problema || "Sin descripción"}</p>
                    <p className="text-xs text-muted-foreground">
                      Ingreso: {incidente.fecha_ingreso ? new Date(incidente.fecha_ingreso).toLocaleDateString() : "N/A"}
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
