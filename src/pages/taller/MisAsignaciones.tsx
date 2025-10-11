import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Clock, Package, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];
type SolicitudRepuesto = Database['public']['Tables']['solicitudes_repuestos']['Row'];

export default function MisAsignaciones() {
  const navigate = useNavigate();
  const [misIncidentes, setMisIncidentes] = useState<IncidenteDB[]>([]);
  const [solicitudesRepuestos, setSolicitudesRepuestos] = useState<SolicitudRepuesto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel('mis-asignaciones')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'incidentes',
        filter: `status=eq.En diagnostico`
      }, () => {
        fetchData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'solicitudes_repuestos'
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Obtener incidentes en diagnóstico
      const { data: incidentes, error: incError } = await supabase
        .from('incidentes')
        .select('*')
        .eq('status', 'En diagnostico')
        .order('fecha_ingreso', { ascending: true });

      if (incError) throw incError;
      
      // Obtener solicitudes de repuestos
      const { data: solicitudes, error: solError } = await supabase
        .from('solicitudes_repuestos')
        .select('*')
        .order('created_at', { ascending: false });

      if (solError) throw solError;

      setMisIncidentes(incidentes || []);
      setSolicitudesRepuestos(solicitudes || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const getDiasDesdeIngreso = (fechaIngreso: string) => {
    return Math.floor((Date.now() - new Date(fechaIngreso).getTime()) / (1000 * 60 * 60 * 24));
  };

  const getEstadoBadge = (estado: string) => {
    const colores: Record<string, string> = {
      'pendiente': 'bg-yellow-500',
      'en_preparacion': 'bg-blue-500',
      'listo': 'bg-green-500',
      'entregado': 'bg-gray-500'
    };
    return colores[estado] || 'bg-gray-500';
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wrench className="h-8 w-8 text-primary" />
          Mis Asignaciones
        </h1>
        <p className="text-muted-foreground mt-2">
          Máquinas asignadas y estado de solicitudes
        </p>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">En Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{misIncidentes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Solicitudes Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {solicitudesRepuestos.filter(s => s.estado !== 'entregado').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Repuestos Listos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {solicitudesRepuestos.filter(s => s.estado === 'listo').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incidentes en diagnóstico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Incidentes en Diagnóstico ({misIncidentes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          ) : misIncidentes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No tienes incidentes asignados</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {misIncidentes.map((inc) => {
                const dias = getDiasDesdeIngreso(inc.fecha_ingreso);
                return (
                  <div
                    key={inc.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all"
                    onClick={() => navigate(`/taller/diagnostico/${inc.id}`)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{inc.codigo}</p>
                        <Badge variant="outline" className="bg-blue-50">
                          {inc.familia_producto || 'Sin familia'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {inc.descripcion_problema}
                      </p>

                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            dias > 7 ? 'bg-red-50 text-red-700 border-red-200' :
                            dias > 3 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {dias} días
                        </Badge>
                        {inc.cobertura_garantia && (
                          <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                            Garantía
                          </Badge>
                        )}
                      </div>

                      <Button className="w-full" size="sm">
                        Ver Diagnóstico
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Solicitudes de repuestos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Solicitudes de Repuestos ({solicitudesRepuestos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {solicitudesRepuestos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No hay solicitudes de repuestos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {solicitudesRepuestos.map((sol) => (
                <div key={sol.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Solicitud #{sol.id.slice(0, 8)}</p>
                        <Badge className={`${getEstadoBadge(sol.estado)} text-white`}>
                          {sol.estado.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      {sol.estado === 'listo' && (
                        <div className="flex items-center gap-2 text-green-600 text-sm">
                          <Bell className="h-4 w-4" />
                          <span className="font-medium">¡Repuestos listos para recoger!</span>
                        </div>
                      )}
                      
                      <div className="text-sm text-muted-foreground">
                        {Array.isArray(sol.repuestos) && sol.repuestos.length > 0 && (
                          <div className="space-y-1">
                            {sol.repuestos.map((rep: any, idx: number) => (
                              <p key={idx}>• {rep.descripcion || rep.codigo} (x{rep.cantidad})</p>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {sol.notas && (
                        <p className="text-sm text-muted-foreground italic">
                          Nota: {sol.notas}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}