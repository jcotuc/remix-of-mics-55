import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Paperclip, Camera } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
type GarantiaManuaDB = {
  id: string;
  codigo_cliente: string;
  sku_reportado: string;
  descripcion_sku: string;
  cantidad_sku: number;
  descripcion_problema: string;
  estatus: string;
  comentarios_logistica: string | null;
  numero_incidente: string | null;
  fotos_urls: string[] | null;
  created_at: string;
  created_by: string | null;
};
const ESTATUS_OPTIONS = [{
  value: "pendiente_resolucion",
  label: "Pendiente Resolución"
}, {
  value: "aplica_nc",
  label: "Aplica NC"
}, {
  value: "no_aplica_nc",
  label: "No Aplica NC"
}, {
  value: "cambio_garantia",
  label: "Cambio en Garantía"
}, {
  value: "informacion_incompleta",
  label: "Información Incompleta"
}, {
  value: "enviar_centro_servicio",
  label: "Enviar a Centro de Servicio"
}];
export default function GarantiasManuales() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState<string>("todos");
  const [garantias, setGarantias] = useState<GarantiaManuaDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGarantia, setSelectedGarantia] = useState<GarantiaManuaDB | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    codigo_cliente: "",
    sku_reportado: "",
    descripcion_sku: "",
    cantidad_sku: 1,
    descripcion_problema: ""
  });
  const [updateData, setUpdateData] = useState({
    estatus: "",
    comentarios_logistica: "",
    numero_incidente: ""
  });
  useEffect(() => {
    fetchGarantias();
  }, []);
  const fetchGarantias = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("garantias_manuales").select("*").order("created_at", {
        ascending: false
      });
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
    try {
      const {
        error
      } = await supabase.from("garantias_manuales").insert([{
        ...formData,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }]);
      if (error) throw error;
      toast.success("Garantía creada exitosamente");
      setShowNewDialog(false);
      setFormData({
        codigo_cliente: "",
        sku_reportado: "",
        descripcion_sku: "",
        cantidad_sku: 1,
        descripcion_problema: ""
      });
      fetchGarantias();
    } catch (error) {
      console.error("Error creating garantía:", error);
      toast.error("Error al crear garantía");
    }
  };
  const handleUpdateGarantia = async () => {
    if (!selectedGarantia) return;
    try {
      const {
        error
      } = await supabase.from("garantias_manuales").update({
        estatus: updateData.estatus,
        comentarios_logistica: updateData.comentarios_logistica,
        numero_incidente: updateData.numero_incidente || null,
        modified_by: (await supabase.auth.getUser()).data.user?.id
      }).eq("id", selectedGarantia.id);
      if (error) throw error;
      toast.success("Garantía actualizada exitosamente");
      setShowDetailDialog(false);
      setSelectedGarantia(null);
      fetchGarantias();
    } catch (error) {
      console.error("Error updating garantía:", error);
      toast.error("Error al actualizar garantía");
    }
  };
  const getEstatusLabel = (estatus: string) => {
    return ESTATUS_OPTIONS.find(opt => opt.value === estatus)?.label || estatus;
  };
  const getEstatusBadgeVariant = (estatus: string) => {
    switch (estatus) {
      case "pendiente_resolucion":
        return "secondary";
      case "aplica_nc":
        return "destructive";
      case "cambio_garantia":
        return "default";
      default:
        return "outline";
    }
  };
  const garantiasFiltradas = garantias.filter(g => {
    const matchSearch = g.codigo_cliente.toLowerCase().includes(searchTerm.toLowerCase()) || g.sku_reportado.toLowerCase().includes(searchTerm.toLowerCase()) || g.descripcion_sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstatus = filtroEstatus === "todos" || g.estatus === filtroEstatus;
    return matchSearch && matchEstatus;
  });
  const garantiasPorEstatus = ESTATUS_OPTIONS.reduce((acc, {
    value
  }) => {
    acc[value] = garantiasFiltradas.filter(g => g.estatus === value);
    return acc;
  }, {} as Record<string, GarantiaManuaDB[]>);
  const pendientesCount = garantias.filter(g => g.estatus === "pendiente_resolucion").length;
  return <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Garantías Manuales</h1>
          <p className="text-muted-foreground mt-1">Gestión de garantías para herramientas manuales </p>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Solicitud
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nueva Solicitud de Garantía</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Código Cliente</Label>
                <Input value={formData.codigo_cliente} onChange={e => setFormData({
                ...formData,
                codigo_cliente: e.target.value
              })} placeholder="HPC-000001" />
              </div>
              <div>
                <Label>SKU Reportado</Label>
                <Input value={formData.sku_reportado} onChange={e => setFormData({
                ...formData,
                sku_reportado: e.target.value
              })} placeholder="SKU del producto" />
              </div>
              <div>
                <Label>Descripción SKU</Label>
                <Input value={formData.descripcion_sku} onChange={e => setFormData({
                ...formData,
                descripcion_sku: e.target.value
              })} placeholder="Martillo de goma 2 libras" />
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input type="number" min={1} value={formData.cantidad_sku} onChange={e => setFormData({
                ...formData,
                cantidad_sku: parseInt(e.target.value) || 1
              })} />
              </div>
              <div>
                <Label>Descripción del Problema Reportado</Label>
                <Textarea value={formData.descripcion_problema} onChange={e => setFormData({
                ...formData,
                descripcion_problema: e.target.value
              })} placeholder="Describa el problema reportado por el cliente..." rows={4} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateGarantia}>
                  Crear Solicitud
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes Resolución
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendientesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aplica NC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{garantiasPorEstatus.aplica_nc?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              No Aplica NC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{garantiasPorEstatus.no_aplica_nc?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cambio en Garantía
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{garantiasPorEstatus.cambio_garantia?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Solicitudes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{garantias.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por código cliente, SKU o descripción..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filtroEstatus} onValueChange={setFiltroEstatus}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por estatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estatus</SelectItem>
                {ESTATUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vista Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pendiente Resolución */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>PENDIENTE RESOLUCIÓN</span>
              <Badge variant="secondary">{garantiasPorEstatus.pendiente_resolucion?.length || 0}+</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {garantiasPorEstatus.pendiente_resolucion?.map(garantia => <Card key={garantia.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
            setSelectedGarantia(garantia);
            setUpdateData({
              estatus: garantia.estatus,
              comentarios_logistica: garantia.comentarios_logistica || "",
              numero_incidente: garantia.numero_incidente || ""
            });
            setShowDetailDialog(true);
          }}>
                <CardContent className="pt-4 space-y-2">
                  <div className="text-sm">
                    <span className="font-semibold">ID:</span> {garantia.id.slice(0, 8)}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">CODIGO CLIENTE:</span><br />
                    {garantia.codigo_cliente}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {garantia.descripcion_sku}
                  </div>
                  {garantia.fotos_urls && garantia.fotos_urls.length > 0 && <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Paperclip className="h-3 w-3" />
                      {garantia.fotos_urls.length} foto(s)
                    </div>}
                </CardContent>
              </Card>)}
          </CardContent>
        </Card>

        {/* Aplica NC */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>APLICA NC</span>
              <Badge variant="destructive">{garantiasPorEstatus.aplica_nc?.length || 0}+</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {garantiasPorEstatus.aplica_nc?.map(garantia => <Card key={garantia.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
            setSelectedGarantia(garantia);
            setUpdateData({
              estatus: garantia.estatus,
              comentarios_logistica: garantia.comentarios_logistica || "",
              numero_incidente: garantia.numero_incidente || ""
            });
            setShowDetailDialog(true);
          }}>
                <CardContent className="pt-4 space-y-2">
                  <div className="text-sm">
                    <span className="font-semibold">ID:</span> {garantia.id.slice(0, 8)}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">CODIGO CLIENTE:</span><br />
                    {garantia.codigo_cliente}
                  </div>
                  {garantia.numero_incidente && <Badge variant="outline" className="text-xs">
                      {garantia.numero_incidente}
                    </Badge>}
                </CardContent>
              </Card>)}
          </CardContent>
        </Card>

        {/* No Aplica NC */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>NO APLICA NC</span>
              <Badge>{garantiasPorEstatus.no_aplica_nc?.length || 0}+</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {garantiasPorEstatus.no_aplica_nc?.map(garantia => <Card key={garantia.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
            setSelectedGarantia(garantia);
            setUpdateData({
              estatus: garantia.estatus,
              comentarios_logistica: garantia.comentarios_logistica || "",
              numero_incidente: garantia.numero_incidente || ""
            });
            setShowDetailDialog(true);
          }}>
                <CardContent className="pt-4 space-y-2">
                  <div className="text-sm">
                    <span className="font-semibold">ID:</span> {garantia.id.slice(0, 8)}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">CODIGO CLIENTE:</span><br />
                    {garantia.codigo_cliente}
                  </div>
                </CardContent>
              </Card>)}
          </CardContent>
        </Card>

        {/* Cambio en Garantía */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>CAMBIO EN GARANTÍA</span>
              <Badge>{garantiasPorEstatus.cambio_garantia?.length || 0}+</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {garantiasPorEstatus.cambio_garantia?.map(garantia => <Card key={garantia.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
            setSelectedGarantia(garantia);
            setUpdateData({
              estatus: garantia.estatus,
              comentarios_logistica: garantia.comentarios_logistica || "",
              numero_incidente: garantia.numero_incidente || ""
            });
            setShowDetailDialog(true);
          }}>
                <CardContent className="pt-4 space-y-2">
                  <div className="text-sm">
                    <span className="font-semibold">ID:</span> {garantia.id.slice(0, 8)}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">CODIGO CLIENTE:</span><br />
                    {garantia.codigo_cliente}
                  </div>
                  {garantia.numero_incidente && <Badge variant="outline" className="text-xs">
                      {garantia.numero_incidente}
                    </Badge>}
                </CardContent>
              </Card>)}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Detalle */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Solicitud</DialogTitle>
          </DialogHeader>
          {selectedGarantia && <div className="space-y-6">
              {/* Datos del Asesor */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Datos de la Solicitud</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Código Cliente</Label>
                    <div className="font-medium">{selectedGarantia.codigo_cliente}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">SKU Reportado</Label>
                    <div className="font-medium">{selectedGarantia.sku_reportado}</div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Descripción SKU</Label>
                    <div className="font-medium">{selectedGarantia.descripcion_sku}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Cantidad</Label>
                    <div className="font-medium">{selectedGarantia.cantidad_sku}</div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Descripción del Problema</Label>
                    <div className="font-medium whitespace-pre-wrap">{selectedGarantia.descripcion_problema}</div>
                  </div>
                </div>
              </div>

              {/* Datos Adjuntos (Fotos) */}
              {selectedGarantia.fotos_urls && selectedGarantia.fotos_urls.length > 0 && <div className="space-y-2">
                  <h3 className="font-semibold border-b pb-2">Datos Adjuntos</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Camera className="h-4 w-4" />
                    {selectedGarantia.fotos_urls.length} foto(s) adjuntas
                  </div>
                </div>}

              {/* Formulario de Logística */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Resolución Logística</h3>
                <div>
                  <Label>Estatus</Label>
                  <Select value={updateData.estatus} onValueChange={value => setUpdateData({
                ...updateData,
                estatus: value
              })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTATUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Comentarios Logística</Label>
                  <Textarea value={updateData.comentarios_logistica} onChange={e => setUpdateData({
                ...updateData,
                comentarios_logistica: e.target.value
              })} placeholder="Comentarios sobre la resolución..." rows={4} />
                </div>
                {(updateData.estatus === "aplica_nc" || updateData.estatus === "cambio_garantia") && <div>
                    <Label>Número de Incidente</Label>
                    <Input value={updateData.numero_incidente} onChange={e => setUpdateData({
                ...updateData,
                numero_incidente: e.target.value
              })} placeholder="INC-000001" />
                  </div>}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateGarantia}>
                  Actualizar
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
}