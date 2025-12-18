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
}

interface StockItem {
  id: string;
  codigo_repuesto: string;
  cantidad_actual: number;
  ubicacion: string | null;
  bodega: string | null;
  costo_unitario: number | null;
  centro_servicio_id: string;
  descripcion?: string;
}

export default function InventarioAdmin() {
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [selectedCentro, setSelectedCentro] = useState<string>("");
  const [stock, setStock] = useState<StockItem[]>([]);
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
      fetchStock();
    }
  }, [selectedCentro]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCentro]);

  const fetchCentros = async () => {
    const { data, error } = await supabase
      .from("centros_servicio")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre");

    if (!error && data) {
      setCentros(data);
    }
  };

  const fetchStock = async () => {
    if (!selectedCentro) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("stock_departamental")
      .select("*")
      .eq("centro_servicio_id", selectedCentro)
      .order("codigo_repuesto");

    if (!error && data) {
      setStock(data);
    }
    setLoading(false);
  };

  const filteredStock = useMemo(() => {
    if (!searchTerm) return stock;
    const term = searchTerm.toLowerCase();
    return stock.filter(
      (item) =>
        item.codigo_repuesto.toLowerCase().includes(term) ||
        item.ubicacion?.toLowerCase().includes(term) ||
        item.bodega?.toLowerCase().includes(term)
    );
  }, [stock, searchTerm]);

  const totalPages = Math.ceil(filteredStock.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStock = filteredStock.slice(startIndex, startIndex + itemsPerPage);

  const totals = useMemo(() => {
    return {
      skus: filteredStock.length,
      unidades: filteredStock.reduce((sum, item) => sum + item.cantidad_actual, 0),
      valor: filteredStock.reduce(
        (sum, item) => sum + item.cantidad_actual * (item.costo_unitario || 0),
        0
      ),
    };
  }, [filteredStock]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const requiredCols = ["ubicacion", "codigo", "descripcion", "cantidad", "centro_servicio"];
      const firstRow = rows[0];
      const missingCols = requiredCols.filter(
        (col) => !(col in firstRow) && !(col.toUpperCase() in firstRow)
      );

      if (missingCols.length > 0) {
        toast.error(`Faltan columnas: ${missingCols.join(", ")}`);
        setImporting(false);
        return;
      }

      // Obtener mapeo de nombres de centro a IDs
      const centrosMap = new Map(centros.map((c) => [c.nombre.toLowerCase(), c.id]));

      let imported = 0;
      let errors = 0;

      for (const row of rows) {
        const codigoCentro = (row.centro_servicio || row.CENTRO_SERVICIO || "").toString().toLowerCase();
        const centroId = centrosMap.get(codigoCentro);

        if (!centroId) {
          errors++;
          continue;
        }

        const codigo = (row.codigo || row.CODIGO || "").toString();
        const cantidad = parseInt(row.cantidad || row.CANTIDAD || 0);
        const ubicacion = (row.ubicacion || row.UBICACION || "").toString();
        const bodega = (row.bodega || row.BODEGA || "").toString() || null;
        const costoUnitario = parseFloat(row.costo_unitario || row.COSTO_UNITARIO || 0) || 0;

        // Upsert stock_departamental
        const { error } = await supabase.from("stock_departamental").upsert(
          {
            centro_servicio_id: centroId,
            codigo_repuesto: codigo,
            cantidad_actual: cantidad,
            ubicacion: ubicacion || null,
            bodega: bodega,
            costo_unitario: costoUnitario,
            ultima_actualizacion: new Date().toISOString(),
          },
          { onConflict: "centro_servicio_id,codigo_repuesto" }
        );

        if (error) {
          errors++;
        } else {
          imported++;
        }
      }

      toast.success(`Importación completada: ${imported} registros importados, ${errors} errores`);
      setShowImportDialog(false);

      if (selectedCentro) {
        fetchStock();
      }
    } catch (error) {
      toast.error("Error al procesar el archivo");
    }

    setImporting(false);
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
                  placeholder="Código, ubicación, bodega..."
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
          ) : paginatedStock.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay datos de inventario</p>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Bodega</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Costo Unit.</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStock.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.codigo_repuesto}</TableCell>
                        <TableCell>{item.ubicacion || "-"}</TableCell>
                        <TableCell>{item.bodega || "-"}</TableCell>
                        <TableCell className="text-right">{item.cantidad_actual}</TableCell>
                        <TableCell className="text-right">
                          Q{(item.costo_unitario || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          Q{(item.cantidad_actual * (item.costo_unitario || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredStock.length}
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
              <li><strong>ubicacion</strong> - Ubicación en bodega</li>
              <li><strong>codigo</strong> - Código del repuesto</li>
              <li><strong>descripcion</strong> - Descripción del repuesto</li>
              <li><strong>cantidad</strong> - Cantidad en stock</li>
              <li><strong>bodega</strong> - Nombre de la bodega (opcional)</li>
              <li><strong>centro_servicio</strong> - Código del centro de servicio</li>
              <li><strong>costo_unitario</strong> - Costo unitario (opcional)</li>
            </ul>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={importing}
            />
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
