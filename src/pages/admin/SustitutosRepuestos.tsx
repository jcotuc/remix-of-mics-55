import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Trash2, Plus, Search, FileUp, Users, GitBranch, Loader2, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

interface Relacion {
  id: number;
  Código: string | null;
  Descripción: string | null;
  Padre: number | null;
  padre_codigo?: string | null;
}

interface ImportPadreRow {
  codigo: string;
  descripcion: string;
}

interface ImportHijoRow {
  hijo: string;
  descripcion: string;
  padre: string;
}

export default function SustitutosRepuestos() {
  const [relaciones, setRelaciones] = useState<Relacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, padres: 0, hijos: 0 });
  const pageSize = 50;
  
  // Import states
  const [showImportPadresDialog, setShowImportPadresDialog] = useState(false);
  const [showImportHijosDialog, setShowImportHijosDialog] = useState(false);
  const [showVaciarDialog, setShowVaciarDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [importPadresData, setImportPadresData] = useState<ImportPadreRow[]>([]);
  const [importHijosData, setImportHijosData] = useState<ImportHijoRow[]>([]);
  const [hijosErrors, setHijosErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  
  // Manual add form
  const [newCodigo, setNewCodigo] = useState("");
  const [newDescripcion, setNewDescripcion] = useState("");
  const [newPadreCodigo, setNewPadreCodigo] = useState("");
  
  const fileInputPadresRef = useRef<HTMLInputElement>(null);
  const fileInputHijosRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRelaciones();
    fetchStats();
  }, [page, searchTerm]);

  const fetchStats = async () => {
    const { count: total } = await supabase
      .from("repuestos_relaciones")
      .select("*", { count: "exact", head: true });
    
    const { count: padres } = await supabase
      .from("repuestos_relaciones")
      .select("*", { count: "exact", head: true })
      .is("Padre", null);
    
    const { count: hijos } = await supabase
      .from("repuestos_relaciones")
      .select("*", { count: "exact", head: true })
      .not("Padre", "is", null);
    
    setStats({
      total: total || 0,
      padres: padres || 0,
      hijos: hijos || 0
    });
  };

  const fetchRelaciones = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("repuestos_relaciones")
        .select("*", { count: "exact" });
      
      if (searchTerm) {
        query = query.or(`Código.ilike.%${searchTerm}%,Descripción.ilike.%${searchTerm}%`);
      }
      
      const { data, count, error } = await query
        .order("id", { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      if (error) throw error;
      
      // Get parent codes for display
      const dataWithParents: Relacion[] = (data || []).map(d => ({
        id: d.id,
        Código: d["Código"],
        Descripción: d["Descripción"],
        Padre: d.Padre,
        padre_codigo: null
      }));
      
      if (dataWithParents.length > 0) {
        const parentIds = dataWithParents.filter(r => r.Padre).map(r => r.Padre) as number[];
        if (parentIds.length > 0) {
          const { data: parents } = await supabase
            .from("repuestos_relaciones")
            .select("*")
            .in("id", parentIds);
          
          const parentMap = new Map(parents?.map(p => [p.id, p["Código"]]) || []);
          dataWithParents.forEach((r) => {
            r.padre_codigo = r.Padre ? parentMap.get(r.Padre) || null : null;
          });
        }
      }
      
      setRelaciones(dataWithParents);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching relaciones:", error);
      toast({ title: "Error al cargar relaciones", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ========== IMPORTAR PADRES ==========
  const handlePadresFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Get column keys from first row
        const keys = Object.keys(jsonData[0] || {});
        console.log("Columnas detectadas:", keys);
        
        // Section 1: columns 0,1,2 -> padre en columna 2
        const padreKey1 = keys[2];
        const descKey1 = keys[1];
        
        // Section 2: columns 4,5,6 -> padre en columna 6
        const padreKey2 = keys[6];
        const descKey2 = keys[5];

        // Map and deduplicate by codigo - extracting from BOTH sections
        const padresMap = new Map<string, string>();
        jsonData.forEach((row: any) => {
          // Section 1: padre en columna 2
          const padre1 = String(row[padreKey1] || "").trim();
          const desc1 = String(row[descKey1] || "").trim();
          if (padre1 && !padresMap.has(padre1)) {
            padresMap.set(padre1, desc1);
          }
          
          // Section 2: padre en columna 6
          if (padreKey2) {
            const padre2 = String(row[padreKey2] || "").trim();
            const desc2 = String(row[descKey2] || "").trim();
            if (padre2 && !padresMap.has(padre2)) {
              padresMap.set(padre2, desc2);
            }
          }
        });

        const padresUnicos: ImportPadreRow[] = Array.from(padresMap.entries()).map(([codigo, descripcion]) => ({
          codigo,
          descripcion
        }));

        setImportPadresData(padresUnicos);
        setShowImportPadresDialog(true);
        
        toast({
          title: `${padresUnicos.length} códigos padre únicos encontrados`,
          description: `Procesadas ambas secciones del Excel`
        });
      } catch (error) {
        console.error("Error parsing Excel:", error);
        toast({ title: "Error al leer el archivo", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputPadresRef.current) fileInputPadresRef.current.value = "";
  };

  const handleImportPadres = async () => {
    if (importPadresData.length === 0) return;
    
    setImporting(true);
    try {
      // Prepare records - let DB auto-generate IDs
      const records = importPadresData.map(p => ({
        "Código": p.codigo,
        "Descripción": p.descripcion,
        Padre: null
      }));
      
      // Insert in batches using upsert (updates existing, inserts new)
      const batchSize = 500;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase
          .from("repuestos_relaciones")
          .upsert(batch, { 
            onConflict: "Código",
            ignoreDuplicates: false 
          });
        
        if (error) throw error;
      }
      
      toast({
        title: "Padres importados correctamente",
        description: `${records.length} registros creados`
      });
      
      setShowImportPadresDialog(false);
      setImportPadresData([]);
      fetchRelaciones();
      fetchStats();
    } catch (error) {
      console.error("Error importing padres:", error);
      toast({ title: "Error al importar padres", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  // ========== IMPORTAR HIJOS ==========
  const handleHijosFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Get column keys from first row
        const keys = Object.keys(jsonData[0] || {});
        console.log("Columnas detectadas para hijos:", keys);
        
        // Section 1: columns 0,1,2 (hijo, desc, padre)
        const hijoKey1 = keys[0];
        const descKey1 = keys[1];
        const padreKey1 = keys[2];
        
        // Section 2: columns 4,5,6 (hijo, desc, padre)
        const hijoKey2 = keys[4];
        const descKey2 = keys[5];
        const padreKey2 = keys[6];

        // Extract children from BOTH sections
        const hijos: ImportHijoRow[] = [];
        jsonData.forEach((row: any) => {
          // Section 1
          const hijo1 = String(row[hijoKey1] || "").trim();
          const desc1 = String(row[descKey1] || "").trim();
          const padre1 = String(row[padreKey1] || "").trim();
          if (hijo1 && padre1) {
            hijos.push({ hijo: hijo1, descripcion: desc1, padre: padre1 });
          }
          
          // Section 2
          if (hijoKey2) {
            const hijo2 = String(row[hijoKey2] || "").trim();
            const desc2 = String(row[descKey2] || "").trim();
            const padre2 = String(row[padreKey2] || "").trim();
            if (hijo2 && padre2) {
              hijos.push({ hijo: hijo2, descripcion: desc2, padre: padre2 });
            }
          }
        });

        // Cargar TODOS los registros existentes a un mapa (igual que FamiliasProductos)
        const { data: allExisting } = await supabase
          .from("repuestos_relaciones")
          .select("*");
        
        const existingMap = new Map<string, number>();
        allExisting?.forEach(r => {
          if (r["Código"]) {
            existingMap.set(r["Código"], r.id);
          }
        });
        
        // Validar qué padres existen en el mapa
        const padresCodigos = [...new Set(hijos.map(h => h.padre))];
        const existingSet = new Set(padresCodigos.filter(p => existingMap.has(p)));
        const errors = padresCodigos.filter(p => !existingSet.has(p));
        
        setHijosErrors(errors);
        setImportHijosData(hijos);
        setShowImportHijosDialog(true);
        
        toast({
          title: `${hijos.length} hijos encontrados (ambas secciones)`,
          description: errors.length > 0 
            ? `${errors.length} padres no encontrados en la base de datos`
            : "Todos los padres existen"
        });
      } catch (error) {
        console.error("Error parsing Excel:", error);
        toast({ title: "Error al leer el archivo", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputHijosRef.current) fileInputHijosRef.current.value = "";
  };

  const handleImportHijos = async () => {
    if (importHijosData.length === 0) return;
    
    setImporting(true);
    try {
      // 1. Cargar TODOS los registros existentes a un mapa en memoria (igual que FamiliasProductos)
      const { data: allExisting } = await supabase
        .from("repuestos_relaciones")
        .select("*");
      
      // 2. Crear mapa: código -> id
      const existingMap = new Map<string, number>();
      allExisting?.forEach(r => {
        if (r["Código"]) {
          existingMap.set(r["Código"], r.id);
        }
      });
      
      console.log(`Mapa cargado con ${existingMap.size} registros existentes`);
      
      // 3. Get max ID for new records
      let nextId = allExisting?.length 
        ? Math.max(...allExisting.map(r => r.id)) + 1 
        : 1;
      
      // 4. Preparar registros de hijos usando el mapa para obtener ID del padre
      const records = importHijosData
        .filter(h => existingMap.has(h.padre))
        .map(h => ({
          id: nextId++,
          "Código": h.hijo,
          "Descripción": h.descripcion,
          Padre: existingMap.get(h.padre)
        }));
      
      const skipped = importHijosData.filter(h => !existingMap.has(h.padre)).length;
      
      // 5. Insertar en batches
      const batchSize = 500;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase
          .from("repuestos_relaciones")
          .insert(batch);
        
        if (error) throw error;
      }
      
      toast({
        title: "Hijos importados correctamente",
        description: `${records.length} registros creados` + 
          (skipped > 0 ? `, ${skipped} omitidos por padre no encontrado` : "")
      });
      
      setShowImportHijosDialog(false);
      setImportHijosData([]);
      setHijosErrors([]);
      fetchRelaciones();
      fetchStats();
    } catch (error) {
      console.error("Error importing hijos:", error);
      toast({ title: "Error al importar hijos", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  // ========== VACIAR TABLA ==========
  const handleVaciarTabla = async () => {
    setImporting(true);
    try {
      const { error } = await supabase
        .from("repuestos_relaciones")
        .delete()
        .neq("id", 0); // Delete all
      
      if (error) throw error;
      
      toast({ title: "Tabla vaciada correctamente" });
      setShowVaciarDialog(false);
      fetchRelaciones();
      fetchStats();
    } catch (error) {
      console.error("Error vaciando tabla:", error);
      toast({ title: "Error al vaciar tabla", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  // ========== AGREGAR MANUAL ==========
  const handleAddManual = async () => {
    if (!newCodigo || !newDescripcion) {
      toast({ title: "Código y descripción son requeridos", variant: "destructive" });
      return;
    }
    
    setImporting(true);
    try {
      let padreId = null;
      
      if (newPadreCodigo) {
        const { data: padreData } = await supabase
          .from("repuestos_relaciones")
          .select("id")
          .eq("Código", newPadreCodigo)
          .is("Padre", null)
          .single();
        
        if (!padreData) {
          toast({ title: "Código padre no encontrado", variant: "destructive" });
          setImporting(false);
          return;
        }
        padreId = padreData.id;
      }
      
      // Get next ID
      const { data: maxIdData } = await supabase
        .from("repuestos_relaciones")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      
      const nextId = (maxIdData?.[0]?.id || 0) + 1;
      
      const { error } = await supabase
        .from("repuestos_relaciones")
        .insert({
          id: nextId,
          "Código": newCodigo,
          "Descripción": newDescripcion,
          Padre: padreId
        });
      
      if (error) throw error;
      
      toast({ title: "Registro agregado correctamente" });
      setShowAddDialog(false);
      setNewCodigo("");
      setNewDescripcion("");
      setNewPadreCodigo("");
      fetchRelaciones();
      fetchStats();
    } catch (error) {
      console.error("Error adding record:", error);
      toast({ title: "Error al agregar registro", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  // ========== ELIMINAR ==========
  const handleDelete = async (id: number) => {
    try {
      // Check if has children
      const { count } = await supabase
        .from("repuestos_relaciones")
        .select("*", { count: "exact", head: true })
        .eq("Padre", id);
      
      if (count && count > 0) {
        toast({
          title: "No se puede eliminar",
          description: "Este código tiene hijos asociados",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase
        .from("repuestos_relaciones")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast({ title: "Registro eliminado" });
      fetchRelaciones();
      fetchStats();
    } catch (error) {
      console.error("Error deleting:", error);
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Sustitutos de Repuestos</h1>
          <p className="text-muted-foreground">Gestión de relaciones padre-hijo entre códigos de repuestos</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GitBranch className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Registros</p>
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Códigos Padre</p>
                <p className="text-2xl font-bold">{stats.padres.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <GitBranch className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Códigos Hijo</p>
                <p className="text-2xl font-bold">{stats.hijos.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones de Importación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <input
              type="file"
              ref={fileInputPadresRef}
              onChange={handlePadresFileUpload}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <Button onClick={() => fileInputPadresRef.current?.click()}>
              <FileUp className="h-4 w-4 mr-2" />
              1. Importar Padres
            </Button>
            
            <input
              type="file"
              ref={fileInputHijosRef}
              onChange={handleHijosFileUpload}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <Button onClick={() => fileInputHijosRef.current?.click()} variant="secondary">
              <Upload className="h-4 w-4 mr-2" />
              2. Importar Sustitutos (Hijos)
            </Button>
            
            <Button onClick={() => setShowAddDialog(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Manual
            </Button>
            
            <Button onClick={() => setShowVaciarDialog(true)} variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Vaciar Tabla
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            <strong>Formato Padres:</strong> columnas <code>codigo</code>, <code>descripcion</code><br />
            <strong>Formato Hijos:</strong> columnas <code>hijo</code>, <code>descripcion</code>, <code>padre</code>
          </p>
        </CardContent>
      </Card>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Relaciones de Repuestos</CardTitle>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o descripción..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">ID</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Código Padre</TableHead>
                      <TableHead className="w-20">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relaciones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          No hay registros
                        </TableCell>
                      </TableRow>
                    ) : (
                      relaciones.map((rel) => (
                        <TableRow key={rel.id}>
                          <TableCell className="font-mono text-sm">{rel.id}</TableCell>
                          <TableCell className="font-medium">{rel.Código}</TableCell>
                          <TableCell>{rel.Descripción}</TableCell>
                          <TableCell>
                            {rel.padre_codigo ? (
                              <span className="text-primary">{rel.padre_codigo}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(rel.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} de {totalCount}
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
                  <span className="px-3 py-1 text-sm">
                    Página {page} de {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Import Padres Preview */}
      <Dialog open={showImportPadresDialog} onOpenChange={setShowImportPadresDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Códigos Padre</DialogTitle>
            <DialogDescription>
              Se importarán {importPadresData.length} códigos padre únicos (sin duplicados)
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPadresData.slice(0, 100).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{row.codigo}</TableCell>
                    <TableCell>{row.descripcion}</TableCell>
                  </TableRow>
                ))}
                {importPadresData.length > 100 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      ... y {importPadresData.length - 100} más
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportPadresDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImportPadres} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importar {importPadresData.length} Padres
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Import Hijos Preview */}
      <Dialog open={showImportHijosDialog} onOpenChange={setShowImportHijosDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Sustitutos (Hijos)</DialogTitle>
            <DialogDescription>
              Se importarán {importHijosData.length} códigos hijo
            </DialogDescription>
          </DialogHeader>
          
          {hijosErrors.length > 0 && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                <AlertTriangle className="h-4 w-4" />
                {hijosErrors.length} códigos padre no encontrados:
              </div>
              <p className="text-sm text-destructive/80 font-mono">
                {hijosErrors.slice(0, 10).join(", ")}
                {hijosErrors.length > 10 && ` ... y ${hijosErrors.length - 10} más`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Los hijos de estos padres no se importarán
              </p>
            </div>
          )}
          
          <div className="rounded-md border max-h-60 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hijo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Padre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importHijosData.slice(0, 100).map((row, idx) => (
                  <TableRow key={idx} className={hijosErrors.includes(row.padre) ? "bg-destructive/5" : ""}>
                    <TableCell className="font-mono">{row.hijo}</TableCell>
                    <TableCell>{row.descripcion}</TableCell>
                    <TableCell className={hijosErrors.includes(row.padre) ? "text-destructive" : ""}>
                      {row.padre}
                    </TableCell>
                  </TableRow>
                ))}
                {importHijosData.length > 100 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      ... y {importHijosData.length - 100} más
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportHijosDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImportHijos} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importar Hijos Válidos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Vaciar Tabla */}
      <Dialog open={showVaciarDialog} onOpenChange={setShowVaciarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Vaciar toda la tabla?</DialogTitle>
            <DialogDescription>
              Esta acción eliminará todos los {stats.total.toLocaleString()} registros de relaciones.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVaciarDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleVaciarTabla} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Vaciar Tabla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Agregar Manual */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Registro Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código *</Label>
              <Input
                value={newCodigo}
                onChange={(e) => setNewCodigo(e.target.value)}
                placeholder="Ej: 90179"
              />
            </div>
            <div>
              <Label>Descripción *</Label>
              <Input
                value={newDescripcion}
                onChange={(e) => setNewDescripcion(e.target.value)}
                placeholder="Ej: Tornillo principal"
              />
            </div>
            <div>
              <Label>Código Padre (opcional)</Label>
              <Input
                value={newPadreCodigo}
                onChange={(e) => setNewPadreCodigo(e.target.value)}
                placeholder="Dejar vacío para crear como padre"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si se especifica, debe ser un código padre existente
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddManual} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
