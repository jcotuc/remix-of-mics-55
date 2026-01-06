import { useState, useEffect, useCallback } from "react";
import { Package, Search, AlertTriangle, TrendingUp, TrendingDown, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PuertaEntradaWidget } from "@/components/dashboard/PuertaEntradaWidget";
import { EquivalenciasWidget } from "@/components/dashboard/EquivalenciasWidget";
import { TablePagination } from "@/components/TablePagination";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

type InventarioItem = {
  id: string;
  codigo_repuesto: string;
  descripcion: string | null;
  cantidad: number;
  ubicacion_legacy: string;
  bodega: string | null;
  costo_unitario: number | null;
  centro_servicio_id: string;
  centro_nombre?: string;
};

type Stats = {
  totalItems: number;
  stockBajo: number;
  stockTotal: number;
};

export default function Inventario() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalItems: 0, stockBajo: 0, stockTotal: 0 });
  const [showMovimiento, setShowMovimiento] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventarioItem | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<"entrada" | "salida">("entrada");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch stats only once on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch inventory data when page or search changes
  useEffect(() => {
    fetchInventario();
  }, [currentPage, itemsPerPage, debouncedSearch]);

  const fetchStats = async () => {
    try {
      // Get total count
      const { count: totalItems } = await supabase
        .from('inventario')
        .select('*', { count: 'exact', head: true });

      // Get stock bajo count
      const { count: stockBajo } = await supabase
        .from('inventario')
        .select('*', { count: 'exact', head: true })
        .lte('cantidad', 5);

      // Get total stock sum - using a simple approach
      const { data: stockData } = await supabase
        .from('inventario')
        .select('cantidad');

      const stockTotal = (stockData || []).reduce((acc, item) => acc + (item.cantidad || 0), 0);

      setStats({
        totalItems: totalItems || 0,
        stockBajo: stockBajo || 0,
        stockTotal
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchInventario = async () => {
    try {
      setLoading(true);
      
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      // Build query with server-side filtering
      let query = supabase
        .from('inventario')
        .select(`
          *,
          centros_servicio(nombre)
        `, { count: 'exact' });

      // Apply search filter on server side
      if (debouncedSearch) {
        query = query.or(`codigo_repuesto.ilike.%${debouncedSearch}%,descripcion.ilike.%${debouncedSearch}%,ubicacion_legacy.ilike.%${debouncedSearch}%`);
      }

      // Apply pagination and ordering
      const { data, error, count } = await query
        .order('codigo_repuesto')
        .range(start, end);

      if (error) throw error;

      const formateado = (data || []).map(item => ({
        id: item.id,
        codigo_repuesto: item.codigo_repuesto,
        descripcion: item.descripcion,
        cantidad: item.cantidad || 0,
        ubicacion_legacy: item.ubicacion_legacy,
        bodega: item.bodega,
        costo_unitario: item.costo_unitario,
        centro_servicio_id: item.centro_servicio_id,
        centro_nombre: (item.centros_servicio as any)?.nombre || 'Sin centro'
      }));

      setInventario(formateado);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  const handleMovimiento = (item: InventarioItem) => {
    setSelectedItem(item);
    setShowMovimiento(true);
  };

  const guardarMovimiento = async () => {
    if (!selectedItem || !cantidad) {
      toast.error('Complete todos los campos');
      return;
    }

    const cantidadNum = parseInt(cantidad);
    const nuevoStock = tipoMovimiento === "entrada" 
      ? selectedItem.cantidad + cantidadNum
      : selectedItem.cantidad - cantidadNum;

    if (nuevoStock < 0) {
      toast.error('Stock insuficiente');
      return;
    }

    try {
      // Actualizar inventario
      const { error: updateError } = await supabase
        .from('inventario')
        .update({ cantidad: nuevoStock })
        .eq('id', selectedItem.id);

      if (updateError) throw updateError;

      // Registrar movimiento
      const { error: movError } = await supabase
        .from('movimientos_inventario')
        .insert({
          codigo_repuesto: selectedItem.codigo_repuesto,
          tipo_movimiento: tipoMovimiento,
          cantidad: cantidadNum,
          motivo: motivo || null,
          centro_servicio_id: selectedItem.centro_servicio_id,
          stock_anterior: selectedItem.cantidad,
          stock_nuevo: nuevoStock,
        });

      if (movError) {
        console.error('Error registrando movimiento:', movError);
      }

      // Update local state
      setInventario(prev => prev.map(item => 
        item.id === selectedItem.id 
          ? { ...item, cantidad: nuevoStock }
          : item
      ));

      // Refresh stats
      fetchStats();

      toast.success(`Movimiento registrado: ${tipoMovimiento === "entrada" ? "+" : "-"}${cantidadNum} unidades`);
      setShowMovimiento(false);
      setCantidad("");
      setMotivo("");
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar movimiento');
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Control de Inventario
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestión de stock de repuestos y movimientos
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              Stock Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stockTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.totalItems.toLocaleString()} referencias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.stockBajo.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">≤ 5 unidades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Movimientos Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Entradas y salidas</p>
          </CardContent>
        </Card>

        <PuertaEntradaWidget />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <EquivalenciasWidget />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventario de Repuestos</CardTitle>
          <CardDescription>
            {debouncedSearch 
              ? `${totalCount.toLocaleString()} resultados para "${debouncedSearch}"`
              : `${stats.totalItems.toLocaleString()} repuestos en inventario`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por SKU, descripción o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            {searchTerm !== debouncedSearch && (
              <span className="text-xs text-muted-foreground">Buscando...</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Centro/Bodega</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Costo Unit.</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventario.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {debouncedSearch 
                          ? `No se encontraron resultados para "${debouncedSearch}"`
                          : 'No hay datos de inventario'
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventario.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.ubicacion_legacy || "-"}</TableCell>
                        <TableCell className="font-mono">{item.codigo_repuesto}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.descripcion || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.centro_nombre}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={item.cantidad <= 5 ? "text-orange-500 font-bold" : ""}>
                            {item.cantidad}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          Q{(item.costo_unitario || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {item.cantidad === 0 ? (
                            <Badge variant="destructive">Sin stock</Badge>
                          ) : item.cantidad <= 5 ? (
                            <Badge className="bg-orange-500">Stock bajo</Badge>
                          ) : (
                            <Badge className="bg-green-500">Normal</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMovimiento(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalCount > 0 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(value) => {
                    setItemsPerPage(value);
                    setCurrentPage(1);
                  }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showMovimiento} onOpenChange={setShowMovimiento}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
            <DialogDescription>
              {selectedItem?.codigo_repuesto} - {selectedItem?.descripcion}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo de Movimiento</Label>
              <Select value={tipoMovimiento} onValueChange={(v) => setTipoMovimiento(v as "entrada" | "salida")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Entrada
                    </div>
                  </SelectItem>
                  <SelectItem value="salida">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Salida
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Motivo</Label>
              <Input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Reparación INC-000123"
              />
            </div>

            <div className="bg-muted p-3 rounded">
              <p className="text-sm">
                <strong>Stock actual:</strong> {selectedItem?.cantidad}
              </p>
              {cantidad && (
                <p className="text-sm mt-1">
                  <strong>Nuevo stock:</strong> {
                    tipoMovimiento === "entrada"
                      ? (selectedItem?.cantidad || 0) + parseInt(cantidad || "0")
                      : (selectedItem?.cantidad || 0) - parseInt(cantidad || "0")
                  }
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovimiento(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarMovimiento}>
              Guardar Movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
