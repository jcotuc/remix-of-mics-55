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
  const [codigoEmpleado, setCodigoEmpleado] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // Obtener código de empleado del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    if (codigoEmpleado) {
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
  }, [codigoEmpleado]);

  const fetchAsignaciones = async () => {
    if (!codigoEmpleado) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Filtrar incidentes asignados al técnico actual
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
        .eq('codigo_tecnico', codigoEmpleado)
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

  const marcarNotificacionLeida = async (id: string, incidenteId?: string) => {
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
    if (!codigoEmpleado) return;
    
    const fetchMetricas = async () => {
      try {
        // Productividad del día: diagnósticos completados hoy por este técnico
        const { data: diagHoy } = await supabase
          .from('diagnosticos')
          .select('id')
          .eq('estado', 'completado')
          .eq('tecnico_codigo', codigoEmpleado)
          .gte('updated_at', hoy.toISOString());
        
        setProductividadDia(diagHoy?.length || 0);

        // Reingresos: incidentes marcados como reingreso asignados a este técnico
        const { data: reingresosData } = await supabase
          .from('incidentes')
          .select('id')
          .eq('es_reingreso', true)
          .eq('status', 'En diagnostico')
          .eq('codigo_tecnico', codigoEmpleado);
        
        setReingresos(reingresosData?.length || 0);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchMetricas();
  }, [codigoEmpleado]);

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
            {notificaciones.map((notif) => (
              <div
                key={notif.id}
                className="p-3 bg-card rounded-lg border flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{notif.mensaje}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
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
                </div>
              </div>
            ))}
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
