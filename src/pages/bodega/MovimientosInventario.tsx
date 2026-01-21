import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2, Package, Search, History, AlertTriangle, Warehouse } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatFechaHora } from "@/utils/dateFormatters";

type TipoMovimiento = "entrada" | "salida";

interface ItemMovimiento {
  id: string;
  tipo: TipoMovimiento;
  codigo_repuesto: string;
  descripcion: string;
  cantidad: number;
  ubicacion: string;
  stock_actual?: number;
}

const MOTIVOS_ENTRADA = [
  { value: "compra", label: "Compra / Recepción" },
  { value: "devolucion_cliente", label: "Devolución de cliente" },
  { value: "transferencia_entrada", label: "Transferencia entre bodegas" },
  { value: "ajuste_inventario_entrada", label: "Ajuste por inventario físico" },
  { value: "reparacion", label: "Reparación / Reacondicionamiento" },
  { value: "otro_entrada", label: "Otro" },
];

const MOTIVOS_SALIDA = [
  { value: "despacho_tecnico", label: "Despacho a técnico" },
  { value: "consumo_interno", label: "Consumo interno" },
  { value: "transferencia_salida", label: "Transferencia entre bodegas" },
  { value: "merma", label: "Merma / Daño" },
  { value: "ajuste_inventario_salida", label: "Ajuste por inventario físico" },
  { value: "muestra", label: "Muestra / Demo" },
  { value: "otro_salida", label: "Otro" },
];

