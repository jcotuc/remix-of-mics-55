import { useState, useEffect } from "react";
import { Package, Search, AlertTriangle, TrendingUp, TrendingDown, Plus, Edit, History, Upload } from "lucide-react";
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
import { importRepuestosZona5 } from "@/scripts/importRepuestosZona5";
import { PuertaEntradaWidget } from "@/components/dashboard/PuertaEntradaWidget";

type Repuesto = {
  id: string;
  codigo: string;
  descripcion: string;
  stock_actual: number;
  stock_minimo: number;
  ubicacion: string;
  codigo_producto: string;
  centro_servicio: string;
};

export default function Inventario() {
  const [searchTerm, setSearchTerm] = useState("");
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMovimiento, setShowMovimiento] = useState(false);
  const [selectedRepuesto, setSelectedRepuesto] = useState<Repuesto | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<"entrada" | "salida">("entrada");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchRepuestos();
  }, []);

  const fetchRepuestos = async () => {
    try {
      setLoading(true);
      
      // Fetch repuestos from bodega central
      const { data: repuestosCentral, error: errorCentral } = await supabase
        .from('repuestos')
        .select('*')
        .order('codigo');

      if (errorCentral) throw errorCentral;

      // Fetch stock departamental con datos del repuesto
      const { data: stockDept, error: errorDept } = await supabase
        .from('stock_departamental')
        .select(`
          *,
          centros_servicio(nombre),
          repuestos!stock_departamental_codigo_repuesto_fkey(descripcion, codigo_producto)
        `);

      if (errorDept) throw errorDept;

      // Mapear stock departamental con toda la información
      const stockDeptFormateado = (stockDept || []).map(s => {
        const repuestoInfo = s.repuestos as any;
        return {
          id: s.id,
          codigo: s.codigo_repuesto,
          descripcion: repuestoInfo?.descripcion || s.codigo_repuesto,
          stock_actual: s.cantidad_actual || 0,
          stock_minimo: s.stock_minimo || 0,
          ubicacion: s.ubicacion || 'Sin ubicación',
          codigo_producto: repuestoInfo?.codigo_producto || '',
          centro_servicio: (s.centros_servicio as any)?.nombre || 'Sin centro'
        };
      });

      setRepuestos(stockDeptFormateado);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  const handleMovimiento = (repuesto: Repuesto) => {
    setSelectedRepuesto(repuesto);
    setShowMovimiento(true);
  };

  const handleImportZona5 = async () => {
    setImporting(true);
    toast.loading('Importando datos de Zona 5...');
    
    try {
      const result = await importRepuestosZona5();
      
      if (result.success) {
        toast.success(`Importación completada: ${result.processedCount} registros procesados`);
        if (result.errorCount > 0) {
          toast.warning(`${result.errorCount} registros con errores`);
        }
        fetchRepuestos(); // Recargar datos
      } else {
        toast.error(`Error en importación: ${result.error}`);
      }
    } catch (error) {
      toast.error('Error al importar datos');
      console.error(error);
    } finally {
      setImporting(false);
      toast.dismiss();
    }
  };

  const guardarMovimiento = async () => {
    if (!selectedRepuesto || !cantidad) {
      toast.error('Complete todos los campos');
      return;
    }

    const cantidadNum = parseInt(cantidad);
    const nuevoStock = tipoMovimiento === "entrada" 
      ? selectedRepuesto.stock_actual + cantidadNum
      : selectedRepuesto.stock_actual - cantidadNum;

    if (nuevoStock < 0) {
      toast.error('Stock insuficiente');
      return;
    }

    // Actualizar localmente
    setRepuestos(prev => prev.map(r => 
      r.id === selectedRepuesto.id 
        ? { ...r, stock_actual: nuevoStock }
        : r
    ));

    toast.success(`Movimiento registrado: ${tipoMovimiento === "entrada" ? "+" : "-"}${cantidadNum} unidades`);
    setShowMovimiento(false);
    setCantidad("");
    setMotivo("");
  };

  const filteredRepuestos = repuestos.filter(r =>
    r.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stockBajo = repuestos.filter(r => r.stock_actual <= r.stock_minimo).length;
  const stockTotal = repuestos.reduce((acc, r) => acc + r.stock_actual, 0);

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
        <Button
          onClick={handleImportZona5}
          disabled={importing}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {importing ? 'Importando...' : 'Importar Bodega Zona 5'}
        </Button>
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
            <div className="text-2xl font-bold">{stockTotal}</div>
            <p className="text-xs text-muted-foreground">{repuestos.length} referencias</p>
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
            <p className="text-xs text-muted-foreground">Requieren reabastecimiento</p>
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

        <div className="md:row-span-2">
          <PuertaEntradaWidget />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventario de Repuestos</CardTitle>
          <CardDescription>
            {filteredRepuestos.length} repuestos en inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar repuestos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">Cargando inventario...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Centro/Bodega</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Stock Actual</TableHead>
                  <TableHead>Stock Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepuestos.map((repuesto) => (
                  <TableRow key={repuesto.id}>
                    <TableCell className="font-medium">{repuesto.codigo}</TableCell>
                    <TableCell>{repuesto.descripcion}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{repuesto.centro_servicio}</Badge>
                    </TableCell>
                    <TableCell>{repuesto.ubicacion}</TableCell>
                    <TableCell>
                      <span className={repuesto.stock_actual <= repuesto.stock_minimo ? "text-orange-500 font-bold" : ""}>
                        {repuesto.stock_actual}
                      </span>
                    </TableCell>
                    <TableCell>{repuesto.stock_minimo}</TableCell>
                    <TableCell>
                      {repuesto.stock_actual === 0 ? (
                        <Badge variant="destructive">Sin stock</Badge>
                      ) : repuesto.stock_actual <= repuesto.stock_minimo ? (
                        <Badge className="bg-orange-500">Stock bajo</Badge>
                      ) : (
                        <Badge className="bg-green-500">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMovimiento(repuesto)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showMovimiento} onOpenChange={setShowMovimiento}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
            <DialogDescription>
              {selectedRepuesto?.descripcion}
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
                <strong>Stock actual:</strong> {selectedRepuesto?.stock_actual}
              </p>
              {cantidad && (
                <p className="text-sm mt-1">
                  <strong>Nuevo stock:</strong> {
                    tipoMovimiento === "entrada"
                      ? (selectedRepuesto?.stock_actual || 0) + parseInt(cantidad || "0")
                      : (selectedRepuesto?.stock_actual || 0) - parseInt(cantidad || "0")
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
