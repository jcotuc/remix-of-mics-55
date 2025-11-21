import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, FileText, Image as ImageIcon } from "lucide-react";
import { PhotoGalleryWithDescriptions } from "@/components/PhotoGalleryWithDescriptions";
import { uploadMediaToStorage } from "@/lib/uploadMedia";
import { MediaFile } from "@/components/WhatsAppStyleMediaCapture";

interface GarantiaManual {
  id: string;
  codigo_cliente: string;
  sku_reportado: string;
  descripcion_sku: string;
  cantidad_sku: number;
  descripcion_problema: string;
  estatus: string;
  fotos_urls: string[] | null;
  comentarios_logistica: string | null;
  numero_incidente: string | null;
  created_at: string;
}

interface PhotoWithDescription {
  id: string;
  file: File;
  preview: string;
  description: string;
  tipo: 'foto' | 'video';
}

const ESTATUS_OPTIONS = [
  { value: "pendiente_resolucion", label: "Pendiente de Resolución", color: "bg-yellow-500" },
  { value: "aplica_nc", label: "Aplica NC", color: "bg-green-500" },
  { value: "no_aplica_nc", label: "No Aplica NC", color: "bg-red-500" },
  { value: "cambio_garantia", label: "Cambio en Garantía", color: "bg-blue-500" },
  { value: "informacion_incompleta", label: "Información Incompleta", color: "bg-gray-500" },
  { value: "enviar_cs", label: "Enviar a CS", color: "bg-purple-500" },
];

