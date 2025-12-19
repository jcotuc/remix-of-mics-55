import { useState, useEffect, useMemo } from "react";
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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("idle");
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Estados para análisis y pre-importación
  const [analysisResults, setAnalysisResults] = useState<AnalisisCS[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [centrosToCreate, setCentrosToCreate] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  useEffect(() => {
    fetchCentros();
  }, []);

  useEffect(() => {
    if (selectedCentro) {
      fetchInventario();
    } else {
      setInventario([]);
    }
  }, [selectedCentro]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCentro]);

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

  const fetchInventario = async () => {
    if (!selectedCentro) return;
    setLoading(true);

    try {
      // Si es "todos", necesitamos paginar porque Supabase tiene límite de 1000
      if (selectedCentro === "todos") {
        const allData: InventarioItem[] = [];
        const PAGE_SIZE = 1000;
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from("inventario")
            .select("*")
            .order("codigo_repuesto")
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

          if (error) {
            console.error("Error fetching inventario:", error);
            toast.error("Error al cargar inventario");
            break;
          }

          if (data && data.length > 0) {
            allData.push(...data);
            hasMore = data.length === PAGE_SIZE;
            page++;
          } else {
            hasMore = false;
          }
        }

        setInventario(allData);
      } else {
        // Para un centro específico, una sola consulta debería bastar
        const { data, error } = await supabase
          .from("inventario")
          .select("*")
          .eq("centro_servicio_id", selectedCentro)
          .order("codigo_repuesto");

        if (!error && data) {
          setInventario(data);
        } else if (error) {
          console.error("Error fetching inventario:", error);
          toast.error("Error al cargar inventario");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredInventario = useMemo(() => {
    if (!searchTerm) return inventario;
    const term = searchTerm.toLowerCase();
    return inventario.filter(
      (item) =>
        item.codigo_repuesto.toLowerCase().includes(term) ||
        item.descripcion?.toLowerCase().includes(term) ||
        item.ubicacion?.toLowerCase().includes(term) ||
        item.bodega?.toLowerCase().includes(term)
    );
  }, [inventario, searchTerm]);

  const totalPages = Math.ceil(filteredInventario.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventario = filteredInventario.slice(startIndex, startIndex + itemsPerPage);

  const totals = useMemo(() => {
    return {
      skus: filteredInventario.length,
      unidades: filteredInventario.reduce((sum, item) => sum + item.cantidad, 0),
      valor: filteredInventario.reduce(
        (sum, item) => sum + item.cantidad * (item.costo_unitario || 0),
        0
      ),
    };
  }, [filteredInventario]);

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

  // Paso 2: Ejecutar la importación
  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setImportStep("importing");
    setImportProgress({ processed: 0, total: 0 });

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

      const toUpsert: UpsertRow[] = [];
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

        // Detectar duplicados (mismo SKU + mismo centro)
        const key = `${centroId}|${sku}`;
        if (seenKeys.has(key)) {
          duplicateCount++;
          if (duplicateDetails.length < 10) {
            duplicateDetails.push(`SKU ${sku} en ${numeroBodega} (filas ${seenKeys.get(key)! + 2} y ${rowIndex + 2})`);
          }
          // Continuar para que el último valor prevalezca
        }
        seenKeys.set(key, rowIndex);

        const ubicacion = findValue(row, "UBICACIÓN", "UBICACION", "ubicacion");
        const descripcion = findValue(row, "DESCRIPCIÓN", "DESCRIPCION", "descripcion");
        const cantidadRaw = findValue(row, "CANTIDAD", "cantidad", "QTY", "STOCK") || "0";
        const cantidad = parseInt(cantidadRaw.replace(/,/g, "")) || 0;
        const costoRaw = findValue(row, "COSTO UN", "COSTO  UN", "COSTO_UN", "costo_un", "COSTO UNITARIO") || "0";
        const costoUnitario = parseFloat(costoRaw.replace(/,/g, "").replace("Q", "").replace("$", "")) || 0;

        toUpsert.push({
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

      const totalToUpsert = toUpsert.length;
      setImportProgress({ processed: 0, total: totalToUpsert });

      let imported = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      if (totalToUpsert > 0) {
        const BATCH_SIZE = 300;
        for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
          const batch = toUpsert.slice(i, i + BATCH_SIZE);

          const { error } = await supabase.from("inventario").upsert(batch, {
            onConflict: "centro_servicio_id,codigo_repuesto",
          });

          if (error) {
            console.error("Error upserting batch:", error);
            
            // Si el batch falla, intentar uno por uno
            for (const record of batch) {
              const { error: singleError } = await supabase.from("inventario").upsert([record], {
                onConflict: "centro_servicio_id,codigo_repuesto",
              });
              
              if (singleError) {
                errors++;
                if (errorDetails.length < 20) {
                  errorDetails.push(`SKU ${record.codigo_repuesto} (${record.bodega}): ${singleError.message}`);
                }
                console.error(`Error con SKU ${record.codigo_repuesto}:`, singleError);
              } else {
                imported++;
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
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedCentro ? (
            <p className="text-center py-8 text-muted-foreground">
              Seleccione un centro de servicio para ver su inventario
            </p>
          ) : paginatedInventario.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay datos de inventario</p>
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
                    {paginatedInventario.map((item) => (
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
                totalItems={filteredInventario.length}
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
                <p className="text-muted-foreground">
                  Importando{importProgress?.total ? ` ${importProgress.processed.toLocaleString()} / ${importProgress.total.toLocaleString()}` : "..."}
                </p>
                {importProgress && importProgress.total > 0 && (
                  <div className="w-full max-w-xs bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
                    />
                  </div>
                )}
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
