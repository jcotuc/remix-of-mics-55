import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { 
  Upload, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  AlertTriangle,
  Wrench,
  HelpCircle,
  FolderTree,
  Loader2
} from "lucide-react";
import * as XLSX from "xlsx";

interface Familia {
  id: number;
  Categoria: string | null;
  Padre: number | null;
}

interface Falla {
  id: number;
  nombre: string;
  familia_id: number | null;
  created_at: string;
}

interface Causa {
  id: number;
  nombre: string;
  familia_id: number | null;
  created_at: string;
}

interface ImportRow {
  nombre: string;
  familiaName: string;
  familiaId: number | null;
}

export default function FallasCausas() {
  const [fallas, setFallas] = useState<Falla[]>([]);
  const [causas, setCausas] = useState<Causa[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("fallas");
  
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form state
  const [newNombre, setNewNombre] = useState("");
  const [newFamiliaId, setNewFamiliaId] = useState<string>("");
  const [editingItem, setEditingItem] = useState<Falla | Causa | null>(null);
  const [deletingItem, setDeletingItem] = useState<Falla | Causa | null>(null);
  
  // Import state
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchFamilias(), fetchFallas(), fetchCausas()]);
    setLoading(false);
  };

  const fetchFamilias = async () => {
    const { data, error } = await supabase
      .from("CDS_Familias")
      .select("*")
      .order("Categoria");
    
    if (error) {
      console.error("Error fetching familias:", error);
      return;
    }
    setFamilias(data || []);
  };

  const fetchFallas = async () => {
    const { data, error } = await supabase
      .from("CDS_Fallas")
      .select("*")
      .order("nombre");
    
    if (error) {
      console.error("Error fetching fallas:", error);
      return;
    }
    setFallas(data || []);
  };

  const fetchCausas = async () => {
    const { data, error } = await supabase
      .from("CDS_Causas")
      .select("*")
      .order("nombre");
    
    if (error) {
      console.error("Error fetching causas:", error);
      return;
    }
    setCausas(data || []);
  };

  const getFamiliaName = (familiaId: number | null) => {
    if (!familiaId) return "Sin familia";
    const familia = familias.find(f => f.id === familiaId);
    return familia?.Categoria || "Desconocida";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

        // Detect columns based on active tab
        const isFallas = activeTab === "fallas";
        const parsed: ImportRow[] = [];

        jsonData.forEach((row) => {
          let nombre = "";
          let familiaName = "";

          if (isFallas) {
            // Fallas: PRODUCTO/FAMILIA, FALLA
            nombre = String(row["FALLA"] || row["falla"] || row["Falla"] || "").trim();
            familiaName = String(row["PRODUCTO/FAMILIA"] || row["PRODUCTO / FAMILIA"] || row["Producto/Familia"] || row["FAMILIA"] || row["familia"] || "").trim();
          } else {
            // Causas: FAMILIA, CASUA/CAUSA
            nombre = String(row["CASUA"] || row["CAUSA"] || row["causa"] || row["Causa"] || "").trim();
            familiaName = String(row["FAMILIA"] || row["familia"] || row["Familia"] || "").trim();
          }

          if (nombre) {
            // Find familia by name (case-insensitive)
            const familia = familias.find(
              f => f.Categoria?.toLowerCase() === familiaName.toLowerCase()
            );
            
            parsed.push({
              nombre,
              familiaName: familiaName || "Sin familia",
              familiaId: familia?.id || null
            });
          }
        });

        // Remove duplicates
        const unique = parsed.filter((item, index, self) =>
          index === self.findIndex(t => 
            t.nombre.toLowerCase() === item.nombre.toLowerCase() && 
            t.familiaId === item.familiaId
          )
        );

        setImportData(unique);
        setShowImportDialog(true);
        
        toast({
          title: "Archivo procesado",
          description: `Se encontraron ${unique.length} registros únicos para importar.`
        });
      } catch (error) {
        console.error("Error parsing file:", error);
        toast({
          title: "Error al procesar archivo",
          description: "El archivo no tiene el formato esperado.",
          variant: "destructive"
        });
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (importData.length === 0) return;
    
    setImporting(true);
    const tableName = activeTab === "fallas" ? "CDS_Fallas" : "CDS_Causas";
    
    try {
      const records = importData.map(item => ({
        nombre: item.nombre,
        familia_id: item.familiaId
      }));

      // Import in batches of 100
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase
          .from(tableName)
          .upsert(batch, { onConflict: "id" });
        
        if (error) throw error;
      }

      toast({
        title: "Importación exitosa",
        description: `Se importaron ${records.length} registros.`
      });

      setShowImportDialog(false);
      setImportData([]);
      fetchAll();
    } catch (error) {
      console.error("Error importing:", error);
      toast({
        title: "Error al importar",
        description: "Ocurrió un error durante la importación.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const handleAdd = async () => {
    if (!newNombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre es requerido.",
        variant: "destructive"
      });
      return;
    }

    const tableName = activeTab === "fallas" ? "CDS_Fallas" : "CDS_Causas";
    
    const { error } = await supabase
      .from(tableName)
      .insert({
        nombre: newNombre.trim(),
        familia_id: newFamiliaId ? parseInt(newFamiliaId) : null
      });

    if (error) {
      console.error("Error adding:", error);
      toast({
        title: "Error",
        description: "No se pudo agregar el registro.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Éxito",
      description: `${activeTab === "fallas" ? "Falla" : "Causa"} agregada correctamente.`
    });

    setShowAddDialog(false);
    setNewNombre("");
    setNewFamiliaId("");
    fetchAll();
  };

  const handleEdit = async () => {
    if (!editingItem || !newNombre.trim()) return;

    const tableName = activeTab === "fallas" ? "CDS_Fallas" : "CDS_Causas";
    
    const { error } = await supabase
      .from(tableName)
      .update({
        nombre: newNombre.trim(),
        familia_id: newFamiliaId ? parseInt(newFamiliaId) : null
      })
      .eq("id", editingItem.id);

    if (error) {
      console.error("Error updating:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el registro.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Éxito",
      description: "Registro actualizado correctamente."
    });

    setShowEditDialog(false);
    setEditingItem(null);
    setNewNombre("");
    setNewFamiliaId("");
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    const tableName = activeTab === "fallas" ? "CDS_Fallas" : "CDS_Causas";
    
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", deletingItem.id);

    if (error) {
      console.error("Error deleting:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Éxito",
      description: "Registro eliminado correctamente."
    });

    setShowDeleteDialog(false);
    setDeletingItem(null);
    fetchAll();
  };

  const openEditDialog = (item: Falla | Causa) => {
    setEditingItem(item);
    setNewNombre(item.nombre);
    setNewFamiliaId(item.familia_id?.toString() || "");
    setShowEditDialog(true);
  };

  const openDeleteDialog = (item: Falla | Causa) => {
    setDeletingItem(item);
    setShowDeleteDialog(true);
  };

  const openAddDialog = () => {
    setNewNombre("");
    setNewFamiliaId("");
    setShowAddDialog(true);
  };

  const currentData = activeTab === "fallas" ? fallas : causas;
  const filteredData = currentData.filter(item =>
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getFamiliaName(item.familia_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unmatchedImports = importData.filter(item => !item.familiaId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fallas y Causas</h1>
          <p className="text-muted-foreground">
            Gestión de opciones de diagnóstico por familia de producto
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="fallas" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Fallas ({fallas.length})
          </TabsTrigger>
          <TabsTrigger value="causas" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Causas ({causas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fallas" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
              <CardTitle className="text-lg">Lista de Fallas</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar falla o familia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Excel
                </Button>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={filteredData}
                getFamiliaName={getFamiliaName}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="causas" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
              <CardTitle className="text-lg">Lista de Causas</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar causa o familia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  id="causas-file-input"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("causas-file-input")?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Excel
                </Button>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={filteredData}
                getFamiliaName={getFamiliaName}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Agregar {activeTab === "fallas" ? "Falla" : "Causa"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                placeholder={`Nombre de la ${activeTab === "fallas" ? "falla" : "causa"}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Familia de Producto</Label>
              <Select value={newFamiliaId} onValueChange={setNewFamiliaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar familia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin familia</SelectItem>
                  {familias.map((familia) => (
                    <SelectItem key={familia.id} value={familia.id.toString()}>
                      {familia.Categoria}
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
            <Button onClick={handleAdd}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar {activeTab === "fallas" ? "Falla" : "Causa"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Familia de Producto</Label>
              <Select value={newFamiliaId} onValueChange={setNewFamiliaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar familia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin familia</SelectItem>
                  {familias.map((familia) => (
                    <SelectItem key={familia.id} value={familia.id.toString()}>
                      {familia.Categoria}
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
            <Button onClick={handleEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <p className="py-4">
            ¿Está seguro de eliminar "{deletingItem?.nombre}"? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Vista Previa de Importación - {activeTab === "fallas" ? "Fallas" : "Causas"}
            </DialogTitle>
          </DialogHeader>
          
          {unmatchedImports.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-600">
                  {unmatchedImports.length} registros sin familia coincidente
                </p>
                <p className="text-muted-foreground">
                  Estos registros se importarán sin familia asignada.
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Familia (Excel)</TableHead>
                  <TableHead>Familia (Sistema)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.slice(0, 100).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{item.familiaName}</TableCell>
                    <TableCell>
                      {item.familiaId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                          <FolderTree className="h-3 w-3" />
                          {getFamiliaName(item.familiaId)}
                        </span>
                      ) : (
                        <span className="text-yellow-600 text-sm">No encontrada</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {importData.length > 100 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Mostrando 100 de {importData.length} registros
              </p>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importar {importData.length} registros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Data Table Component
function DataTable({
  data,
  getFamiliaName,
  onEdit,
  onDelete
}: {
  data: (Falla | Causa)[];
  getFamiliaName: (id: number | null) => string;
  onEdit: (item: Falla | Causa) => void;
  onDelete: (item: Falla | Causa) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay registros para mostrar
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Familia</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-sm">{item.id}</TableCell>
              <TableCell className="font-medium">{item.nombre}</TableCell>
              <TableCell>
                {item.familia_id ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                    <FolderTree className="h-3 w-3" />
                    {getFamiliaName(item.familia_id)}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">Sin familia</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(item)}
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
  );
}
