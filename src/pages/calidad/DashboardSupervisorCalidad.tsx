import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertTriangle, TrendingDown, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { mycsapi } from "@/mics-api";

interface DefectoStats {
  tipo: string;
  cantidad: number;
}

interface DashboardStats {
  tasaAprobacion: number;
  auditoriasPendientes: number;
  tasaReincidencia: number;
  defectosPorProveedor: { proveedor: string; cantidad: number }[];
  topDefectos: DefectoStats[];
}

export default function DashboardSupervisorCalidad() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch data in parallel using apiBackendAction
      const [incidentesResponse] = await Promise.all([
        mycsapi.get("/api/v1/incidentes", { query: { limit: 5000 } })
      ]);

      const incidentes = incidentesResponse.results || [];

      // Calculate stats - auditorias and defectos not in registry yet
      // For now, calculate based on incident status
      const incidentesReparados = incidentes.filter((i: any) => i.estado === 'REPARADO');
      
      // Simulated approval rate based on completed repairs
      const completados = incidentes.filter((i: any) => 
        i.estado === 'COMPLETADO' || i.estado === 'REPARADO'
      ).length;
      const tasaAprobacion = incidentes.length > 0 
        ? (completados / incidentes.length) * 100 
        : 0;

      // Pending audits (reparados in last 7 days)
      const fecha7Dias = new Date();
      fecha7Dias.setDate(fecha7Dias.getDate() - 7);
      const auditoriasPendientes = incidentesReparados.filter((i: any) => 
        i.updated_at && new Date(i.updated_at) >= fecha7Dias
      ).length;

      // Top defectos - group by producto for now
      const defectoMap = new Map<string, number>();
      incidentes.forEach((i: any) => {
        if (i.descripcion_problema) {
          const tipo = i.descripcion_problema.substring(0, 30) + '...';
          defectoMap.set(tipo, (defectoMap.get(tipo) || 0) + 1);
        }
      });

      const topDefectos = Array.from(defectoMap.entries())
        .map(([tipo, cantidad]) => ({ tipo, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      // Defectos por proveedor - use producto as proxy
      const proveedorMap = new Map<string, number>();
      incidentes.forEach((i: any) => {
        const proveedor = i.producto?.descripcion || 'Sin proveedor';
        proveedorMap.set(proveedor, (proveedorMap.get(proveedor) || 0) + 1);
      });

      const defectosPorProveedor = Array.from(proveedorMap.entries())
        .map(([proveedor, cantidad]) => ({ proveedor, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      setStats({
        tasaAprobacion: Math.round(tasaAprobacion),
        auditoriasPendientes,
        tasaReincidencia: 0, // Not calculable without reincidencias table
        defectosPorProveedor,
        topDefectos
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
      <h1 className="text-3xl font-bold">Dashboard Supervisor de Calidad</h1>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Aprobación</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{stats.tasaAprobacion}%</div>
            <Progress value={stats.tasaAprobacion} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Auditorías Pendientes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.auditoriasPendientes}</div>
            <p className="text-xs text-muted-foreground">Últimos 7 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Reincidencia</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{stats.tasaReincidencia}%</div>
            <Progress value={stats.tasaReincidencia} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Top Defectos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top 5 - Defectos Más Frecuentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topDefectos.length > 0 ? (
              stats.topDefectos.map((defecto, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="font-medium">{defecto.tipo}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{defecto.cantidad} ocurrencias</span>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No hay defectos registrados</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Defectos por Proveedor */}
      <Card>
        <CardHeader>
          <CardTitle>Defectos por Proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.defectosPorProveedor.length > 0 ? (
              stats.defectosPorProveedor.map((proveedor, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="font-medium">{proveedor.proveedor}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{proveedor.cantidad} defectos</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No hay datos de proveedores</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
