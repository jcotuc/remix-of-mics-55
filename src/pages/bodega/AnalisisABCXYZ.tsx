import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Package, AlertTriangle, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ClasificacionABC = 'A' | 'B' | 'C';
type ClasificacionXYZ = 'X' | 'Y' | 'Z';
type CategoriaABCXYZ = `${ClasificacionABC}${ClasificacionXYZ}`;

interface ProductoABCXYZ {
  codigo: string;
  descripcion: string;
  precio_unitario: number;
  consumo_mensual: number[];
  consumo_anual: number;
  valor_anual: number;
  clasificacion_abc: ClasificacionABC;
  clasificacion_xyz: ClasificacionXYZ;
  categoria: CategoriaABCXYZ;
  cv: number; // Coeficiente de variación
  stock_actual: number;
  estrategia: string;
  nivel_control: string;
  frecuencia_revision: string;
}

const ESTRATEGIAS: Record<CategoriaABCXYZ, { estrategia: string; nivel: string; frecuencia: string }> = {
  'AX': { estrategia: 'Reposición frecuente, stock bajo, alta prioridad', nivel: 'Muy alto', frecuencia: 'Semanal' },
  'AY': { estrategia: 'Control ajustado a estacionalidad', nivel: 'Alto', frecuencia: 'Quincenal' },
  'AZ': { estrategia: 'Bajo stock, revisar bajo pedido', nivel: 'Medio', frecuencia: 'Mensual' },
  'BX': { estrategia: 'Reposición periódica constante', nivel: 'Medio', frecuencia: 'Quincenal' },
  'BY': { estrategia: 'Ajustar stock según temporada', nivel: 'Medio', frecuencia: 'Mensual' },
  'BZ': { estrategia: 'Stock mínimo, revisar obsolescencia', nivel: 'Bajo', frecuencia: 'Trimestral' },
  'CX': { estrategia: 'Mantener stock básico', nivel: 'Bajo', frecuencia: 'Mensual' },
  'CY': { estrategia: 'Mantener si es necesario', nivel: 'Bajo', frecuencia: 'Trimestral' },
  'CZ': { estrategia: 'Producto obsoleto, considerar baja', nivel: 'Muy bajo', frecuencia: 'Anual' }
};

