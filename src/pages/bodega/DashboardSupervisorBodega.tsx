import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Package, AlertTriangle, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiBackendAction } from "@/lib/api";

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

      // Clasificación ABC - placeholder since table may not be in registry
      const clasificacion: ClasificacionStats[] = ['A', 'B', 'C'].map(c => ({
        clasificacion: c,
        cantidad: 0,
        valorTotal: 0
      }));

      // Inventario via registry
      const inventarioRes = await apiBackendAction("inventarios.list", {});
      const inventarioData = (inventarioRes as any).results || [];

      // Movimientos via registry
      const movimientosRes = await apiBackendAction("movimientos_inventario.list", {});
      const allMovimientos = (movimientosRes as any).results || [];

      // Repuestos via registry
      const repuestosRes = await apiBackendAction("repuestos.list", {});
      const todosRepuestos = (repuestosRes as any).results || [];

      // Items obsoletos (sin movimiento mayor a 180 días)
      const fecha180Dias = new Date();
      fecha180Dias.setDate(fecha180Dias.getDate() - 180);
      const movimientosRecientes = allMovimientos.filter(
        (m: any) => new Date(m.created_at) >= fecha180Dias
      );
      const repuestosConMovimiento = new Set(movimientosRecientes.map((m: any) => m.repuesto_id));
      
      const itemsObsoletos = inventarioData.filter(
        (item: any) => !repuestosConMovimiento.has(item.codigo_repuesto) && item.cantidad > 0
      ).length;

      // Eficiencia de espacio
      const ubicacionesConStock = inventarioData.filter((s: any) => s.cantidad > 0).length;
      const totalUbicaciones = inventarioData.length || 1;
      const eficienciaEspacio = (ubicacionesConStock / totalUbicaciones) * 100;

      setStats({
        clasificacionABC: clasificacion,
        valorInventarioTotal: 0,
        rotacionPromedio: 0,
        itemsParaDespiece: 0,
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