export default function MisGarantias() {
  const { user } = useAuth();
  const [garantias, setGarantias] = useState<GarantiaManual[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [estatusFilter, setEstatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedGarantia, setSelectedGarantia] = useState<GarantiaManual | null>(null);
  
  // Form state
  const [codigoCliente, setCodigoCliente] = useState("");
  const [skuReportado, setSkuReportado] = useState("");
  const [descripcionSku, setDescripcionSku] = useState("");
  const [cantidadSku, setCantidadSku] = useState(1);
  const [descripcionProblema, setDescripcionProblema] = useState("");
  const [fotosGarantia, setFotosGarantia] = useState<PhotoWithDescription[]>([]);

  useEffect(() => {
    if (user) {
      fetchGarantias();
    }
  }, [user]);

  const fetchGarantias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("garantias_manuales")
        .select("*")
        .eq("created_by", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGarantias(data || []);
    } catch (error) {
      console.error("Error fetching garantías:", error);
      toast.error("Error al cargar garantías");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGarantia = async () => {
    if (!codigoCliente || !skuReportado || !descripcionSku || !descripcionProblema) {
      toast.error("Por favor complete todos los campos requeridos");
      return;
    }

    if (descripcionProblema.length < 20) {
      toast.error("La descripción del problema debe tener al menos 20 caracteres");
      return;
    }

    try {
      // Upload photos if any
      let fotosUrls: string[] = [];
      if (fotosGarantia.length > 0) {
        const mediaFiles: MediaFile[] = fotosGarantia.map(p => ({
          id: p.id,
          file: p.file,
          preview: p.preview,
          tipo: p.tipo,
          descripcion: p.description
        }));
        const uploadedMedia = await uploadMediaToStorage(mediaFiles, undefined);
        fotosUrls = uploadedMedia.map(m => m.url);
      }

      const { error } = await supabase
        .from("garantias_manuales")
        .insert([{
          codigo_cliente: codigoCliente,
          sku_reportado: skuReportado,
          descripcion_sku: descripcionSku,
          cantidad_sku: cantidadSku,
          descripcion_problema: descripcionProblema,
          fotos_urls: fotosUrls,
          created_by: user?.id,
          estatus: "pendiente_resolucion"
        }]);

      if (error) throw error;

      toast.success("Garantía creada exitosamente");
      setShowCreateDialog(false);
      resetForm();
      fetchGarantias();
    } catch (error) {
      console.error("Error creating garantía:", error);
      toast.error("Error al crear garantía");
    }
  };

  const resetForm = () => {
    setCodigoCliente("");
    setSkuReportado("");
    setDescripcionSku("");
    setCantidadSku(1);
    setDescripcionProblema("");
    setFotosGarantia([]);
  };

  const getEstatusLabel = (estatus: string) => {
    return ESTATUS_OPTIONS.find(opt => opt.value === estatus)?.label || estatus;
  };

  const getEstatusBadgeVariant = (estatus: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (estatus) {
      case "pendiente_resolucion": return "secondary";
      case "aplica_nc": return "default";
      case "no_aplica_nc": return "destructive";
      case "cambio_garantia": return "default";
      case "informacion_incompleta": return "outline";
      default: return "secondary";
    }
  };

  const garantiasFiltradas = garantias.filter(g => {
    const matchesSearch = 
      g.sku_reportado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.descripcion_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.codigo_cliente.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEstatus = estatusFilter === "all" || g.estatus === estatusFilter;
    
    return matchesSearch && matchesEstatus;
  });

  const garantiasPorEstatus = ESTATUS_OPTIONS.reduce((acc, opt) => {
    acc[opt.value] = garantias.filter(g => g.estatus === opt.value).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mis Garantías Manuales</h1>
          <p className="text-muted-foreground">Gestiona tus solicitudes de garantía</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Garantía
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reportar Nueva Garantía Manual</DialogTitle>
              <DialogDescription>
                Complete la información del producto con problema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="codigoCliente">Código de Cliente *</Label>
                <Input
                  id="codigoCliente"
                  value={codigoCliente}
                  onChange={(e) => setCodigoCliente(e.target.value)}
                  placeholder="Ej: HPC-000123"
                />
              </div>
              <div>
                <Label htmlFor="skuReportado">SKU Reportado *</Label>
                <Input
                  id="skuReportado"
                  value={skuReportado}
                  onChange={(e) => setSkuReportado(e.target.value)}
                  placeholder="Código del producto con familia herramienta manual"
                />
              </div>
              <div>
                <Label htmlFor="descripcionSku">Descripción del SKU *</Label>
                <Input
                  id="descripcionSku"
                  value={descripcionSku}
                  onChange={(e) => setDescripcionSku(e.target.value)}
                  placeholder="Ej: Martillo de 16 oz con mango de fibra de vidrio"
                />
              </div>
              <div>
                <Label htmlFor="cantidadSku">Cantidad *</Label>
                <Input
                  id="cantidadSku"
                  type="number"
                  min="1"
                  value={cantidadSku}
                  onChange={(e) => setCantidadSku(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="descripcionProblema">Descripción del Problema *</Label>
                <Textarea
                  id="descripcionProblema"
                  value={descripcionProblema}
                  onChange={(e) => setDescripcionProblema(e.target.value)}
                  placeholder="Describa detalladamente el problema reportado (mínimo 20 caracteres)"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {descripcionProblema.length}/20 caracteres mínimo
                </p>
              </div>
              <div>
                <Label>Fotos (Opcional, máximo 10)</Label>
                <PhotoGalleryWithDescriptions
                  photos={fotosGarantia}
                  onPhotosChange={setFotosGarantia}
                  maxPhotos={10}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateGarantia}>
                  Crear Garantía
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {ESTATUS_OPTIONS.map((opt) => (
          <Card key={opt.value}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{opt.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{garantiasPorEstatus[opt.value] || 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar y Filtrar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por SKU, descripción o código de cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="estatus">Filtrar por Estatus</Label>
              <Select value={estatusFilter} onValueChange={setEstatusFilter}>
                <SelectTrigger id="estatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estatus</SelectItem>
                  {ESTATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Garantías Table */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Solicitudes de Garantía</CardTitle>
          <CardDescription>
            Mostrando {garantiasFiltradas.length} de {garantias.length} garantías
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead>Fotos</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {garantiasFiltradas.map((garantia) => (
                <TableRow key={garantia.id}>
                  <TableCell>{new Date(garantia.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-sm">{garantia.codigo_cliente}</TableCell>
                  <TableCell className="font-mono text-sm">{garantia.sku_reportado}</TableCell>
                  <TableCell className="max-w-xs truncate">{garantia.descripcion_sku}</TableCell>
                  <TableCell>{garantia.cantidad_sku}</TableCell>
                  <TableCell>
                    <Badge variant={getEstatusBadgeVariant(garantia.estatus)}>
                      {getEstatusLabel(garantia.estatus)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {garantia.fotos_urls && garantia.fotos_urls.length > 0 && (
                      <Badge variant="outline">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {garantia.fotos_urls.length}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedGarantia(garantia)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Ver Detalle
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {garantiasFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No se encontraron garantías
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedGarantia} onOpenChange={() => setSelectedGarantia(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Garantía</DialogTitle>
          </DialogHeader>
          {selectedGarantia && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Fecha de Reporte</Label>
                  <p className="font-medium">{new Date(selectedGarantia.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estatus</Label>
                  <div className="mt-1">
                    <Badge variant={getEstatusBadgeVariant(selectedGarantia.estatus)}>
                      {getEstatusLabel(selectedGarantia.estatus)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Código de Cliente</Label>
                <p className="font-medium font-mono">{selectedGarantia.codigo_cliente}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">SKU Reportado</Label>
                <p className="font-medium font-mono">{selectedGarantia.sku_reportado}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Descripción del SKU</Label>
                <p className="font-medium">{selectedGarantia.descripcion_sku}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Cantidad</Label>
                <p className="font-medium">{selectedGarantia.cantidad_sku}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Descripción del Problema</Label>
                <p className="font-medium whitespace-pre-wrap">{selectedGarantia.descripcion_problema}</p>
              </div>
              {selectedGarantia.comentarios_logistica && (
                <div className="bg-muted p-4 rounded-lg">
                  <Label className="text-muted-foreground">Comentarios de Logística</Label>
                  <p className="font-medium mt-1">{selectedGarantia.comentarios_logistica}</p>
                </div>
              )}
              {selectedGarantia.numero_incidente && (
                <div className="bg-primary/10 p-4 rounded-lg">
                  <Label className="text-muted-foreground">Número de Incidente Asignado</Label>
                  <p className="font-medium font-mono text-lg mt-1">{selectedGarantia.numero_incidente}</p>
                </div>
              )}
              {selectedGarantia.fotos_urls && selectedGarantia.fotos_urls.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Fotos Adjuntas</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {selectedGarantia.fotos_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
                      >
                        <img
                          src={url}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
