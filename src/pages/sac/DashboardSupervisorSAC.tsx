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
  sinNotificar: number;
  unaNotificacion: number;
  dosNotificaciones: number;
  tresNotificaciones: number;
  llamadasObligatorias: number;
  tasaRespuesta: number;
  presupuestosAceptados: number;
  presupuestosRechazados: number;
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
      const { data: incidentesHoy, error: e1 } = await supabase
        .from('incidentes')
        .select('*')
        .gte('created_at', hoy)
        .eq('ingresado_en_mostrador', true);

      // Pendientes de notificación (Reparado)
      const { data: pendientesNotif, error: e2 } = await supabase
        .from('incidentes')
        .select('*')
        .eq('status', 'Reparado');

      // Presupuestos y Canjes
      const { data: presupuestos, error: e3 } = await supabase
        .from('incidentes')
        .select('*')
        .eq('status', 'Presupuesto');

      const { data: canjes, error: e4 } = await supabase
        .from('incidentes')
        .select('*')
        .eq('status', 'Porcentaje');

      // Notificaciones por tier
      const { data: notificaciones, error: e5 } = await supabase
        .from('notificaciones_cliente')
        .select('incidente_id, numero_notificacion, respondido');

      // Contar por tiers
      const notifMap = new Map();
      notificaciones?.forEach(n => {
        const current = notifMap.get(n.incidente_id) || { max: 0, respondido: false };
        notifMap.set(n.incidente_id, {
          max: Math.max(current.max, n.numero_notificacion),
          respondido: current.respondido || n.respondido
        });
      });

      let sin = 0, una = 0, dos = 0, tres = 0;
      pendientesNotif?.forEach(inc => {
        const notif = notifMap.get(inc.id);
        if (!notif) sin++;
        else if (notif.max === 1) una++;
        else if (notif.max === 2) dos++;
        else if (notif.max >= 3) tres++;
      });

      // Equipo SAC
      const { data: asignaciones, error: e6 } = await supabase
        .from('asignaciones_sac')
        .select('user_id, incidente_id')
        .eq('activo', true);

      const { data: profiles, error: e7 } = await supabase
        .from('profiles')
        .select('user_id, nombre, apellido');

      const equipoMap = new Map();
      asignaciones?.forEach(a => {
        equipoMap.set(a.user_id, (equipoMap.get(a.user_id) || 0) + 1);
      });

      const equipoSAC = Array.from(equipoMap.entries()).map(([userId, count]) => {
        const profile = profiles?.find(p => p.user_id === userId);
        return {
          nombre: profile ? `${profile.nombre} ${profile.apellido}` : 'Desconocido',
          incidentes: count as number
        };
      });

      // Tasa de respuesta
      const totalNotifs = notificaciones?.length || 0;
      const respondidas = notificaciones?.filter(n => n.respondido).length || 0;
      const tasaRespuesta = totalNotifs > 0 ? (respondidas / totalNotifs) * 100 : 0;

      // Presupuestos aceptados/rechazados (simulado basado en status final)
      const { data: entregados, error: e8 } = await supabase
        .from('incidentes')
        .select('*')
        .in('status', ['Pendiente entrega', 'Logistica envio']);

      const { data: rechazados, error: e9 } = await supabase
        .from('incidentes')
        .select('*')
        .eq('status', 'Rechazado');

      if (e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9) {
        throw new Error('Error al cargar datos');
      }

      setStats({
        incidentesHoy: incidentesHoy?.length || 0,
        pendientesNotificacion: pendientesNotif?.length || 0,
        presupuestosPendientes: presupuestos?.length || 0,
        canjesEnProceso: canjes?.length || 0,
        sinNotificar: sin,
        unaNotificacion: una,
        dosNotificaciones: dos,
        tresNotificaciones: tres,
        llamadasObligatorias: tres,
        tasaRespuesta: Math.round(tasaRespuesta),
        presupuestosAceptados: entregados?.length || 0,
        presupuestosRechazados: rechazados?.length || 0,
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
            <p className="text-xs text-muted-foreground">Ingresados en mostrador</p>
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

      {/* Sistema de Tres Notificaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Sistema de Tres Notificaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950">
              <div className="text-2xl font-bold">{stats.sinNotificar}</div>
              <p className="text-sm text-muted-foreground">Sin notificar</p>
            </div>
            <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-950">
              <div className="text-2xl font-bold">{stats.unaNotificacion}</div>
              <p className="text-sm text-muted-foreground">1 notificación</p>
            </div>
            <div className="p-4 rounded-lg border bg-orange-50 dark:bg-orange-950">
              <div className="text-2xl font-bold">{stats.dosNotificaciones}</div>
              <p className="text-sm text-muted-foreground">2 notificaciones</p>
            </div>
            <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950">
              <div className="text-2xl font-bold">{stats.tresNotificaciones}</div>
              <p className="text-sm text-muted-foreground">3 notificaciones</p>
            </div>
          </div>

          {stats.llamadasObligatorias > 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="font-medium">{stats.llamadasObligatorias} casos requieren llamada obligatoria</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Métricas de Conversión */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tasa de Respuesta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.tasaRespuesta}%</span>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <Progress value={stats.tasaRespuesta} className="h-2" />
            <p className="text-xs text-muted-foreground">Clientes que han respondido notificaciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversión de Presupuestos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Aceptados</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-bold">{stats.presupuestosAceptados}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Rechazados</span>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="font-bold">{stats.presupuestosRechazados}</span>
              </div>
            </div>
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
            {stats.equipoSAC.map((miembro, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="font-medium">{miembro.nombre}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{miembro.incidentes} casos</span>
                  <Users className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
