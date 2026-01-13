import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Clock, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];
type NotificacionDB = Database['public']['Tables']['notificaciones']['Row'];

export default function MisAsignaciones() {
  const navigate = useNavigate();
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('codigo_empleado')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.codigo_empleado) {
        setCodigoEmpleado(profile.codigo_empleado);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAsignaciones();
    }
    fetchNotificaciones();
    
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
      // Filtrar incidentes asignados al técnico actual por tecnico_asignado_id
      const { data, error } = await supabase
        .from('incidentes')
        .select(`
          *,
          diagnosticos(
            id,
            estado,
            tecnico_codigo
          )
        `)
        .eq('status', 'En diagnostico')
        .eq('tecnico_asignado_id', userId)
        .order('fecha_ingreso', { ascending: true });

      if (error) throw error;
      setIncidentes(data || []);
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

      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('user_id', user.id)
        .eq('leido', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotificaciones(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const marcarNotificacionLeida = async (id: string, incidenteId?: string | null) => {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ leido: true })
        .eq('id', id);

      if (error) throw error;
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
      const metadata = notif.metadata as any;
      const solicitudId = metadata?.solicitud_id;
      const incidenteId = notif.incidente_id;

      if (continuar) {
        // El técnico decide continuar sin estos repuestos
        // Actualizar solicitud a "cancelado_tecnico"
        if (solicitudId) {
          await supabase
            .from("solicitudes_repuestos")
            .update({
              estado: "cancelado_tecnico",
              notas: `${metadata?.notas || ""} | Técnico decidió continuar sin estos repuestos.`
            })
            .eq("id", solicitudId);
        }

        toast.success("Se continuará la reparación sin los repuestos faltantes");
      } else {
        // El técnico decide esperar - cambiar incidente a Pendiente por repuestos
        if (incidenteId) {
          await supabase
            .from("incidentes")
            .update({
              status: "Pendiente por repuestos",
              updated_at: new Date().toISOString()
            })
            .eq("id", incidenteId);
        }

        // Actualizar solicitud a sin_stock
        if (solicitudId) {
          await supabase
            .from("solicitudes_repuestos")
            .update({
              estado: "sin_stock",
              notas: `${metadata?.notas || ""} | Técnico confirmó que repuestos son indispensables.`
            })
            .eq("id", solicitudId);
        }

        toast.success("Incidente marcado como pendiente por repuestos");
      }

      // Marcar notificación como leída
      await supabase
        .from('notificaciones')
        .update({ leido: true })
        .eq('id', notif.id);

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
        // Productividad del día: diagnósticos completados hoy por este técnico
        // Usamos el codigo_empleado para diagnósticos ya que esa tabla aún usa tecnico_codigo
        if (codigoEmpleado) {
          const { data: diagHoy } = await supabase
            .from('diagnosticos')
            .select('id')
            .eq('estado', 'completado')
            .eq('tecnico_codigo', codigoEmpleado)
            .gte('updated_at', hoy.toISOString());
          
          setProductividadDia(diagHoy?.length || 0);
        }

        // Reingresos: incidentes marcados como reingreso asignados a este técnico
        const { data: reingresosData } = await supabase
          .from('incidentes')
          .select('id')
          .eq('es_reingreso', true)
          .eq('status', 'En diagnostico')
          .eq('tecnico_asignado_id', userId);
        
        setReingresos(reingresosData?.length || 0);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchMetricas();
  }, [userId, codigoEmpleado]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wrench className="h-8 w-8 text-primary" />
          Mis Asignaciones
        </h1>
        <p className="text-muted-foreground mt-2">
          Máquinas asignadas a ti para diagnóstico
        </p>
      </div>

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
              const metadata = notif.metadata as any;
              const esDecisionStock = notif.tipo === "sin_stock_decision" && metadata?.requiere_decision;
              const repuestosSinStock = metadata?.repuestos_sin_stock || [];
              
              return (
                <div
                  key={notif.id}
                  className={`p-4 bg-card rounded-lg border ${esDecisionStock ? 'border-amber-300 bg-amber-50/50' : ''}`}
                >
                  <div className="flex-1 space-y-2">
                    <p className="font-medium">{notif.mensaje}</p>
                    
                    {/* Mostrar repuestos sin stock si es notificación de decisión */}
                    {esDecisionStock && repuestosSinStock.length > 0 && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <p className="font-medium text-muted-foreground mb-1">Repuestos sin stock:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {repuestosSinStock.map((rep: any, idx: number) => (
                            <li key={idx} className="text-muted-foreground">
                              <span className="font-mono">{rep.codigo}</span> - {rep.descripcion} 
                              <span className="text-amber-600 ml-1">(solicitados: {rep.cantidad_solicitada})</span>
                            </li>
                          ))}
                        </ul>
                        {metadata?.motivo && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            <span className="font-medium">Motivo bodega:</span> {metadata.motivo}
                          </p>
                        )}
                      </div>
                    )}
                    
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Asignadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{totalAsignadas}</div>
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
                const tieneBorrador = (inc as any).diagnosticos?.some((d: any) => d.estado === 'borrador');
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
                          {inc.codigo_producto}
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
                        {inc.cobertura_garantia && (
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