export default function MovimientosInventario() {
  const queryClient = useQueryClient();
  const [tipoActivo, setTipoActivo] = useState<TipoMovimiento>("entrada");
  const [items, setItems] = useState<ItemMovimiento[]>([]);
  const [motivo, setMotivo] = useState("");
  const [referencia, setReferencia] = useState("");
  const [searchRepuesto, setSearchRepuesto] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [bodegaFiltro, setBodegaFiltro] = useState<string>("todas");
  
  const [formItem, setFormItem] = useState({
    codigo_repuesto: '',
    descripcion: '',
    cantidad: 0,
    ubicacion: ''
  });

  // Obtener bodegas únicas del inventario
  const { data: bodegasDisponibles = [] } = useQuery({
    queryKey: ['bodegas-disponibles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventario')
        .select('bodega')
        .not('bodega', 'is', null);
      if (!data) return [];
      const bodegas = [...new Set(data.map(d => d.bodega).filter(Boolean))] as string[];
      return bodegas.sort();
    },
  });

  // Búsqueda de repuestos
  const { data: resultadosBusqueda = [] } = useQuery({
    queryKey: ['busqueda-repuestos', searchRepuesto],
    queryFn: async () => {
      if (!searchRepuesto || searchRepuesto.length < 2) return [];
      const { data } = await supabase
        .from('repuestos')
        .select('codigo, descripcion')
        .or(`codigo.ilike.%${searchRepuesto}%,descripcion.ilike.%${searchRepuesto}%`)
        .limit(10);
      return data || [];
    },
    enabled: searchRepuesto.length >= 2 && isSearching,
  });

  // Stock actual del repuesto seleccionado (filtrado por bodega)
  const { data: stockActual } = useQuery({
    queryKey: ['stock-repuesto', formItem.codigo_repuesto, bodegaFiltro],
    queryFn: async () => {
      if (!formItem.codigo_repuesto) return null;
      let query = supabase
        .from('inventario')
        .select('cantidad, ubicacion_legacy, bodega')
        .eq('codigo_repuesto', formItem.codigo_repuesto);
      
      if (bodegaFiltro && bodegaFiltro !== "todas") {
        query = query.eq('bodega', bodegaFiltro);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: !!formItem.codigo_repuesto,
  });

  // Movimientos recientes
  const { data: movimientosRecientes = [] } = useQuery({
    queryKey: ['movimientos-recientes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('movimientos_inventario')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);
      return data || [];
    },
  });

  const stockTotal = useMemo(() => {
    if (!stockActual) return 0;
    return stockActual.reduce((acc, s) => acc + s.cantidad, 0);
  }, [stockActual]);

  const ubicacionesSugeridas = useMemo(() => {
    if (!stockActual) return [];
    return stockActual.map(s => s.ubicacion_legacy).filter(Boolean);
  }, [stockActual]);

  const seleccionarRepuesto = (rep: { codigo: string; descripcion: string }) => {
    setFormItem({
      ...formItem,
      codigo_repuesto: rep.codigo,
      descripcion: rep.descripcion,
    });
    setSearchRepuesto('');
    setIsSearching(false);
  };

  const agregarItem = () => {
    if (!formItem.codigo_repuesto || !formItem.cantidad || !formItem.ubicacion) {
      toast.error("Complete código, cantidad y ubicación");
      return;
    }

    // Validación de stock para salidas
    if (tipoActivo === "salida" && stockTotal < formItem.cantidad) {
      toast.error(`Stock insuficiente. Disponible: ${stockTotal}`);
      return;
    }

    const nuevoItem: ItemMovimiento = {
      id: crypto.randomUUID(),
      tipo: tipoActivo,
      codigo_repuesto: formItem.codigo_repuesto,
      descripcion: formItem.descripcion,
      cantidad: formItem.cantidad,
      ubicacion: formItem.ubicacion,
      stock_actual: stockTotal,
    };

    setItems([...items, nuevoItem]);
    setFormItem({ codigo_repuesto: '', descripcion: '', cantidad: 0, ubicacion: '' });
    toast.success("Item agregado al lote");
  };

  const eliminarItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const procesarMovimientos = async () => {
    if (items.length === 0) {
      toast.error("Agregue al menos un item");
      return;
    }

    if (!motivo) {
      toast.error("Seleccione un motivo");
      return;
    }

    try {
      for (const item of items) {
        await (supabase as any).from('movimientos_inventario').insert({
          repuesto_id: 0, // Will need actual repuesto_id lookup
          tipo_movimiento: item.tipo === "entrada" ? "ENTRADA" : "SALIDA",
          cantidad: item.cantidad,
          ubicacion: item.ubicacion,
          motivo: motivo,
          referencia: referencia || 'Movimiento manual',
          centro_servicio_id: 1, // Will need actual centro
          stock_anterior: 0,
          stock_nuevo: item.cantidad,
          created_by_id: 1
        });
      }

      toast.success(`${items.length} movimiento(s) procesado(s) exitosamente`);
      setItems([]);
      setMotivo('');
      setReferencia('');
      queryClient.invalidateQueries({ queryKey: ['movimientos-recientes'] });
    } catch (error) {
      toast.error("Error al procesar movimientos");
      console.error(error);
    }
  };

  const totales = useMemo(() => {
    const entradas = items.filter(i => i.tipo === "entrada").reduce((acc, i) => acc + i.cantidad, 0);
    const salidas = items.filter(i => i.tipo === "salida").reduce((acc, i) => acc + i.cantidad, 0);
    return { entradas, salidas, neto: entradas - salidas };
  }, [items]);

  const motivosActivos = tipoActivo === "entrada" ? MOTIVOS_ENTRADA : MOTIVOS_SALIDA;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Movimientos de Inventario</h1>
          <p className="text-muted-foreground text-sm">Registrar entradas y salidas manuales</p>
        </div>
      </div>

      {/* Filtro de bodega y Toggle de tipo */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Filtro de Bodega */}
        <div className="flex items-center gap-2 sm:min-w-[250px]">
          <Warehouse className="h-5 w-5 text-muted-foreground" />
          <Select value={bodegaFiltro} onValueChange={setBodegaFiltro}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Filtrar por bodega..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las bodegas</SelectItem>
              {bodegasDisponibles.map((bodega) => (
                <SelectItem key={bodega} value={bodega}>{bodega}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Toggle de tipo */}
        <div className="flex gap-2 flex-1">
          <Button
            size="lg"
            variant={tipoActivo === "entrada" ? "default" : "outline"}
            className={cn(
              "flex-1 gap-2 transition-all",
              tipoActivo === "entrada" && "bg-green-600 hover:bg-green-700"
            )}
            onClick={() => setTipoActivo("entrada")}
          >
            <ArrowDownCircle className="h-5 w-5" />
            ENTRADA
          </Button>
          <Button
            size="lg"
            variant={tipoActivo === "salida" ? "default" : "outline"}
            className={cn(
              "flex-1 gap-2 transition-all",
              tipoActivo === "salida" && "bg-red-600 hover:bg-red-700"
            )}
            onClick={() => setTipoActivo("salida")}
          >
            <ArrowUpCircle className="h-5 w-5" />
            SALIDA
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulario de item */}
        <Card className={cn(
          "lg:col-span-2 border-2 transition-colors",
          tipoActivo === "entrada" ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900"
        )}>
          <CardHeader className={cn(
            "rounded-t-lg",
            tipoActivo === "entrada" ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"
          )}>
            <CardTitle className="flex items-center gap-2">
              {tipoActivo === "entrada" ? (
                <ArrowDownCircle className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowUpCircle className="h-5 w-5 text-red-600" />
              )}
              Agregar {tipoActivo === "entrada" ? "Entrada" : "Salida"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Búsqueda de repuesto */}
            <div className="relative">
              <Label>Buscar Repuesto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código o descripción..."
                  value={searchRepuesto}
                  onChange={(e) => {
                    setSearchRepuesto(e.target.value);
                    setIsSearching(true);
                  }}
                  className="pl-10"
                />
              </div>
              {isSearching && resultadosBusqueda.length > 0 && (
                <Card className="absolute z-10 w-full mt-1 shadow-lg">
                  <ScrollArea className="max-h-48">
                    {resultadosBusqueda.map((rep) => (
                      <div
                        key={rep.codigo}
                        className="p-2 hover:bg-muted cursor-pointer border-b last:border-0"
                        onClick={() => seleccionarRepuesto(rep)}
                      >
                        <p className="font-mono text-sm">{rep.codigo}</p>
                        <p className="text-xs text-muted-foreground truncate">{rep.descripcion}</p>
                      </div>
                    ))}
                  </ScrollArea>
                </Card>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Código</Label>
                <Input
                  placeholder="REP-001"
                  value={formItem.codigo_repuesto}
                  onChange={(e) => setFormItem({...formItem, codigo_repuesto: e.target.value})}
                  className="font-mono"
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input
                  placeholder="Descripción del repuesto"
                  value={formItem.descripcion}
                  onChange={(e) => setFormItem({...formItem, descripcion: e.target.value})}
                />
              </div>
            </div>

            {/* Info de stock */}
            {formItem.codigo_repuesto && (
              <div className={cn(
                "p-3 rounded-lg text-sm",
                tipoActivo === "salida" && stockTotal < formItem.cantidad ? "bg-red-100 dark:bg-red-950" : "bg-muted"
              )}>
                <div className="flex justify-between items-center">
                  <span>Stock disponible:</span>
                  <Badge variant={stockTotal > 0 ? "default" : "destructive"}>{stockTotal}</Badge>
                </div>
                {ubicacionesSugeridas.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ubicaciones: {ubicacionesSugeridas.join(", ")}
                  </p>
                )}
                {tipoActivo === "salida" && stockTotal < formItem.cantidad && formItem.cantidad > 0 && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Stock insuficiente para esta salida
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="1"
                  value={formItem.cantidad || ''}
                  onChange={(e) => setFormItem({...formItem, cantidad: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Ubicación</Label>
                {ubicacionesSugeridas.length > 0 ? (
                  <Select 
                    value={formItem.ubicacion} 
                    onValueChange={(value) => setFormItem({...formItem, ubicacion: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ubicación..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ubicacionesSugeridas.map((ub) => (
                        <SelectItem key={ub} value={ub}>{ub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="A-01-01"
                    value={formItem.ubicacion}
                    onChange={(e) => setFormItem({...formItem, ubicacion: e.target.value})}
                  />
                )}
              </div>
            </div>

            <Button onClick={agregarItem} className="w-full" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Agregar al Lote
            </Button>
          </CardContent>
        </Card>

        {/* Historial reciente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Movimientos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {movimientosRecientes.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">Sin movimientos recientes</p>
              ) : (
                <div className="space-y-2">
                  {movimientosRecientes.map((mov) => (
                    <div key={mov.id} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                      {mov.tipo_movimiento === "ENTRADA" ? (
                        <ArrowDownCircle className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4 text-red-600 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs truncate">ID: {mov.repuesto_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFechaHora(mov.created_at).slice(0, 11)}
                        </p>
                      </div>
                      <Badge variant={mov.tipo_movimiento === "ENTRADA" ? "default" : "secondary"} className="shrink-0">
                        {mov.tipo_movimiento === "ENTRADA" ? "+" : "-"}{mov.cantidad}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Lote actual */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lote de Movimientos ({items.length} items)</span>
              <div className="flex gap-4 text-sm font-normal">
                <span className="text-green-600">Entradas: +{totales.entradas}</span>
                <span className="text-red-600">Salidas: -{totales.salidas}</span>
                <Badge variant={totales.neto >= 0 ? "default" : "destructive"}>
                  Neto: {totales.neto >= 0 ? "+" : ""}{totales.neto}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Referencia (Opcional)</Label>
                <Input
                  placeholder="Número de orden, factura, etc."
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                />
              </div>
              <div>
                <Label>Motivo *</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {motivosActivos.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Tipo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="hidden sm:table-cell">Descripción</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.tipo === "entrada" ? (
                          <ArrowDownCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowUpCircle className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.codigo_repuesto}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm truncate max-w-[200px]">
                        {item.descripcion}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={item.tipo === "entrada" ? "text-green-600" : "text-red-600"}>
                          {item.tipo === "entrada" ? "+" : "-"}{item.cantidad}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.ubicacion}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => eliminarItem(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setItems([])} className="flex-1">
                Limpiar Lote
              </Button>
              <Button onClick={procesarMovimientos} className="flex-1" size="lg">
                Procesar {items.length} Movimiento(s)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
