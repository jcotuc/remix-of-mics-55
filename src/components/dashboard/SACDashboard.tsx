import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Package, MessageCircle, AlertCircle, CheckCircle, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type NotificacionCliente = {
  id: number;
  incidente_id: number;
  numero_notificacion: number;
  respondido: boolean;
  fecha_envio: string;
};

export function SACDashboard() {
  const [stats, setStats] = useState({
    presupuestos: 0,
    canjes: 0,
    reparados: 0,
    pendientesEntrega: 0,
    notificacionesPendientes: 0,
    notificacionesRespondidas: 0,
    incidentesAsignados: 0,
    faltaPrimeraNotificacion: 0,
    faltaSegundaNotificacion: 0,
    faltaTerceraNotificacion: 0,
    conTresNotificaciones: 0,
  });
  const [notificaciones, setNotificaciones] = useState<NotificacionCliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch incidents - usando campo 'estado' con valores uppercase
      const { data: incidentes } = await (supabase as any)
        .from("incidentes")
        .select("*")
        .in("estado", [
          "ESPERA_APROBACION",
          "CAMBIO_POR_GARANTIA",
          "NOTA_DE_CREDITO",
          "REPARADO",
          "PENDIENTE_ENTREGA",
        ]);

      // Fetch notifications - usando (supabase as any) para tabla no tipada
      const { data: notificacionesData } = await (supabase as any)
        .from("notificaciones_cliente")
        .select("*");

      // Fetch active assignments
      const { data: asignaciones } = await (supabase as any)
        .from("asignaciones_sac")
        .select("*")
        .eq("activo", true);

      if (incidentes) {
        const presupuestos = incidentes.filter(
          (i: any) => i.estado === "ESPERA_APROBACION"
        ).length;
        const canjes = incidentes.filter(
          (i: any) => i.estado === "CAMBIO_POR_GARANTIA" || i.estado === "NOTA_DE_CREDITO"
        ).length;
        const reparados = incidentes.filter((i: any) => i.estado === "REPARADO").length;
        const pendientesEntrega = incidentes.filter((i: any) => i.estado === "PENDIENTE_ENTREGA").length;

        // Calcular estadísticas de notificaciones por número
        const incidentesIds = incidentes.map((i: any) => i.id);
        const notificacionesPorIncidente = new Map<number, number>();

        notificacionesData?.forEach((n: any) => {
          if (incidentesIds.includes(n.incidente_id)) {
            const count = notificacionesPorIncidente.get(n.incidente_id) || 0;
            notificacionesPorIncidente.set(n.incidente_id, Math.max(count, n.numero_notificacion || 0));
          }
        });

        // Contar incidentes por número de notificaciones
        let sinNotificacion = 0;
        let conUnaNotificacion = 0;
        let conDosNotificaciones = 0;
        let conTresNotificaciones = 0;

        incidentes.forEach((inc: any) => {
          const numNotificaciones = notificacionesPorIncidente.get(inc.id) || 0;
          if (numNotificaciones === 0) sinNotificacion++;
          else if (numNotificaciones === 1) conUnaNotificacion++;
          else if (numNotificaciones === 2) conDosNotificaciones++;
          else if (numNotificaciones >= 3) conTresNotificaciones++;
        });

        setStats({
          presupuestos,
          canjes,
          reparados,
          pendientesEntrega,
          notificacionesPendientes: notificacionesData?.filter((n: any) => !n.respondido).length || 0,
          notificacionesRespondidas: notificacionesData?.filter((n: any) => n.respondido).length || 0,
          incidentesAsignados: asignaciones?.length || 0,
          faltaPrimeraNotificacion: sinNotificacion,
          faltaSegundaNotificacion: conUnaNotificacion,
          faltaTerceraNotificacion: conDosNotificaciones,
          conTresNotificaciones: conTresNotificaciones,
        });
      }

      setNotificaciones(notificacionesData || []);
    } catch (error) {
      console.error("Error fetching SAC data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalIncidentes = stats.presupuestos + stats.canjes + stats.reparados + stats.pendientesEntrega;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="text-center text-muted-foreground">Cargando datos de SAC...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              Presupuestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.presupuestos}</div>
            <p className="text-xs text-muted-foreground mt-1">Pendientes de aprobación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Canjes/Garantías
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.canjes}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren notificación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Reparados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.reparados}</div>
            <p className="text-xs text-muted-foreground mt-1">Listos para notificar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              Pendientes Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendientesEntrega}</div>
            <p className="text-xs text-muted-foreground mt-1">Esperando retiro</p>
          </CardContent>
        </Card>
      </div>

      {/* Sistema de Tres Notificaciones */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Sistema de Tres Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Falta 1ª Notificación</p>
              <div className="text-3xl font-bold text-red-600">{stats.faltaPrimeraNotificacion}</div>
              <p className="text-xs text-muted-foreground">sin contactar</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Falta 2ª Notificación</p>
              <div className="text-3xl font-bold text-orange-600">{stats.faltaSegundaNotificacion}</div>
              <p className="text-xs text-muted-foreground">1 notificación enviada</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Falta 3ª Notificación</p>
              <div className="text-3xl font-bold text-yellow-600">{stats.faltaTerceraNotificacion}</div>
              <p className="text-xs text-muted-foreground">2 notificaciones enviadas</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">3 Notificaciones</p>
              <div className="text-3xl font-bold text-red-700">{stats.conTresNotificaciones}</div>
              <p className="text-xs text-red-600 font-medium">⚠️ Retornar máquina</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actividad de notificaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Estado de Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Notificaciones Enviadas</span>
                <span className="font-bold">{stats.notificacionesPendientes + stats.notificacionesRespondidas}</span>
              </div>
              <Progress
                value={
                  ((stats.notificacionesPendientes + stats.notificacionesRespondidas) / (totalIncidentes * 3 || 1)) *
                  100
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pendientes Respuesta</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {stats.notificacionesPendientes}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Respondidas</p>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-lg px-3 py-1">
                    {stats.notificacionesRespondidas}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Actividad del Equipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Incidentes Asignados</span>
                <span className="font-bold">{stats.incidentesAsignados}</span>
              </div>
              <Progress value={(stats.incidentesAsignados / (totalIncidentes || 1)) * 100} />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Incidentes</p>
                <div className="text-2xl font-bold">{totalIncidentes}</div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Sin Asignar</p>
                <div className="text-2xl font-bold">{totalIncidentes - stats.incidentesAsignados}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribución de trabajo */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Incidentes por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-sm">Presupuestos</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(stats.presupuestos / (totalIncidentes || 1)) * 100} className="w-32" />
                <span className="text-sm font-medium w-12 text-right">
                  {((stats.presupuestos / (totalIncidentes || 1)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
                <span className="text-sm">Canjes/Garantías</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(stats.canjes / (totalIncidentes || 1)) * 100} className="w-32" />
                <span className="text-sm font-medium w-12 text-right">
                  {((stats.canjes / (totalIncidentes || 1)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm">Reparados</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(stats.reparados / (totalIncidentes || 1)) * 100} className="w-32" />
                <span className="text-sm font-medium w-12 text-right">
                  {((stats.reparados / (totalIncidentes || 1)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full" />
                <span className="text-sm">Pendientes Entrega</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(stats.pendientesEntrega / (totalIncidentes || 1)) * 100} className="w-32" />
                <span className="text-sm font-medium w-12 text-right">
                  {((stats.pendientesEntrega / (totalIncidentes || 1)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
