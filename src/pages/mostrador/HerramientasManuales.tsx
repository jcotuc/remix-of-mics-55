import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Wrench, CheckCircle, XCircle, Clock, Package } from "lucide-react";
import { PhotoGalleryWithDescriptions, type PhotoWithDescription } from "@/components/shared";
import { uploadMediaToStorage } from "@/lib/uploadMedia";
import { apiBackendAction } from "@/lib/api-backend";
import type { MediaFile } from "@/components/features/media";

type IncidenteHerramienta = {
  id: number;
  codigo: string;
  estado: string;
  tipologia: string | null;
  descripcion_problema: string | null;
  observaciones: string | null;
  aplica_garantia: boolean | null;
  created_at: string | null;
  cliente?: { nombre: string };
};

const ESTADO_FISICO_OPTIONS = [
  { value: "bueno", label: "Bueno" },
  { value: "regular", label: "Regular" },
  { value: "malo", label: "Malo" },
  { value: "danado", label: "Dañado" }
];

export default function HerramientasManuales() {
  const { user } = useAuth();
  const [incidentes, setIncidentes] = useState<IncidenteHerramienta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedIncidente, setSelectedIncidente] = useState<IncidenteHerramienta | null>(null);
  const [showEvaluacionDialog, setShowEvaluacionDialog] = useState(false);

  // Form state para nueva recepción
  const [formData, setFormData] = useState({
    cliente_id: "",
    producto_id: "",
    descripcion_problema: "",
    estado_fisico: "bueno",
    observaciones: ""
  });
  const [fotos, setFotos] = useState<PhotoWithDescription[]>([]);

  // State para evaluación
  const [aplicaGarantia, setAplicaGarantia] = useState<boolean | null>(null);
  const [justificacion, setJustificacion] = useState("");

  useEffect(() => {
    fetchIncidentes();
  }, []);

  const fetchIncidentes = async () => {
    try {
      setLoading(true);
      // Fetch incidentes using apiBackendAction
      const { results } = await apiBackendAction("incidentes.list", { limit: 500 });
      
      // Filter for REPARACION tipologia and map to our type
      const filtered = (results || [])
        .filter((inc: any) => inc.tipologia === "REPARACION")
        .map((inc: any) => ({
          id: inc.id,
          codigo: inc.codigo,
          estado: inc.estado,
          tipologia: inc.tipologia,
          descripcion_problema: inc.descripcion_problema,
          observaciones: inc.observaciones,
          aplica_garantia: inc.aplica_garantia,
          created_at: inc.created_at,
          cliente: inc.cliente ? { nombre: inc.cliente.nombre } : undefined,
        }));
      
      setIncidentes(filtered);
    } catch (error) {
      console.error("Error fetching incidentes:", error);
      toast.error("Error al cargar herramientas manuales");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncidente = async () => {
    if (!formData.cliente_id || !formData.producto_id || !formData.descripcion_problema) {
      toast.error("Por favor complete todos los campos requeridos");
      return;
    }

    if (fotos.length === 0) {
      toast.error("Debe agregar al menos 1 foto de la herramienta");
      return;
    }

    try {
      // Obtener cliente_id numérico using apiBackendAction
      const { result: clienteData } = await apiBackendAction("clientes.getByCodigo", { codigo: formData.cliente_id });

      if (!clienteData) {
        toast.error("Cliente no encontrado");
        return;
      }

      // Obtener producto_id numérico using apiBackendAction
      const { result: productoData } = await apiBackendAction("productos.getByCodigo", { codigo: formData.producto_id });

      if (!productoData) {
        toast.error("Producto no encontrado");
        return;
      }

      // Obtener centro_de_servicio_id del usuario (default 1)
      const centroServicioId = 1;

      // Generar código de incidente via apiBackendAction
      const { codigo: nuevoCodigoIncidente } = await apiBackendAction("rpc.generarCodigoIncidente", {});

      // Subir fotos
      const mediaFiles: MediaFile[] = fotos.map(p => ({
        id: p.id,
        file: p.file,
        preview: p.preview,
        tipo: p.tipo,
        descripcion: p.description
      }));

      // Crear incidente using apiBackendAction
      const incidenteData = await apiBackendAction("incidentes.create", {
        codigo: nuevoCodigoIncidente,
        cliente_id: (clienteData as any).id,
        producto_id: (productoData as any).id,
        centro_de_servicio_id: centroServicioId,
        descripcion_problema: formData.descripcion_problema,
        estado: "EN_DIAGNOSTICO",
        tipologia: "REPARACION",
        observaciones: formData.observaciones,
        aplica_garantia: false,
        tracking_token: crypto.randomUUID(),
        quiere_envio: false
      } as any);

      // Subir fotos asociadas al incidente
      const uploadedMedia = await uploadMediaToStorage(mediaFiles, String((incidenteData as any).id));
      
      // Guardar referencias de fotos using apiBackendAction
      const fotosInserts = uploadedMedia.map(media => ({
        incidente_id: (incidenteData as any).id,
        tipo: "ingreso",
        url: media.url,
        storage_path: media.storage_path
      }));

      await apiBackendAction("incidente_fotos.create", fotosInserts as any);

      toast.success("Herramienta recibida correctamente");
      setShowNewDialog(false);
      resetForm();
      fetchIncidentes();
    } catch (error) {
      console.error("Error creating incidente:", error);
      toast.error("Error al recibir herramienta");
    }
  };

  const handleEvaluacion = async () => {
    if (!selectedIncidente || aplicaGarantia === null) {
      toast.error("Por favor seleccione si aplica garantía");
      return;
    }

    if (!justificacion || justificacion.length < 20) {
      toast.error("La justificación debe tener al menos 20 caracteres");
      return;
    }

    try {
      const nuevoEstado = aplicaGarantia ? "CAMBIO_POR_GARANTIA" : "ESPERA_APROBACION";
      
      await apiBackendAction("incidentes.update", {
        id: selectedIncidente.id,
        data: {
          estado: nuevoEstado,
          aplica_garantia: aplicaGarantia,
          observaciones: justificacion
        }
      } as any);

      toast.success(
        aplicaGarantia 
          ? "Garantía aplicada - Puede proceder con el cambio" 
          : "Canje ofrecido - Cliente debe aceptar/rechazar"
      );
      
      setShowEvaluacionDialog(false);
      setSelectedIncidente(null);
      resetEvaluacion();
      fetchIncidentes();
    } catch (error) {
      console.error("Error updating incidente:", error);
      toast.error("Error al evaluar herramienta");
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      producto_id: "",
      descripcion_problema: "",
      estado_fisico: "bueno",
      observaciones: ""
    });
    setFotos([]);
  };

  const resetEvaluacion = () => {
    setAplicaGarantia(null);
    setJustificacion("");
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "EN_DIAGNOSTICO":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Ingresado</Badge>;
      case "CAMBIO_POR_GARANTIA":
        return <Badge className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" /> Garantía</Badge>;
      case "ESPERA_APROBACION":
        return <Badge className="bg-amber-600 gap-1"><Package className="h-3 w-3" /> Porcentaje</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const incidentesFiltrados = incidentes.filter(inc => 
    inc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inc.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const contadores = {
    ingresado: incidentes.filter(i => i.estado === "EN_DIAGNOSTICO").length,
    garantia: incidentes.filter(i => i.estado === "CAMBIO_POR_GARANTIA").length,
    porcentaje: incidentes.filter(i => i.estado === "ESPERA_APROBACION").length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Herramientas Manuales</h1>
          <p className="text-muted-foreground">Recepción y evaluación de herramientas manuales</p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Recibir Herramienta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Recibir Nueva Herramienta Manual
              </DialogTitle>
              <DialogDescription>
                Complete los datos de la herramienta para ingresarla al sistema
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código Cliente *</Label>
                  <Input
                    placeholder="Ej: CLI-00001"
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SKU Herramienta *</Label>
                  <Input
                    placeholder="Ej: HM-12345"
                    value={formData.producto_id}
                    onChange={(e) => setFormData({ ...formData, producto_id: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción del Problema *</Label>
                <Textarea
                  placeholder="Describa el problema reportado por el cliente..."
                  value={formData.descripcion_problema}
                  onChange={(e) => setFormData({ ...formData, descripcion_problema: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado Físico de Recepción</Label>
                <Select 
                  value={formData.estado_fisico}
                  onValueChange={(v) => setFormData({ ...formData, estado_fisico: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADO_FISICO_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observaciones de Recepción</Label>
                <Textarea
                  placeholder="Observaciones adicionales..."
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Fotos de la Herramienta * (mínimo 1)</Label>
                <PhotoGalleryWithDescriptions
                  photos={fotos}
                  onPhotosChange={setFotos}
                  maxPhotos={5}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateIncidente}>
                  Recibir Herramienta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresadas</p>
                <p className="text-3xl font-bold">{contadores.ingresado}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Garantía Aplicada</p>
                <p className="text-3xl font-bold text-green-600">{contadores.garantia}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Porcentaje Ofrecido</p>
                <p className="text-3xl font-bold text-amber-600">{contadores.porcentaje}</p>
              </div>
              <Package className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o cliente..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de herramientas */}
      <Card>
        <CardHeader>
          <CardTitle>Herramientas Recibidas</CardTitle>
          <CardDescription>
            {incidentesFiltrados.length} herramientas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando...
            </div>
          ) : incidentesFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay herramientas manuales registradas
            </div>
          ) : (
            <div className="space-y-4">
              {incidentesFiltrados.map((inc) => (
                <Card key={inc.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Wrench className="h-10 w-10 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">{inc.codigo}</p>
                          <p className="text-sm text-muted-foreground">
                            {inc.cliente?.nombre || "Cliente desconocido"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(inc.created_at || "").toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(inc.estado)}
                        {inc.estado === "EN_DIAGNOSTICO" && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedIncidente(inc);
                              setShowEvaluacionDialog(true);
                            }}
                          >
                            Evaluar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Evaluación */}
      <Dialog open={showEvaluacionDialog} onOpenChange={setShowEvaluacionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Evaluar Garantía</DialogTitle>
            <DialogDescription>
              Determine si la herramienta aplica para garantía o canje con descuento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold">{selectedIncidente?.codigo}</p>
              <p className="text-sm text-muted-foreground">
                {selectedIncidente?.cliente?.nombre}
              </p>
            </div>

            <div className="space-y-2">
              <Label>¿Aplica Garantía?</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={aplicaGarantia === true ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setAplicaGarantia(true)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Sí, Garantía
                </Button>
                <Button
                  variant={aplicaGarantia === false ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setAplicaGarantia(false)}
                >
                  <XCircle className="h-4 w-4" />
                  No, Canje 40%
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Justificación *</Label>
              <Textarea
                placeholder="Explique el motivo de la decisión (mínimo 20 caracteres)..."
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setShowEvaluacionDialog(false);
                resetEvaluacion();
              }}>
                Cancelar
              </Button>
              <Button onClick={handleEvaluacion}>
                Confirmar Evaluación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
