import { useState } from "react";
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
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
  const familiasMap = new Map(familias.map((f) => [f.id, f]));

  // Obtener categorías padre únicas (familias sin Padre)
  const categoriasPadre = familias.filter((f) => f.Padre === null);

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

  // Familias que son subcategorías (tienen Padre)
  const subcategorias = familias.filter((f) => f.Padre !== null);

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

  // Importar Excel
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

      // Validar columnas (con variantes de nombres)
      const firstRow = rows[0];
      const keys = Object.keys(firstRow);
      
      const findColumn = (variants: string[]) => 
        keys.find(k => variants.some(v => k.toLowerCase().replace(/[-_\s]/g, '') === v.toLowerCase().replace(/[-_\s]/g, '')));
      
      const colAccesorio = findColumn(["Accesorio", "Accesorios", "ACCESORIO"]);
      const colSubCategoria = findColumn(["Sub-categoría", "Subcategoría", "Sub categoria", "Subcategoria"]);
      const colCategoria = findColumn(["Categoría", "Categoria", "CATEGORIA"]);

      if (!colAccesorio || !colSubCategoria || !colCategoria) {
        toast.error("El archivo debe tener columnas: Accesorio, Sub-categoría, Categoría");
        return;
      }

      // Función para normalizar texto para comparación
      const normalize = (str: string) => 
        str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      const results: ImportResult[] = [];

      for (const row of rows) {
        const accesorio = (row[colAccesorio] || "").toString().trim();
        const subCategoriaTexto = (row[colSubCategoria] || "").toString().trim();
        const categoriaTexto = (row[colCategoria] || "").toString().trim();

        if (!accesorio) continue;

        // Buscar la subcategoría que coincida con el nombre y cuyo padre tenga la categoría correcta
        let familiaId: number | null = null;
        let status: "success" | "no_family" | "error" = "success";
        let errorMsg: string | undefined;

        const subcategoriaEncontrada = familias.find((f) => {
          if (!f.Padre) return false;
          if (normalize(f.Categoria || "") !== normalize(subCategoriaTexto)) return false;
          const padre = familiasMap.get(f.Padre);
          return normalize(padre?.Categoria || "") === normalize(categoriaTexto);
        });

        if (subcategoriaEncontrada) {
          familiaId = subcategoriaEncontrada.id;
        } else {
          status = "no_family";
        }

        try {
          const { error } = await supabase.from("CDS_Accesorios").insert([
            { nombre: accesorio, familia_id: familiaId },
          ]);
          if (error) {
            status = "error";
            errorMsg = error.message;
          }
        } catch (err) {
          status = "error";
          errorMsg = "Error de inserción";
        }

        results.push({
          accesorio,
          categoria: categoriaTexto,
          subcategoria: subCategoriaTexto,
          status,
          familiaId,
          error: errorMsg,
        });
      }

      setImportResults(results);
      setImportDialogOpen(true);
      queryClient.invalidateQueries({ queryKey: ["cds-accesorios"] });
    } catch (error) {
      toast.error("Error al procesar el archivo");
    }

    e.target.value = "";
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

      {/* Dialog de resultados de importación */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Resultados de Importación</DialogTitle>
          </DialogHeader>
          
          {/* Stats */}
          <div className="flex gap-4 py-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium">{importStats.success} exitosos</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="font-medium">{importStats.noFamily} sin familia</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="font-medium">{importStats.error} errores</span>
            </div>
          </div>

          <ScrollArea className="h-[400px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Estado</TableHead>
                  <TableHead>Accesorio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Subcategoría</TableHead>
                  <TableHead>Familia Vinculada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importResults.map((result, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {result.status === "success" && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {result.status === "no_family" && (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      )}
                      {result.status === "error" && (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{result.accesorio}</TableCell>
                    <TableCell>{result.categoria}</TableCell>
                    <TableCell>{result.subcategoria}</TableCell>
                    <TableCell>
                      {result.familiaId ? (
                        <Badge variant="secondary">
                          {familiasMap.get(result.familiaId)?.Categoria}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {result.status === "error" ? result.error : "No encontrada"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter>
            <Button onClick={() => setImportDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
