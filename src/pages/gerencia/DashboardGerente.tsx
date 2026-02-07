import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Activity, TrendingUp, AlertCircle, Users, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { mycsapi } from "@/mics-api";

interface DashboardStats {
  incidentesTotales: number;
  incidentesHoy: number;
  tasaGarantia: number;
  incidentesSinAsignar: number;
  stockBajo: number;
  clientesSinNotificar: number;
  incidentesPorEstado: { estado: string; cantidad: number }[];
  incidentesPorArea: { area: string; incidentes: number }[];
}

export default function DashboardGerente() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch data in parallel using apiBackendAction
      const [incidentesResponse, inventarioResponse] = await Promise.all([
        mycsapi.get("/api/v1/incidentes", { query: { limit: 5000 } }),
        mycsapi.get("/api/v1/inventario", { query: { limit: 5000 } })
      ]);

      const todosIncidentes = incidentesResponse.results || [];
      const inventarioData = (inventarioResponse as any).results || (inventarioResponse as any).data || [];

      // Incidentes de hoy
      const hoy = new Date().toISOString().split('T')[0];
      const incidentesHoy = todosIncidentes.filter((i: any) =>
        i.created_at?.startsWith(hoy)
      ).length;

      // Tasa de garantía
      const conGarantia = todosIncidentes.filter((i: any) => i.aplica_garantia).length;
      const tasaGarantia = todosIncidentes.length > 0
        ? (conGarantia / todosIncidentes.length) * 100
        : 0;

      // Sin asignar (EN_DIAGNOSTICO)
      const sinAsignar = todosIncidentes.filter((i: any) => 
        i.estado === 'EN_DIAGNOSTICO'
      ).length;

      // Stock bajo
      const stockBajo = inventarioData.filter((i: any) => i.cantidad < 5).length;

      // Sin notificar (REPARADO)
      const clientesSinNotificar = todosIncidentes.filter((i: any) => 
        i.estado === 'REPARADO'
      ).length;

      // Incidentes por estado
      const estadoMap = new Map<string, number>();
      todosIncidentes.forEach((i: any) => {
        if (i.estado) {
          estadoMap.set(i.estado, (estadoMap.get(i.estado) || 0) + 1);
        }
      });

      const incidentesPorEstado = Array.from(estadoMap.entries())
        .map(([estado, cantidad]) => ({ estado, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      // Incidentes por área (producto)
      const areaMap = new Map<string, number>();
      todosIncidentes.forEach((i: any) => {
        const producto = i.producto?.descripcion || i.producto?.codigo || 'Sin clasificar';
        areaMap.set(producto, (areaMap.get(producto) || 0) + 1);
      });

      const incidentesPorArea = Array.from(areaMap.entries())
        .map(([area, incidentes]) => ({ area, incidentes }))
        .sort((a, b) => b.incidentes - a.incidentes)
        .slice(0, 5);

      setStats({
        incidentesTotales: todosIncidentes.length,
        incidentesHoy,
        tasaGarantia: Math.round(tasaGarantia),
        incidentesSinAsignar: sinAsignar,
        stockBajo,
        clientesSinNotificar,
        incidentesPorEstado,
        incidentesPorArea
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
      <h1 className="text-3xl font-bold">Dashboard Gerente de Centro de Servicio</h1>

      {/* KPIs Ejecutivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Incidentes Totales</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.incidentesTotales}</div>
            <p className="text-xs text-muted-foreground">+{stats.incidentesHoy} hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Garantía</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{stats.tasaGarantia}%</div>
            <Progress value={stats.tasaGarantia} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sin Asignar</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.incidentesSinAsignar}</div>
            <p className="text-xs text-muted-foreground">Requieren asignación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.stockBajo + stats.clientesSinNotificar}
            </div>
            <p className="text-xs text-muted-foreground">Stock bajo + Sin notificar</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Críticas Detalladas */}
      {(stats.incidentesSinAsignar > 0 || stats.stockBajo > 0 || stats.clientesSinNotificar > 0) && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Atención Inmediata Requerida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.incidentesSinAsignar > 0 && (
              <p className="text-sm">• {stats.incidentesSinAsignar} incidentes sin asignar</p>
            )}
            {stats.stockBajo > 0 && (
              <p className="text-sm">• {stats.stockBajo} items con stock bajo</p>
            )}
            {stats.clientesSinNotificar > 0 && (
              <p className="text-sm">• {stats.clientesSinNotificar} clientes sin notificar</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Distribución por Estado */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Incidentes por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.incidentesPorEstado.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.estado}</span>
                  <span className="text-sm text-muted-foreground">{item.cantidad}</span>
                </div>
                <Progress
                  value={(item.cantidad / stats.incidentesTotales) * 100}
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Incidentes por Área */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Incidentes por Familia de Producto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.incidentesPorArea.map((area, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="font-medium">{area.area}</span>
                <span className="text-sm text-muted-foreground">{area.incidentes} incidentes</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
