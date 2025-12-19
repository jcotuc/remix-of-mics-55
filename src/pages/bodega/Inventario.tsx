import { useState, useEffect, useMemo } from "react";
import { Package, Search, AlertTriangle, TrendingUp, TrendingDown, Edit, Upload } from "lucide-react";
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

type InventarioItem = {
  id: string;
  codigo_repuesto: string;
  descripcion: string | null;
  cantidad: number;
  ubicacion: string | null;
  bodega: string | null;
  costo_unitario: number | null;
  centro_servicio_id: string;
  centro_nombre?: string;
};

export default function Inventario() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMovimiento, setShowMovimiento] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventarioItem | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<"entrada" | "salida">("entrada");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    fetchInventario();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchInventario = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('inventario')
        .select(`
          *,
          centros_servicio(nombre)
        `)
        .order('codigo_repuesto');

      if (error) throw error;

      const formateado = (data || []).map(item => ({
        id: item.id,
        codigo_repuesto: item.codigo_repuesto,
        descripcion: item.descripcion,
        cantidad: item.cantidad || 0,
        ubicacion: item.ubicacion,
        bodega: item.bodega,
        costo_unitario: item.costo_unitario,
        centro_servicio_id: item.centro_servicio_id,
        centro_nombre: (item.centros_servicio as any)?.nombre || 'Sin centro'
      }));

      setInventario(formateado);
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

      setInventario(prev => prev.map(item => 
        item.id === selectedItem.id 
          ? { ...item, cantidad: nuevoStock }
          : item
      ));

      toast.success(`Movimiento registrado: ${tipoMovimiento === "entrada" ? "+" : "-"}${cantidadNum} unidades`);
      setShowMovimiento(false);
      setCantidad("");
      setMotivo("");
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar movimiento');
    }
  };

  const filteredInventario = useMemo(() => {
    return inventario.filter(item =>
      item.codigo_repuesto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ubicacion?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventario, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredInventario.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventario = filteredInventario.slice(startIndex, startIndex + itemsPerPage);

  const stockBajo = inventario.filter(item => item.cantidad <= 5).length;
  const stockTotal = inventario.reduce((acc, item) => acc + item.cantidad, 0);

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
            <div className="text-2xl font-bold">{stockTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{inventario.length} referencias</p>
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
            <div className="text-2xl font-bold text-orange-500">{stockBajo}</div>
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
            {filteredInventario.length} repuestos en inventario
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
          </div>

          {loading ? (
            <div className="text-center py-8">Cargando inventario...</div>
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
                  {paginatedInventario.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.ubicacion || "-"}</TableCell>
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
                  ))}
                </TableBody>
              </Table>

              {filteredInventario.length > 0 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredInventario.length}
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
