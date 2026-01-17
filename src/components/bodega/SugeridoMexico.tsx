import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Download, FileSpreadsheet, Check, X, AlertCircle, Search, Loader2, CheckCircle2, ShoppingCart, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";


interface SugeridoMexico {
  id: string;
  nombre_archivo: string;
  estado: string;
  fecha_importacion: string;
  total_items: number;
  valor_total_sugerido: number;
  valor_total_aprobado: number;
  notas: string | null;
}

interface SugeridoItem {
  id: string;
  sugerido_id: string;
  codigo_repuesto: string;
  descripcion: string | null;
  cantidad_sugerida: number;
  precio_unitario: number;
  stock_actual_zona5: number;
  clasificacion_abc: string | null;
  clasificacion_xyz: string | null;
  dias_inventario: number;
  decision: string;
  cantidad_aprobada: number;
  notas: string | null;
}

const ITEMS_PER_PAGE = 20;

const SugeridoMexico = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [sugeridos, setSugeridos] = useState<SugeridoMexico[]>([]);
  const [selectedSugerido, setSelectedSugerido] = useState<SugeridoMexico | null>(null);
  const [items, setItems] = useState<SugeridoItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDecision, setFilterDecision] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    fetchSugeridos();
  }, []);

  useEffect(() => {
    if (selectedSugerido) {
      fetchItems(selectedSugerido.id);
    }
  }, [selectedSugerido]);

  const fetchSugeridos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sugeridos_mexico")
        .select("*")
        .order("fecha_importacion", { ascending: false });
      
      if (error) throw error;
      setSugeridos(data || []);
      
      // Seleccionar el más reciente si existe
      if (data && data.length > 0) {
        setSelectedSugerido(data[0]);
      }
    } catch (error) {
      console.error("Error fetching sugeridos:", error);
      toast.error("Error al cargar los sugeridos");
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (sugeridoId: string) => {
    try {
      const { data, error } = await supabase
        .from("sugeridos_mexico_items")
        .select("*")
        .eq("sugerido_id", sugeridoId)
        .order("created_at");
      
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Mapear datos del Excel
      const mappedData = jsonData.slice(0, 100).map((row: any) => ({
        codigo: row["Codigo"] || row["codigo"] || row["SKU"] || row["sku"] || Object.values(row)[0],
        descripcion: row["Descripcion"] || row["descripcion"] || row["Description"] || "",
        cantidad: Number(row["Cantidad"] || row["cantidad"] || row["Qty"] || 0),
        precio: Number(row["Precio"] || row["precio"] || row["Price"] || row["Precio Unitario"] || 0),
      })).filter((row: any) => row.codigo);
      
      setPreviewData(mappedData);
      setImportDialogOpen(true);
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Error al leer el archivo Excel");
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImportConfirm = async () => {
    if (previewData.length === 0) return;
    
    setImporting(true);
    try {
      // Obtener stock de Zona 5 y análisis ABC-XYZ
      const { data: zona5Data } = await supabase
        .from("centros_servicio")
        .select("id")
        .or("es_central.eq.true,nombre.ilike.%zona 5%")
        .single();

      let stockMap = new Map();
      let analisisMap = new Map();

      if (zona5Data) {
        const { data: inventario } = await supabase
          .from("inventario")
          .select("codigo_repuesto, cantidad")
          .eq("centro_servicio_id", zona5Data.id);
        
        stockMap = new Map((inventario || []).map(i => [i.codigo_repuesto, i.cantidad]));

        const { data: analisis } = await supabase
          .from("analisis_inventario")
          .select("codigo_repuesto, clasificacion_abc, clasificacion_xyz, dias_sin_movimiento")
          .eq("centro_servicio_id", zona5Data.id);
        
        analisisMap = new Map((analisis || []).map(a => [a.codigo_repuesto, a]));
      }

      // Calcular totales
      const valorTotalSugerido = previewData.reduce((acc, row) => acc + (row.cantidad * row.precio), 0);

      // Crear el sugerido
      const { data: nuevoSugerido, error: insertError } = await supabase
        .from("sugeridos_mexico")
        .insert({
          nombre_archivo: fileName,
          importado_por: user?.id,
          estado: "borrador",
          total_items: previewData.length,
          valor_total_sugerido: valorTotalSugerido,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Insertar items con recomendación automática
      const itemsToInsert = previewData.map(row => {
        const stockActual = stockMap.get(row.codigo) || 0;
        const analisis = analisisMap.get(row.codigo);
        const abc = analisis?.clasificacion_abc || null;
        const xyz = analisis?.clasificacion_xyz || null;
        const diasInv = analisis?.dias_sin_movimiento || 0;

        // Determinar decisión automática
        let decision = "revisar";
        if (abc === "A" || xyz === "X") {
          if (stockActual < row.cantidad) {
            decision = "comprar";
          }
        } else if (abc === "C" && xyz === "Z" && stockActual > 0) {
          decision = "no_comprar";
        }

        return {
          sugerido_id: nuevoSugerido.id,
          codigo_repuesto: row.codigo,
          descripcion: row.descripcion,
          cantidad_sugerida: row.cantidad,
          precio_unitario: row.precio,
          stock_actual_zona5: stockActual,
          clasificacion_abc: abc,
          clasificacion_xyz: xyz,
          dias_inventario: diasInv,
          decision,
          cantidad_aprobada: decision === "comprar" ? row.cantidad : 0,
        };
      });

      await supabase.from("sugeridos_mexico_items").insert(itemsToInsert);

      toast.success(`Importados ${previewData.length} códigos correctamente`);
      setImportDialogOpen(false);
      setPreviewData([]);
      setFileName("");
      
      // Refrescar y seleccionar el nuevo
      await fetchSugeridos();
      setSelectedSugerido(nuevoSugerido);
    } catch (error) {
      console.error("Error importing:", error);
      toast.error("Error al importar el archivo");
    } finally {
      setImporting(false);
    }
  };

  const handleUpdateDecision = async (itemId: string, decision: string, cantidadAprobada?: number) => {
    try {
      const updateData: any = { decision };
      
      if (decision === "comprar") {
        const item = items.find(i => i.id === itemId);
        updateData.cantidad_aprobada = cantidadAprobada ?? item?.cantidad_sugerida ?? 0;
      } else if (decision === "no_comprar") {
        updateData.cantidad_aprobada = 0;
      } else if (decision === "parcial" && cantidadAprobada !== undefined) {
        updateData.cantidad_aprobada = cantidadAprobada;
      }

      const { error } = await supabase
        .from("sugeridos_mexico_items")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;

      // Actualizar localmente
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updateData } : item
      ));

      // Recalcular total aprobado
      await recalcularTotales();
    } catch (error) {
      console.error("Error updating decision:", error);
      toast.error("Error al actualizar la decisión");
    }
  };

  const recalcularTotales = async () => {
    if (!selectedSugerido) return;

    const totalAprobado = items.reduce((acc, item) => {
      if (item.decision === "comprar" || item.decision === "parcial") {
        return acc + (item.cantidad_aprobada * Number(item.precio_unitario));
      }
      return acc;
    }, 0);

    await supabase
      .from("sugeridos_mexico")
      .update({ valor_total_aprobado: totalAprobado })
      .eq("id", selectedSugerido.id);

    setSelectedSugerido(prev => prev ? { ...prev, valor_total_aprobado: totalAprobado } : null);
  };

  const handleExportDecision = () => {
    const dataToExport = items.map(item => ({
      "Código": item.codigo_repuesto,
      "Descripción": item.descripcion || "",
      "Cantidad Sugerida": item.cantidad_sugerida,
      "Precio Unitario": item.precio_unitario,
      "Stock Zona 5": item.stock_actual_zona5,
      "ABC": item.clasificacion_abc || "-",
      "XYZ": item.clasificacion_xyz || "-",
      "Días Inv.": item.dias_inventario,
      "Decisión": item.decision,
      "Cantidad Aprobada": item.cantidad_aprobada,
      "Notas": item.notas || "",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Decision");
    XLSX.writeFile(wb, `decision-mexico-${new Date().toISOString().split("T")[0]}.xlsx`);
    
    toast.success("Exportación completada");
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.codigo_repuesto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDecision = filterDecision === "all" || item.decision === filterDecision;
    return matchesSearch && matchesDecision;
  });

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const stats = {
    comprar: items.filter(i => i.decision === "comprar").length,
    parcial: items.filter(i => i.decision === "parcial").length,
    no_comprar: items.filter(i => i.decision === "no_comprar").length,
    revisar: items.filter(i => i.decision === "revisar").length,
  };

  const getDecisionBadge = (decision: string) => {
    const badges: Record<string, { className: string; icon: any; label: string }> = {
      comprar: { className: "bg-green-500/20 text-green-700", icon: Check, label: "Comprar" },
      parcial: { className: "bg-yellow-500/20 text-yellow-700", icon: ShoppingCart, label: "Parcial" },
      no_comprar: { className: "bg-red-500/20 text-red-700", icon: X, label: "No Comprar" },
      revisar: { className: "bg-blue-500/20 text-blue-700", icon: Eye, label: "Revisar" },
    };
    const config = badges[decision] || badges.revisar;
    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Select 
            value={selectedSugerido?.id || ""} 
            onValueChange={(v) => setSelectedSugerido(sugeridos.find(s => s.id === v) || null)}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Seleccionar sugerido..." />
            </SelectTrigger>
            <SelectContent>
              {sugeridos.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre_archivo} - {new Date(s.fecha_importacion).toLocaleDateString("es-GT")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Excel
          </Button>
          {selectedSugerido && items.length > 0 && (
            <Button variant="outline" onClick={handleExportDecision}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Decisión
            </Button>
          )}
        </div>
      </div>

      {/* Resumen si hay sugerido seleccionado */}
      {selectedSugerido && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-xl font-bold">{selectedSugerido.total_items}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Valor Sugerido</p>
                <p className="text-xl font-bold text-blue-600">
                  Q{Number(selectedSugerido.valor_total_sugerido).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Valor Aprobado</p>
                <p className="text-xl font-bold text-green-600">
                  Q{Number(selectedSugerido.valor_total_aprobado).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-4">
                <p className="text-xs text-green-700">Comprar</p>
                <p className="text-xl font-bold text-green-700">{stats.comprar}</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="pt-4">
                <p className="text-xs text-yellow-700">Parcial</p>
                <p className="text-xl font-bold text-yellow-700">{stats.parcial}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-950/20">
              <CardContent className="pt-4">
                <p className="text-xs text-red-700">No Comprar</p>
                <p className="text-xl font-bold text-red-700">{stats.no_comprar}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar código..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-9"
                  />
                </div>
                <Select value={filterDecision} onValueChange={(v) => { setFilterDecision(v); setCurrentPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar decisión" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las decisiones</SelectItem>
                    <SelectItem value="comprar">Comprar</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="no_comprar">No Comprar</SelectItem>
                    <SelectItem value="revisar">Por Revisar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de items */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead className="hidden lg:table-cell">Descripción</TableHead>
                      <TableHead className="text-right">Sugerido</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Stock Z5</TableHead>
                      <TableHead className="text-center">ABC/XYZ</TableHead>
                      <TableHead className="text-center">Decisión</TableHead>
                      <TableHead className="text-right">Aprobado</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No hay items que mostrar
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.codigo_repuesto}</TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                            {item.descripcion || "-"}
                          </TableCell>
                          <TableCell className="text-right">{item.cantidad_sugerida}</TableCell>
                          <TableCell className="text-right">
                            Q{Number(item.precio_unitario).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">{item.stock_actual_zona5}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs">
                              {item.clasificacion_abc || "-"}/{item.clasificacion_xyz || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {getDecisionBadge(item.decision)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              max={item.cantidad_sugerida}
                              value={item.cantidad_aprobada}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                handleUpdateDecision(item.id, val === item.cantidad_sugerida ? "comprar" : val > 0 ? "parcial" : "no_comprar", val);
                              }}
                              className="w-16 text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleUpdateDecision(item.id, "comprar")}
                                title="Comprar todo"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleUpdateDecision(item.id, "no_comprar")}
                                title="No comprar"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {totalPages > 1 && (
                <div className="border-t p-4 flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                  <span className="text-sm py-2">Página {currentPage} de {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedSugerido && sugeridos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">No hay sugeridos importados</h3>
            <p className="text-muted-foreground mb-4">
              Importa un archivo Excel de México para comenzar el análisis.
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Importar Excel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de preview de importación */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Previsualización de Importación</DialogTitle>
            <DialogDescription>
              Se importarán {previewData.length} códigos del archivo "{fileName}"
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 20).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{row.codigo}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{row.descripcion}</TableCell>
                    <TableCell className="text-right">{row.cantidad}</TableCell>
                    <TableCell className="text-right">Q{row.precio.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {previewData.length > 20 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      ... y {previewData.length - 20} códigos más
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importing}>
              Cancelar
            </Button>
            <Button onClick={handleImportConfirm} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirmar Importación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SugeridoMexico;
