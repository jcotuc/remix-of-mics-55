import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Truck, AlertCircle, Package, TrendingUp, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DashboardStats {
  guiasPendientes: number;
  guiasRetrasadas: number;
  embarquesEnTransito: number;
  garantiasManualesPendientes: number;
  tasaEntregaExitosa: number;
  costoPromedioEnvio: number;
  maquinasEnRuta: number;
}

export default function DashboardJefeLogistica() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Guías por estado
      const { data: guiasPendientes } = await (supabase as any)
        .from('guias')
        .select('*')
        .in('estado', ['PENDIENTE', 'EN_TRANSITO']);

      // Guías retrasadas (sin entrega después de fecha promesa)
      const hoy = new Date().toISOString();
      const { data: guiasRetrasadas } = await (supabase as any)
        .from('guias')
        .select('*')
        .eq('estado', 'EN_TRANSITO')
        .lt('fecha_promesa_entrega', hoy)
        .is('fecha_entrega', null);

      // Embarques
      const { data: embarques } = await supabase
        .from('embarques')
        .select('*');

      // Garantías manuales
      const { data: garantiasManuales } = await supabase
        .from('garantias_manuales')
        .select('*')
        .eq('estatus', 'pendiente_resolucion');

      // Tasa de entrega
      const { data: guiasEntregadas } = await (supabase as any)
        .from('guias')
        .select('*')
        .eq('estado', 'ENTREGADA');

      const { data: todasGuias } = await (supabase as any)
        .from('guias')
        .select('*');

      const tasaEntrega = todasGuias && todasGuias.length > 0
        ? ((guiasEntregadas?.length || 0) / todasGuias.length) * 100
        : 0;

      // Costo promedio
      const guiasConTarifa = (todasGuias || []).filter((g: any) => g.tarifa) || [];
      const costoPromedio = guiasConTarifa.length > 0
        ? guiasConTarifa.reduce((sum: number, g: any) => sum + (g.tarifa || 0), 0) / guiasConTarifa.length
        : 0;

      // Máquinas en ruta
      const { data: maquinasEnRuta } = await supabase
        .from('incidentes')
        .select('*')
        .eq('estado', 'EN_ENTREGA');

      setStats({
        guiasPendientes: guiasPendientes?.length || 0,
        guiasRetrasadas: guiasRetrasadas?.length || 0,
        embarquesEnTransito: embarques?.length || 0,
        garantiasManualesPendientes: garantiasManuales?.length || 0,
        tasaEntregaExitosa: Math.round(tasaEntrega),
        costoPromedioEnvio: Math.round(costoPromedio),
        maquinasEnRuta: maquinasEnRuta?.length || 0
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
      <h1 className="text-3xl font-bold">Dashboard Jefe de Logística</h1>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Guías Pendientes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.guiasPendientes}</div>
            <p className="text-xs text-muted-foreground">En tránsito</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Guías Retrasadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.guiasRetrasadas}</div>
            <p className="text-xs text-muted-foreground">Vencidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Embarques</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.embarquesEnTransito}</div>
            <p className="text-xs text-muted-foreground">En proceso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Garantías Manuales</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.garantiasManualesPendientes}</div>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tasa de Entrega Exitosa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.tasaEntregaExitosa}%</span>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <Progress value={stats.tasaEntregaExitosa} className="h-2" />
            <p className="text-xs text-muted-foreground">Entregas completadas exitosamente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costo Promedio de Envío</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Q{stats.costoPromedioEnvio}</div>
            <p className="text-sm text-muted-foreground mt-2">Por guía de envío</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {stats.guiasRetrasadas > 0 && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Atención Requerida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Hay {stats.guiasRetrasadas} guías retrasadas que requieren seguimiento inmediato.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Máquinas en Ruta */}
      <Card>
        <CardHeader>
          <CardTitle>Máquinas en Tránsito</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.maquinasEnRuta}</div>
          <p className="text-sm text-muted-foreground mt-2">
            Incidentes en status "En ruta" hacia el centro de servicio
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
