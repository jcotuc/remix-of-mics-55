import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Bell, FileText, TrendingUp } from "lucide-react";
import { apiBackendAction } from "@/lib/api-backend";

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

      // Fetch data in parallel using apiBackendAction
      const [incidentesResponse, usuariosResponse] = await Promise.all([
        apiBackendAction("incidentes.list", { limit: 5000 }),
        apiBackendAction("usuarios.list", {})
      ]);

      const incidentes = incidentesResponse.results || [];
      const usuarios = usuariosResponse.results || [];

      // Calculate stats from fetched data
      const hoy = new Date().toISOString().split('T')[0];
      const incidentesHoy = incidentes.filter((i: any) => 
        i.created_at?.startsWith(hoy)
      ).length;

      const pendientesNotificacion = incidentes.filter((i: any) => 
        i.estado === 'REPARADO'
      ).length;

      const presupuestosPendientes = incidentes.filter((i: any) => 
        i.estado === 'ESPERA_APROBACION'
      ).length;

      const canjesEnProceso = incidentes.filter((i: any) => 
        i.estado === 'CAMBIO_POR_GARANTIA'
      ).length;

      // For equipo SAC, group by propietario_id as proxy (asignaciones_sac not in registry)
      const equipoMap = new Map<number, number>();
      incidentes.forEach((i: any) => {
        if (i.propietario_id) {
          equipoMap.set(i.propietario_id, (equipoMap.get(i.propietario_id) || 0) + 1);
        }
      });

      const equipoSAC = Array.from(equipoMap.entries()).map(([userId, count]) => {
        const usuario = usuarios.find((u: any) => u.id === userId);
        return {
          nombre: usuario ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() : 'Desconocido',
          incidentes: count
        };
      })
        .sort((a, b) => b.incidentes - a.incidentes)
        .slice(0, 5);

      setStats({
        incidentesHoy,
        pendientesNotificacion,
        presupuestosPendientes,
        canjesEnProceso,
        equipoSAC
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
