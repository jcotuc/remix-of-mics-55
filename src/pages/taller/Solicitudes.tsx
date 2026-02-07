import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { mycsapi } from "@/mics-api";

interface SolicitudDisplay {
  id: number;
  incidente_id: number;
  tipo_cambio: string;
  estado: string;
  tecnico_solicitante: string;
  justificacion: string | null;
  created_at: string;
  fecha_aprobacion: string | null;
  observaciones_aprobacion: string | null;
}

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState<SolicitudDisplay[]>([]);
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudDisplay | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      setLoading(true);
      
      // Fetch diagnosticos via Registry
      // Fetch all incidentes first, then diagnosticos per incidente
      const incidentesRes = await mycsapi.get("/api/v1/incidentes", { query: { limit: 1000 } });
      const incIds = ((incidentesRes as any).results || []).map((i: any) => i.id);
      const diagArrays = await Promise.all(
        incIds.slice(0, 50).map((id: number) => mycsapi.get("/api/v1/incidentes/{incidente_id}/diagnosticos", { path: { incidente_id: id } }).catch(() => ({ results: [] })))
      );
      const allDiagnosticos = diagArrays.flatMap(r => (r as any).results || []);
      
      // Filter by estado
      const filteredDiagnosticos = allDiagnosticos.filter((d: any) => 
        ['PENDIENTE', 'COMPLETADO'].includes(d.estado)
      );

      // Fetch usuarios for technician names
      const usuariosRes = await mycsapi.get("/api/v1/usuarios/");
      const allUsuarios = (usuariosRes as any).results || [];
      const usuariosMap = new Map(allUsuarios.map((u: any) => [u.id, u]));

      // Transform to solicitud format
      const formattedData: SolicitudDisplay[] = filteredDiagnosticos.map((d: any) => {
        const usuario = usuariosMap.get(d.tecnico_id) as { nombre?: string; apellido?: string | null } | undefined;
        return {
          id: d.id,
          incidente_id: d.incidente_id,
          tipo_cambio: d.tipo_resolucion || 'reparacion',
          estado: d.estado === 'COMPLETADO' ? 'aprobado' : 'pendiente',
          tecnico_solicitante: usuario 
            ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim()
            : `Técnico #${d.tecnico_id}`,
          justificacion: d.recomendaciones,
          created_at: d.created_at || new Date().toISOString(),
          fecha_aprobacion: d.updated_at,
          observaciones_aprobacion: null,
        };
      });

      // Sort by created_at descending
      formattedData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setSolicitudes(formattedData);
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
      // Use apiBackendAction for updates
      await mycsapi.fetch("/api/v1/diagnosticos/{diagnostico_id}".replace("{diagnostico_id}", String(selectedSolicitud.id)), { method: "PATCH", body: {
          estado: 'COMPLETADO',
          updated_at: new Date().toISOString()
        } as any });

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
      // Use apiBackendAction for updates
      await mycsapi.fetch("/api/v1/diagnosticos/{diagnostico_id}".replace("{diagnostico_id}", String(selectedSolicitud.id)), { method: "PATCH", body: {
          estado: 'PENDIENTE',
          updated_at: new Date().toISOString()
        } as any });

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
    const colors: Record<string, string> = {
      GARANTIA: 'bg-blue-500 text-white',
      CAMBIO: 'bg-orange-500 text-white',
      NOTA_CREDITO: 'bg-purple-500 text-white',
      REPARACION: 'bg-green-500 text-white',
    };
    return <Badge className={colors[tipo] || 'bg-gray-500 text-white'}>{tipo.replace('_', ' ')}</Badge>;
  };

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente');
  const resueltas = solicitudes.filter(s => s.estado !== 'pendiente');

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">Cargando...</p>
      </div>
    );
  }

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
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
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
                        <p className="font-semibold">Incidente: #{sol.incidente_id}</p>
                        <p className="text-sm text-muted-foreground">Técnico: {sol.tecnico_solicitante}</p>
                      </div>
                      {sol.justificacion && (
                        <p className="text-sm">{sol.justificacion}</p>
                      )}
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
                    <p className="text-sm font-medium">Incidente: #{sol.incidente_id}</p>
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
                <p>#{selectedSolicitud.incidente_id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Técnico Solicitante</label>
                <p>{selectedSolicitud.tecnico_solicitante}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Justificación</label>
                <p className="text-sm text-muted-foreground">{selectedSolicitud.justificacion || "Sin justificación"}</p>
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
