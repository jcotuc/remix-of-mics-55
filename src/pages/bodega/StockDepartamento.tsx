import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Package, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type RepuestoABC = {
  codigo: string;
  descripcion: string;
  clasificacion: 'A' | 'B' | 'C';
  frecuencia_uso: number;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  requiere_reabasto: boolean;
};

type StockDepartamental = {
  centro_servicio: string;
  codigo_repuesto: string;
  descripcion: string;
  cantidad_actual: number;
  stock_minimo: number;
  requiere_reabasto: boolean;
  clasificacion: 'A' | 'B' | 'C';
};

const COLORS = {
  A: '#ef4444', // rojo
  B: '#f59e0b', // naranja
  C: '#10b981'  // verde
};

export default function StockDepartamento() {
  const [repuestosABC, setRepuestosABC] = useState<RepuestoABC[]>([]);
  const [stockDepartamental, setStockDepartamental] = useState<StockDepartamental[]>([]);
  const [centrosServicio, setCentrosServicio] = useState<any[]>([]);
  const [centroSeleccionado, setCentroSeleccionado] = useState<string>('');
  const [clasificacionFiltro, setClasificacionFiltro] = useState<'all' | 'A' | 'B' | 'C'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (centroSeleccionado) {
      fetchStockDepartamental(centroSeleccionado);
    }
  }, [centroSeleccionado]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch centros de servicio
      const { data: centros, error: centrosError } = await supabase
        .from('centros_servicio')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (centrosError) throw centrosError;
      setCentrosServicio(centros || []);

      // Fetch clasificación ABC
      const { data: abc, error: abcError } = await supabase
        .from('repuestos_clasificacion_abc')
        .select('*')
        .order('clasificacion');

      if (abcError) throw abcError;

      // Enriquecer con info de repuestos
      const repuestosEnriquecidos = await Promise.all(
        (abc || []).map(async (item) => {
          const { data: repuesto } = await supabase
            .from('repuestos')
            .select('descripcion, stock_actual')
            .eq('codigo', item.codigo_repuesto)
            .single();

          return {
            codigo: item.codigo_repuesto,
            descripcion: repuesto?.descripcion || 'Sin descripción',
            clasificacion: item.clasificacion as 'A' | 'B' | 'C',
            frecuencia_uso: item.frecuencia_uso || 0,
            stock_actual: repuesto?.stock_actual || 0,
            stock_minimo: item.stock_minimo_sugerido || 0,
            stock_maximo: item.stock_maximo_sugerido || 0,
            requiere_reabasto: (repuesto?.stock_actual || 0) < (item.stock_minimo_sugerido || 0)
          };
        })
      );

      setRepuestosABC(repuestosEnriquecidos);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockDepartamental = async (centroId: string) => {
    try {
      const { data, error } = await supabase
        .from('stock_departamental')
        .select(`
          *,
          centros_servicio(nombre)
        `)
        .eq('centro_servicio_id', centroId);

      if (error) throw error;

      const stockEnriquecido = await Promise.all(
        (data || []).map(async (item) => {
          const { data: repuesto } = await supabase
            .from('repuestos')
            .select('descripcion')
            .eq('codigo', item.codigo_repuesto)
            .single();

          const { data: abc } = await supabase
            .from('repuestos_clasificacion_abc')
            .select('clasificacion')
            .eq('codigo_repuesto', item.codigo_repuesto)
            .single();

          return {
            centro_servicio: item.centros_servicio?.nombre || 'N/A',
            codigo_repuesto: item.codigo_repuesto,
            descripcion: repuesto?.descripcion || 'Sin descripción',
            cantidad_actual: item.cantidad_actual,
            stock_minimo: item.stock_minimo,
            requiere_reabasto: item.cantidad_actual < item.stock_minimo,
            clasificacion: (abc?.clasificacion as 'A' | 'B' | 'C') || 'C'
          };
        })
      );

      setStockDepartamental(stockEnriquecido);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar stock departamental');
    }
  };

  const calcularReabastecimientoAutomatico = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('No se pudo identificar el usuario');
        return;
      }

      // Filtrar repuestos que necesitan reabastecimiento
      const repuestosParaReabastecer = stockDepartamental.filter(r => r.requiere_reabasto);

      if (repuestosParaReabastecer.length === 0) {
        toast.info('No hay repuestos que requieran reabastecimiento');
        return;
      }

      // Obtener centro central
      const { data: centroCentral } = await supabase
        .from('centros_servicio')
        .select('id')
        .eq('es_central', true)
        .single();

      // Crear tránsito automático
      const numeroTransito = `AUTO-${Date.now()}`;
      const { data: transito, error: transitoError } = await supabase
        .from('transitos_bodega')
        .insert({
          numero_transito: numeroTransito,
          centro_origen_id: centroCentral?.id,
          centro_destino_id: centroSeleccionado,
          estado: 'en_transito',
          enviado_por: user.id,
          notas: 'Reabastecimiento automático basado en clasificación ABC'
        })
        .select()
        .single();

      if (transitoError) throw transitoError;

      // Crear detalles basados en clasificación
      const detalles = repuestosParaReabastecer.map(rep => {
        let cantidadReabastecer = 0;
        
        // Clase A: Reabasto completo al stock máximo
        if (rep.clasificacion === 'A') {
          const abc = repuestosABC.find(r => r.codigo === rep.codigo_repuesto);
          cantidadReabastecer = (abc?.stock_maximo || rep.stock_minimo * 2) - rep.cantidad_actual;
        }
        // Clase B: Reabasto al stock mínimo + 50%
        else if (rep.clasificacion === 'B') {
          cantidadReabastecer = Math.ceil(rep.stock_minimo * 1.5) - rep.cantidad_actual;
        }
        // Clase C: Reabasto solo al stock mínimo
        else {
          cantidadReabastecer = rep.stock_minimo - rep.cantidad_actual;
        }

        return {
          transito_id: transito.id,
          codigo_repuesto: rep.codigo_repuesto,
          descripcion: rep.descripcion,
          cantidad_enviada: Math.max(cantidadReabastecer, 0),
          verificado: false
        };
      });

      const { error: detallesError } = await supabase
        .from('transitos_detalle')
        .insert(detalles);

      if (detallesError) throw detallesError;

      toast.success(`Reabastecimiento automático creado: ${numeroTransito}`);
      await fetchStockDepartamental(centroSeleccionado);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al calcular reabastecimiento');
    }
  };

  const filteredRepuestos = repuestosABC.filter(r => 
    clasificacionFiltro === 'all' || r.clasificacion === clasificacionFiltro
  );

  const dataPorClasificacion = [
    { name: 'Clase A', value: repuestosABC.filter(r => r.clasificacion === 'A').length, color: COLORS.A },
    { name: 'Clase B', value: repuestosABC.filter(r => r.clasificacion === 'B').length, color: COLORS.B },
    { name: 'Clase C', value: repuestosABC.filter(r => r.clasificacion === 'C').length, color: COLORS.C }
  ];

  const dataFrecuencia = filteredRepuestos.slice(0, 10).map(r => ({
    codigo: r.codigo.substring(0, 10),
    frecuencia: r.frecuencia_uso,
    clasificacion: r.clasificacion
  }));

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Stock Departamento - Clasificación ABC
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestión inteligente de inventario por prioridad de uso
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" style={{ color: COLORS.A }} />
              Clase A (Alto)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {repuestosABC.filter(r => r.clasificacion === 'A').length}
            </div>
            <p className="text-xs text-muted-foreground">80% de la rotación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" style={{ color: COLORS.B }} />
              Clase B (Medio)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {repuestosABC.filter(r => r.clasificacion === 'B').length}
            </div>
            <p className="text-xs text-muted-foreground">15% de la rotación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" style={{ color: COLORS.C }} />
              Clase C (Bajo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {repuestosABC.filter(r => r.clasificacion === 'C').length}
            </div>
            <p className="text-xs text-muted-foreground">5% de la rotación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Requieren Reabasto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {repuestosABC.filter(r => r.requiere_reabasto).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="visualizacion" className="space-y-4">
        <TabsList>
          <TabsTrigger value="visualizacion">Visualización</TabsTrigger>
          <TabsTrigger value="listado">Listado Completo</TabsTrigger>
          <TabsTrigger value="departamental">Stock Departamental</TabsTrigger>
        </TabsList>

        <TabsContent value="visualizacion" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Clasificación</CardTitle>
                <CardDescription>Repuestos por clase ABC</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dataPorClasificacion}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dataPorClasificacion.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 10 por Frecuencia de Uso</CardTitle>
                <CardDescription>Repuestos más utilizados</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dataFrecuencia}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="codigo" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="frecuencia" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="listado" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Clasificación ABC de Repuestos</CardTitle>
                  <CardDescription>Gestión por prioridad de rotación</CardDescription>
                </div>
                <Select value={clasificacionFiltro} onValueChange={(v: any) => setClasificacionFiltro(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las Clases</SelectItem>
                    <SelectItem value="A">Solo Clase A</SelectItem>
                    <SelectItem value="B">Solo Clase B</SelectItem>
                    <SelectItem value="C">Solo Clase C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Cargando...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Clase</TableHead>
                      <TableHead>Frecuencia</TableHead>
                      <TableHead>Stock Actual</TableHead>
                      <TableHead>Stock Mín/Máx</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRepuestos.map((rep) => (
                      <TableRow key={rep.codigo}>
                        <TableCell className="font-medium">{rep.codigo}</TableCell>
                        <TableCell>{rep.descripcion}</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: COLORS[rep.clasificacion] }}>
                            {rep.clasificacion}
                          </Badge>
                        </TableCell>
                        <TableCell>{rep.frecuencia_uso}</TableCell>
                        <TableCell>
                          <span className={rep.requiere_reabasto ? "text-orange-500 font-bold" : ""}>
                            {rep.stock_actual}
                          </span>
                        </TableCell>
                        <TableCell>
                          {rep.stock_minimo} / {rep.stock_maximo}
                        </TableCell>
                        <TableCell>
                          {rep.requiere_reabasto ? (
                            <Badge variant="destructive">Bajo Stock</Badge>
                          ) : (
                            <Badge className="bg-green-500">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departamental" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stock en Centros de Servicio</CardTitle>
                  <CardDescription>Gestión de reabastecimiento automático</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={centroSeleccionado} onValueChange={setCentroSeleccionado}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Seleccione un centro" />
                    </SelectTrigger>
                    <SelectContent>
                      {centrosServicio.map((centro) => (
                        <SelectItem key={centro.id} value={centro.id}>
                          {centro.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {centroSeleccionado && stockDepartamental.some(r => r.requiere_reabasto) && (
                    <Button onClick={calcularReabastecimientoAutomatico}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reabasto Automático
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!centroSeleccionado ? (
                <div className="text-center py-12 text-muted-foreground">
                  Seleccione un centro de servicio para ver su stock
                </div>
              ) : stockDepartamental.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay stock registrado para este centro
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Clase</TableHead>
                      <TableHead>Stock Actual</TableHead>
                      <TableHead>Stock Mínimo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockDepartamental.map((stock, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{stock.codigo_repuesto}</TableCell>
                        <TableCell>{stock.descripcion}</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: COLORS[stock.clasificacion] }}>
                            {stock.clasificacion}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={stock.requiere_reabasto ? "text-orange-500 font-bold" : ""}>
                            {stock.cantidad_actual}
                          </span>
                        </TableCell>
                        <TableCell>{stock.stock_minimo}</TableCell>
                        <TableCell>
                          {stock.requiere_reabasto ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Requiere Reabasto
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}