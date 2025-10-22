import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Download, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MovimientoCardex {
  fecha: string;
  tipo: string;
  documento: string;
  entrada: number;
  salida: number;
  saldo: number;
  ubicacion: string;
  responsable: string;
  observaciones: string;
}

export default function ConsultaCardex() {
  const [codigoRepuesto, setCodigoRepuesto] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tipoMovimientoFiltro, setTipoMovimientoFiltro] = useState('todos');
  const [ubicacionFiltro, setUbicacionFiltro] = useState('');
  const [movimientos, setMovimientos] = useState<MovimientoCardex[]>([]);
  const [loading, setLoading] = useState(false);
  const [saldoFinal, setSaldoFinal] = useState(0);
  const [productoInfo, setProductoInfo] = useState<{ codigo: string; descripcion: string } | null>(null);

  const buscarKardex = async () => {
    if (!codigoRepuesto.trim()) {
      toast.error("Ingrese un código de producto");
      return;
    }

    if (!fechaInicio || !fechaFin) {
      toast.error("Seleccione el rango de fechas");
      return;
    }

    setLoading(true);
    try {
      // Obtener información del producto
      const { data: repuesto, error: repuestoError } = await supabase
        .from('repuestos')
        .select('codigo, descripcion')
        .eq('codigo', codigoRepuesto)
        .single();

      if (repuestoError) {
        toast.error("Producto no encontrado");
        setLoading(false);
        return;
      }

      setProductoInfo(repuesto);

      // Obtener movimientos en el rango de fechas
      let query = supabase
        .from('movimientos_inventario')
        .select('*')
        .eq('codigo_repuesto', codigoRepuesto)
        .gte('created_at', fechaInicio)
        .lte('created_at', fechaFin + 'T23:59:59')
        .order('created_at', { ascending: true });

      // Aplicar filtros opcionales
      if (tipoMovimientoFiltro !== 'todos') {
        const tiposFiltro: Array<'entrada' | 'salida' | 'ajuste' | 'transferencia' | 'devolucion'> = 
          [tipoMovimientoFiltro as 'entrada' | 'salida' | 'ajuste' | 'transferencia' | 'devolucion'];
        query = query.in('tipo_movimiento', tiposFiltro);
      }

      if (ubicacionFiltro.trim()) {
        query = query.eq('ubicacion', ubicacionFiltro);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Procesar movimientos y calcular saldo
      let saldoAcumulado = 0;
      const movimientosFormateados = data.map(m => {
        const esEntrada = ['entrada', 'devolucion'].includes(m.tipo_movimiento);
        const cantidad = m.cantidad;
        
        const entrada = esEntrada ? cantidad : 0;
        const salida = esEntrada ? 0 : cantidad;
        
        saldoAcumulado = esEntrada ? saldoAcumulado + cantidad : saldoAcumulado - cantidad;

        return {
          fecha: new Date(m.created_at).toLocaleString('es-GT'),
          tipo: m.tipo_movimiento,
          documento: m.referencia || 'N/A',
          entrada,
          salida,
          saldo: saldoAcumulado,
          ubicacion: m.ubicacion || 'N/A',
          responsable: 'Sistema',
          observaciones: m.motivo || '-'
        };
      });

      setMovimientos(movimientosFormateados);
      setSaldoFinal(saldoAcumulado);
      toast.success(`${movimientosFormateados.length} movimientos encontrados`);
    } catch (error: any) {
      toast.error("Error al buscar kardex");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setCodigoRepuesto('');
    setFechaInicio('');
    setFechaFin('');
    setTipoMovimientoFiltro('todos');
    setUbicacionFiltro('');
    setMovimientos([]);
    setProductoInfo(null);
    setSaldoFinal(0);
  };

  const exportarExcel = () => {
    toast.info("Función de exportación disponible próximamente");
  };

  const totalEntradas = movimientos.reduce((sum, m) => sum + m.entrada, 0);
  const totalSalidas = movimientos.reduce((sum, m) => sum + m.salida, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Consulta de Kardex</h1>
            <p className="text-muted-foreground">Historial detallado de movimientos de inventario</p>
          </div>
        </div>
        {movimientos.length > 0 && (
          <Button onClick={exportarExcel} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Código de Producto *</Label>
              <Input
                placeholder="Ej: REP-001"
                value={codigoRepuesto}
                onChange={(e) => setCodigoRepuesto(e.target.value.toUpperCase())}
              />
            </div>

            <div>
              <Label>Fecha Inicio *</Label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>

            <div>
              <Label>Fecha Fin *</Label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>

            <div>
              <Label>Tipo de Movimiento</Label>
              <Select value={tipoMovimientoFiltro} onValueChange={setTipoMovimientoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="devolucion">Devolución</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ubicación (Opcional)</Label>
              <Input
                placeholder="Ej: A-01-01"
                value={ubicacionFiltro}
                onChange={(e) => setUbicacionFiltro(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={limpiarFiltros}>
              Limpiar
            </Button>
            <Button onClick={buscarKardex} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {productoInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Información del Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Código</p>
                <p className="font-semibold">{productoInfo.codigo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="font-semibold">{productoInfo.descripcion}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Movimientos</p>
                <p className="font-semibold">{movimientos.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Final</p>
                <p className="font-semibold text-lg">{saldoFinal}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {movimientos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kardex - Movimientos de Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                    <TableHead className="text-right">Salida</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Observaciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos.map((mov, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="whitespace-nowrap">{mov.fecha}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            mov.tipo === 'entrada' || mov.tipo === 'devolucion' ? 'default' : 
                            mov.tipo === 'salida' ? 'destructive' : 'secondary'
                          }
                        >
                          {mov.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{mov.documento}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        {mov.entrada > 0 ? `+${mov.entrada}` : ''}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-semibold">
                        {mov.salida > 0 ? `-${mov.salida}` : ''}
                      </TableCell>
                      <TableCell className="text-right font-bold">{mov.saldo}</TableCell>
                      <TableCell>{mov.ubicacion}</TableCell>
                      <TableCell>{mov.responsable}</TableCell>
                      <TableCell className="max-w-xs truncate">{mov.observaciones}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-bold">
                    <TableCell colSpan={3}>TOTALES</TableCell>
                    <TableCell className="text-right text-green-600">+{totalEntradas}</TableCell>
                    <TableCell className="text-right text-red-600">-{totalSalidas}</TableCell>
                    <TableCell className="text-right text-lg">{saldoFinal}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && movimientos.length === 0 && productoInfo && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No se encontraron movimientos en el rango de fechas seleccionado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
