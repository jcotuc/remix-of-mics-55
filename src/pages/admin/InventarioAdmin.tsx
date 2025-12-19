import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Search, Package, DollarSign, MapPin, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { TablePagination } from "@/components/TablePagination";

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

export default function InventarioAdmin() {
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [selectedCentro, setSelectedCentro] = useState<string>("");
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    fetchCentros();
  }, []);

  useEffect(() => {
    if (selectedCentro) {
      fetchInventario();
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
    setLoading(false);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file) return;

    // Evita intentar importar si aún no han cargado los centros
    if (centros.length === 0) {
      toast.error("Primero espere a que carguen los centros de servicio");
      inputEl.value = "";
      return;
    }

    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];

      if (rows.length === 0) {
        toast.error("El archivo está vacío");
        setImporting(false);
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
        setImporting(false);
        return;
      }

      console.log("Columnas encontradas:", Object.keys(firstRow));

      // Crear mapeo por numero_bodega (B008 -> id)
      const centrosMapByNumero = new Map(
        centros.filter(c => c.numero_bodega).map((c) => [c.numero_bodega!.toLowerCase().trim(), c.id])
      );

      // Función simple: CS -> numero_bodega -> centro_id
      const findCentroId = (cs: string): { id: string | null; numeroBodega: string } => {
        const csNum = cs.toString().replace(/\D/g, "");
        if (!csNum) return { id: null, numeroBodega: "" };
        
        const numeroBodega = `b${csNum.padStart(3, "0")}`;
        const centroId = centrosMapByNumero.get(numeroBodega) || null;
        return { id: centroId, numeroBodega: numeroBodega.toUpperCase() };
      };

      let imported = 0;
      let errors = 0;
      const errorMessages: string[] = [];
      const centrosAfectados = new Set<string>();
      let firstCentroId: string | null = null;

      for (const row of rows) {
        const ubicacion = findValue(row, "UBICACIÓN", "UBICACION", "ubicacion");
        const sku = findValue(row, "SKU", "sku", "Sku", "CODIGO", "codigo_repuesto");
        const descripcion = findValue(row, "DESCRIPCIÓN", "DESCRIPCION", "descripcion");
        const cantidadRaw = findValue(row, "CANTIDAD", "cantidad", "QTY", "STOCK") || "0";
        const cantidad = parseInt(cantidadRaw.replace(/,/g, "")) || 0;
        
        // Leer CS (número) y convertirlo a numero_bodega (ej: 8 -> B008)
        const cs = findValue(
          row,
          "CS",
          "cs",
          "BODEGA CS",
          "BODEGA_CS",
          "CENTRO DE SERVICIO",
          "CENTRO SERVICIO",
          "CENTRO_SERVICIO"
        );
        
        const costoRaw = findValue(row, "COSTO UN", "COSTO  UN", "COSTO_UN", "costo_un", "COSTO UNITARIO") || "0";
        const costoUnitario = parseFloat(costoRaw.replace(/,/g, "").replace("Q", "").replace("$", "")) || 0;

        if (!sku) {
          errors++;
          continue;
        }

        // Buscar centro por numero_bodega
        const { id: centroId, numeroBodega } = findCentroId(cs);

        if (!centroId) {
          errors++;
          const errorMsg = `Centro no encontrado: CS=${cs} (${numeroBodega || "sin número"})`;
          if (!errorMessages.includes(errorMsg)) {
            errorMessages.push(errorMsg);
          }
          continue;
        }

        // Upsert inventario
        const { error } = await supabase.from("inventario").upsert(
          {
            centro_servicio_id: centroId,
            codigo_repuesto: sku,
            descripcion: descripcion || null,
            cantidad: cantidad,
            ubicacion: ubicacion || null,
            bodega: numeroBodega || null,
            costo_unitario: costoUnitario || null,
          },
          { onConflict: "centro_servicio_id,codigo_repuesto" }
        );

        if (error) {
          errors++;
          console.error("Error upserting:", error);
        } else {
          imported++;
          centrosAfectados.add(centroId);
          if (!firstCentroId) firstCentroId = centroId;
        }
      }

      if (errorMessages.length > 0) {
        console.log("Errores de importación:", errorMessages);
      }

      toast.success(`Importación completada: ${imported} registros importados, ${errors} errores`);
      setShowImportDialog(false);

      if (!selectedCentro && firstCentroId) {
        setSelectedCentro(firstCentroId);
      } else if (selectedCentro && centrosAfectados.has(selectedCentro)) {
        fetchInventario();
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Error al procesar el archivo");
    } finally {
      setImporting(false);
      inputEl.value = "";
    }
  };

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
                  {centros.map((centro) => (
                    <SelectItem key={centro.id} value={centro.id}>
                      {centro.nombre}
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

      {/* Dialog Importar */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Inventario desde Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={importing} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)} disabled={importing}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
