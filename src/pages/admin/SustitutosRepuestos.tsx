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
import { Upload, Edit, Trash2, Search, Plus, Save, X, Link, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface Relacion {
  id: number;
  Código: string | null;
  Descripción: string | null;
  Padre: number | null;
}

interface ImportPadreRow {
  codigo: string;
  descripcion: string;
}

interface ImportRelacionRow {
  codigo: string;
  descripcion: string;
  padre: string;
}

export default function SustitutosRepuestos() {
  const [relaciones, setRelaciones] = useState<Relacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showImportPadresDialog, setShowImportPadresDialog] = useState(false);
  const [showImportRelacionesDialog, setShowImportRelacionesDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [importPadresData, setImportPadresData] = useState<ImportPadreRow[]>([]);
  const [importRelacionesData, setImportRelacionesData] = useState<ImportRelacionRow[]>([]);
  const [importingPadres, setImportingPadres] = useState(false);
  const [importingRelaciones, setImportingRelaciones] = useState(false);
  const [selectedRelacion, setSelectedRelacion] = useState<Relacion | null>(null);
  const [editPadre, setEditPadre] = useState<string>("");
  const [newCodigo, setNewCodigo] = useState("");
  const [newDescripcion, setNewDescripcion] = useState("");
  const [newPadre, setNewPadre] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  
  const padresInputRef = useRef<HTMLInputElement>(null);
  const relacionesInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRelaciones();
  }, []);

  const fetchRelaciones = async () => {
    try {
      setLoading(true);
      
      // Cargar todas las relaciones en páginas
      let allData: Relacion[] = [];
      let from = 0;
      const batchSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from("repuestos_relaciones")
          .select('id, "Código", "Descripción", "Padre"')
          .range(from, from + batchSize - 1)
          .order("id", { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allData = allData.concat(data as Relacion[]);
        
        if (data.length < batchSize) break;
        from += batchSize;
      }
      
      setRelaciones(allData);
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

  // Importar Padres: lee archivo con columnas Código y Descripción directamente
  const handlePadresFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        console.log("Excel raw data (Padres):", jsonData);

        // Map to collect unique parents - first column is Código, second is Descripción
        const padresMap = new Map<string, string>();

        jsonData.forEach((row: any) => {
          const keys = Object.keys(row);
          // First column = Código, Second column = Descripción
          const codigo = keys[0] ? String(row[keys[0]] || "").trim() : "";
          const descripcion = keys[1] ? String(row[keys[1]] || "").trim() : "";

          if (codigo && !padresMap.has(codigo)) {
            padresMap.set(codigo, descripcion);
          }
        });

        const mappedData: ImportPadreRow[] = Array.from(padresMap.entries()).map(([codigo, descripcion]) => ({
          codigo,
          descripcion
        }));

        console.log("Padres únicos encontrados:", mappedData.length);

        if (mappedData.length === 0) {
          toast({
            title: "Sin datos válidos",
            description: "No se encontraron códigos padre en el archivo.",
            variant: "destructive",
          });
          return;
        }

        setImportPadresData(mappedData);
        setShowImportPadresDialog(true);
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
    
    if (padresInputRef.current) {
      padresInputRef.current.value = "";
    }
  };

  const handleImportPadres = async () => {
    if (importPadresData.length === 0) return;

    try {
      setImportingPadres(true);

      // Get max ID
      const { data: maxRows } = await supabase
        .from("repuestos_relaciones")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);

      let nextId = maxRows && maxRows.length > 0 ? (maxRows[0].id as number) : 0;

      // Create existing codes map
      const existingCodes = new Set(relaciones.map(r => r.Código?.toLowerCase()));

      // Filter out existing codes
      const newPadres = importPadresData.filter(p => !existingCodes.has(p.codigo.toLowerCase()));

      if (newPadres.length === 0) {
        toast({
          title: "Sin nuevos registros",
          description: "Todos los códigos padre ya existen en la base de datos.",
        });
        setShowImportPadresDialog(false);
        return;
      }

      // Prepare inserts
      const inserts = newPadres.map(p => {
        nextId++;
        return {
          id: nextId,
          "Código": p.codigo,
          "Descripción": p.descripcion,
          "Padre": null
        };
      });

      // Insert in batches
      const batchSize = 500;
      for (let i = 0; i < inserts.length; i += batchSize) {
        const batch = inserts.slice(i, i + batchSize);
        const { error } = await supabase.from("repuestos_relaciones").insert(batch);
        if (error) throw error;
      }

      toast({
        title: "Importación exitosa",
        description: `Se importaron ${inserts.length} códigos padre`,
      });

      setShowImportPadresDialog(false);
      setImportPadresData([]);
      fetchRelaciones();
    } catch (error: any) {
      toast({
        title: "Error al importar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImportingPadres(false);
    }
  };

  // Importar Relaciones: crea hijos con la descripción del padre
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

        console.log("Excel raw data (Relaciones):", jsonData);

        const mappedData: ImportRelacionRow[] = [];
        const seen = new Set<string>();

        jsonData.forEach((row: any) => {
          const keys = Object.keys(row);
          const hijo = keys[0] ? String(row[keys[0]] || "").trim() : "";
          const descripcion = keys[1] ? String(row[keys[1]] || "").trim() : "";
          const padre = keys[2] ? String(row[keys[2]] || "").trim() : "";

          if (hijo && padre && !seen.has(hijo.toLowerCase())) {
            seen.add(hijo.toLowerCase());
            mappedData.push({
              codigo: hijo,
              descripcion,
              padre
            });
          }
        });

        console.log("Relaciones únicas encontradas:", mappedData.length);

        if (mappedData.length === 0) {
          toast({
            title: "Sin datos válidos",
            description: "No se encontraron relaciones válidas en el archivo.",
            variant: "destructive",
          });
          return;
        }

        setImportRelacionesData(mappedData);
        setShowImportRelacionesDialog(true);
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
    if (importRelacionesData.length === 0) return;

    try {
      setImportingRelaciones(true);

      // Reload all current data
      let existing: Relacion[] = [];
      let from = 0;
      const batchSize = 1000;

      while (true) {
        const { data: page, error } = await supabase
          .from("repuestos_relaciones")
          .select('id, "Código", "Descripción", "Padre"')
          .range(from, from + batchSize - 1);

        if (error) throw error;
        if (!page || page.length === 0) break;

        existing = existing.concat(page as Relacion[]);
        if (page.length < batchSize) break;
        from += batchSize;
      }

      // Create code-to-record map
      const codeMap = new Map<string, Relacion>();
      existing.forEach(r => {
        if (r.Código) {
          codeMap.set(r.Código.toLowerCase(), r);
        }
      });

      // Get max ID
      let nextId = existing.length > 0 ? Math.max(...existing.map(r => r.id)) : 0;

      const inserts: any[] = [];
      const updates: { id: number; Padre: number }[] = [];

      for (const row of importRelacionesData) {
        const padreRecord = codeMap.get(row.padre.toLowerCase());
        
        if (!padreRecord) {
          console.log(`Padre no encontrado: ${row.padre}`);
          continue;
        }

        const existingHijo = codeMap.get(row.codigo.toLowerCase());
        
        if (existingHijo) {
          // Update existing hijo with padre
          if (existingHijo.Padre !== padreRecord.id) {
            updates.push({ id: existingHijo.id, Padre: padreRecord.id });
          }
        } else {
          // Create new hijo with padre's description
          nextId++;
          const newRecord = {
            id: nextId,
            "Código": row.codigo,
            "Descripción": padreRecord.Descripción || row.descripcion,
            "Padre": padreRecord.id
          };
          inserts.push(newRecord);
          codeMap.set(row.codigo.toLowerCase(), newRecord as Relacion);
        }
      }

      // Insert new records in batches
      if (inserts.length > 0) {
        const insertBatchSize = 500;
        for (let i = 0; i < inserts.length; i += insertBatchSize) {
          const batch = inserts.slice(i, i + insertBatchSize);
          const { error } = await supabase.from("repuestos_relaciones").insert(batch);
          if (error) throw error;
        }
      }

      // Apply updates in batches
      for (const update of updates) {
        await supabase
          .from("repuestos_relaciones")
          .update({ Padre: update.Padre })
          .eq("id", update.id);
      }

      toast({
        title: "Importación exitosa",
        description: `Se crearon ${inserts.length} hijos y se actualizaron ${updates.length} relaciones`,
      });

      setShowImportRelacionesDialog(false);
      setImportRelacionesData([]);
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

  const handleEditClick = (relacion: Relacion) => {
    setSelectedRelacion(relacion);
    setEditPadre(relacion.Padre?.toString() || "none");
    setShowEditDialog(true);
  };

  const handleUpdatePadre = async () => {
    if (!selectedRelacion) return;

    try {
      const newPadreValue = editPadre === "none" ? null : Number(editPadre);
      
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

  const handleAddCodigo = async () => {
    if (!newCodigo.trim()) {
      toast({
        title: "Error",
        description: "El código es requerido",
        variant: "destructive",
      });
      return;
    }

    const exists = relaciones.some(r => r.Código?.toLowerCase() === newCodigo.trim().toLowerCase());
    if (exists) {
      toast({
        title: "Error",
        description: "Ya existe un código con ese valor",
        variant: "destructive",
      });
      return;
    }

    try {
      const maxId = relaciones.length > 0 ? Math.max(...relaciones.map(r => r.id)) : 0;
      
      const { error } = await supabase
        .from("repuestos_relaciones")
        .insert({
          id: maxId + 1,
          "Código": newCodigo.trim(),
          "Descripción": newDescripcion.trim() || null,
          "Padre": newPadre === "none" ? null : Number(newPadre),
        });

      if (error) throw error;

      toast({
        title: "Código creado",
        description: `Se creó el código "${newCodigo.trim()}"`,
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

  const handleDelete = async (relacion: Relacion) => {
    const hasChildren = relaciones.some(r => r.Padre === relacion.id);
    if (hasChildren) {
      toast({
        title: "No se puede eliminar",
        description: "Este código tiene hijos. Elimine primero los hijos.",
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
        description: "Código eliminado correctamente",
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

  const getHijosCount = (id: number) => {
    return relaciones.filter(r => r.Padre === id).length;
  };

  const filteredRelaciones = relaciones.filter(r =>
    r.Código?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.Descripción?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.toString().includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredRelaciones.length / pageSize);
  const paginatedRelaciones = filteredRelaciones.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const padresOnly = relaciones.filter(r => !r.Padre);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" />
            Sustitutos de Repuestos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de códigos padre-hijo para repuestos equivalentes
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={padresInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handlePadresFileUpload}
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
            onClick={() => padresInputRef.current?.click()}
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
              {padresOnly.length}
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
          <CardTitle>Códigos de Repuestos</CardTitle>
          <CardDescription>
            Lista de códigos y sus relaciones de sustitución
          </CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, descripción o ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">ID</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Padre</TableHead>
                      <TableHead className="text-center"># Hijos</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRelaciones.map((relacion) => (
                      <TableRow key={relacion.id}>
                        <TableCell className="font-mono text-sm">
                          {relacion.id}
                        </TableCell>
                        <TableCell className="font-medium font-mono">
                          {relacion.Código || "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {relacion.Descripción || "-"}
                        </TableCell>
                        <TableCell>
                          {relacion.Padre ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium font-mono">
                              {getPadreNombre(relacion.Padre)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Raíz</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {getHijosCount(relacion.id) > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-primary/10 text-primary rounded-full text-sm font-medium">
                              {getHijosCount(relacion.id)}
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
                              onClick={() => handleEditClick(relacion)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(relacion)}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredRelaciones.length)} de {filteredRelaciones.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
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

      {/* Import Padres Dialog */}
      <Dialog open={showImportPadresDialog} onOpenChange={setShowImportPadresDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Códigos Padre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se encontraron <strong>{importPadresData.length}</strong> códigos padre únicos.
              Cada padre tomará la descripción del primer hijo que aparezca en el archivo.
            </p>
            <div className="max-h-60 overflow-y-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código Padre</TableHead>
                    <TableHead>Descripción (del primer hijo)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPadresData.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{row.codigo}</TableCell>
                      <TableCell>{row.descripcion || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {importPadresData.length > 50 && (
              <p className="text-sm text-muted-foreground">
                ...y {importPadresData.length - 50} registros más
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportPadresDialog(false)}
              disabled={importingPadres}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleImportPadres} disabled={importingPadres}>
              {importingPadres ? (
                "Importando..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Importar {importPadresData.length} padres
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Relaciones Dialog */}
      <Dialog open={showImportRelacionesDialog} onOpenChange={setShowImportRelacionesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Relaciones (Hijos)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se encontraron <strong>{importRelacionesData.length}</strong> códigos hijo.
              Cada hijo heredará la descripción de su padre.
            </p>
            <div className="max-h-60 overflow-y-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código Hijo</TableHead>
                    <TableHead>Descripción Original</TableHead>
                    <TableHead>Código Padre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importRelacionesData.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{row.codigo}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{row.descripcion || "-"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium font-mono">
                          {row.padre}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {importRelacionesData.length > 50 && (
              <p className="text-sm text-muted-foreground">
                ...y {importRelacionesData.length - 50} relaciones más
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportRelacionesDialog(false)}
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
                  Importar {importRelacionesData.length} hijos
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
              <Label>Código</Label>
              <Input value={selectedRelacion?.Código || ""} disabled className="font-mono" />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={selectedRelacion?.Descripción || ""} disabled />
            </div>
            <div>
              <Label>Código Padre</Label>
              <Select value={editPadre} onValueChange={setEditPadre}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar padre" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">Sin padre (Raíz)</SelectItem>
                  {padresOnly
                    .filter(r => r.id !== selectedRelacion?.id)
                    .slice(0, 100)
                    .map(r => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.Código} - {r.Descripción?.substring(0, 30) || "Sin descripción"}
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

      {/* Add Code Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Código</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código *</Label>
              <Input
                value={newCodigo}
                onChange={(e) => setNewCodigo(e.target.value)}
                placeholder="Ej: 90179"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                value={newDescripcion}
                onChange={(e) => setNewDescripcion(e.target.value)}
                placeholder="Ej: Tornillo de cuchillas"
              />
            </div>
            <div>
              <Label>Código Padre</Label>
              <Select value={newPadre} onValueChange={setNewPadre}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar padre (opcional)" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">Sin padre (Raíz)</SelectItem>
                  {padresOnly.slice(0, 100).map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.Código} - {r.Descripción?.substring(0, 30) || "Sin descripción"}
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
            <Button onClick={handleAddCodigo}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Código
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
