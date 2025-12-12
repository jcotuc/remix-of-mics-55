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
import { Upload, Edit, Trash2, Search, Plus, Link, GitBranch, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface Relacion {
  id: number;
  Código: string | null;
  Descripción: string | null;
  Padre: number | null;
}

interface ImportRow {
  id: number;
  Código: string;
  Descripción: string;
  Padre?: number | null;
}

interface RelacionRow {
  codigo: string;
  descripcion: string;
  padre: string;
}

export default function SustitutosRepuestos() {
  const [relaciones, setRelaciones] = useState<Relacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [selectedRelacion, setSelectedRelacion] = useState<Relacion | null>(null);
  const [editPadre, setEditPadre] = useState<string>("");
  const [newCodigo, setNewCodigo] = useState("");
  const [newDescripcion, setNewDescripcion] = useState("");
  const [newPadre, setNewPadre] = useState<string>("");
  const [showRelacionesDialog, setShowRelacionesDialog] = useState(false);
  const [relacionesData, setRelacionesData] = useState<RelacionRow[]>([]);
  const [importingRelaciones, setImportingRelaciones] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const relacionesInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    fetchRelaciones();
  }, []);

  const fetchRelaciones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("repuestos_relaciones")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;
      setRelaciones(data || []);
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

  // ========== IMPORTAR PADRES (códigos principales) ==========
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

        console.log("Excel raw data:", jsonData);
        console.log("Columnas encontradas:", jsonData.length > 0 ? Object.keys(jsonData[0]) : "ninguna");

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
        const maxExistingId = relaciones.length > 0 ? Math.max(...relaciones.map(r => r.id)) : 0;
        let autoId = maxExistingId;

        // Map data to expected format
        const mappedData: ImportRow[] = jsonData.map((row: any) => {
          // Try to get ID from various column names, or auto-generate
          let rowId = getColumnValue(row, ['id', 'ID', 'Id', 'Numero', 'numero', 'No', '#']);
          if (!rowId) {
            autoId++;
            rowId = autoId;
          }

          // Try to get Código from various column names
          const codigo = getColumnValue(row, [
            'Código', 'codigo', 'CODIGO', 'Codigo',
            'Code', 'code', 'CODE',
            'SKU', 'sku', 'Sku'
          ]);

          // Try to get Descripción from various column names
          const descripcion = getColumnValue(row, [
            'Descripción', 'descripcion', 'DESCRIPCION', 'Descripcion',
            'Description', 'description', 'DESCRIPTION',
            'Nombre', 'nombre', 'NOMBRE'
          ]);

          return {
            id: Number(rowId),
            Código: String(codigo || "").trim(),
            Descripción: String(descripcion || "").trim(),
            Padre: null, // Padres no tienen padre
          };
        });

        console.log("Mapped data:", mappedData);

        // Filter valid rows and remove duplicates by Código (case-insensitive)
        const seen = new Set<string>();
        const uniqueData = mappedData.filter(row => {
          if (!row.Código) return false;
          const key = row.Código.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        console.log("Unique data:", uniqueData);

        if (uniqueData.length === 0) {
          toast({
            title: "Sin datos válidos",
            description: "No se encontraron códigos válidos. Asegúrese de tener una columna llamada 'Código' o 'codigo'.",
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
          .from("repuestos_relaciones")
          .upsert(batch, { onConflict: "id" });

        if (error) throw error;
      }

      toast({
        title: "Importación exitosa",
        description: `Se importaron ${importData.length} códigos padre`,
      });

      setShowImportDialog(false);
      setImportData([]);
      fetchRelaciones();
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

  // ========== IMPORTAR RELACIONES (hijos con padres) ==========
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

        const getColumnValue = (row: any, possibleNames: string[]) => {
          for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
              return String(row[name]).trim();
            }
          }
          return null;
        };

        const mappedData: RelacionRow[] = jsonData.map((row: any) => {
          const codigo = getColumnValue(row, [
            'Código', 'codigo', 'CODIGO', 'Codigo',
            'Hijo', 'hijo', 'HIJO',
            'Code', 'code', 'CODE',
            'Sustituto', 'sustituto', 'SUSTITUTO'
          ]);
          const descripcion = getColumnValue(row, [
            'Descripción', 'descripcion', 'DESCRIPCION', 'Descripcion',
            'Description', 'description',
            'Nombre', 'nombre'
          ]);
          const padre = getColumnValue(row, [
            'Padre', 'padre', 'PADRE',
            'Parent', 'parent',
            'Código Padre', 'codigo_padre',
            'Principal', 'principal'
          ]);
          
          return {
            codigo: codigo || "",
            descripcion: descripcion || "",
            padre: padre || "",
          };
        }).filter((row: RelacionRow) => row.codigo && row.padre);

        // Remove duplicates by codigo
        const seen = new Set<string>();
        const uniqueData = mappedData.filter(row => {
          const key = row.codigo.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        console.log("Relaciones mapped:", uniqueData);

        if (uniqueData.length === 0) {
          toast({
            title: "Sin datos válidos",
            description: "No se encontraron relaciones válidas. Asegúrese de tener columnas 'Código' (o 'Hijo') y 'Padre'.",
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
      
      // Siempre leer el estado real de la BD para evitar colisiones de IDs
      const { data: existingRows, error: existingError } = await supabase
        .from("repuestos_relaciones")
        .select("*");

      if (existingError) throw existingError;

      const existing = existingRows || [];

      // Obtener el ID máximo actual directamente de la BD
      const maxId = existing.length > 0 ? Math.max(...existing.map((r: any) => r.id as number)) : 0;
      let nextId = maxId;
      
      // Crear mapa de códigos existentes (case-insensitive)
      const existingMap = new Map<string, Relacion>();
      existing.forEach((r: any) => {
        if (r["Código"]) {
          existingMap.set(String(r["Código"]).toLowerCase(), {
            id: r.id,
            Código: r["Código"],
            Descripción: r["Descripción"],
            Padre: r.Padre,
          });
        }
      });
      
      // Recolectar todos los padres y códigos hijos
      const allPadres = new Set<string>();
      const allCodigos = new Set<string>();
      
      relacionesData.forEach((row) => {
        allPadres.add(row.padre.toLowerCase());
        allCodigos.add(row.codigo.toLowerCase());
      });
      
      // Crear padres que no existan (como códigos raíz Padre = null)
      const newPadres: { id: number; Código: string; Descripción: string; Padre: number | null }[] = [];
      
      for (const padreLower of allPadres) {
        if (!existingMap.has(padreLower)) {
          nextId++;
          const padreOriginal =
            relacionesData.find((r) => r.padre.toLowerCase() === padreLower)?.padre || "";
          newPadres.push({
            id: nextId,
            Código: padreOriginal,
            Descripción: `Padre: ${padreOriginal}`,
            Padre: null,
          });
          existingMap.set(padreLower, {
            id: nextId,
            Código: padreOriginal,
            Descripción: `Padre: ${padreOriginal}`,
            Padre: null,
          });
        }
      }
      
      // Crear códigos (hijos) que no existan
      const newCodigos: { id: number; Código: string; Descripción: string; Padre: number | null }[] = [];
      
      for (const row of relacionesData) {
        const codigoLower = row.codigo.toLowerCase();
        const padreLower = row.padre.toLowerCase();
        const padre = existingMap.get(padreLower);
        const padreId = padre?.id || null;
        
        if (!existingMap.has(codigoLower)) {
          nextId++;
          newCodigos.push({
            id: nextId,
            Código: row.codigo,
            Descripción: row.descripcion,
            Padre: padreId,
          });
          existingMap.set(codigoLower, {
            id: nextId,
            Código: row.codigo,
            Descripción: row.descripcion,
            Padre: padreId,
          });
        }
      }
      
      // Insertar nuevos padres primero
      if (newPadres.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < newPadres.length; i += batchSize) {
          const batch = newPadres.slice(i, i + batchSize);
          const { error } = await supabase.from("repuestos_relaciones").insert(batch);
          if (error) throw error;
        }
      }
      
      // Insertar nuevos códigos (hijos)
      if (newCodigos.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < newCodigos.length; i += batchSize) {
          const batch = newCodigos.slice(i, i + batchSize);
          const { error } = await supabase.from("repuestos_relaciones").insert(batch);
          if (error) throw error;
        }
      }
      
      // Actualizar códigos existentes con su relación Padre correcta
      const updates: { id: number; Padre: number }[] = [];
      
      for (const row of relacionesData) {
        const codigoLower = row.codigo.toLowerCase();
        const padreLower = row.padre.toLowerCase();
        const codigo = existingMap.get(codigoLower);
        const padre = existingMap.get(padreLower);
        
        if (codigo && padre && !newCodigos.find((nc) => nc.id === codigo.id)) {
          if (codigo.Padre !== padre.id) {
            updates.push({ id: codigo.id, Padre: padre.id });
          }
        }
      }
      
      for (const update of updates) {
        await supabase
          .from("repuestos_relaciones")
          .update({ Padre: update.Padre })
          .eq("id", update.id);
      }

      toast({
        title: "Importación exitosa",
        description: `Se crearon ${newPadres.length} padres, ${newCodigos.length} hijos y se actualizaron ${updates.length} relaciones`,
      });

      setShowRelacionesDialog(false);
      setRelacionesData([]);
      fetchRelaciones();
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

  // ========== EDITAR ==========
  const handleEditClick = (relacion: Relacion) => {
    setSelectedRelacion(relacion);
    setEditPadre(relacion.Padre?.toString() || "none");
    setShowEditDialog(true);
  };

  const handleUpdatePadre = async () => {
    if (!selectedRelacion) return;

    try {
      const newPadreValue = editPadre === "none" ? null : Number(editPadre);
      
      // Prevent circular reference
      if (newPadreValue === selectedRelacion.id) {
        toast({
          title: "Error",
          description: "Un código no puede ser su propio padre",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("repuestos_relaciones")
        .update({ Padre: newPadreValue })
        .eq("id", selectedRelacion.id);

      if (error) throw error;

      toast({
        title: "Actualizado",
        description: "Relación padre actualizada correctamente",
      });

      setShowEditDialog(false);
      fetchRelaciones();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ========== AGREGAR MANUAL ==========
  const handleAddCodigo = async () => {
    if (!newCodigo.trim()) {
      toast({
        title: "Error",
        description: "El código es requerido",
        variant: "destructive",
      });
      return;
    }

    // Verificar duplicados
    const exists = relaciones.some(r => r.Código?.toLowerCase() === newCodigo.trim().toLowerCase());
    if (exists) {
      toast({
        title: "Error",
        description: "Ya existe un registro con ese código",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get max ID
      const maxId = relaciones.length > 0 ? Math.max(...relaciones.map(r => r.id)) : 0;
      
      const { error } = await supabase
        .from("repuestos_relaciones")
        .insert({
          id: maxId + 1,
          "Código": newCodigo.trim(),
          "Descripción": newDescripcion.trim(),
          Padre: newPadre === "none" ? null : Number(newPadre),
        });

      if (error) throw error;

      toast({
        title: "Código creado",
        description: `Se creó el código "${newCodigo}"`,
      });

      setShowAddDialog(false);
      setNewCodigo("");
      setNewDescripcion("");
      setNewPadre("");
      fetchRelaciones();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ========== ELIMINAR ==========
  const handleDelete = async (relacion: Relacion) => {
    // Check if this has children
    const hasChildren = relaciones.some(r => r.Padre === relacion.id);
    if (hasChildren) {
      toast({
        title: "No se puede eliminar",
        description: "Este código tiene hijos asociados. Elimine primero los hijos.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`¿Está seguro de eliminar el código "${relacion.Código}"?`)) return;

    try {
      const { error } = await supabase
        .from("repuestos_relaciones")
        .delete()
        .eq("id", relacion.id);

      if (error) throw error;

      toast({
        title: "Eliminado",
        description: "Registro eliminado correctamente",
      });

      fetchRelaciones();
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
    const padre = relaciones.find(r => r.id === padreId);
    return padre?.Código || `ID: ${padreId}`;
  };

  const getHijosCount = (relacionId: number) => {
    return relaciones.filter(r => r.Padre === relacionId).length;
  };

  // Get root codes (padres) for select options
  const padreOptions = relaciones.filter(r => !r.Padre);

  const filteredRelaciones = relaciones.filter(r =>
    r.Código?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.Descripción?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.toString().includes(searchTerm)
  );

  // Pagination
  const totalPages = Math.ceil(filteredRelaciones.length / pageSize);
  const paginatedRelaciones = filteredRelaciones.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <GitBranch className="h-7 w-7 text-primary" />
            Sustitutos de Repuestos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de códigos padre-hijo y sustitutos
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
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar Padres
          </Button>
          <Button
            onClick={() => relacionesInputRef.current?.click()}
            variant="outline"
          >
            <Link className="h-4 w-4 mr-2" />
            Importar Relaciones
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Código
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{relaciones.length}</div>
            <div className="text-sm text-muted-foreground">Total Códigos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-chart-2">
              {relaciones.filter(r => !r.Padre).length}
            </div>
            <div className="text-sm text-muted-foreground">Códigos Padre</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-chart-3">
              {relaciones.filter(r => r.Padre).length}
            </div>
            <div className="text-sm text-muted-foreground">Códigos Hijo</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-chart-4">
              {new Set(relaciones.filter(r => r.Padre).map(r => r.Padre)).size}
            </div>
            <div className="text-sm text-muted-foreground">Con Hijos</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Códigos</CardTitle>
          <CardDescription>
            Lista de todos los códigos de repuestos y sus relaciones padre-hijo
          </CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, descripción o ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando códigos...
            </div>
          ) : paginatedRelaciones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {relaciones.length === 0 
                ? "No hay códigos. Importe un archivo para comenzar."
                : "No se encontraron códigos con ese criterio."}
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Padre</TableHead>
                      <TableHead className="text-center">Hijos</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRelaciones.map((relacion) => (
                      <TableRow key={relacion.id}>
                        <TableCell className="font-mono text-sm">{relacion.id}</TableCell>
                        <TableCell className="font-medium">{relacion.Código}</TableCell>
                        <TableCell className="max-w-xs truncate">{relacion.Descripción}</TableCell>
                        <TableCell>
                          {relacion.Padre ? (
                            <span className="text-primary">{getPadreNombre(relacion.Padre)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {getHijosCount(relacion.id) > 0 && (
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                              {getHijosCount(relacion.id)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditClick(relacion)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(relacion)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredRelaciones.length)} de {filteredRelaciones.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Importar Padres */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Códigos Padre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se importarán {importData.length} códigos padre (sin relación a otro código).
            </p>
            <div className="rounded-md border max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.slice(0, 20).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.Código}</TableCell>
                      <TableCell className="max-w-xs truncate">{row.Descripción}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {importData.length > 20 && (
                <p className="p-2 text-center text-sm text-muted-foreground">
                  ... y {importData.length - 20} más
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                `Importar ${importData.length} códigos`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Importar Relaciones */}
      <Dialog open={showRelacionesDialog} onOpenChange={setShowRelacionesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Relaciones (Hijos)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se importarán {relacionesData.length} relaciones. 
              Los códigos padre que no existan serán creados automáticamente.
            </p>
            <div className="rounded-md border max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código (Hijo)</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Padre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relacionesData.slice(0, 20).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.codigo}</TableCell>
                      <TableCell className="max-w-xs truncate">{row.descripcion}</TableCell>
                      <TableCell>{row.padre}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {relacionesData.length > 20 && (
                <p className="p-2 text-center text-sm text-muted-foreground">
                  ... y {relacionesData.length - 20} más
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelacionesDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImportRelaciones} disabled={importingRelaciones}>
              {importingRelaciones ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                `Importar ${relacionesData.length} relaciones`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Padre */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Relación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código</Label>
              <Input value={selectedRelacion?.Código || ""} disabled />
            </div>
            <div>
              <Label>Código Padre</Label>
              <Select value={editPadre} onValueChange={setEditPadre}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar padre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin padre (es código principal)</SelectItem>
                  {padreOptions
                    .filter(p => p.id !== selectedRelacion?.id)
                    .map((padre) => (
                      <SelectItem key={padre.id} value={padre.id.toString()}>
                        {padre.Código} - {padre.Descripción?.substring(0, 30)}
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
            <Button onClick={handleUpdatePadre}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Agregar nuevo */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Código</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código *</Label>
              <Input
                value={newCodigo}
                onChange={(e) => setNewCodigo(e.target.value)}
                placeholder="Ej: 929926"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                value={newDescripcion}
                onChange={(e) => setNewDescripcion(e.target.value)}
                placeholder="Descripción del repuesto"
              />
            </div>
            <div>
              <Label>Código Padre</Label>
              <Select value={newPadre} onValueChange={setNewPadre}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin padre (es código principal)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin padre (es código principal)</SelectItem>
                  {padreOptions.map((padre) => (
                    <SelectItem key={padre.id} value={padre.id.toString()}>
                      {padre.Código} - {padre.Descripción?.substring(0, 30)}
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
            <Button onClick={handleAddCodigo}>Crear Código</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
