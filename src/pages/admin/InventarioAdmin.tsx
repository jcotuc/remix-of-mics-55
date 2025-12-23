import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Search, Package, DollarSign, MapPin, Loader2, CheckCircle, XCircle, AlertTriangle, Plus } from "lucide-react";
import * as XLSX from "xlsx";
import { TablePagination } from "@/components/TablePagination";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CentroServicio {
  id: string;
  nombre: string;
  numero_bodega: string | null;
}

interface InventarioItem {
  id: string;
  codigo_repuesto: string;
  descripcion: string | null;
  cantidad: number;
  ubicacion: string | null;
  bodega: string | null;
  costo_unitario: number | null;
  centro_servicio_id: string;
}

interface AnalisisCS {
  csValue: string;
  numeroBodega: string;
  registros: number;
  centroExiste: boolean;
  centroId: string | null;
  centroNombre: string | null;
}

interface ImportSummary {
  totalRows: number;
  validRows: number;
  skippedRows: number;
  imported: number;
  errors: number;
  duplicates: number;
  byCS: AnalisisCS[];
  missingCSValues: string[];
  errorDetails: string[];
  duplicateDetails: string[];
}

type ImportStep = "idle" | "analyzing" | "preview" | "creating-centros" | "importing" | "done";

export default function InventarioAdmin() {
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [selectedCentro, setSelectedCentro] = useState<string>("");
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("idle");
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totals, setTotals] = useState({ skus: 0, unidades: 0, valor: 0 });
  
  // Estados para análisis y pre-importación
  const [analysisResults, setAnalysisResults] = useState<AnalisisCS[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [centrosToCreate, setCentrosToCreate] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importStartTime, setImportStartTime] = useState<number | null>(null);
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchCentros();
    return () => {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedCentro) {
      fetchInventario();
      fetchTotals();
    } else {
      setInventario([]);
      setTotals({ skus: 0, unidades: 0, valor: 0 });
      setTotalCount(0);
    }
  }, [selectedCentro, currentPage, itemsPerPage, debouncedSearch]);

  const fetchCentros = async () => {
    const { data, error } = await supabase
      .from("centros_servicio")
      .select("id, nombre, numero_bodega")
      .eq("activo", true)
      .order("nombre");

    if (!error && data) {
      setCentros(data);
    }
  };

  const fetchTotals = async () => {
    if (!selectedCentro) return;
    
    try {
      const centroId = selectedCentro === "todos" ? null : selectedCentro;
      const { data, error } = await supabase.rpc('inventario_totales', {
        p_centro_servicio_id: centroId,
        p_search: debouncedSearch || null
      });

      if (error) {
        console.error("Error fetching totals:", error);
        return;
      }

      if (data && data.length > 0) {
        setTotals({
          skus: Number(data[0].skus) || 0,
          unidades: Number(data[0].unidades) || 0,
          valor: Number(data[0].valor) || 0
        });
      }
    } catch (error) {
      console.error("Error fetching totals:", error);
    }
  };

  const fetchInventario = async () => {
    if (!selectedCentro) return;
    setLoading(true);

    try {
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      let query = supabase
        .from("inventario")
        .select("*", { count: 'exact' });

      // Filter by centro if not "todos"
      if (selectedCentro !== "todos") {
        query = query.eq("centro_servicio_id", selectedCentro);
      }

      // Apply search filter on server
      if (debouncedSearch) {
        query = query.or(
          `codigo_repuesto.ilike.%${debouncedSearch}%,descripcion.ilike.%${debouncedSearch}%,ubicacion.ilike.%${debouncedSearch}%,bodega.ilike.%${debouncedSearch}%`
        );
      }

      const { data, error, count } = await query
        .order("codigo_repuesto")
        .range(start, end);

      if (error) {
        console.error("Error fetching inventario:", error);
        toast.error("Error al cargar inventario");
        return;
      }

      setInventario(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  // Normaliza texto removiendo acentos
  const normalizeText = (text: string): string => {
    return text
      .replace(/_/g, " ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .toUpperCase()
      .trim();
  };

  // Busca valor en objeto ignorando acentos y mayúsculas
  const findValue = (row: any, ...possibleKeys: string[]): string => {
    const keys = Object.keys(row);
    for (const pk of possibleKeys) {
      const normalizedPk = normalizeText(pk);
      const foundKey = keys.find(k => normalizeText(k) === normalizedPk);
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
        return String(row[foundKey]).trim();
      }
    }
    return "";
  };

  const csToNumeroBodega = (cs: string): string => {
    const csNum = cs.toString().replace(/\D/g, "");
    if (!csNum) return "";
    return `B${csNum.padStart(3, "0")}`;
  };

  // Paso 1: Analizar el archivo Excel
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (centros.length === 0) {
      toast.error("Primero espere a que carguen los centros de servicio");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setImportStep("analyzing");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];

      if (rows.length === 0) {
        toast.error("El archivo está vacío");
        resetImport();
        return;
      }

      // Validar columnas requeridas
      const firstRow = rows[0];
      const keys = Object.keys(firstRow).map(k => normalizeText(k));
      
      const requiredCols = [
        { name: "SKU", alternatives: ["SKU", "CODIGO", "CODIGO_REPUESTO"] },
        { name: "CANTIDAD", alternatives: ["CANTIDAD", "QTY", "STOCK"] },
        { name: "CS", alternatives: ["CS", "BODEGA CS", "BODEGA_CS", "CENTRO DE SERVICIO", "CENTRO SERVICIO", "CENTRO_SERVICIO"] },
      ];
      
      const missingCols = requiredCols.filter(
        (col) => !col.alternatives.some(alt => keys.includes(normalizeText(alt)))
      );

      if (missingCols.length > 0) {
        toast.error(`Faltan columnas: ${missingCols.map(c => c.name).join(", ")}`);
        resetImport();
        return;
      }

      setParsedRows(rows);

      // Crear mapeo por numero_bodega
      const centrosMapByNumero = new Map(
        centros.filter(c => c.numero_bodega).map((c) => [c.numero_bodega!.toUpperCase().trim(), c])
      );

      // Analizar CS values
      const csAnalysis = new Map<string, AnalisisCS>();
      
      for (const row of rows) {
        const cs = findValue(
          row,
          "CS", "cs", "BODEGA CS", "BODEGA_CS", 
          "CENTRO DE SERVICIO", "CENTRO SERVICIO", "CENTRO_SERVICIO"
        );
        
        if (!cs) continue;

        const numeroBodega = csToNumeroBodega(cs);
        const key = cs;

        if (!csAnalysis.has(key)) {
          const centro = centrosMapByNumero.get(numeroBodega);
          csAnalysis.set(key, {
            csValue: cs,
            numeroBodega,
            registros: 0,
            centroExiste: !!centro,
            centroId: centro?.id || null,
            centroNombre: centro?.nombre || null,
          });
        }
        
        const analysis = csAnalysis.get(key)!;
        analysis.registros++;
      }

      const results = Array.from(csAnalysis.values()).sort((a, b) => b.registros - a.registros);
      setAnalysisResults(results);
      
      // Pre-seleccionar centros faltantes para crear
      const missing = results.filter(r => !r.centroExiste).map(r => r.csValue);
      setCentrosToCreate(missing);
      
      setImportStep("preview");
      
      console.log("Análisis completado:", {
        totalRows: rows.length,
        csValues: results.length,
        conCentro: results.filter(r => r.centroExiste).length,
        sinCentro: results.filter(r => !r.centroExiste).length,
      });

    } catch (error) {
      console.error("Error analyzing file:", error);
      toast.error("Error al analizar el archivo");
      resetImport();
    }
  };

  // Crear centros de servicio faltantes
  const handleCreateMissingCentros = async () => {
    if (centrosToCreate.length === 0) {
      toast.info("No hay centros seleccionados para crear");
      return;
    }

    setImportStep("creating-centros");

    try {
      const nuevoCentros = centrosToCreate.map(cs => {
        const numeroBodega = csToNumeroBodega(cs);
        return {
          nombre: `Bodega ${numeroBodega}`,
          numero_bodega: numeroBodega,
          activo: true,
        };
      });

      const { data, error } = await supabase
        .from("centros_servicio")
        .insert(nuevoCentros)
        .select();

      if (error) {
        console.error("Error creating centros:", error);
        toast.error("Error al crear centros de servicio");
        setImportStep("preview");
        return;
      }

      toast.success(`${data.length} centros de servicio creados`);
      
      // Actualizar lista de centros
      await fetchCentros();
      
      // Re-analizar con los nuevos centros
      const updatedCentros = [...centros, ...data];
      const centrosMapByNumero = new Map(
        updatedCentros.filter(c => c.numero_bodega).map((c) => [c.numero_bodega!.toUpperCase().trim(), c])
      );

      const updatedResults = analysisResults.map(r => {
        const centro = centrosMapByNumero.get(r.numeroBodega);
        return {
          ...r,
          centroExiste: !!centro,
          centroId: centro?.id || null,
          centroNombre: centro?.nombre || null,
        };
      });

      setAnalysisResults(updatedResults);
      setCentrosToCreate([]);
      setImportStep("preview");

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear centros");
      setImportStep("preview");
    }
  };

  const startKeepAlive = () => {
    keepAliveRef.current = setInterval(async () => {
      try {
        await supabase.auth.refreshSession();
        console.log("Session refreshed during import");
      } catch (e) {
        console.warn("Error refreshing session:", e);
      }
    }, 30000);
  };

  const stopKeepAlive = () => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  };

  const formatTimeRemaining = (): string => {
    if (!importProgress || !importStartTime || importProgress.processed === 0) return "Calculando...";
    
    const elapsed = Date.now() - importStartTime;
    const rate = importProgress.processed / elapsed;
    const remaining = importProgress.total - importProgress.processed;
    const msRemaining = remaining / rate;
    
    const seconds = Math.ceil(msRemaining / 1000);
    if (seconds < 60) return `~${seconds}s restantes`;
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes}min restantes`;
  };

  // Paso 2: Ejecutar la importación
  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setImportStep("importing");
    setImportProgress({ processed: 0, total: 0 });
    setImportStartTime(Date.now());
    startKeepAlive();

    try {
      // Refrescar centros para tener los más actualizados
      const { data: currentCentros } = await supabase
        .from("centros_servicio")
        .select("id, nombre, numero_bodega")
        .eq("activo", true);

      const centrosMapByNumero = new Map(
        (currentCentros || []).filter(c => c.numero_bodega).map((c) => [c.numero_bodega!.toUpperCase().trim(), c.id])
      );

      type UpsertRow = {
        centro_servicio_id: string;
        codigo_repuesto: string;
        descripcion: string | null;
        cantidad: number;
        ubicacion: string | null;
        bodega: string | null;
        costo_unitario: number | null;
      };

      // Usar Map para deduplicar: último valor gana
      const upsertMap = new Map<string, UpsertRow>();
      let skippedNoSku = 0;
      let skippedNoCentro = 0;
      const skippedByCS = new Map<string, number>();
      let firstCentroId: string | null = null;
      const centrosAfectados = new Set<string>();
      
      // Detectar duplicados en Excel
      const seenKeys = new Map<string, number>(); // key -> row number
      const duplicateDetails: string[] = [];
      let duplicateCount = 0;

      for (let rowIndex = 0; rowIndex < parsedRows.length; rowIndex++) {
        const row = parsedRows[rowIndex];
        const sku = findValue(row, "SKU", "sku", "Sku", "CODIGO", "codigo_repuesto");
        
        if (!sku) {
          skippedNoSku++;
          continue;
        }

        const cs = findValue(
          row,
          "CS", "cs", "BODEGA CS", "BODEGA_CS",
          "CENTRO DE SERVICIO", "CENTRO SERVICIO", "CENTRO_SERVICIO"
        );

        const numeroBodega = csToNumeroBodega(cs);
        const centroId = centrosMapByNumero.get(numeroBodega);

        if (!centroId) {
          skippedNoCentro++;
          skippedByCS.set(cs, (skippedByCS.get(cs) || 0) + 1);
          continue;
        }

        const ubicacion = findValue(row, "UBICACIÓN", "UBICACION", "ubicacion") || "";
        const descripcion = findValue(row, "DESCRIPCIÓN", "DESCRIPCION", "descripcion");
        const cantidadRaw = findValue(row, "CANTIDAD", "cantidad", "QTY", "STOCK") || "0";
        const cantidad = parseInt(cantidadRaw.replace(/,/g, "")) || 0;
        const costoRaw = findValue(row, "COSTO UN", "COSTO  UN", "COSTO_UN", "costo_un", "COSTO UNITARIO") || "0";
        const costoUnitario = parseFloat(costoRaw.replace(/,/g, "").replace("Q", "").replace("$", "")) || 0;

        // Clave incluye ubicación para permitir mismo SKU en diferentes ubicaciones
        const key = `${centroId}|${sku}|${ubicacion}`;
        if (seenKeys.has(key)) {
          duplicateCount++;
          if (duplicateDetails.length < 10) {
            duplicateDetails.push(`SKU ${sku} ubicación ${ubicacion || '(vacía)'} en ${numeroBodega} (filas ${seenKeys.get(key)! + 2} y ${rowIndex + 2})`);
          }
        }
        seenKeys.set(key, rowIndex);

        // Usar Map para que el último valor gane (sobrescribe duplicados exactos)
        upsertMap.set(key, {
          centro_servicio_id: centroId,
          codigo_repuesto: sku,
          descripcion: descripcion || null,
          cantidad,
          ubicacion: ubicacion || null,
          bodega: numeroBodega || null,
          costo_unitario: costoUnitario || null,
        });

        centrosAfectados.add(centroId);
        if (!firstCentroId) firstCentroId = centroId;
      }

      // Convertir Map a Array (ya sin duplicados)
      const toUpsert = Array.from(upsertMap.values());

      const totalToUpsert = toUpsert.length;
      setImportProgress({ processed: 0, total: totalToUpsert });

      let imported = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      if (totalToUpsert > 0) {
        // Batch más grande para mejor rendimiento
        const BATCH_SIZE = 500;
        for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
          const batch = toUpsert.slice(i, i + BATCH_SIZE);

          const { error } = await supabase.from("inventario").upsert(batch, {
            onConflict: "centro_servicio_id,codigo_repuesto,ubicacion",
          });

          if (error) {
            console.error("Error upserting batch:", error);
            
            // Si el batch falla, intentar con batches más pequeños (no uno por uno)
            const SMALL_BATCH = 50;
            for (let j = 0; j < batch.length; j += SMALL_BATCH) {
              const smallBatch = batch.slice(j, j + SMALL_BATCH);
              const { error: smallError } = await supabase.from("inventario").upsert(smallBatch, {
                onConflict: "centro_servicio_id,codigo_repuesto,ubicacion",
              });
              
              if (smallError) {
                errors += smallBatch.length;
                if (errorDetails.length < 20) {
                  errorDetails.push(`Batch error (${smallBatch.length} items): ${smallError.message}`);
                }
                console.error(`Error en small batch:`, smallError);
              } else {
                imported += smallBatch.length;
              }
            }
          } else {
            imported += batch.length;
          }

          setImportProgress({
            processed: Math.min(i + batch.length, totalToUpsert),
            total: totalToUpsert,
          });
        }
      }

      // Crear resumen
      const summary: ImportSummary = {
        totalRows: parsedRows.length,
        validRows: totalToUpsert,
        skippedRows: skippedNoSku + skippedNoCentro,
        imported,
        errors,
        duplicates: duplicateCount,
        byCS: analysisResults,
        missingCSValues: Array.from(skippedByCS.entries()).map(([cs, count]) => `CS ${cs}: ${count} registros`),
        errorDetails,
        duplicateDetails,
      };

      setImportSummary(summary);
      setImportStep("done");

      console.log("=== RESUMEN DE IMPORTACIÓN ===");
      console.log(`Total filas en Excel: ${summary.totalRows}`);
      console.log(`Filas válidas: ${summary.validRows}`);
      console.log(`Duplicados en Excel: ${duplicateCount}`);
      console.log(`Omitidas sin SKU: ${skippedNoSku}`);
      console.log(`Omitidas sin centro: ${skippedNoCentro}`);
      console.log(`Importadas exitosamente: ${imported}`);
      console.log(`Errores de inserción: ${errors}`);
      if (skippedByCS.size > 0) {
        console.log("Omitidos por CS sin centro:");
        skippedByCS.forEach((count, cs) => console.log(`  CS ${cs}: ${count} registros`));
      }
      if (errorDetails.length > 0) {
        console.log("Errores específicos:");
        errorDetails.forEach(e => console.log(`  ${e}`));
      }

      if (!selectedCentro && firstCentroId) {
        setSelectedCentro(firstCentroId);
      } else if (selectedCentro && selectedCentro !== "todos" && centrosAfectados.has(selectedCentro)) {
        fetchInventario();
      } else if (selectedCentro === "todos") {
        fetchInventario();
      }

    } catch (error) {
      console.error("Error during import:", error);
      toast.error("Error durante la importación");
      setImportStep("preview");
    } finally {
      stopKeepAlive();
      setImportStartTime(null);
    }
  };

  const resetImport = () => {
    setImportStep("idle");
    setSelectedFile(null);
    setParsedRows([]);
    setAnalysisResults([]);
    setCentrosToCreate([]);
    setImportSummary(null);
    setImportProgress(null);
  };

  const closeDialog = () => {
    setShowImportDialog(false);
    resetImport();
  };

  const toggleCentroToCreate = (cs: string) => {
    setCentrosToCreate(prev => 
      prev.includes(cs) 
        ? prev.filter(c => c !== cs)
        : [...prev, cs]
    );
  };

  // Estadísticas del análisis
  const analysisStats = useMemo(() => {
    const conCentro = analysisResults.filter(r => r.centroExiste);
    const sinCentro = analysisResults.filter(r => !r.centroExiste);
    return {
      totalCS: analysisResults.length,
      conCentro: conCentro.length,
      sinCentro: sinCentro.length,
      registrosConCentro: conCentro.reduce((sum, r) => sum + r.registros, 0),
      registrosSinCentro: sinCentro.reduce((sum, r) => sum + r.registros, 0),
    };
  }, [analysisResults]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventario por Centro de Servicio</h1>
          <p className="text-muted-foreground">Gestión de inventario departamental</p>
        </div>
        <Button onClick={() => setShowImportDialog(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Importar Excel
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label>Centro de Servicio</Label>
              <Select value={selectedCentro} onValueChange={setSelectedCentro}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar centro..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">
                    <span className="font-medium">📦 Todos los centros</span>
                  </SelectItem>
                  {centros.map((centro) => (
                    <SelectItem key={centro.id} value={centro.id}>
                      {centro.nombre} {centro.numero_bodega && `(${centro.numero_bodega})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="SKU, descripción, ubicación, bodega..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totales */}
      {selectedCentro && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total SKUs</p>
                  <p className="text-2xl font-bold">{totals.skus.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Unidades</p>
                  <p className="text-2xl font-bold">{totals.unidades.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">Q{totals.valor.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !selectedCentro ? (
            <p className="text-center py-8 text-muted-foreground">
              Seleccione un centro de servicio para ver su inventario
            </p>
          ) : inventario.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {debouncedSearch 
                ? `No se encontraron resultados para "${debouncedSearch}"`
                : "No hay datos de inventario"
              }
            </p>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead>Bodega CS</TableHead>
                      <TableHead className="text-right">Costo Unit.</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventario.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.ubicacion || "-"}</TableCell>
                        <TableCell className="font-mono">{item.codigo_repuesto}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.descripcion || "-"}</TableCell>
                        <TableCell className="text-right">{item.cantidad}</TableCell>
                        <TableCell>{item.bodega || "-"}</TableCell>
                        <TableCell className="text-right">
                          Q{(item.costo_unitario || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          Q{(item.cantidad * (item.costo_unitario || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(val) => {
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Importar - Multi-paso */}
      <Dialog open={showImportDialog} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {importStep === "idle" && "Importar Inventario desde Excel"}
              {importStep === "analyzing" && "Analizando archivo..."}
              {importStep === "preview" && "Vista previa de importación"}
              {importStep === "creating-centros" && "Creando centros de servicio..."}
              {importStep === "importing" && "Importando datos..."}
              {importStep === "done" && "Importación completada"}
            </DialogTitle>
            <DialogDescription>
              {importStep === "idle" && "Selecciona el archivo Excel para analizar antes de importar"}
              {importStep === "preview" && "Revisa el análisis y decide si crear centros faltantes"}
              {importStep === "done" && "Resumen de la importación realizada"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4">
            {/* Paso 1: Selección de archivo */}
            {importStep === "idle" && (
              <>
                <p className="text-sm text-muted-foreground">
                  El archivo debe contener las siguientes columnas:
                </p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  <li><strong>SKU</strong> - Código del repuesto (requerido)</li>
                  <li><strong>CANTIDAD</strong> - Cantidad en stock (requerido)</li>
                  <li><strong>CS</strong> - Número de centro de servicio: 8, 18, 19... (requerido)</li>
                  <li><strong>UBICACIÓN</strong> - Ubicación física (opcional)</li>
                  <li><strong>DESCRIPCIÓN</strong> - Descripción del repuesto (opcional)</li>
                  <li><strong>COSTO UN</strong> - Costo unitario (opcional)</li>
                </ul>
                <p className="text-xs text-muted-foreground italic">
                  El número CS se convierte a numero_bodega: 8 → B008, 18 → B018
                </p>
                <div className="space-y-2">
                  <Label>Seleccionar archivo</Label>
                  <Input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} />
                </div>
              </>
            )}

            {/* Analizando */}
            {importStep === "analyzing" && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Analizando archivo Excel...</p>
              </div>
            )}

            {/* Paso 2: Preview del análisis */}
            {importStep === "preview" && (
              <>
                {/* Resumen */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Listos para importar</p>
                          <p className="text-xl font-bold text-green-600">
                            {analysisStats.registrosConCentro.toLocaleString()} registros
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {analysisStats.conCentro} centros de servicio
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-destructive" />
                        <div>
                          <p className="text-sm text-muted-foreground">Sin centro asignado</p>
                          <p className="text-xl font-bold text-destructive">
                            {analysisStats.registrosSinCentro.toLocaleString()} registros
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {analysisStats.sinCentro} valores de CS
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabla de análisis */}
                <div className="border rounded-md">
                  <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
                    <span className="text-sm font-medium">Detalle por Centro de Servicio</span>
                    <span className="text-xs text-muted-foreground">Total: {parsedRows.length.toLocaleString()} filas</span>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Crear</TableHead>
                          <TableHead>CS</TableHead>
                          <TableHead>Bodega</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Registros</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisResults.map((item) => (
                          <TableRow key={item.csValue}>
                            <TableCell>
                              {!item.centroExiste && (
                                <Checkbox
                                  checked={centrosToCreate.includes(item.csValue)}
                                  onCheckedChange={() => toggleCentroToCreate(item.csValue)}
                                />
                              )}
                            </TableCell>
                            <TableCell className="font-mono">{item.csValue}</TableCell>
                            <TableCell className="font-mono">{item.numeroBodega}</TableCell>
                            <TableCell>
                              {item.centroExiste ? (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {item.centroNombre}
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  No existe
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.registros.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {/* Advertencia si hay centros faltantes */}
                {analysisStats.sinCentro > 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        {analysisStats.registrosSinCentro.toLocaleString()} registros serán omitidos
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Selecciona los centros que deseas crear automáticamente o importa solo los registros con centros existentes.
                      </p>
                      {centrosToCreate.length > 0 && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleCreateMissingCentros}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Crear {centrosToCreate.length} centro(s) seleccionado(s)
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Creando centros */}
            {importStep === "creating-centros" && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Creando centros de servicio...</p>
              </div>
            )}

            {/* Importando */}
            {importStep === "importing" && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-medium">Importando inventario...</p>
                <p className="text-sm text-muted-foreground">
                  {importProgress?.total 
                    ? `${importProgress.processed.toLocaleString()} / ${importProgress.total.toLocaleString()} registros`
                    : "Preparando..."}
                </p>
                {importProgress && importProgress.total > 0 && (
                  <div className="w-full max-w-md space-y-2">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{Math.round((importProgress.processed / importProgress.total) * 100)}%</span>
                      <span>{formatTimeRemaining()}</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Por favor no cierre esta ventana durante la importación
                </p>
              </div>
            )}

            {/* Paso 3: Resumen final */}
            {importStep === "done" && importSummary && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">{importSummary.imported.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Registros importados</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-amber-600">{importSummary.skippedRows.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Registros omitidos</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Total filas en Excel:</span>
                    <span className="font-medium">{importSummary.totalRows.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Filas válidas:</span>
                    <span className="font-medium">{importSummary.validRows.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Importadas exitosamente:</span>
                    <span className="font-medium text-green-600">{importSummary.imported.toLocaleString()}</span>
                  </div>
                  {importSummary.errors > 0 && (
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Errores de inserción:</span>
                      <span className="font-medium text-destructive">{importSummary.errors.toLocaleString()}</span>
                    </div>
                  )}
                  {importSummary.duplicates > 0 && (
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Duplicados en Excel:</span>
                      <span className="font-medium text-amber-600">{importSummary.duplicates.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {importSummary.duplicateDetails.length > 0 && (
                  <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm">
                    <p className="font-medium mb-2 text-amber-700 dark:text-amber-400">Duplicados encontrados (se usó el último valor):</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {importSummary.duplicateDetails.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                      {importSummary.duplicates > 10 && (
                        <li className="italic">...y {importSummary.duplicates - 10} más</li>
                      )}
                    </ul>
                  </div>
                )}

                {importSummary.errorDetails.length > 0 && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm">
                    <p className="font-medium mb-2 text-destructive">Errores específicos:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {importSummary.errorDetails.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                      {importSummary.errors > 20 && (
                        <li className="italic">...y {importSummary.errors - 20} más</li>
                      )}
                    </ul>
                  </div>
                )}

                {importSummary.missingCSValues.length > 0 && (
                  <div className="p-3 rounded-md bg-muted/50 text-sm">
                    <p className="font-medium mb-2">Omitidos por centro no encontrado:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {importSummary.missingCSValues.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Importación completada. Revisa la consola del navegador para ver el log detallado.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            {importStep === "idle" && (
              <Button variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
            )}
            
            {importStep === "preview" && (
              <>
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleImport} disabled={analysisStats.registrosConCentro === 0}>
                  Importar {analysisStats.registrosConCentro.toLocaleString()} registros
                </Button>
              </>
            )}

            {importStep === "done" && (
              <Button onClick={closeDialog}>
                Cerrar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
