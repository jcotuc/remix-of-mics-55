import { useState, useEffect } from "react";
import { Package, Upload, Plus, Ship, Truck, Eye, Play, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { formatFechaCorta } from "@/utils/dateFormatters";
import { es } from "date-fns/locale";

type Importacion = {
  id: string;
  numero_embarque: string;
  origen: string;
  fecha_llegada: string;
  estado: string;
  notas: string | null;
  total_items?: number;
  items_recibidos?: number;
};

type DetalleImportacion = {
  id: string;
  sku: string;
  descripcion: string;
  cantidad: number;
  cantidad_esperada: number;
  cantidad_recibida: number;
  estado: string;
};

export default function Importacion() {
  const navigate = useNavigate();
  const [importaciones, setImportaciones] = useState<Importacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNuevaDialog, setShowNuevaDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state for new import
  const [formData, setFormData] = useState({
    numero_embarque: "",
    origen: "china" as "china" | "mexico",
    fecha_llegada: new Date().toISOString().split("T")[0],
    notas: ""
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ processed: number; total: number } | null>(null);

  useEffect(() => {
    fetchImportaciones();
  }, []);

  const fetchImportaciones = async () => {
    try {
      setLoading(true);
      
      // Get importaciones with detail counts
      const { data: importacionesData, error } = await supabase
        .from("importaciones")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get counts for each importacion
      const importacionesWithCounts = await Promise.all(
        (importacionesData || []).map(async (imp) => {
          const { count: totalItems } = await supabase
            .from("importaciones_detalle")
            .select("*", { count: "exact", head: true })
            .eq("importacion_id", imp.id);
          
          const { count: itemsRecibidos } = await supabase
            .from("importaciones_detalle")
            .select("*", { count: "exact", head: true })
            .eq("importacion_id", imp.id)
            .eq("estado", "recibido");

          return {
            ...imp,
            total_items: totalItems || 0,
            items_recibidos: itemsRecibidos || 0
          };
        })
      );

      setImportaciones(importacionesWithCounts);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar importaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleCreateImportacion = async () => {
    if (!formData.numero_embarque.trim()) {
      toast.error("Ingrese el número de contenedor/embarque");
      return;
    }

    setCreating(true);

    try {
      // Get centro central
      const { data: centroCentral } = await supabase
        .from("centros_servicio")
        .select("id")
        .eq("es_central", true)
        .single();

      // Create importacion record
      const { data: nuevaImportacion, error: importError } = await supabase
        .from("importaciones")
        .insert({
          numero_embarque: formData.numero_embarque.trim(),
          origen: formData.origen === "china" ? "China" : "México",
          fecha_llegada: formData.fecha_llegada,
          estado: "pendiente",
          notas: formData.notas || null,
          centro_destino_id: centroCentral?.id || null
        })
        .select()
        .single();

      if (importError) throw importError;

      // If file provided, parse and insert details
      if (file) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        if (rows.length > 0) {
          const detalles: {
            importacion_id: string;
            sku: string;
            descripcion: string;
            cantidad: number;
            cantidad_esperada: number;
            estado: string;
          }[] = [];

          for (const row of rows) {
            const sku = row.SKU || row.sku || row.CODIGO || row.codigo || "";
            const descripcion = row.DESCRIPCION || row.descripcion || row.NOMBRE || row.nombre || "";
            const cantidad = parseInt(row.CANTIDAD || row.cantidad || row.QTY || row.qty || 1);

            if (!sku) continue;

            detalles.push({
              importacion_id: nuevaImportacion.id,
              sku: sku.toString().trim(),
              descripcion: descripcion.toString().trim(),
              cantidad: cantidad,
              cantidad_esperada: cantidad,
              estado: "pendiente"
            });
          }

          if (detalles.length > 0) {
            setUploadProgress({ processed: 0, total: detalles.length });
            const BATCH_SIZE = 100;

            for (let i = 0; i < detalles.length; i += BATCH_SIZE) {
              const batch = detalles.slice(i, i + BATCH_SIZE);
              await supabase.from("importaciones_detalle").insert(batch);
              setUploadProgress({ processed: Math.min(i + batch.length, detalles.length), total: detalles.length });
            }
          }
        }
      }

      toast.success("Importación creada correctamente");
      setShowNuevaDialog(false);
      setFormData({
        numero_embarque: "",
        origen: "china",
        fecha_llegada: new Date().toISOString().split("T")[0],
        notas: ""
      });
      setFile(null);
      setUploadProgress(null);
      
      // Navigate directly to reception
      navigate(`/bodega/recepcion/${nuevaImportacion.id}`);

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear importación");
    } finally {
      setCreating(false);
    }
  };

  const getEstadoBadge = (imp: Importacion) => {
    if (imp.estado === "completado") {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><Check className="h-3 w-3 mr-1" /> Completado</Badge>;
    }
    if (imp.estado === "en_recepcion" || (imp.items_recibidos && imp.items_recibidos > 0 && imp.items_recibidos < (imp.total_items || 0))) {
      const pct = imp.total_items ? Math.round((imp.items_recibidos || 0) / imp.total_items * 100) : 0;
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><Play className="h-3 w-3 mr-1" /> En recepción ({pct}%)</Badge>;
    }
    return <Badge variant="secondary"><Package className="h-3 w-3 mr-1" /> Pendiente</Badge>;
  };

  const getOrigenIcon = (origen: string) => {
    return origen.toLowerCase().includes("china") 
      ? <Ship className="h-4 w-4 text-blue-500" /> 
      : <Truck className="h-4 w-4 text-orange-500" />;
  };

  const pendientes = importaciones.filter(i => i.estado !== "completado");
  const completadas = importaciones.filter(i => i.estado === "completado");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Package className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Importaciones
          </h1>
          <p className="text-muted-foreground mt-2">
            Recepción de contenedores de China y México
          </p>
        </div>
        <Button onClick={() => setShowNuevaDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Importación
        </Button>
      </div>

      {/* Tabs for pending and completed */}
      <Tabs defaultValue="pendientes" className="w-full">
        <TabsList>
          <TabsTrigger value="pendientes" className="gap-2">
            <Package className="h-4 w-4" />
            Pendientes ({pendientes.length})
          </TabsTrigger>
          <TabsTrigger value="completadas" className="gap-2">
            <Check className="h-4 w-4" />
            Completadas ({completadas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes">
          <Card>
            <CardHeader>
              <CardTitle>Importaciones Pendientes de Recibir</CardTitle>
              <CardDescription>
                Haga clic en "Recibir" para iniciar el proceso de recepción código por código
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendientes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay importaciones pendientes</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowNuevaDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primera importación
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contenedor</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Fecha Llegada</TableHead>
                      <TableHead>Códigos</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendientes.map((imp) => {
                      const pct = imp.total_items ? Math.round((imp.items_recibidos || 0) / imp.total_items * 100) : 0;
                      return (
                        <TableRow key={imp.id}>
                          <TableCell className="font-mono font-medium">{imp.numero_embarque}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getOrigenIcon(imp.origen)}
                              {imp.origen}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatFechaCorta(imp.fecha_llegada)}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{imp.total_items}</span> códigos
                          </TableCell>
                          <TableCell className="w-[150px]">
                            <div className="space-y-1">
                              <Progress value={pct} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {imp.items_recibidos || 0} / {imp.total_items}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getEstadoBadge(imp)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              onClick={() => navigate(`/bodega/recepcion/${imp.id}`)}
                              size="sm"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Recibir
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completadas">
          <Card>
            <CardHeader>
              <CardTitle>Importaciones Completadas</CardTitle>
              <CardDescription>
                Historial de importaciones recibidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completadas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay importaciones completadas aún</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contenedor</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Fecha Llegada</TableHead>
                      <TableHead>Códigos Recibidos</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completadas.map((imp) => (
                      <TableRow key={imp.id}>
                        <TableCell className="font-mono font-medium">{imp.numero_embarque}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getOrigenIcon(imp.origen)}
                            {imp.origen}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatFechaCorta(imp.fecha_llegada)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{imp.items_recibidos}</span> / {imp.total_items}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline"
                            onClick={() => navigate(`/bodega/recepcion/${imp.id}`)}
                            size="sm"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for new import */}
      <Dialog open={showNuevaDialog} onOpenChange={(open) => !creating && setShowNuevaDialog(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nueva Importación
            </DialogTitle>
            <DialogDescription>
              Registre un nuevo contenedor y cargue la lista de códigos esperados
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="numero_embarque">Número de Contenedor / Embarque</Label>
              <Input
                id="numero_embarque"
                placeholder="CONT-2024-001"
                value={formData.numero_embarque}
                onChange={(e) => setFormData({ ...formData, numero_embarque: e.target.value })}
                disabled={creating}
              />
            </div>

            <div className="space-y-2">
              <Label>Origen</Label>
              <RadioGroup
                value={formData.origen}
                onValueChange={(value: "china" | "mexico") => setFormData({ ...formData, origen: value })}
                className="flex gap-4"
                disabled={creating}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="china" id="china" />
                  <Label htmlFor="china" className="flex items-center gap-2 cursor-pointer">
                    <Ship className="h-4 w-4 text-blue-500" />
                    China
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mexico" id="mexico" />
                  <Label htmlFor="mexico" className="flex items-center gap-2 cursor-pointer">
                    <Truck className="h-4 w-4 text-orange-500" />
                    México
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_llegada">Fecha de Llegada</Label>
              <Input
                id="fecha_llegada"
                type="date"
                value={formData.fecha_llegada}
                onChange={(e) => setFormData({ ...formData, fecha_llegada: e.target.value })}
                disabled={creating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Archivo Excel con Códigos (Opcional)</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={creating}
              />
              <p className="text-xs text-muted-foreground">
                Opcional: Si tiene lista previa, cargue el Excel. Si no, puede agregar códigos durante la recepción.
              </p>
            </div>

            {file && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm">{file.name}</span>
              </div>
            )}

            {uploadProgress && (
              <div className="space-y-2">
                <Progress value={(uploadProgress.processed / uploadProgress.total) * 100} />
                <p className="text-sm text-muted-foreground text-center">
                  Procesando {uploadProgress.processed} de {uploadProgress.total} códigos...
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNuevaDialog(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreateImportacion} disabled={creating || !formData.numero_embarque}>
              {creating ? (
                <>
                  <Package className="h-4 w-4 mr-2 animate-pulse" />
                  Creando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Crear Importación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
