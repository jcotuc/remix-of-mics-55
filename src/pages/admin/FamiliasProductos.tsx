import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Upload, Edit, Trash2, FolderTree, Search, Plus, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface Familia {
  id: number;
  Categoria: string | null;
  Padre: number | null;
}

interface ImportRow {
  id: number;
  Categoria: string;
  Padre?: number | null;
}

export default function FamiliasProductos() {
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [selectedFamilia, setSelectedFamilia] = useState<Familia | null>(null);
  const [editPadre, setEditPadre] = useState<string>("");
  const [newCategoria, setNewCategoria] = useState("");
  const [newPadre, setNewPadre] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFamilias();
  }, []);

  const fetchFamilias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("CDS_Familias")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;
      setFamilias(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        // Map data to expected format
        const mappedData: ImportRow[] = jsonData.map((row: any) => ({
          id: Number(row.id || row.ID || row.Id),
          Categoria: String(row.Categoria || row.categoria || row.CATEGORIA || ""),
          Padre: row.Padre || row.padre || row.PADRE ? Number(row.Padre || row.padre || row.PADRE) : null,
        }));

        setImportData(mappedData.filter(row => row.id && row.Categoria));
        setShowImportDialog(true);
      } catch (error: any) {
        toast({
          title: "Error al leer archivo",
          description: error.message,
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (importData.length === 0) return;

    try {
      setImporting(true);

      // Insert in batches of 500
      const batchSize = 500;
      for (let i = 0; i < importData.length; i += batchSize) {
        const batch = importData.slice(i, i + batchSize);
        const { error } = await supabase
          .from("CDS_Familias")
          .upsert(batch, { onConflict: "id" });

        if (error) throw error;
      }

      toast({
        title: "Importación exitosa",
        description: `Se importaron ${importData.length} categorías`,
      });

      setShowImportDialog(false);
      setImportData([]);
      fetchFamilias();
    } catch (error: any) {
      toast({
        title: "Error al importar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleEditClick = (familia: Familia) => {
    setSelectedFamilia(familia);
    setEditPadre(familia.Padre?.toString() || "none");
    setShowEditDialog(true);
  };

  const handleUpdatePadre = async () => {
    if (!selectedFamilia) return;

    try {
      const newPadreValue = editPadre === "none" ? null : Number(editPadre);
      
      // Prevent circular reference
      if (newPadreValue === selectedFamilia.id) {
        toast({
          title: "Error",
          description: "Una categoría no puede ser su propio padre",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("CDS_Familias")
        .update({ Padre: newPadreValue })
        .eq("id", selectedFamilia.id);

      if (error) throw error;

      toast({
        title: "Actualizado",
        description: "Relación padre actualizada correctamente",
      });

      setShowEditDialog(false);
      fetchFamilias();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddCategoria = async () => {
    if (!newCategoria.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoría es requerido",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get max ID
      const maxId = familias.length > 0 ? Math.max(...familias.map(f => f.id)) : 0;
      
      const { error } = await supabase
        .from("CDS_Familias")
        .insert({
          id: maxId + 1,
          Categoria: newCategoria.trim(),
          Padre: newPadre === "none" ? null : Number(newPadre),
        });

      if (error) throw error;

      toast({
        title: "Categoría creada",
        description: `Se creó la categoría "${newCategoria}"`,
      });

      setShowAddDialog(false);
      setNewCategoria("");
      setNewPadre("");
      fetchFamilias();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (familia: Familia) => {
    // Check if this familia has children
    const hasChildren = familias.some(f => f.Padre === familia.id);
    if (hasChildren) {
      toast({
        title: "No se puede eliminar",
        description: "Esta categoría tiene subcategorías. Elimine primero las subcategorías.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`¿Está seguro de eliminar la categoría "${familia.Categoria}"?`)) return;

    try {
      const { error } = await supabase
        .from("CDS_Familias")
        .delete()
        .eq("id", familia.id);

      if (error) throw error;

      toast({
        title: "Eliminado",
        description: "Categoría eliminada correctamente",
      });

      fetchFamilias();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPadreNombre = (padreId: number | null) => {
    if (!padreId) return "-";
    const padre = familias.find(f => f.id === padreId);
    return padre?.Categoria || `ID: ${padreId}`;
  };

  const getHijosCount = (familiaId: number) => {
    return familias.filter(f => f.Padre === familiaId).length;
  };

  const filteredFamilias = familias.filter(f =>
    f.Categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.id.toString().includes(searchTerm)
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <FolderTree className="h-7 w-7 text-primary" />
            Familias de Productos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de categorías y jerarquía de productos
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{familias.length}</div>
            <div className="text-sm text-muted-foreground">Total Categorías</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-chart-2">
              {familias.filter(f => !f.Padre).length}
            </div>
            <div className="text-sm text-muted-foreground">Categorías Raíz</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-chart-3">
              {familias.filter(f => f.Padre).length}
            </div>
            <div className="text-sm text-muted-foreground">Subcategorías</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-chart-4">
              {new Set(familias.filter(f => f.Padre).map(f => f.Padre)).size}
            </div>
            <div className="text-sm text-muted-foreground">Con Hijos</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Categorías</CardTitle>
          <CardDescription>
            Lista de todas las familias de productos y sus relaciones jerárquicas
          </CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando categorías...
            </div>
          ) : filteredFamilias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {familias.length === 0 
                ? "No hay categorías. Importe un archivo para comenzar."
                : "No se encontraron categorías con ese criterio."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Padre</TableHead>
                    <TableHead className="text-center">Subcategorías</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFamilias.map((familia) => (
                    <TableRow key={familia.id}>
                      <TableCell className="font-mono text-sm">
                        {familia.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {familia.Categoria || "-"}
                      </TableCell>
                      <TableCell>
                        {familia.Padre ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded text-sm">
                            <FolderTree className="h-3 w-3" />
                            {getPadreNombre(familia.Padre)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Raíz</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getHijosCount(familia.id) > 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-primary/10 text-primary rounded-full text-sm font-medium">
                            {getHijosCount(familia.id)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(familia)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(familia)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa de importación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se encontraron <strong>{importData.length}</strong> categorías para importar.
            </p>
            <div className="max-h-60 overflow-y-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Padre ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{row.id}</TableCell>
                      <TableCell>{row.Categoria}</TableCell>
                      <TableCell>{row.Padre || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {importData.length > 50 && (
              <p className="text-sm text-muted-foreground">
                ...y {importData.length - 50} registros más
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
              disabled={importing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                "Importando..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Importar {importData.length} registros
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Parent Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Relación Padre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Categoría</Label>
              <Input value={selectedFamilia?.Categoria || ""} disabled />
            </div>
            <div>
              <Label>Categoría Padre</Label>
              <Select value={editPadre} onValueChange={setEditPadre}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar padre" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">Sin padre (Raíz)</SelectItem>
                  {familias
                    .filter(f => f.id !== selectedFamilia?.id)
                    .map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.id} - {f.Categoria}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePadre}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre de Categoría *</Label>
              <Input
                value={newCategoria}
                onChange={(e) => setNewCategoria(e.target.value)}
                placeholder="Ej: Herramientas Eléctricas"
              />
            </div>
            <div>
              <Label>Categoría Padre</Label>
              <Select value={newPadre} onValueChange={setNewPadre}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar padre (opcional)" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">Sin padre (Raíz)</SelectItem>
                  {familias.map(f => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.id} - {f.Categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCategoria}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
