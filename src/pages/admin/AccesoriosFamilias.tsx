import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Upload, Plus, Pencil, Trash2, Search, Package, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface Accesorio {
  id: number;
  nombre: string;
  familia_id: number | null;
  created_at: string;
}

interface Familia {
  id: number;
  Categoria: string | null;
  Padre: number | null;
}

interface ImportRow {
  accesorio: string;
  familiaId: number | null;
  familiaTexto: string;
  valid: boolean;
}

interface ImportResult {
  accesorio: string;
  categoria: string;
  subcategoria: string;
  status: "success" | "no_family" | "error";
  familiaId: number | null;
  error?: string;
}

export default function AccesoriosFamilias() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterVinculacion, setFilterVinculacion] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importResultsOpen, setImportResultsOpen] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [editingAccesorio, setEditingAccesorio] = useState<Accesorio | null>(null);
  const [formData, setFormData] = useState({ nombre: "", familia_id: "" });

  // Fetch accesorios
  const { data: accesorios = [], isLoading } = useQuery({
    queryKey: ["cds-accesorios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("CDS_Accesorios")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return data as Accesorio[];
    },
  });

  // Fetch familias para el select
  const { data: familias = [] } = useQuery({
    queryKey: ["cds-familias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("CDS_Familias")
        .select("*")
        .order("Categoria");
      if (error) throw error;
      return data as Familia[];
    },
  });

  // Crear mapa de familias para lookup rápido
  const familiasMap = useMemo(() => new Map(familias.map((f) => [f.id, f])), [familias]);

  const normalizeText = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  // Obtener categorías padre únicas (familias sin Padre)
  const categoriasPadre = useMemo(() => familias.filter((f) => f.Padre === null), [familias]);

  // Familias que son subcategorías (tienen Padre)
  const subcategorias = useMemo(() => familias.filter((f) => f.Padre !== null), [familias]);

  // Obtener categoría padre de una familia
  const getCategoriaPadre = (familiaId: number | null): string => {
    if (!familiaId) return "—";
    const familia = familiasMap.get(familiaId);
    if (!familia) return "—";
    if (familia.Padre) {
      const padre = familiasMap.get(familia.Padre);
      return padre?.Categoria || "—";
    }
    return "—";
  };

  // Obtener subcategoría
  const getSubcategoria = (familiaId: number | null): string => {
    if (!familiaId) return "—";
    const familia = familiasMap.get(familiaId);
    return familia?.Categoria || "—";
  };

  // Crear accesorio
  const createMutation = useMutation({
    mutationFn: async (data: { nombre: string; familia_id: number | null }) => {
      const { error } = await supabase.from("CDS_Accesorios").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cds-accesorios"] });
      toast.success("Accesorio creado exitosamente");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Error al crear accesorio: " + error.message);
    },
  });

  // Actualizar accesorio
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; nombre: string; familia_id: number | null }) => {
      const { error } = await supabase
        .from("CDS_Accesorios")
        .update({ nombre: data.nombre, familia_id: data.familia_id })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cds-accesorios"] });
      toast.success("Accesorio actualizado exitosamente");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Error al actualizar accesorio: " + error.message);
    },
  });

  // Eliminar accesorio
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("CDS_Accesorios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cds-accesorios"] });
      toast.success("Accesorio eliminado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar accesorio: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ nombre: "", familia_id: "" });
    setEditingAccesorio(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (accesorio: Accesorio) => {
    setEditingAccesorio(accesorio);
    setFormData({
      nombre: accesorio.nombre,
      familia_id: accesorio.familia_id?.toString() || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    const data = {
      nombre: formData.nombre.trim(),
      familia_id: formData.familia_id ? parseInt(formData.familia_id) : null,
    };

    if (editingAccesorio) {
      updateMutation.mutate({ id: editingAccesorio.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Importar Excel - Paso 1: Previsualizar
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      if (rows.length === 0) {
        toast.error("El archivo está vacío");
        return;
      }

      const firstRow = rows[0];
      const keys = Object.keys(firstRow);
      
      const findColumn = (variants: string[]) => 
        keys.find(k => variants.some(v => k.toLowerCase().replace(/[-_\s]/g, '') === v.toLowerCase().replace(/[-_\s]/g, '')));
      
      const colAccesorio = findColumn(["Accesorio", "Accesorios", "ACCESORIO", "Nombre", "nombre"]);
      const colCategoria = findColumn(["Categoría", "Categoria", "CATEGORIA", "ID", "id", "familia_id", "FamiliaId"]);

      if (!colAccesorio) {
        toast.error("El archivo debe tener columna: Accesorio o Nombre");
        return;
      }

      if (!colCategoria) {
        toast.error("El archivo debe tener columna: Categoría (con el ID de la familia)");
        return;
      }

      // Crear mapa de IDs existentes
      const familiaIdsSet = new Set(familias.map(f => f.id));

      const parsed: ImportRow[] = [];
      const seen = new Set<string>();

      for (const row of rows) {
        const accesorio = (row[colAccesorio] || "").toString().trim();
        const categoriaRaw = (row[colCategoria] || "").toString().trim();
        
        if (!accesorio) continue;
        
        // Evitar duplicados por nombre
        const key = accesorio.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        // Parsear el ID de la categoría
        const familiaId = categoriaRaw ? parseInt(categoriaRaw, 10) : null;
        const valid = familiaId !== null && !isNaN(familiaId) && familiaIdsSet.has(familiaId);
        const familia = familiaId && valid ? familiasMap.get(familiaId) : null;

        parsed.push({
          accesorio,
          familiaId: valid && familiaId ? familiaId : null,
          familiaTexto: familia ? `${familia.Categoria} (ID: ${familiaId})` : categoriaRaw || "Sin familia",
          valid: valid || !categoriaRaw,
        });
      }

      if (parsed.length === 0) {
        toast.error("No se encontraron accesorios válidos en el archivo");
        return;
      }

      setImportData(parsed);
      setImportPreviewOpen(true);
      
      const vinculados = parsed.filter(p => p.familiaId).length;
      const sinVincular = parsed.filter(p => !p.familiaId).length;
      toast.info(`${parsed.length} accesorios: ${vinculados} con familia, ${sinVincular} sin vincular`);
    } catch (error) {
      toast.error("Error al procesar el archivo");
    }

    e.target.value = "";
  };

  // Importar Excel - Paso 2: Confirmar e insertar
  const handleConfirmImport = async () => {
    if (importData.length === 0) return;

    setImporting(true);
    const results: ImportResult[] = [];

    try {
      // Preparar registros para insertar
      const records = importData.map(item => ({
        nombre: item.accesorio,
        familia_id: item.familiaId,
      }));

      // Insertar en batches de 100
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase.from("CDS_Accesorios").insert(batch);
        
        if (error) {
          // Si hay error, marcar todos del batch como error
          batch.forEach((rec, idx) => {
            results.push({
              accesorio: rec.nombre,
              categoria: importData[i + idx].familiaTexto,
              subcategoria: "",
              status: "error",
              familiaId: rec.familia_id,
              error: error.message,
            });
          });
        } else {
          // Éxito
          batch.forEach((rec, idx) => {
            results.push({
              accesorio: rec.nombre,
              categoria: importData[i + idx].familiaTexto,
              subcategoria: "",
              status: rec.familia_id ? "success" : "no_family",
              familiaId: rec.familia_id,
            });
          });
        }
      }

      setImportResults(results);
      setImportPreviewOpen(false);
      setImportResultsOpen(true);
      setImportData([]);
      queryClient.invalidateQueries({ queryKey: ["cds-accesorios"] });
      
      const successCount = results.filter(r => r.status === "success").length;
      toast.success(`Se importaron ${successCount} accesorios`);
    } catch (error) {
      toast.error("Error durante la importación");
    } finally {
      setImporting(false);
    }
  };

  // Filtrar accesorios
  const filtered = accesorios.filter((a) => {
    // Filtro de texto
    const matchesSearch = 
      a.nombre.toLowerCase().includes(search.toLowerCase()) ||
      getSubcategoria(a.familia_id).toLowerCase().includes(search.toLowerCase()) ||
      getCategoriaPadre(a.familia_id).toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    // Filtro de vinculación
    if (filterVinculacion === "vinculados" && !a.familia_id) return false;
    if (filterVinculacion === "sin_vincular" && a.familia_id) return false;

    // Filtro por categoría padre
    if (filterCategoria !== "all") {
      if (!a.familia_id) return false;
      const familia = familiasMap.get(a.familia_id);
      if (!familia?.Padre) return false;
      if (familia.Padre.toString() !== filterCategoria) return false;
    }

    return true;
  });

  // Contadores para estadísticas
  const totalVinculados = accesorios.filter(a => a.familia_id).length;
  const totalSinVincular = accesorios.filter(a => !a.familia_id).length;

  // Stats del import
  const importStats = {
    success: importResults.filter(r => r.status === "success").length,
    noFamily: importResults.filter(r => r.status === "no_family").length,
    error: importResults.filter(r => r.status === "error").length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Accesorios por Familia
          </CardTitle>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <Button variant="outline" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Excel
                </span>
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar accesorio o familia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2 items-center">
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categoriasPadre.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.Categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterVinculacion} onValueChange={setFilterVinculacion}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos ({accesorios.length})</SelectItem>
                  <SelectItem value="vinculados">
                    Vinculados ({totalVinculados})
                  </SelectItem>
                  <SelectItem value="sin_vincular">
                    Sin vincular ({totalSinVincular})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="flex gap-4 text-sm">
            <Badge variant="secondary">
              Total: {accesorios.length}
            </Badge>
            <Badge variant="default" className="bg-green-600">
              Vinculados: {totalVinculados}
            </Badge>
            {totalSinVincular > 0 && (
              <Badge variant="destructive">
                Sin vincular: {totalSinVincular}
              </Badge>
            )}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Accesorio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Subcategoría</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No se encontraron accesorios
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((accesorio) => (
                    <TableRow key={accesorio.id}>
                      <TableCell className="font-medium">{accesorio.nombre}</TableCell>
                      <TableCell>{getCategoriaPadre(accesorio.familia_id)}</TableCell>
                      <TableCell>{getSubcategoria(accesorio.familia_id)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(accesorio)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(accesorio.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccesorio ? "Editar Accesorio" : "Nuevo Accesorio"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre del Accesorio</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Mango lateral"
              />
            </div>
            <div className="space-y-2">
              <Label>Subcategoría (Familia)</Label>
              <Select
                value={formData.familia_id}
                onValueChange={(v) => setFormData({ ...formData, familia_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar subcategoría" />
                </SelectTrigger>
                <SelectContent>
                  {subcategorias.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {getCategoriaPadre(f.id)} → {f.Categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingAccesorio ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de previsualización de importación */}
      <Dialog open={importPreviewOpen} onOpenChange={setImportPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Previsualización de Importación</DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-4 py-2">
            <Badge variant="secondary">Total: {importData.length}</Badge>
            <Badge className="bg-success text-success-foreground">
              Con familia: {importData.filter(d => d.familiaId).length}
            </Badge>
            <Badge variant="destructive">
              Sin vincular: {importData.filter(d => !d.familiaId).length}
            </Badge>
          </div>

          <ScrollArea className="h-[350px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Estado</TableHead>
                  <TableHead>Accesorio</TableHead>
                  <TableHead>Familia (ID)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {item.familiaId ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.accesorio}</TableCell>
                    <TableCell>
                      {item.familiaId ? (
                        <Badge variant="secondary">{item.familiaTexto}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">{item.familiaTexto}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportPreviewOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={importing}>
              {importing ? "Importando..." : `Importar ${importData.length} accesorios`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de resultados de importación */}
      <Dialog open={importResultsOpen} onOpenChange={setImportResultsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Resultados de Importación</DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-4 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="font-medium">{importStats.success} exitosos</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="font-medium">{importStats.noFamily} sin familia</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="font-medium">{importStats.error} errores</span>
            </div>
          </div>

          <ScrollArea className="h-[400px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Estado</TableHead>
                  <TableHead>Accesorio</TableHead>
                  <TableHead>Familia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importResults.map((result, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {result.status === "success" && (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                      {result.status === "no_family" && (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                      {result.status === "error" && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{result.accesorio}</TableCell>
                    <TableCell>
                      {result.familiaId ? (
                        <Badge variant="secondary">
                          {familiasMap.get(result.familiaId)?.Categoria}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {result.status === "error" ? result.error : "Sin vincular"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter>
            <Button onClick={() => setImportResultsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