export default function AnalisisABCXYZ() {
  const [productos, setProductos] = useState<ProductoABCXYZ[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaFiltro, setCategoriaFiltro] = useState<'all' | CategoriaABCXYZ>('all');
  const [clasificacionABC, setClasificacionABC] = useState<'all' | ClasificacionABC>('all');
  const [clasificacionXYZ, setClasificacionXYZ] = useState<'all' | ClasificacionXYZ>('all');

  useEffect(() => {
    calcularABCXYZ();
  }, []);

  const calcularABCXYZ = async () => {
    try {
      setLoading(true);

      // Obtener movimientos de los últimos 12 meses
      const hace12Meses = new Date();
      hace12Meses.setMonth(hace12Meses.getMonth() - 12);

      const { data: movimientos, error: movError } = await supabase
        .from('movimientos_inventario')
        .select('*')
        .gte('created_at', hace12Meses.toISOString())
        .eq('tipo_movimiento', 'salida');

      if (movError) throw movError;

      // Agrupar por producto y mes
      const consumoPorProducto: Record<string, number[]> = {};
      const preciosPorProducto: Record<string, number> = {};

      // Obtener info de repuestos
      const { data: repuestos } = await supabase
        .from('repuestos')
        .select('codigo, descripcion, stock_actual');

      const repuestosMap = new Map(repuestos?.map(r => [r.codigo, r]) || []);

      // Simular consumo mensual (en producción vendría de movimientos reales)
      const productosUnicos = [...new Set(movimientos?.map(m => m.codigo_repuesto) || [])];
      
      productosUnicos.forEach((codigo) => {
        const consumoMeses = Array(12).fill(0).map(() => Math.floor(Math.random() * 50) + 10);
        consumoPorProducto[codigo] = consumoMeses;
        preciosPorProducto[codigo] = Math.random() * 100 + 10;
      });

      // Calcular valor anual y clasificar
      const productosConValor = Object.entries(consumoPorProducto).map(([codigo, consumoMensual]) => {
        const consumo_anual = consumoMensual.reduce((a, b) => a + b, 0);
        const precio = preciosPorProducto[codigo];
        const valor_anual = consumo_anual * precio;

        // Calcular CV para clasificación XYZ
        const media = consumo_anual / 12;
        const varianza = consumoMensual.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / 12;
        const desviacion = Math.sqrt(varianza);
        const cv = media > 0 ? desviacion / media : 0;

        const repuesto = repuestosMap.get(codigo);

        return {
          codigo,
          descripcion: repuesto?.descripcion || 'Sin descripción',
          precio_unitario: precio,
          consumo_mensual: consumoMensual,
          consumo_anual,
          valor_anual,
          cv,
          stock_actual: repuesto?.stock_actual || 0,
          clasificacion_abc: 'C' as ClasificacionABC,
          clasificacion_xyz: 'Z' as ClasificacionXYZ,
          categoria: 'CZ' as CategoriaABCXYZ,
          estrategia: '',
          nivel_control: '',
          frecuencia_revision: ''
        };
      });

      // Ordenar por valor anual para clasificación ABC
      productosConValor.sort((a, b) => b.valor_anual - a.valor_anual);

      const valorTotal = productosConValor.reduce((sum, p) => sum + p.valor_anual, 0);
      let acumulado = 0;

      // Asignar clasificación ABC
      productosConValor.forEach((producto) => {
        acumulado += producto.valor_anual;
        const porcentajeAcumulado = (acumulado / valorTotal) * 100;

        if (porcentajeAcumulado <= 80) {
          producto.clasificacion_abc = 'A';
        } else if (porcentajeAcumulado <= 95) {
          producto.clasificacion_abc = 'B';
        } else {
          producto.clasificacion_abc = 'C';
        }

        // Asignar clasificación XYZ
        if (producto.cv <= 0.1) {
          producto.clasificacion_xyz = 'X';
        } else if (producto.cv <= 0.25) {
          producto.clasificacion_xyz = 'Y';
        } else {
          producto.clasificacion_xyz = 'Z';
        }

        // Combinar y asignar estrategia
        producto.categoria = `${producto.clasificacion_abc}${producto.clasificacion_xyz}` as CategoriaABCXYZ;
        const estrategia = ESTRATEGIAS[producto.categoria];
        producto.estrategia = estrategia.estrategia;
        producto.nivel_control = estrategia.nivel;
        producto.frecuencia_revision = estrategia.frecuencia;
      });

      setProductos(productosConValor);
      toast.success('Análisis ABC-XYZ completado');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al calcular análisis');
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter(p => {
    if (categoriaFiltro !== 'all' && p.categoria !== categoriaFiltro) return false;
    if (clasificacionABC !== 'all' && p.clasificacion_abc !== clasificacionABC) return false;
    if (clasificacionXYZ !== 'all' && p.clasificacion_xyz !== clasificacionXYZ) return false;
    return true;
  });

  const getCategoriaColor = (categoria: CategoriaABCXYZ) => {
    const abc = categoria[0];
    if (abc === 'A') return 'destructive';
    if (abc === 'B') return 'default';
    return 'secondary';
  };

  const contarPorCategoria = (cat: CategoriaABCXYZ) => {
    return productos.filter(p => p.categoria === cat).length;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Análisis Repastock ABC-XYZ
          </h1>
          <p className="text-muted-foreground mt-2">
            Clasificación combinada por valor de consumo y variabilidad de demanda
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={calcularABCXYZ} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recalcular
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
          <CardTitle>Matriz ABC-XYZ</CardTitle>
          <CardDescription>Distribución de productos en las 9 categorías</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="font-bold"></div>
            <div className="font-bold">X (Estable)</div>
            <div className="font-bold">Y (Variable)</div>
            <div className="font-bold">Z (Irregular)</div>

            <div className="font-bold">A (80%)</div>
            <div className="border p-4 bg-red-50">
              <div className="text-2xl font-bold">{contarPorCategoria('AX')}</div>
              <p className="text-xs">AX</p>
            </div>
            <div className="border p-4 bg-red-50">
              <div className="text-2xl font-bold">{contarPorCategoria('AY')}</div>
              <p className="text-xs">AY</p>
            </div>
            <div className="border p-4 bg-red-50">
              <div className="text-2xl font-bold">{contarPorCategoria('AZ')}</div>
              <p className="text-xs">AZ</p>
            </div>

            <div className="font-bold">B (15%)</div>
            <div className="border p-4 bg-orange-50">
              <div className="text-2xl font-bold">{contarPorCategoria('BX')}</div>
              <p className="text-xs">BX</p>
            </div>
            <div className="border p-4 bg-orange-50">
              <div className="text-2xl font-bold">{contarPorCategoria('BY')}</div>
              <p className="text-xs">BY</p>
            </div>
            <div className="border p-4 bg-orange-50">
              <div className="text-2xl font-bold">{contarPorCategoria('BZ')}</div>
              <p className="text-xs">BZ</p>
            </div>

            <div className="font-bold">C (5%)</div>
            <div className="border p-4 bg-green-50">
              <div className="text-2xl font-bold">{contarPorCategoria('CX')}</div>
              <p className="text-xs">CX</p>
            </div>
            <div className="border p-4 bg-green-50">
              <div className="text-2xl font-bold">{contarPorCategoria('CY')}</div>
              <p className="text-xs">CY</p>
            </div>
            <div className="border p-4 bg-green-50">
              <div className="text-2xl font-bold">{contarPorCategoria('CZ')}</div>
              <p className="text-xs">CZ</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de estrategias */}
      <Card>
        <CardHeader>
          <CardTitle>Estrategias de Reposición por Categoría</CardTitle>
          <CardDescription>Políticas de stock según clasificación</CardDescription>
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
              {Object.entries(ESTRATEGIAS).map(([cat, est]) => (
                <TableRow key={cat}>
                  <TableCell>
                    <Badge variant={getCategoriaColor(cat as CategoriaABCXYZ)}>
                      {cat}
                    </Badge>
                  </TableCell>
                  <TableCell>{est.estrategia}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{est.nivel}</Badge>
                  </TableCell>
                  <TableCell>{est.frecuencia}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Listado de productos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Productos Clasificados</CardTitle>
              <CardDescription>{productosFiltrados.length} productos</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={clasificacionABC} onValueChange={(v: any) => setClasificacionABC(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="ABC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos ABC</SelectItem>
                  <SelectItem value="A">Clase A</SelectItem>
                  <SelectItem value="B">Clase B</SelectItem>
                  <SelectItem value="C">Clase C</SelectItem>
                </SelectContent>
              </Select>

              <Select value={clasificacionXYZ} onValueChange={(v: any) => setClasificacionXYZ(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="XYZ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos XYZ</SelectItem>
                  <SelectItem value="X">Clase X</SelectItem>
                  <SelectItem value="Y">Clase Y</SelectItem>
                  <SelectItem value="Z">Clase Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Calculando análisis...</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Consumo Anual</TableHead>
                    <TableHead className="text-right">Valor Anual</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">CV</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Estrategia</TableHead>
                    <TableHead>Frecuencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosFiltrados.map((producto) => (
                    <TableRow key={producto.codigo}>
                      <TableCell className="font-medium">{producto.codigo}</TableCell>
                      <TableCell>{producto.descripcion}</TableCell>
                      <TableCell className="text-right">{producto.consumo_anual}</TableCell>
                      <TableCell className="text-right">
                        Q{producto.valor_anual.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getCategoriaColor(producto.categoria)}>
                          {producto.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{producto.cv.toFixed(3)}</TableCell>
                      <TableCell className="text-right">{producto.stock_actual}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {producto.estrategia}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{producto.frecuencia_revision}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
