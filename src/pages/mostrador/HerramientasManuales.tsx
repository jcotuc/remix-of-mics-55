import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import type { MediaFile } from "@/components/features/media";

type IncidenteHerramienta = {
  id: string;
  codigo: string;
  codigo_cliente: string;
  codigo_producto: string;
  descripcion_problema: string;
  status: string;
  estado_fisico_recepcion: string | null;
  observaciones_recepcion: string | null;
  created_at: string;
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
    codigo_cliente: "",
    codigo_producto: "",
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
      const { data, error } = await supabase
        .from("incidentes")
        .select(`
          *,
          cliente:clientes(nombre)
        `)
        .eq("es_herramienta_manual", true)
        .eq("ingresado_en_mostrador", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIncidentes(data || []);
    } catch (error) {
      console.error("Error fetching incidentes:", error);
      toast.error("Error al cargar herramientas manuales");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncidente = async () => {
    if (!formData.codigo_cliente || !formData.codigo_producto || !formData.descripcion_problema) {
      toast.error("Por favor complete todos los campos requeridos");
      return;
    }

    if (fotos.length === 0) {
      toast.error("Debe agregar al menos 1 foto de la herramienta");
      return;
    }

    try {
      // Generar código de incidente
      const { data: codigoData, error: codigoError } = await supabase
        .rpc("generar_codigo_incidente");
      
      if (codigoError) throw codigoError;
      const nuevoCodigoIncidente = codigoData;

      // Subir fotos
      const mediaFiles: MediaFile[] = fotos.map(p => ({
        id: p.id,
        file: p.file,
        preview: p.preview,
        tipo: p.tipo,
        descripcion: p.description
      }));

      // Crear incidente
      const { data: incidenteData, error: incidenteError } = await supabase
        .from("incidentes")
        .insert({
          codigo: nuevoCodigoIncidente,
          codigo_cliente: formData.codigo_cliente,
          codigo_producto: formData.codigo_producto,
          descripcion_problema: formData.descripcion_problema,
          status: "Ingresado",
          es_herramienta_manual: true,
          ingresado_en_mostrador: true,
          estado_fisico_recepcion: formData.estado_fisico,
          observaciones_recepcion: formData.observaciones,
          cobertura_garantia: false,
          created_by: user?.id
        })
        .select()
        .single();

      if (incidenteError) throw incidenteError;

      // Subir fotos asociadas al incidente
      const uploadedMedia = await uploadMediaToStorage(mediaFiles, incidenteData.id);
      
      // Guardar referencias de fotos
      const fotosInserts = uploadedMedia.map(media => ({
        incidente_id: incidenteData.id,
        tipo: "ingreso",
        url: media.url,
        storage_path: media.storage_path,
        created_by: user?.id
      }));

      const { error: fotosError } = await supabase
        .from("incidente_fotos")
        .insert(fotosInserts);

      if (fotosError) throw fotosError;

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
      const nuevoStatus = aplicaGarantia ? "Cambio por garantia" : "Porcentaje";
      
      const { error } = await supabase
        .from("incidentes")
        .update({
          status: nuevoStatus,
          cobertura_garantia: aplicaGarantia,
          log_observaciones: justificacion
        })
        .eq("id", selectedIncidente.id);

      if (error) throw error;

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
      toast.error("Error al evaluar garantía");
    }
  };

  const resetForm = () => {
    setFormData({
      codigo_cliente: "",
      codigo_producto: "",
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      "Ingresado": { variant: "secondary", icon: Clock },
      "Cambio por garantia": { variant: "default", icon: CheckCircle },
      "Porcentaje": { variant: "outline", icon: Package },
      "Entregado": { variant: "default", icon: CheckCircle },
      "Rechazado": { variant: "destructive", icon: XCircle }
    };
    
    const config = variants[status] || { variant: "secondary", icon: Clock };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const incidentesPorEstado = {
    pendiente: incidentes.filter(i => i.status === "Ingresado").length,
    cambio: incidentes.filter(i => i.status === "Cambio por garantia").length,
    canje: incidentes.filter(i => i.status === "Porcentaje").length,
    entregado: incidentes.filter(i => i.status === "Entregado").length,
    rechazado: incidentes.filter(i => i.status === "Rechazado").length
  };

  const incidentesFiltrados = incidentes.filter(i =>
    i.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.codigo_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.codigo_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Herramientas Manuales</h1>
          <p className="text-muted-foreground">Gestión de garantías de herramientas manuales</p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Recibir Herramienta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Recepción Física de Herramienta</DialogTitle>
              <DialogDescription>
                Complete la información de la herramienta recibida
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="codigo_cliente">Código de Cliente *</Label>
                <Input
                  id="codigo_cliente"
                  value={formData.codigo_cliente}
                  onChange={(e) => setFormData({ ...formData, codigo_cliente: e.target.value })}
                  placeholder="Ej: HPC-000123"
                />
              </div>
              <div>
                <Label htmlFor="codigo_producto">SKU de la Herramienta *</Label>
                <Input
                  id="codigo_producto"
                  value={formData.codigo_producto}
                  onChange={(e) => setFormData({ ...formData, codigo_producto: e.target.value })}
                  placeholder="Código del producto"
                />
              </div>
              <div>
                <Label htmlFor="descripcion_problema">Descripción del Problema *</Label>
                <Textarea
                  id="descripcion_problema"
                  value={formData.descripcion_problema}
                  onChange={(e) => setFormData({ ...formData, descripcion_problema: e.target.value })}
                  placeholder="Describa el problema reportado"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="estado_fisico">Estado Físico *</Label>
                <Select 
                  value={formData.estado_fisico}
                  onValueChange={(value) => setFormData({ ...formData, estado_fisico: value })}
                >
                  <SelectTrigger id="estado_fisico">
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
              <div>
                <Label htmlFor="observaciones">Observaciones de Recepción</Label>
                <Textarea
                  id="observaciones"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Daños visibles, accesorios faltantes, etc."
                  rows={2}
                />
              </div>
              <div>
                <Label>Fotos de la Herramienta * (mínimo 1, máximo 10)</Label>
                <PhotoGalleryWithDescriptions
                  photos={fotos}
                  onPhotosChange={setFotos}
                  maxPhotos={10}
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

      {/* Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendiente Evaluación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidentesPorEstado.pendiente}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cambio por Garantía</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidentesPorEstado.cambio}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Canje Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidentesPorEstado.canje}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Entregado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidentesPorEstado.entregado}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rechazado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidentesPorEstado.rechazado}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, cliente o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Herramientas */}
      <Card>
        <CardHeader>
          <CardTitle>Herramientas Manuales</CardTitle>
          <CardDescription>
            Mostrando {incidentesFiltrados.length} de {incidentes.length} herramientas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {incidentesFiltrados.map((incidente) => (
              <Card key={incidente.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-lg">{incidente.codigo}</span>
                        {getStatusBadge(incidente.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Cliente:</span>{" "}
                          <span className="font-medium">{incidente.cliente?.nombre || incidente.codigo_cliente}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">SKU:</span>{" "}
                          <span className="font-mono">{incidente.codigo_producto}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Estado Físico:</span>{" "}
                          <span className="font-medium capitalize">{incidente.estado_fisico_recepcion || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fecha:</span>{" "}
                          <span>{new Date(incidente.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-sm">Problema:</span>{" "}
                        <span className="text-sm">{incidente.descripcion_problema}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {incidente.status === "Ingresado" && (
                        <Button
                          onClick={() => {
                            setSelectedIncidente(incidente);
                            setShowEvaluacionDialog(true);
                          }}
                        >
                          <Wrench className="h-4 w-4 mr-2" />
                          Evaluar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {incidentesFiltrados.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron herramientas
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Evaluación */}
      <Dialog open={showEvaluacionDialog} onOpenChange={setShowEvaluacionDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Evaluar Garantía</DialogTitle>
            <DialogDescription>
              Determine si aplica garantía para esta herramienta
            </DialogDescription>
          </DialogHeader>
          {selectedIncidente && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div>
                  <span className="text-muted-foreground">Código:</span>{" "}
                  <span className="font-mono font-bold">{selectedIncidente.codigo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cliente:</span>{" "}
                  <span className="font-medium">{selectedIncidente.cliente?.nombre}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">SKU:</span>{" "}
                  <span className="font-mono">{selectedIncidente.codigo_producto}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Estado Físico:</span>{" "}
                  <span className="capitalize">{selectedIncidente.estado_fisico_recepcion}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Problema:</span>{" "}
                  <span>{selectedIncidente.descripcion_problema}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>¿Aplica Garantía? *</Label>
                <div className="flex gap-4">
                  <Button
                    variant={aplicaGarantia === true ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setAplicaGarantia(true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Sí, aplica (Cambio)
                  </Button>
                  <Button
                    variant={aplicaGarantia === false ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setAplicaGarantia(false)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    No aplica (Canje 40%)
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="justificacion">Justificación * (mínimo 20 caracteres)</Label>
                <Textarea
                  id="justificacion"
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Explique la razón de la decisión"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {justificacion.length}/20 caracteres mínimo
                </p>
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
