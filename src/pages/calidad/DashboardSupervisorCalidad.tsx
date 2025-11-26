import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertTriangle, TrendingDown, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

      // Auditorías
      const { data: auditorias } = await supabase
        .from('auditorias_calidad')
        .select('*');

      const aprobadas = auditorias?.filter(a => a.resultado === 'Aprobado').length || 0;
      const tasaAprobacion = auditorias && auditorias.length > 0
        ? (aprobadas / auditorias.length) * 100
        : 0;

      // Auditorías pendientes (últimos 7 días sin auditoría)
      const fecha7Dias = new Date();
      fecha7Dias.setDate(fecha7Dias.getDate() - 7);

      const { data: incidentesReparados } = await supabase
        .from('incidentes')
        .select('id')
        .eq('status', 'Reparado')
        .gte('updated_at', fecha7Dias.toISOString());

      const incidentesAuditados = new Set(auditorias?.map(a => a.incidente_id));
      const auditoriasPendientes = incidentesReparados?.filter(
        i => !incidentesAuditados.has(i.id)
      ).length || 0;

      // Defectos
      const { data: defectos } = await supabase
        .from('defectos_calidad')
        .select('*');

      // Top defectos
      const defectoMap = new Map<string, number>();
      defectos?.forEach(d => {
        const count = defectoMap.get(d.tipo_defecto) || 0;
        defectoMap.set(d.tipo_defecto, count + (d.frecuencia || 1));
      });

      const topDefectos = Array.from(defectoMap.entries())
        .map(([tipo, cantidad]) => ({ tipo, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      // Defectos por proveedor
      const proveedorMap = new Map<string, number>();
      defectos?.forEach(d => {
        if (d.proveedor) {
          const count = proveedorMap.get(d.proveedor) || 0;
          proveedorMap.set(d.proveedor, count + (d.frecuencia || 1));
        }
      });

      const defectosPorProveedor = Array.from(proveedorMap.entries())
        .map(([proveedor, cantidad]) => ({ proveedor, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      // Reincidencias
      const { data: verificaciones } = await supabase
        .from('verificaciones_reincidencia')
        .select('*')
        .eq('es_reincidencia_valida', true);

      const { data: totalIncidentes } = await supabase
        .from('incidentes')
        .select('id');

      const tasaReincidencia = totalIncidentes && totalIncidentes.length > 0
        ? ((verificaciones?.length || 0) / totalIncidentes.length) * 100
        : 0;

      setStats({
        tasaAprobacion: Math.round(tasaAprobacion),
        auditoriasPendientes,
        tasaReincidencia: Math.round(tasaReincidencia),
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
            {stats.topDefectos.map((defecto, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="font-medium">{defecto.tipo}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{defecto.cantidad} ocurrencias</span>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
              </div>
            ))}
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
            {stats.defectosPorProveedor.map((proveedor, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="font-medium">{proveedor.proveedor}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{proveedor.cantidad} defectos</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
