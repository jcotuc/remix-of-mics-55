import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wrench, Clock, Bell, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActiveIncidents } from "@/contexts/ActiveIncidentsContext";
import { apiBackendAction } from "@/lib/api-backend";

type NotificacionDB = {
  id: number;
  incidente_id: number | null;
  mensaje: string | null;
  tipo: string | null;
  enviada: boolean | null;
  created_at: string | null;
};

type IncidenteDB = {
  id: number;
  codigo: string;
  estado: string;
  producto_id: number | null;
  fecha_ingreso: string;
  observaciones: string | null;
  descripcion_problema?: string | null;
  aplica_garantia?: boolean | null;
  diagnosticos?: Array<{ id: number; estado: string; tecnico_id: number }>;
};

export default function MisAsignaciones() {
  const navigate = useNavigate();
  const { currentAssignments, maxAssignments, canTakeMoreAssignments, refreshIncidents } = useActiveIncidents();
  const [incidentes, setIncidentes] = useState<IncidenteDB[]>([]);
  const [notificaciones, setNotificaciones] = useState<NotificacionDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [codigoEmpleado, setCodigoEmpleado] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Buscar usuario en tabla usuarios via apiBackendAction
      const { results } = await apiBackendAction("usuarios.search", { auth_uid: user.id });
      const usuario = results?.[0];

      if (usuario) {
        setCodigoEmpleado((usuario as any).id.toString());
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (userId) {
      refreshIncidents();
      fetchAsignaciones();
      fetchNotificaciones();
    }

    // Suscribirse a cambios en notificaciones
    const channel = supabase
      .channel('notificaciones-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones'
        },
        () => fetchNotificaciones()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchAsignaciones = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Buscar usuario_id numérico via apiBackendAction
      const { results: usuarioResults } = await apiBackendAction("usuarios.search", { auth_uid: userId });
      const usuario = usuarioResults?.[0] as { id: number } | undefined;

      if (!usuario) {
        setIncidentes([]);
        setLoading(false);
        return;
      }

      // Buscar asignaciones via apiBackendAction
      const { results: asignaciones } = await apiBackendAction("incidente_tecnico.list", { 
        tecnico_id: usuario.id 
      });

      if (!asignaciones || asignaciones.length === 0) {
        setIncidentes([]);
        setLoading(false);
        return;
      }

      const incidenteIds = asignaciones.map((a: any) => a.incidente_id);

      // Fetch incidentes via apiBackendAction
      const { results: allIncidentes } = await apiBackendAction("incidentes.list", { limit: 2000 });
      
      // Filter by ids and estado
      const filteredIncidentes = (allIncidentes || []).filter((inc: any) => 
        incidenteIds.includes(inc.id) && inc.estado === 'EN_DIAGNOSTICO'
      );

      // Fetch diagnosticos for these incidentes
      const incidentesWithDiag = await Promise.all(
        filteredIncidentes.map(async (inc: any) => {
          const { results: diagResults } = await apiBackendAction("diagnosticos.search", { incidente_id: inc.id });
          return {
            ...inc,
            diagnosticos: diagResults || [],
          };
        })
      );

      // Sort by fecha_ingreso
      incidentesWithDiag.sort((a: any, b: any) => 
        new Date(a.fecha_ingreso || a.created_at).getTime() - new Date(b.fecha_ingreso || b.created_at).getTime()
      );

      setIncidentes(incidentesWithDiag as IncidenteDB[]);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar asignaciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificaciones = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar usuario_id via apiBackendAction
      const { results: usuarioResults } = await apiBackendAction("usuarios.search", { auth_uid: user.id });
      const usuario = usuarioResults?.[0] as { id: number } | undefined;

      if (!usuario) return;

      // Buscar asignaciones via apiBackendAction
      const { results: asignaciones } = await apiBackendAction("incidente_tecnico.list", { 
        tecnico_id: usuario.id 
      });

      if (!asignaciones || asignaciones.length === 0) {
        setNotificaciones([]);
        return;
      }

      const incidenteIds = asignaciones.map((a: any) => a.incidente_id);

      // Fetch notificaciones via apiBackendAction
      const { results: allNotifs } = await apiBackendAction("notificaciones.list", {});
      
      // Filter by incidente_id and enviada
      const filteredNotifs = (allNotifs || []).filter((n: any) => 
        incidenteIds.includes(n.incidente_id) && n.enviada === false
      );

      // Sort by created_at descending
      filteredNotifs.sort((a: any, b: any) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      setNotificaciones(filteredNotifs as NotificacionDB[]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const marcarNotificacionLeida = async (id: number, incidenteId?: number | null) => {
    try {
      await apiBackendAction("notificaciones.markAsRead", { id });
      setNotificaciones(prev => prev.filter(n => n.id !== id));
      
      if (incidenteId) {
        navigate(`/mostrador/seguimiento/${incidenteId}`);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Manejar decisión del técnico sobre falta de stock
  const handleDecisionStock = async (notif: NotificacionDB, continuar: boolean) => {
    try {
      const incidenteId = notif.incidente_id;

      if (continuar) {
        toast.success("Se continuará la reparación sin los repuestos faltantes");
      } else {
        // El técnico decide esperar - cambiar incidente a Espera repuestos
        if (incidenteId) {
          await apiBackendAction("incidentes.update", {
            id: incidenteId,
            data: {
              estado: "ESPERA_REPUESTOS",
              updated_at: new Date().toISOString()
            }
          } as any);
        }

        toast.success("Incidente marcado como pendiente por repuestos");
      }

      // Marcar notificación como leída via apiBackendAction
      await apiBackendAction("notificaciones.markAsRead", { id: notif.id });

      setNotificaciones(prev => prev.filter(n => n.id !== notif.id));
      
      // Refrescar asignaciones
      fetchAsignaciones();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar decisión');
    }
  };

  const getDiasDesdeIngreso = (fechaIngreso: string) => {
    const dias = Math.floor((Date.now() - new Date(fechaIngreso).getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  // Calcular métricas del dashboard
  const totalAsignadas = incidentes.length;
  const promedioDias = incidentes.length > 0
    ? Math.round(incidentes.reduce((sum, inc) => sum + getDiasDesdeIngreso(inc.fecha_ingreso), 0) / incidentes.length)
    : 0;
  
  // Productividad del día: incidentes completados hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [productividadDia, setProductividadDia] = useState(0);
  const [reingresos, setReingresos] = useState(0);

  useEffect(() => {
    if (!userId) return;
    
    const fetchMetricas = async () => {
      try {
        // Buscar usuario_id via apiBackendAction
        const { results: usuarioResults } = await apiBackendAction("usuarios.search", { auth_uid: userId });
        const usuario = usuarioResults?.[0] as { id: number } | undefined;

        if (!usuario) return;

        // Productividad del día: diagnósticos completados hoy por este técnico
        const { results: allDiagnosticos } = await apiBackendAction("diagnosticos.list", { limit: 1000 });
        const diagHoy = (allDiagnosticos || []).filter((d: any) => 
          d.estado === 'COMPLETADO' && 
          d.tecnico_id === usuario.id &&
          new Date(d.updated_at || 0) >= hoy
        );
        
        setProductividadDia(diagHoy.length);

        // Reingresos: incidentes marcados como reingreso asignados a este técnico
        const { results: asignaciones } = await apiBackendAction("incidente_tecnico.list", { 
          tecnico_id: usuario.id 
        });

        if (asignaciones && asignaciones.length > 0) {
          const incidenteIds = asignaciones.map((a: any) => a.incidente_id) as number[];
          const { results: allIncidentes } = await apiBackendAction("incidentes.list", { limit: 2000 });
          const reingresosData = (allIncidentes || []).filter((inc: any) => 
            (inc as any).es_reingreso === true &&
            inc.estado === 'EN_DIAGNOSTICO' &&
            incidenteIds.includes(inc.id)
          );
          
          setReingresos(reingresosData.length);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchMetricas();
  }, [userId, codigoEmpleado]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-8 w-8 text-primary" />
            Mis Asignaciones
          </h1>
          <p className="text-muted-foreground mt-2">
            Máquinas asignadas a ti para diagnóstico
          </p>
        </div>
        <Badge 
          variant="outline" 
          className={`text-lg px-4 py-2 ${
            !canTakeMoreAssignments 
              ? "bg-red-100 text-red-700 border-red-300" 
              : "bg-primary/10 text-primary border-primary/30"
          }`}
        >
          {currentAssignments} / {maxAssignments}
        </Badge>
      </div>

      {/* Alerta de límite alcanzado */}
      {!canTakeMoreAssignments && (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Has alcanzado el límite de {maxAssignments} asignaciones. Completa un diagnóstico para tomar más máquinas.
          </AlertDescription>
        </Alert>
      )}

      {/* Notificaciones */}
      {notificaciones.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-primary animate-pulse" />
              Notificaciones ({notificaciones.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notificaciones.map((notif) => {
              const esDecisionStock = notif.tipo === "sin_stock_decision";
              
              return (
                <div
                  key={notif.id}
                  className={`p-4 bg-card rounded-lg border ${esDecisionStock ? 'border-amber-300 bg-amber-50/50' : ''}`}
                >
                  <div className="flex-1 space-y-2">
                    <p className="font-medium">{notif.mensaje}</p>
                    
                    <p className="text-xs text-muted-foreground">
                      {new Date(notif.created_at || '').toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {esDecisionStock ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                          onClick={() => handleDecisionStock(notif, true)}
                        >
                          ✓ Continuar sin estos repuestos
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                          onClick={() => handleDecisionStock(notif, false)}
                        >
                          ⏸ Esperar repuestos (indispensables)
                        </Button>
                        {notif.incidente_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/mostrador/seguimiento/${notif.incidente_id}`)}
                          >
                            Ver Incidente
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        {notif.incidente_id && (
                          <Button
                            size="sm"
                            onClick={() => marcarNotificacionLeida(notif.id, notif.incidente_id)}
                          >
                            Ver Incidente
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => marcarNotificacionLeida(notif.id)}
                        >
                          Marcar leída
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className={!canTakeMoreAssignments ? "border-red-300 bg-red-50" : "border-primary/30 bg-primary/5"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Asignadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-bold ${!canTakeMoreAssignments ? "text-red-600" : "text-primary"}`}>
                {currentAssignments}
              </span>
              <span className="text-lg text-muted-foreground">/ {maxAssignments}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Promedio de Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{promedioDias}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Productividad del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{productividadDia}</div>
            <p className="text-xs text-muted-foreground mt-1">completados hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Reingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{reingresos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Notificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{notificaciones.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de asignaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Máquinas en Diagnóstico</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          ) : incidentes.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">No tienes máquinas asignadas</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {incidentes.map((inc) => {
                const dias = getDiasDesdeIngreso(inc.fecha_ingreso);
                const tieneBorrador = (inc as any).diagnosticos?.some((d: any) => d.estado === 'PENDIENTE' || d.estado === 'EN_PROGRESO');
                return (
                  <div
                    key={inc.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all hover:shadow-md"
                    onClick={() => navigate(`/mostrador/seguimiento/${inc.id}`)}
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-lg">{inc.codigo}</p>
                        <Badge variant="outline" className="bg-blue-50">
                          {inc.producto_id ? `Producto #${inc.producto_id}` : "Sin producto"}
                        </Badge>
                      </div>

                      {/* Descripción */}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {inc.descripcion_problema}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            dias > 7
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : dias > 3
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {dias}d
                        </Badge>
                        {inc.aplica_garantia && (
                          <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                            Garantía
                          </Badge>
                        )}
                        {tieneBorrador && (
                          <Badge variant="secondary" className="text-xs bg-yellow-50 text-yellow-700">
                            En Progreso
                          </Badge>
                        )}
                      </div>

                      {/* Botón */}
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/taller/diagnostico/${inc.id}`);
                        }}
                      >
                        {tieneBorrador ? 'Continuar Diagnóstico' : 'Iniciar Diagnóstico'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
