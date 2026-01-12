import { useState, useEffect, useRef, useMemo } from "react";
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
import { Upload, Edit, Trash2, FolderTree, Search, Plus, Save, X, Link, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TablePagination } from "@/components/TablePagination";
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

interface RelacionRow {
  categoria: string;
  familia: string;
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
  const [editCategoria, setEditCategoria] = useState<string>("");
  const [newCategoria, setNewCategoria] = useState("");
  const [newPadre, setNewPadre] = useState<string>("");
  const [showRelacionesDialog, setShowRelacionesDialog] = useState(false);
  const [relacionesData, setRelacionesData] = useState<RelacionRow[]>([]);
  const [importingRelaciones, setImportingRelaciones] = useState(false);
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  
  // Filtros
  const [filterTipo, setFilterTipo] = useState<string>("all"); // all, raiz, subcategoria
  const [filterPadre, setFilterPadre] = useState<string>("all");
  const [filterConHijos, setFilterConHijos] = useState<string>("all"); // all, con_hijos, sin_hijos
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const relacionesInputRef = useRef<HTMLInputElement>(null);
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

    setShowFormatDialog(false);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        console.log("Excel raw data:", jsonData);
        console.log("Columnas encontradas:", jsonData.length > 0 ? Object.keys(jsonData[0]) : "ninguna");

        // Función para capitalizar (primera letra mayúscula, resto minúscula)
        const capitalize = (str: string) => {
          if (!str) return "";
          return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        };

