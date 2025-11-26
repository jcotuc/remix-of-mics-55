import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Package, AlertTriangle, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ClasificacionStats {
  clasificacion: string;
  cantidad: number;
  valorTotal: number;
}

interface DashboardStats {
  clasificacionABC: ClasificacionStats[];
  valorInventarioTotal: number;
  rotacionPromedio: number;
  itemsParaDespiece: number;
  itemsObsoletos: number;
  eficienciaEspacio: number;
}

export default function DashboardSupervisorBodega() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Clasificación ABC
      const { data: clasificacionABC } = await supabase
        .from('repuestos_clasificacion_abc')
        .select('*');

      const abcMap = new Map<string, { cantidad: number; valorTotal: number }>();
      clasificacionABC?.forEach(item => {
        const current = abcMap.get(item.clasificacion) || { cantidad: 0, valorTotal: 0 };
        abcMap.set(item.clasificacion, {
          cantidad: current.cantidad + 1,
          valorTotal: current.valorTotal + (item.valor_rotacion || 0)
        });
      });

      const clasificacion: ClasificacionStats[] = ['A', 'B', 'C'].map(c => ({
        clasificacion: c,
        cantidad: abcMap.get(c)?.cantidad || 0,
        valorTotal: abcMap.get(c)?.valorTotal || 0
      }));

      // Valor total del inventario (simplificado)
      const valorInventarioTotal = clasificacion.reduce((sum, c) => sum + c.valorTotal, 0);

      // Rotación promedio
      const rotacionPromedio = clasificacionABC && clasificacionABC.length > 0
        ? clasificacionABC.reduce((sum, item) => sum + (item.valor_rotacion || 0), 0) / clasificacionABC.length
        : 0;

      // Items para despiece (productos descontinuados con stock)
      const { data: despieces } = await supabase
        .from('despieces')
        .select('*')
        .eq('estado', 'disponible');

      // Items obsoletos (sin movimiento mayor a 180 días)
      const fecha180Dias = new Date();
      fecha180Dias.setDate(fecha180Dias.getDate() - 180);

      const { data: movimientos } = await supabase
        .from('movimientos_inventario')
        .select('codigo_repuesto')
        .gte('created_at', fecha180Dias.toISOString());

      const repuestosConMovimiento = new Set(movimientos?.map(m => m.codigo_repuesto));
      const { data: todosRepuestos } = await supabase
        .from('repuestos')
        .select('codigo, stock_actual');

      const itemsObsoletos = todosRepuestos?.filter(r =>
        !repuestosConMovimiento.has(r.codigo) && (r.stock_actual || 0) > 0
      ).length || 0;

      // Eficiencia de espacio (simplificado - % de ubicaciones ocupadas)
      const { data: stockDept } = await supabase
        .from('stock_departamental')
        .select('*');

      const ubicacionesConStock = stockDept?.filter(s => s.cantidad_actual > 0).length || 0;
      const totalUbicaciones = stockDept?.length || 1;
      const eficienciaEspacio = (ubicacionesConStock / totalUbicaciones) * 100;

      setStats({
        clasificacionABC: clasificacion,
        valorInventarioTotal: Math.round(valorInventarioTotal),
        rotacionPromedio: Math.round(rotacionPromedio * 10) / 10,
        itemsParaDespiece: despieces?.length || 0,
        itemsObsoletos,
        eficienciaEspacio: Math.round(eficienciaEspacio)
      });

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Supervisor de Bodega</h1>

      {/* KPIs Estratégicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Q{stats.valorInventarioTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Valor total estimado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rotación Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rotacionPromedio}</div>
            <p className="text-xs text-muted-foreground">Índice de rotación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia de Espacio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{stats.eficienciaEspacio}%</div>
            <Progress value={stats.eficienciaEspacio} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Análisis ABC */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis ABC de Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.clasificacionABC.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Categoría {item.clasificacion}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.cantidad} items • Q{item.valorTotal.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={(item.cantidad / stats.clasificacionABC.reduce((s, c) => s + c.cantidad, 0)) * 100}
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimización */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Items Obsoletos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.itemsObsoletos}</div>
            <p className="text-sm text-muted-foreground mt-2">Sin movimiento &gt; 180 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Candidatos a Despiece</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.itemsParaDespiece}</div>
            <p className="text-sm text-muted-foreground mt-2">Máquinas disponibles para despiece</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
