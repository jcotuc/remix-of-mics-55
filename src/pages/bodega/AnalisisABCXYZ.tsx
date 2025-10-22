import { useState, useEffect } from "react";
import { Package, AlertTriangle, Download, RefreshCw, TrendingUp, Send, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ClasificacionABC = 'A' | 'B' | 'C';

interface CentroServicio {
  id: string;
  codigo: string;
  nombre: string;
  es_central: boolean;
}

interface StockDepartamental {
  centro_servicio_id: string;
  codigo_repuesto: string;
  cantidad_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  ubicacion?: string;
  centros_servicio?: CentroServicio;
  repuestos?: {
    codigo: string;
    descripcion: string;
    clave: string;
  };
}

interface NecesidadReabastecimiento {
  centro_servicio: string;
  codigo_centro: string;
  codigo_repuesto: string;
  descripcion_repuesto: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  cantidad_sugerida: number;
  clasificacion_abc: ClasificacionABC;
  clasificacion_xyz: 'X' | 'Y' | 'Z';
  categoria_abcxyz: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
}

const ESTRATEGIAS_ABCXYZ: Record<string, { estrategia: string; nivel: string; frecuencia: string }> = {
  'AX': { estrategia: 'Reposición frecuente, stock bajo, alta prioridad', nivel: 'Muy alto', frecuencia: 'Semanal' },
  'AY': { estrategia: 'Control ajustado a variabilidad', nivel: 'Alto', frecuencia: 'Quincenal' },
  'AZ': { estrategia: 'Bajo stock, revisar bajo pedido', nivel: 'Medio', frecuencia: 'Mensual' },
  'BX': { estrategia: 'Reposición periódica constante', nivel: 'Medio', frecuencia: 'Quincenal' },
  'BY': { estrategia: 'Ajustar stock según variación', nivel: 'Medio', frecuencia: 'Mensual' },
  'BZ': { estrategia: 'Stock mínimo, revisar obsolescencia', nivel: 'Bajo', frecuencia: 'Trimestral' },
  'CX': { estrategia: 'Mantener stock básico', nivel: 'Bajo', frecuencia: 'Mensual' },
  'CY': { estrategia: 'Mantener si es necesario', nivel: 'Bajo', frecuencia: 'Trimestral' },
  'CZ': { estrategia: 'Producto obsoleto, considerar baja', nivel: 'Muy bajo', frecuencia: 'Anual' }
};

export default function AnalisisABCXYZ() {
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [stockDepartamental, setStockDepartamental] = useState<StockDepartamental[]>([]);
  const [necesidades, setNecesidades] = useState<NecesidadReabastecimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [centroSeleccionado, setCentroSeleccionado] = useState<string>("all");
  const [clasificacionFiltro, setClasificacionFiltro] = useState<'all' | ClasificacionABC>('all');
  const [prioridadFiltro, setPrioridadFiltro] = useState<string>("all");
  const [isTransitoDialogOpen, setIsTransitoDialogOpen] = useState(false);
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<string[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar centros de servicio
      const { data: centrosData, error: centrosError } = await supabase
        .from("centros_servicio")
        .select("*")
        .eq("activo", true)
        .order("nombre");

      if (centrosError) throw centrosError;
      setCentros(centrosData || []);

      // Cargar stock departamental con información de repuestos
      const { data: stockDataRaw, error: stockError } = await supabase
        .from("stock_departamental")
        .select(`
          *,
          centros_servicio:centros_servicio(id, codigo, nombre, es_central)
        `);

      if (stockError) throw stockError;

      // Obtener información de repuestos por separado
      const codigosRepuestos = [...new Set(stockDataRaw?.map((s) => s.codigo_repuesto) || [])];
      const { data: repuestosData } = await supabase
        .from("repuestos")
        .select("codigo, descripcion, clave")
        .in("codigo", codigosRepuestos);

      const repuestosMap = new Map(repuestosData?.map((r) => [r.codigo, r]) || []);

      // Combinar datos
      const stockData = (stockDataRaw || []).map((stock) => ({
        ...stock,
        repuestos: repuestosMap.get(stock.codigo_repuesto) || null,
      })) as StockDepartamental[];

      setStockDepartamental(stockData);

      // Calcular necesidades de reabastecimiento
      calcularNecesidades(stockData);

      toast.success("Datos cargados correctamente");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const calcularNecesidades = (stockData: StockDepartamental[]) => {
    const necesidadesCalculadas: NecesidadReabastecimiento[] = [];

    stockData.forEach((stock) => {
      // Solo considerar centros que NO son centrales
      if (stock.centros_servicio?.es_central) return;

      const stockActual = stock.cantidad_actual;
      const stockMinimo = stock.stock_minimo || 0;
      const stockMaximo = stock.stock_maximo || stockMinimo * 2;

      // Calcular si necesita reabastecimiento
      if (stockActual <= stockMinimo) {
        const cantidadSugerida = stockMaximo - stockActual;

        // Determinar clasificación ABC basado en nivel de stock (prioridad)
        let clasificacion_abc: ClasificacionABC = 'C';
        let prioridad: 'Alta' | 'Media' | 'Baja' = 'Baja';

        const porcentajeBajo = stockMinimo > 0 ? (stockActual / stockMinimo) * 100 : 0;

        if (porcentajeBajo <= 25) {
          clasificacion_abc = 'A';
          prioridad = 'Alta';
        } else if (porcentajeBajo <= 50) {
          clasificacion_abc = 'B';
          prioridad = 'Media';
        } else {
          clasificacion_abc = 'C';
          prioridad = 'Baja';
        }

        // Determinar clasificación XYZ basado en variabilidad de demanda
        // Simulamos variabilidad basada en la diferencia entre mínimo y máximo
        let clasificacion_xyz: 'X' | 'Y' | 'Z' = 'X';
        const rangoStock = stockMaximo - stockMinimo;
        const coeficienteVariacion = stockMinimo > 0 ? rangoStock / stockMinimo : 0;

        if (coeficienteVariacion <= 0.5) {
          clasificacion_xyz = 'X'; // Demanda estable
        } else if (coeficienteVariacion <= 1.5) {
          clasificacion_xyz = 'Y'; // Demanda variable
        } else {
          clasificacion_xyz = 'Z'; // Demanda irregular
        }

        const categoria_abcxyz = `${clasificacion_abc}${clasificacion_xyz}`;

        necesidadesCalculadas.push({
          centro_servicio: stock.centros_servicio?.nombre || '',
          codigo_centro: stock.centros_servicio?.codigo || '',
          codigo_repuesto: stock.codigo_repuesto,
          descripcion_repuesto: stock.repuestos?.descripcion || stock.codigo_repuesto,
          stock_actual: stockActual,
          stock_minimo: stockMinimo,
          stock_maximo: stockMaximo,
          cantidad_sugerida: cantidadSugerida,
          clasificacion_abc,
          clasificacion_xyz,
          categoria_abcxyz,
          prioridad,
        });
      }
    });

    // Ordenar por prioridad
    necesidadesCalculadas.sort((a, b) => {
      const prioridadOrder = { 'Alta': 1, 'Media': 2, 'Baja': 3 };
      return prioridadOrder[a.prioridad] - prioridadOrder[b.prioridad];
    });

    setNecesidades(necesidadesCalculadas);
  };

  const necesidadesFiltradas = necesidades.filter((n) => {
    if (centroSeleccionado !== "all" && n.codigo_centro !== centroSeleccionado) return false;
    if (clasificacionFiltro !== "all" && n.clasificacion_abc !== clasificacionFiltro) return false;
    if (prioridadFiltro !== "all" && n.prioridad !== prioridadFiltro) return false;
    return true;
  });

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta':
        return 'destructive';
      case 'Media':
        return 'default';
      case 'Baja':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getClasificacionColor = (clasificacion: ClasificacionABC) => {
    switch (clasificacion) {
      case 'A':
        return 'destructive';
      case 'B':
        return 'default';
      case 'C':
        return 'secondary';
    }
  };

  const handleCrearTransito = async () => {
    if (repuestosSeleccionados.length === 0) {
      toast.error("Seleccione al menos un repuesto");
      return;
    }

    try {
      // Esta funcionalidad se implementaría en la página de tránsitos
      toast.info("Redirigiendo a crear tránsito de bodega...");
      setIsTransitoDialogOpen(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear tránsito");
    }
  };

  const toggleRepuestoSeleccionado = (codigo: string) => {
    setRepuestosSeleccionados((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  // Agrupar necesidades por centro
  const necesidadesPorCentro = necesidadesFiltradas.reduce((acc, nec) => {
    if (!acc[nec.codigo_centro]) {
      acc[nec.codigo_centro] = {
        centro: nec.centro_servicio,
        total: 0,
        alta: 0,
        media: 0,
        baja: 0,
        repuestos: [],
      };
    }
    acc[nec.codigo_centro].total += nec.cantidad_sugerida;
    acc[nec.codigo_centro].repuestos.push(nec);
    if (nec.prioridad === 'Alta') acc[nec.codigo_centro].alta++;
    else if (nec.prioridad === 'Media') acc[nec.codigo_centro].media++;
    else acc[nec.codigo_centro].baja++;
    return acc;
  }, {} as Record<string, any>);

  const totalNecesidadesAlta = necesidadesFiltradas.filter((n) => n.prioridad === 'Alta').length;
  const totalNecesidadesMedia = necesidadesFiltradas.filter((n) => n.prioridad === 'Media').length;
  const totalNecesidadesBaja = necesidadesFiltradas.filter((n) => n.prioridad === 'Baja').length;

  // Contar por categoría ABC-XYZ
  const contarPorCategoria = (cat: string) => {
    return necesidades.filter((n) => n.categoria_abcxyz === cat).length;
  };

  const getCategoriaABCXYZColor = (categoria: string) => {
    const abc = categoria[0];
    if (abc === 'A') return 'bg-red-50 border-red-200';
    if (abc === 'B') return 'bg-orange-50 border-orange-200';
    return 'bg-green-50 border-green-200';
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Análisis ABC-XYZ de Reabastecimiento
          </h1>
          <p className="text-muted-foreground mt-2">
            Clasificación por prioridad (ABC) y variabilidad de demanda (XYZ) para los 13 centros de servicio
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={cargarDatos} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Matriz ABC-XYZ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Matriz ABC-XYZ de Necesidades
          </CardTitle>
          <CardDescription>
            Distribución de repuestos según prioridad (ABC) y variabilidad de demanda (XYZ)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="font-bold"></div>
            <div className="font-bold text-sm">
              <div>X</div>
              <div className="text-xs text-muted-foreground font-normal">Estable</div>
            </div>
            <div className="font-bold text-sm">
              <div>Y</div>
              <div className="text-xs text-muted-foreground font-normal">Variable</div>
            </div>
            <div className="font-bold text-sm">
              <div>Z</div>
              <div className="text-xs text-muted-foreground font-normal">Irregular</div>
            </div>

            <div className="font-bold text-sm flex items-center">
              <div>
                <div>A</div>
                <div className="text-xs text-muted-foreground font-normal">Alta</div>
              </div>
            </div>
            <div className={`border-2 p-4 rounded-lg ${getCategoriaABCXYZColor('AX')}`}>
              <div className="text-2xl font-bold text-red-700">{contarPorCategoria('AX')}</div>
              <p className="text-xs text-red-600">AX</p>
              <p className="text-xs text-muted-foreground mt-1">Crítico estable</p>
            </div>
            <div className={`border-2 p-4 rounded-lg ${getCategoriaABCXYZColor('AY')}`}>
              <div className="text-2xl font-bold text-red-700">{contarPorCategoria('AY')}</div>
              <p className="text-xs text-red-600">AY</p>
              <p className="text-xs text-muted-foreground mt-1">Crítico variable</p>
            </div>
            <div className={`border-2 p-4 rounded-lg ${getCategoriaABCXYZColor('AZ')}`}>
              <div className="text-2xl font-bold text-red-700">{contarPorCategoria('AZ')}</div>
              <p className="text-xs text-red-600">AZ</p>
              <p className="text-xs text-muted-foreground mt-1">Crítico irregular</p>
            </div>

            <div className="font-bold text-sm flex items-center">
              <div>
                <div>B</div>
                <div className="text-xs text-muted-foreground font-normal">Media</div>
              </div>
            </div>
            <div className={`border-2 p-4 rounded-lg ${getCategoriaABCXYZColor('BX')}`}>
              <div className="text-2xl font-bold text-orange-700">{contarPorCategoria('BX')}</div>
              <p className="text-xs text-orange-600">BX</p>
              <p className="text-xs text-muted-foreground mt-1">Moderado estable</p>
            </div>
            <div className={`border-2 p-4 rounded-lg ${getCategoriaABCXYZColor('BY')}`}>
              <div className="text-2xl font-bold text-orange-700">{contarPorCategoria('BY')}</div>
              <p className="text-xs text-orange-600">BY</p>
              <p className="text-xs text-muted-foreground mt-1">Moderado variable</p>
            </div>
            <div className={`border-2 p-4 rounded-lg ${getCategoriaABCXYZColor('BZ')}`}>
              <div className="text-2xl font-bold text-orange-700">{contarPorCategoria('BZ')}</div>
              <p className="text-xs text-orange-600">BZ</p>
              <p className="text-xs text-muted-foreground mt-1">Moderado irregular</p>
            </div>

            <div className="font-bold text-sm flex items-center">
              <div>
                <div>C</div>
                <div className="text-xs text-muted-foreground font-normal">Baja</div>
              </div>
            </div>
            <div className={`border-2 p-4 rounded-lg ${getCategoriaABCXYZColor('CX')}`}>
              <div className="text-2xl font-bold text-green-700">{contarPorCategoria('CX')}</div>
              <p className="text-xs text-green-600">CX</p>
              <p className="text-xs text-muted-foreground mt-1">Normal estable</p>
            </div>
            <div className={`border-2 p-4 rounded-lg ${getCategoriaABCXYZColor('CY')}`}>
              <div className="text-2xl font-bold text-green-700">{contarPorCategoria('CY')}</div>
              <p className="text-xs text-green-600">CY</p>
              <p className="text-xs text-muted-foreground mt-1">Normal variable</p>
            </div>
            <div className={`border-2 p-4 rounded-lg ${getCategoriaABCXYZColor('CZ')}`}>
              <div className="text-2xl font-bold text-green-700">{contarPorCategoria('CZ')}</div>
              <p className="text-xs text-green-600">CZ</p>
              <p className="text-xs text-muted-foreground mt-1">Normal irregular</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de estrategias ABC-XYZ */}
      <Card>
        <CardHeader>
          <CardTitle>Estrategias de Reposición por Categoría ABC-XYZ</CardTitle>
          <CardDescription>Políticas de reabastecimiento según clasificación combinada</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead>Estrategia de Reposición</TableHead>
                <TableHead>Nivel de Control</TableHead>
                <TableHead>Frecuencia de Revisión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(ESTRATEGIAS_ABCXYZ).map(([cat, est]) => {
                const abc = cat[0] as ClasificacionABC;
                return (
                  <TableRow key={cat}>
                    <TableCell>
                      <Badge variant={getClasificacionColor(abc)}>
                        {cat}
                      </Badge>
                    </TableCell>
                    <TableCell>{est.estrategia}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{est.nivel}</Badge>
                    </TableCell>
                    <TableCell>{est.frecuencia}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resumen de Necesidades */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Necesidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{necesidadesFiltradas.length}</div>
            <p className="text-xs text-muted-foreground">Repuestos a reabastecer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Prioridad Alta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalNecesidadesAlta}</div>
            <p className="text-xs text-muted-foreground">Stock crítico ≤25%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              Prioridad Media
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalNecesidadesMedia}</div>
            <p className="text-xs text-muted-foreground">Stock bajo 25-50%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Prioridad Baja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNecesidadesBaja}</div>
            <p className="text-xs text-muted-foreground">Stock 50-100%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="necesidades" className="w-full">
        <TabsList>
          <TabsTrigger value="necesidades">Necesidades de Reabastecimiento</TabsTrigger>
          <TabsTrigger value="centros">Por Centro de Servicio</TabsTrigger>
        </TabsList>

        <TabsContent value="necesidades" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Filtros</CardTitle>
                <Dialog open={isTransitoDialogOpen} onOpenChange={setIsTransitoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={repuestosSeleccionados.length === 0}>
                      <Send className="h-4 w-4 mr-2" />
                      Crear Tránsito ({repuestosSeleccionados.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Tránsito de Bodega</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Se crearán tránsitos para {repuestosSeleccionados.length} repuestos seleccionados
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsTransitoDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCrearTransito}>Crear Tránsito</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Centro de Servicio</Label>
                  <Select value={centroSeleccionado} onValueChange={setCentroSeleccionado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los centros</SelectItem>
                      {centros
                        .filter((c) => !c.es_central)
                        .map((centro) => (
                          <SelectItem key={centro.id} value={centro.codigo}>
                            {centro.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Clasificación</Label>
                  <Select value={clasificacionFiltro} onValueChange={(v: any) => setClasificacionFiltro(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="A">Clase A (Crítico)</SelectItem>
                      <SelectItem value="B">Clase B (Moderado)</SelectItem>
                      <SelectItem value="C">Clase C (Normal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Prioridad</Label>
                  <Select value={prioridadFiltro} onValueChange={setPrioridadFiltro}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Media">Media</SelectItem>
                      <SelectItem value="Baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Necesidades de Reabastecimiento ({necesidadesFiltradas.length})</CardTitle>
              <CardDescription>Repuestos que requieren reposición en centros de servicio</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Calculando necesidades...</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={
                              repuestosSeleccionados.length === necesidadesFiltradas.length &&
                              necesidadesFiltradas.length > 0
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRepuestosSeleccionados(necesidadesFiltradas.map((n) => n.codigo_repuesto));
                              } else {
                                setRepuestosSeleccionados([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Centro</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Stock Actual</TableHead>
                        <TableHead className="text-right">Stock Mín</TableHead>
                        <TableHead className="text-right">Stock Máx</TableHead>
                        <TableHead className="text-right">Cant. Sugerida</TableHead>
                        <TableHead>ABC-XYZ</TableHead>
                        <TableHead>Prioridad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {necesidadesFiltradas.map((necesidad, idx) => (
                        <TableRow key={`${necesidad.codigo_centro}-${necesidad.codigo_repuesto}-${idx}`}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={repuestosSeleccionados.includes(necesidad.codigo_repuesto)}
                              onChange={() => toggleRepuestoSeleccionado(necesidad.codigo_repuesto)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{necesidad.centro_servicio}</TableCell>
                          <TableCell className="font-mono">{necesidad.codigo_repuesto}</TableCell>
                          <TableCell className="max-w-xs truncate">{necesidad.descripcion_repuesto}</TableCell>
                          <TableCell className="text-right">{necesidad.stock_actual}</TableCell>
                          <TableCell className="text-right">{necesidad.stock_minimo}</TableCell>
                          <TableCell className="text-right">{necesidad.stock_maximo}</TableCell>
                          <TableCell className="text-right font-bold">{necesidad.cantidad_sugerida}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge variant={getClasificacionColor(necesidad.clasificacion_abc)} className="text-xs">
                                {necesidad.categoria_abcxyz}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPrioridadColor(necesidad.prioridad)}>{necesidad.prioridad}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="centros" className="space-y-4">
          {Object.entries(necesidadesPorCentro).map(([codigo, info]) => (
            <Card key={codigo}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{info.centro}</CardTitle>
                    <CardDescription>
                      {info.repuestos.length} repuestos necesitan reabastecimiento
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="destructive">{info.alta} Alta</Badge>
                    <Badge variant="default">{info.media} Media</Badge>
                    <Badge variant="secondary">{info.baja} Baja</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Mín/Máx</TableHead>
                      <TableHead className="text-right">Sugerido</TableHead>
                      <TableHead>Prioridad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {info.repuestos.map((rep: NecesidadReabastecimiento, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono">{rep.codigo_repuesto}</TableCell>
                        <TableCell className="max-w-xs truncate">{rep.descripcion_repuesto}</TableCell>
                        <TableCell className="text-right">{rep.stock_actual}</TableCell>
                        <TableCell className="text-right">
                          {rep.stock_minimo} / {rep.stock_maximo}
                        </TableCell>
                        <TableCell className="text-right font-bold">{rep.cantidad_sugerida}</TableCell>
                        <TableCell>
                          <Badge variant={getPrioridadColor(rep.prioridad)}>{rep.prioridad}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

