import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type SolicitudCambio = Database['public']['Tables']['solicitudes_cambio']['Row'];

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCambio[]>([]);
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudCambio | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('solicitudes_cambio')
        .select('*, incidentes(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async () => {
    if (!selectedSolicitud) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('solicitudes_cambio')
        .update({
          estado: 'aprobado',
          aprobado_por: user.id,
          fecha_aprobacion: new Date().toISOString(),
          observaciones_aprobacion: observaciones
        })
        .eq('id', selectedSolicitud.id);

      if (error) throw error;

      // Crear notificación para el técnico
      await supabase.from('notificaciones').insert({
        user_id: user.id, // Idealmente sería el ID del técnico
        incidente_id: selectedSolicitud.incidente_id,
        tipo: 'aprobacion_solicitud',
        mensaje: `Solicitud de ${selectedSolicitud.tipo_cambio} APROBADA para ${selectedSolicitud.incidente_id}`
      });

      toast.success('Solicitud aprobada');
      setSelectedSolicitud(null);
      setObservaciones("");
      fetchSolicitudes();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al aprobar solicitud');
    }
  };

  const handleRechazar = async () => {
    if (!selectedSolicitud) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('solicitudes_cambio')
        .update({
          estado: 'rechazado',
          aprobado_por: user.id,
          fecha_aprobacion: new Date().toISOString(),
          observaciones_aprobacion: observaciones
        })
        .eq('id', selectedSolicitud.id);

      if (error) throw error;

      // Crear notificación para el técnico
      await supabase.from('notificaciones').insert({
        user_id: user.id,
        incidente_id: selectedSolicitud.incidente_id,
        tipo: 'rechazo_solicitud',
        mensaje: `Solicitud de ${selectedSolicitud.tipo_cambio} RECHAZADA para ${selectedSolicitud.incidente_id}`
      });

      toast.success('Solicitud rechazada');
      setSelectedSolicitud(null);
      setObservaciones("");
      fetchSolicitudes();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al rechazar solicitud');
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'aprobado':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Aprobado</Badge>;
      case 'rechazado':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rechazado</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    const colors = {
      garantia: 'bg-blue-500 text-white',
      canje: 'bg-orange-500 text-white',
      nota_credito: 'bg-purple-500 text-white'
    };
    return <Badge className={colors[tipo as keyof typeof colors]}>{tipo.replace('_', ' ').toUpperCase()}</Badge>;
  };

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente');
  const resueltas = solicitudes.filter(s => s.estado !== 'pendiente');

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Solicitudes de Cambio</h1>
        <p className="text-muted-foreground mt-2">
          Aprobaciones de garantía, canje y notas de crédito
        </p>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{pendientes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {resueltas.filter(s => s.estado === 'aprobado').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {resueltas.filter(s => s.estado === 'rechazado').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Solicitudes Pendientes */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes Pendientes ({pendientes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pendientes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No hay solicitudes pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendientes.map((sol) => (
                <div
                  key={sol.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {getTipoBadge(sol.tipo_cambio)}
                        {getEstadoBadge(sol.estado)}
                      </div>
                      <div>
                        <p className="font-semibold">Incidente: {sol.incidente_id}</p>
                        <p className="text-sm text-muted-foreground">Técnico: {sol.tecnico_solicitante}</p>
                      </div>
                      <p className="text-sm">{sol.justificacion}</p>
                      <p className="text-xs text-muted-foreground">
                        Creada: {new Date(sol.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button onClick={() => setSelectedSolicitud(sol)}>
                      Revisar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Solicitudes Resueltas */}
      <Card>
        <CardHeader>
          <CardTitle>Historial ({resueltas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {resueltas.map((sol) => (
              <div key={sol.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getTipoBadge(sol.tipo_cambio)}
                      {getEstadoBadge(sol.estado)}
                    </div>
                    <p className="text-sm font-medium">Incidente: {sol.incidente_id}</p>
                    <p className="text-xs text-muted-foreground">
                      Resuelto: {sol.fecha_aprobacion ? new Date(sol.fecha_aprobacion).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Revisión */}
      <Dialog open={!!selectedSolicitud} onOpenChange={() => setSelectedSolicitud(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Solicitud de {selectedSolicitud?.tipo_cambio.replace('_', ' ')}</DialogTitle>
          </DialogHeader>
          
          {selectedSolicitud && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Incidente</label>
                <p>{selectedSolicitud.incidente_id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Técnico Solicitante</label>
                <p>{selectedSolicitud.tecnico_solicitante}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Justificación</label>
                <p className="text-sm text-muted-foreground">{selectedSolicitud.justificacion}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Observaciones (Opcional)</label>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Agrega observaciones sobre esta decisión..."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedSolicitud(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRechazar}>
              <XCircle className="h-4 w-4 mr-2" />
              Rechazar
            </Button>
            <Button onClick={handleAprobar}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