        // Función para obtener valor de columna (flexible con nombres)
        const getColumnValue = (row: any, possibleNames: string[]) => {
          for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
              return row[name];
            }
          }
          return null;
        };

        // Get max existing ID for auto-generation
        const maxExistingId = familias.length > 0 ? Math.max(...familias.map(f => f.id)) : 0;
        let autoId = maxExistingId;

        // Map data to expected format with capitalization
        const mappedData: ImportRow[] = jsonData.map((row: any, index: number) => {
          // Try to get ID from various column names, or auto-generate
          let rowId = getColumnValue(row, ['id', 'ID', 'Id', 'iD', 'Numero', 'numero', 'No', 'no', '#']);
          if (!rowId) {
            autoId++;
            rowId = autoId;
          }

          // Try to get Categoria from various column names
          const categoria = getColumnValue(row, [
            'Categoria', 'categoria', 'CATEGORIA', 
            'Nombre', 'nombre', 'NOMBRE',
            'Descripcion', 'descripcion', 'DESCRIPCION',
            'Familia', 'familia', 'FAMILIA',
            'Category', 'category', 'CATEGORY',
            'Name', 'name', 'NAME'
          ]);

          // Try to get Padre from various column names
          const padre = getColumnValue(row, [
            'Padre', 'padre', 'PADRE',
            'Parent', 'parent', 'PARENT',
            'PadreId', 'padre_id', 'parent_id',
            'IdPadre', 'id_padre'
          ]);

          return {
            id: Number(rowId),
            Categoria: capitalize(String(categoria || "").trim()),
            Padre: padre ? Number(padre) : null,
          };
        });

        console.log("Mapped data:", mappedData);

        // Filter valid rows and remove duplicates by Categoria (case-insensitive)
        const seen = new Set<string>();
        const uniqueData = mappedData.filter(row => {
          if (!row.Categoria) return false; // Solo requerir Categoria, ID ya se auto-genera
          const key = row.Categoria.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        console.log("Unique data:", uniqueData);

        if (uniqueData.length === 0) {
          toast({
            title: "Sin datos válidos",
            description: "No se encontraron categorías válidas. Asegúrese de tener una columna llamada 'Categoria', 'Nombre' o 'Familia'.",
            variant: "destructive",
          });
          return;
        }

        setImportData(uniqueData);
        setShowImportDialog(true);
      } catch (error: any) {
        console.error("Error parsing Excel:", error);
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
    setEditCategoria(familia.Categoria || "");
    setEditPadre(familia.Padre?.toString() || "none");
    setShowEditDialog(true);
  };

  const handleUpdateFamilia = async () => {
    if (!selectedFamilia) return;

    if (!editCategoria.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoría es requerido",
        variant: "destructive",
      });
      return;
    }

    // Verificar duplicados (excluyendo la categoría actual)
    const exists = familias.some(f => 
      f.id !== selectedFamilia.id && 
      f.Categoria?.toLowerCase() === editCategoria.trim().toLowerCase()
    );
    if (exists) {
      toast({
        title: "Error",
        description: "Ya existe otra categoría con ese nombre",
        variant: "destructive",
      });
      return;
    }

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
        .update({ 
          Categoria: editCategoria.trim(),
          Padre: newPadreValue 
        })
        .eq("id", selectedFamilia.id);

      if (error) throw error;

      toast({
        title: "Actualizado",
        description: "Categoría actualizada correctamente",
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

    // Capitalizar: primera letra mayúscula, resto minúscula
    const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    const categoriaFormatted = capitalize(newCategoria.trim());

    // Verificar duplicados
    const exists = familias.some(f => f.Categoria?.toLowerCase() === categoriaFormatted.toLowerCase());
    if (exists) {
      toast({
        title: "Error",
        description: "Ya existe una categoría con ese nombre",
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
          Categoria: categoriaFormatted,
          Padre: newPadre === "none" ? null : Number(newPadre),
        });

      if (error) throw error;

      toast({
        title: "Categoría creada",
        description: `Se creó la categoría "${categoriaFormatted}"`,
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

  const handleRelacionesFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        console.log("Relaciones raw data:", jsonData);

        const capitalize = (str: string) => {
          if (!str) return "";
          return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        };

        const getColumnValue = (row: any, possibleNames: string[]) => {
          for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
              return String(row[name]).trim();
            }
          }
          return null;
        };

        const mappedData: RelacionRow[] = jsonData.map((row: any) => {
          const categoria = getColumnValue(row, ['Categoria', 'categoria', 'CATEGORIA', 'Subcategoria', 'subcategoria']);
          const familia = getColumnValue(row, ['Familia', 'familia', 'FAMILIA', 'Padre', 'padre']);
          
          return {
            categoria: capitalize(categoria || ""),
            familia: capitalize(familia || ""),
          };
        }).filter((row: RelacionRow) => row.categoria && row.familia);

        // Remove duplicates by categoria
        const seen = new Set<string>();
        const uniqueData = mappedData.filter(row => {
          const key = row.categoria.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        console.log("Relaciones mapped:", uniqueData);

        if (uniqueData.length === 0) {
          toast({
            title: "Sin datos válidos",
            description: "No se encontraron relaciones válidas. Asegúrese de tener columnas 'Categoria' y 'Familia'.",
            variant: "destructive",
          });
          return;
        }

        setRelacionesData(uniqueData);
        setShowRelacionesDialog(true);
      } catch (error: any) {
        console.error("Error parsing Excel:", error);
        toast({
          title: "Error al leer archivo",
          description: error.message,
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
    
    if (relacionesInputRef.current) {
      relacionesInputRef.current.value = "";
    }
  };

  const handleImportRelaciones = async () => {
    if (relacionesData.length === 0) return;

    try {
      setImportingRelaciones(true);
      
      // Get current max ID
      let maxId = familias.length > 0 ? Math.max(...familias.map(f => f.id)) : 0;
      
      // Create a map of existing categories (case-insensitive)
      const existingMap = new Map<string, Familia>();
      familias.forEach(f => {
        if (f.Categoria) {
          existingMap.set(f.Categoria.toLowerCase(), f);
        }
      });
      
      // First pass: collect all unique familias (parents) and categorias (children)
      const allFamilias = new Set<string>();
      const allCategorias = new Set<string>();
      
      relacionesData.forEach(row => {
        allFamilias.add(row.familia.toLowerCase());
        allCategorias.add(row.categoria.toLowerCase());
      });
      
      // Create families that don't exist (as root categories)
      const newFamilias: { id: number; Categoria: string; Padre: number | null }[] = [];
      
      for (const familiaLower of allFamilias) {
        if (!existingMap.has(familiaLower)) {
          maxId++;
          const familiaCapitalized = relacionesData.find(r => r.familia.toLowerCase() === familiaLower)?.familia || "";
          newFamilias.push({
            id: maxId,
            Categoria: familiaCapitalized,
            Padre: null
          });
          existingMap.set(familiaLower, { id: maxId, Categoria: familiaCapitalized, Padre: null });
        }
      }
      
      // Create categorias that don't exist
      const newCategorias: { id: number; Categoria: string; Padre: number | null }[] = [];
      
      for (const row of relacionesData) {
        const categoriaLower = row.categoria.toLowerCase();
        const familiaLower = row.familia.toLowerCase();
        const padreId = existingMap.get(familiaLower)?.id || null;
        
        if (!existingMap.has(categoriaLower)) {
          maxId++;
          newCategorias.push({
            id: maxId,
            Categoria: row.categoria,
            Padre: padreId
          });
          existingMap.set(categoriaLower, { id: maxId, Categoria: row.categoria, Padre: padreId });
        }
      }
      
      // Insert new families first
      if (newFamilias.length > 0) {
        const { error } = await supabase.from("CDS_Familias").insert(newFamilias);
        if (error) throw error;
      }
      
      // Insert new categorias
      if (newCategorias.length > 0) {
        const { error } = await supabase.from("CDS_Familias").insert(newCategorias);
        if (error) throw error;
      }
      
      // Update existing categorias with their parent relationships
      const updates: { id: number; Padre: number }[] = [];
      
      for (const row of relacionesData) {
        const categoriaLower = row.categoria.toLowerCase();
        const familiaLower = row.familia.toLowerCase();
        const categoria = existingMap.get(categoriaLower);
        const padre = existingMap.get(familiaLower);
        
        if (categoria && padre && !newCategorias.find(nc => nc.id === categoria.id)) {
          // This is an existing categoria that needs its parent updated
          if (categoria.Padre !== padre.id) {
            updates.push({ id: categoria.id, Padre: padre.id });
          }
        }
      }
      
      // Apply updates
      for (const update of updates) {
        await supabase
          .from("CDS_Familias")
          .update({ Padre: update.Padre })
          .eq("id", update.id);
      }

      toast({
        title: "Importación exitosa",
        description: `Se crearon ${newFamilias.length} familias, ${newCategorias.length} subcategorías y se actualizaron ${updates.length} relaciones`,
      });

      setShowRelacionesDialog(false);
      setRelacionesData([]);
      fetchFamilias();
    } catch (error: any) {
      toast({
        title: "Error al importar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImportingRelaciones(false);
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

  // Lista de categorías raíz para el filtro
  const categoriasRaiz = useMemo(() => 
    familias.filter(f => !f.Padre).sort((a, b) => (a.Categoria || "").localeCompare(b.Categoria || "")), 
    [familias]
  );

  // Filtrado
  const filteredFamilias = useMemo(() => {
    return familias.filter(f => {
      // Búsqueda por texto
      const matchesSearch = !searchTerm || 
        f.Categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.id.toString().includes(searchTerm);
      
      // Filtro por tipo
      const matchesTipo = filterTipo === "all" ||
        (filterTipo === "raiz" && !f.Padre) ||
        (filterTipo === "subcategoria" && f.Padre);
      
      // Filtro por padre
      const matchesPadre = filterPadre === "all" || f.Padre?.toString() === filterPadre;
      
      // Filtro por si tiene hijos
      const tieneHijos = familias.some(h => h.Padre === f.id);
      const matchesConHijos = filterConHijos === "all" ||
        (filterConHijos === "con_hijos" && tieneHijos) ||
        (filterConHijos === "sin_hijos" && !tieneHijos);
      
      return matchesSearch && matchesTipo && matchesPadre && matchesConHijos;
    });
  }, [familias, searchTerm, filterTipo, filterPadre, filterConHijos]);

  // Paginación
  const totalPages = Math.ceil(filteredFamilias.length / itemsPerPage);
  const paginatedFamilias = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFamilias.slice(start, start + itemsPerPage);
  }, [filteredFamilias, currentPage, itemsPerPage]);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTipo, filterPadre, filterConHijos]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterTipo("all");
    setFilterPadre("all");
    setFilterConHijos("all");
  };

  const hasActiveFilters = searchTerm || filterTipo !== "all" || filterPadre !== "all" || filterConHijos !== "all";

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
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={relacionesInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleRelacionesFileUpload}
            className="hidden"
          />
          <Button
            onClick={() => setShowFormatDialog(true)}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar Excel
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
          
          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="raiz">Solo raíz</SelectItem>
                <SelectItem value="subcategoria">Solo subcategorías</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterPadre} onValueChange={setFilterPadre}>
              <SelectTrigger>
                <SelectValue placeholder="Categoría padre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías padre</SelectItem>
                {categoriasRaiz.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.Categoria}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterConHijos} onValueChange={setFilterConHijos}>
              <SelectTrigger>
                <SelectValue placeholder="Subcategorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="con_hijos">Con subcategorías</SelectItem>
                <SelectItem value="sin_hijos">Sin subcategorías</SelectItem>
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Limpiar filtros
              </Button>
            )}
          </div>
          
          {hasActiveFilters && (
            <p className="text-sm text-muted-foreground mt-2">
              Mostrando {filteredFamilias.length} de {familias.length} categorías
            </p>
          )}
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
            <>
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
                    {paginatedFamilias.map((familia) => (
                      <TableRow key={familia.id}>
                        <TableCell className="font-mono text-sm">
                          {familia.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {familia.Categoria || "-"}
                        </TableCell>
                      <TableCell>
                        {familia.Padre ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
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
            
            {/* Paginación */}
            {filteredFamilias.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredFamilias.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(items) => {
                  setItemsPerPage(items);
                  setCurrentPage(1);
                }}
              />
            )}
          </>
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ID</Label>
              <Input value={selectedFamilia?.id?.toString() || ""} disabled />
            </div>
            <div>
              <Label>Nombre de Categoría *</Label>
              <Input 
                value={editCategoria} 
                onChange={(e) => setEditCategoria(e.target.value)}
                placeholder="Nombre de la categoría"
              />
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
            <Button onClick={handleUpdateFamilia}>
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

      {/* Import Relations Dialog */}
      <Dialog open={showRelacionesDialog} onOpenChange={setShowRelacionesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Relaciones Familia-Categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se encontraron <strong>{relacionesData.length}</strong> relaciones para importar.
              Se crearán las familias y subcategorías que no existan.
            </p>
            <div className="max-h-60 overflow-y-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subcategoría</TableHead>
                    <TableHead>Familia Padre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relacionesData.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.categoria}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                          <FolderTree className="h-3 w-3" />
                          {row.familia}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {relacionesData.length > 50 && (
              <p className="text-sm text-muted-foreground">
                ...y {relacionesData.length - 50} relaciones más
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRelacionesDialog(false)}
              disabled={importingRelaciones}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleImportRelaciones} disabled={importingRelaciones}>
              {importingRelaciones ? (
                "Importando..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Importar {relacionesData.length} relaciones
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Format Dialog */}
      <Dialog open={showFormatDialog} onOpenChange={setShowFormatDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Formato de archivo Excel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              El archivo Excel debe tener las siguientes columnas para importar correctamente las familias de productos:
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Columna</TableHead>
                    <TableHead>Alternativas aceptadas</TableHead>
                    <TableHead>Requerido</TableHead>
                    <TableHead>Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono font-medium">id</TableCell>
                    <TableCell className="text-sm text-muted-foreground">ID, Id, Numero, No, #</TableCell>
                    <TableCell><span className="text-amber-600">Opcional</span></TableCell>
                    <TableCell className="text-sm">Se auto-genera si no se proporciona</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-medium">Categoria</TableCell>
                    <TableCell className="text-sm text-muted-foreground">Nombre, Descripcion, Familia, Category, Name</TableCell>
                    <TableCell><span className="text-green-600 font-medium">Requerido</span></TableCell>
                    <TableCell className="text-sm">Nombre de la categoría (se capitaliza automáticamente)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-medium">Padre</TableCell>
                    <TableCell className="text-sm text-muted-foreground">Parent, PadreId, padre_id, IdPadre</TableCell>
                    <TableCell><span className="text-amber-600">Opcional</span></TableCell>
                    <TableCell className="text-sm">ID de la categoría padre (para subcategorías)</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Notas importantes:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Las categorías duplicadas se ignorarán automáticamente</li>
                <li>El nombre de la categoría se formateará con primera letra mayúscula</li>
                <li>Si no se proporciona ID, se asignará automáticamente el siguiente disponible</li>
                <li>El campo Padre debe ser un ID numérico válido de una categoría existente</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormatDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Seleccionar archivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
