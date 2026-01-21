import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Bell, FileText, TrendingUp, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DashboardStats {
  incidentesHoy: number;
  pendientesNotificacion: number;
  presupuestosPendientes: number;
  canjesEnProceso: number;
  equipoSAC: { nombre: string; incidentes: number }[];
}

export default function DashboardSupervisorSAC() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Incidentes de hoy
      const hoy = new Date().toISOString().split('T')[0];
      const { data: incidentesHoy } = await supabase
        .from('incidentes')
        .select('id')
        .gte('created_at', hoy);

      // Pendientes de notificación (Reparado)
      const { data: pendientesNotif } = await supabase
        .from('incidentes')
        .select('id')
        .eq('estado', 'REPARADO');

      // Presupuestos pendientes
      const { data: presupuestos } = await supabase
        .from('incidentes')
        .select('id')
        .eq('estado', 'ESPERA_APROBACION');

      // Canjes (cambio por garantía)
      const { data: canjes } = await supabase
        .from('incidentes')
        .select('id')
        .eq('estado', 'CAMBIO_POR_GARANTIA');

      // Equipo SAC
      const { data: asignaciones } = await supabase
        .from('asignaciones_sac')
        .select('user_id, incidente_id')
        .eq('activo', true);

      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, nombre, apellido');

      const equipoMap = new Map<number, number>();
      asignaciones?.forEach(a => {
        equipoMap.set(a.user_id, (equipoMap.get(a.user_id) || 0) + 1);
      });

      const equipoSAC = Array.from(equipoMap.entries()).map(([userId, count]) => {
        const usuario = usuarios?.find(u => u.id === userId);
        return {
          nombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Desconocido',
          incidentes: count
        };
      });

      setStats({
        incidentesHoy: incidentesHoy?.length || 0,
        pendientesNotificacion: pendientesNotif?.length || 0,
        presupuestosPendientes: presupuestos?.length || 0,
        canjesEnProceso: canjes?.length || 0,
        equipoSAC: equipoSAC.sort((a, b) => b.incidentes - a.incidentes).slice(0, 5)
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard Supervisor SAC</h1>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Incidentes Hoy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.incidentesHoy}</div>
            <p className="text-xs text-muted-foreground">Ingresados hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendientes Notificación</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendientesNotificacion}</div>
            <p className="text-xs text-muted-foreground">Máquinas reparadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Presupuestos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.presupuestosPendientes}</div>
            <p className="text-xs text-muted-foreground">Pendientes de aprobación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Canjes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.canjesEnProceso}</div>
            <p className="text-xs text-muted-foreground">En proceso</p>
          </CardContent>
        </Card>
      </div>

      {/* Rendimiento del Equipo */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 - Equipo SAC</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.equipoSAC.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Sin asignaciones activas</p>
            ) : (
              stats.equipoSAC.map((miembro, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="font-medium">{miembro.nombre}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{miembro.incidentes} casos</span>
                    <Users className="h-4 w-4" />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
