import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Wrench, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TecnicoStats {
  nombre: string;
  asignados: number;
  completados: number;
  tiempoPromedio: number;
}

interface DashboardStats {
  incidentesAsignados: number;
  enDiagnostico: number;
  pendienteRepuestos: number;
  aprobacionesPendientes: number;
  solicitudesCambio: number;
  aprobacionesStockCemaco: number;
  tasaReincidencia: number;
  tecnicos: TecnicoStats[];
}

export default function DashboardJefeTaller() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Incidentes por estado
      const { data: asignados } = await supabase
        .from('incidentes')
        .select('*')
        .not('codigo_tecnico', 'is', null);

      const { data: enDiagnostico } = await supabase
        .from('incidentes')
        .select('*')
        .eq('status', 'En diagnostico');

      const { data: pendienteRepuestos } = await supabase
        .from('incidentes')
        .select('*')
        .eq('status', 'Pendiente por repuestos');

      // Aprobaciones pendientes
      const { data: solicitudesCambio } = await supabase
        .from('solicitudes_cambio')
        .select('*')
        .eq('estado', 'pendiente');

      const { data: stockCemaco } = await supabase
        .from('revisiones_stock_cemaco')
        .select('*')
        .is('aprobado_por', null);

      const { data: incidentesStockCemaco } = await supabase
        .from('incidentes')
        .select('*')
        .eq('status', 'Pendiente de aprobación NC');

      // Reincidencias
      const { data: verificaciones } = await supabase
        .from('verificaciones_reincidencia')
        .select('*')
        .eq('es_reincidencia_valida', true);

      const totalIncidentes = asignados?.length || 0;
      const tasaReincidencia = totalIncidentes > 0
        ? ((verificaciones?.length || 0) / totalIncidentes) * 100
        : 0;

      // Estadísticas por técnico
      const { data: tecnicos } = await supabase
        .from('tecnicos')
        .select('*');

      const { data: diagnosticos } = await supabase
        .from('diagnosticos')
        .select('*');

      const tecnicoStats: TecnicoStats[] = tecnicos?.map(tec => {
        const incidentesTec = asignados?.filter(i => i.codigo_tecnico === tec.codigo) || [];
        const diagnosticosTec = diagnosticos?.filter(d => d.tecnico_codigo === tec.codigo) || [];
        
        return {
          nombre: `${tec.nombre} ${tec.apellido}`,
          asignados: incidentesTec.length,
          completados: diagnosticosTec.length,
          tiempoPromedio: 0 // Cálculo simplificado
        };
      }).sort((a, b) => b.completados - a.completados).slice(0, 5) || [];

      setStats({
        incidentesAsignados: asignados?.length || 0,
        enDiagnostico: enDiagnostico?.length || 0,
        pendienteRepuestos: pendienteRepuestos?.length || 0,
        aprobacionesPendientes: (solicitudesCambio?.length || 0) + (stockCemaco?.length || 0),
        solicitudesCambio: solicitudesCambio?.length || 0,
        aprobacionesStockCemaco: incidentesStockCemaco?.length || 0,
        tasaReincidencia: Math.round(tasaReincidencia),
        tecnicos: tecnicoStats
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
      <h1 className="text-3xl font-bold">Dashboard Jefe de Taller</h1>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Incidentes Asignados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.incidentesAsignados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En Diagnóstico</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enDiagnostico}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendiente Repuestos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendienteRepuestos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aprobaciones Pendientes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aprobacionesPendientes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Aprobaciones Requeridas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes de Cambio de Tipología</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.solicitudesCambio}</div>
            <p className="text-sm text-muted-foreground mt-2">Pendientes de aprobación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aprobaciones Stock Cemaco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.aprobacionesStockCemaco}</div>
            <p className="text-sm text-muted-foreground mt-2">Pendientes de decisión final</p>
          </CardContent>
        </Card>
      </div>

      {/* Calidad de Reparaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Tasa de Reincidencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{stats.tasaReincidencia}%</span>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
          <Progress value={stats.tasaReincidencia} className="h-2" />
          <p className="text-xs text-muted-foreground">Incidentes que regresan por mismo problema</p>
        </CardContent>
      </Card>

      {/* Rendimiento por Técnico */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 - Rendimiento de Técnicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.tecnicos.map((tec, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{tec.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {tec.asignados} asignados • {tec.completados} completados
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
