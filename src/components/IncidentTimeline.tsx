import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  ArrowUpDown, 
  User, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Camera,
  Wrench,
  Package,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLog {
  id: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  tabla_afectada: string;
  registro_id: string;
  usuario_email: string | null;
  created_at: string;
  valores_anteriores: Record<string, any> | null;
  valores_nuevos: Record<string, any> | null;
  campos_modificados: string[] | null;
  motivo: string | null;
}

interface TimelineEvent {
  id: string;
  type: 'create' | 'update' | 'delete' | 'diagnostico' | 'repuesto' | 'foto' | 'status';
  title: string;
  description: string;
  user: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
}

interface IncidentTimelineProps {
  incidenteId: string;
}

const actionConfig = {
  INSERT: { color: "bg-emerald-500", icon: Plus, label: "Creación" },
  UPDATE: { color: "bg-amber-500", icon: Edit, label: "Actualización" },
  DELETE: { color: "bg-red-500", icon: Trash2, label: "Eliminación" },
};

const tableLabels: Record<string, string> = {
  incidentes: "Incidente",
  diagnosticos: "Diagnóstico",
  solicitudes_repuestos: "Solicitud de repuestos",
  incidente_fotos: "Foto",
  guias_envio: "Guía de envío",
  notificaciones_cliente: "Notificación cliente",
};

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    status: "Estado",
    codigo_producto: "Código de producto",
    codigo_cliente: "Código de cliente",
    descripcion_problema: "Descripción del problema",
    cobertura_garantia: "Cobertura de garantía",
    tecnico_asignado_id: "Técnico asignado",
    centro_servicio: "Centro de servicio",
    accesorios: "Accesorios",
    observaciones_recepcion: "Observaciones de recepción",
    log_observaciones: "Log de observaciones",
    fallas: "Fallas",
    causas: "Causas",
    resolucion: "Resolución",
  };
  return labels[field] || field.replace(/_/g, " ");
}

export function IncidentTimeline({ incidenteId }: IncidentTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchHistory();
  }, [incidenteId]);

  const fetchHistory = async () => {
    try {
      // Fetch audit logs for the incident
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .or(`registro_id.eq.${incidenteId},tabla_afectada.eq.incidentes`)
        .order('created_at', { ascending: false });

      if (auditError) throw auditError;

      // Filter logs that are related to this incident
      const relevantLogs = (auditLogs || []).filter(log => {
        if (log.registro_id === incidenteId) return true;
        if (log.tabla_afectada === 'incidentes' && log.registro_id === incidenteId) return true;
        return false;
      });

      // Fetch diagnostico events
      const { data: diagnosticos } = await supabase
        .from('diagnosticos')
        .select('*')
        .eq('incidente_id', incidenteId)
        .order('created_at', { ascending: false });

      // Fetch solicitudes de repuestos
      const { data: solicitudes } = await supabase
        .from('solicitudes_repuestos')
        .select('*')
        .eq('incidente_id', incidenteId)
        .order('created_at', { ascending: false });

      // Fetch photos
      const { data: fotos } = await supabase
        .from('incidente_fotos')
        .select('*')
        .eq('incidente_id', incidenteId)
        .order('created_at', { ascending: false });

      // Transform to timeline events
      const timelineEvents: TimelineEvent[] = [];

      // Add audit log events
      relevantLogs.forEach(log => {
        const config = actionConfig[log.accion as keyof typeof actionConfig];
        let description = "";
        
        if (log.accion === 'UPDATE' && log.campos_modificados) {
          const changes = log.campos_modificados
            .filter(f => f !== 'updated_at')
            .map(f => getFieldLabel(f))
            .join(", ");
          description = `Campos modificados: ${changes || "Sin cambios significativos"}`;
          
          // Special handling for status changes
          if (log.campos_modificados.includes('status') && log.valores_nuevos && log.valores_anteriores) {
            const oldStatus = (log.valores_anteriores as Record<string, any>)?.status;
            const newStatus = (log.valores_nuevos as Record<string, any>)?.status;
            if (oldStatus && newStatus) {
              description = `Estado: ${oldStatus} → ${newStatus}`;
            }
          }
        } else if (log.accion === 'INSERT') {
          description = `${tableLabels[log.tabla_afectada] || log.tabla_afectada} creado`;
        } else if (log.accion === 'DELETE') {
          description = `${tableLabels[log.tabla_afectada] || log.tabla_afectada} eliminado`;
        }

        timelineEvents.push({
          id: log.id,
          type: log.accion === 'INSERT' ? 'create' : log.accion === 'UPDATE' ? 'update' : 'delete',
          title: `${config.label} de ${tableLabels[log.tabla_afectada] || log.tabla_afectada}`,
          description,
          user: log.usuario_email || "Sistema",
          timestamp: log.created_at,
          icon: <config.icon className="w-3 h-3" />,
          color: config.color,
        });
      });

      // Add diagnostico events
      (diagnosticos || []).forEach(diag => {
        timelineEvents.push({
          id: `diag-${diag.id}`,
          type: 'diagnostico',
          title: "Diagnóstico técnico",
          description: `Fallas: ${(diag.fallas || []).join(", ") || "Sin fallas registradas"}`,
          user: diag.tecnico_codigo || "Técnico",
          timestamp: diag.created_at || new Date().toISOString(),
          icon: <Wrench className="w-3 h-3" />,
          color: "bg-blue-500",
        });
      });

      // Add solicitudes events
      (solicitudes || []).forEach(sol => {
        const repuestos = sol.repuestos as any[];
        const count = Array.isArray(repuestos) ? repuestos.length : 0;
        timelineEvents.push({
          id: `sol-${sol.id}`,
          type: 'repuesto',
          title: "Solicitud de repuestos",
          description: `${count} repuesto(s) solicitado(s) - Estado: ${sol.estado || "pendiente"}`,
          user: sol.tecnico_solicitante || "Técnico",
          timestamp: sol.created_at || new Date().toISOString(),
          icon: <Package className="w-3 h-3" />,
          color: "bg-violet-500",
        });
      });

      // Add photo events (grouped by type)
      const fotosByType = (fotos || []).reduce((acc, foto) => {
        if (!acc[foto.tipo]) acc[foto.tipo] = [];
        acc[foto.tipo].push(foto);
        return acc;
      }, {} as Record<string, typeof fotos>);

      Object.entries(fotosByType).forEach(([tipo, photos]) => {
        if (photos && photos.length > 0) {
          const firstPhoto = photos[0];
          timelineEvents.push({
            id: `foto-${tipo}-${firstPhoto.id}`,
            type: 'foto',
            title: `Fotos de ${tipo}`,
            description: `${photos.length} foto(s) agregada(s)`,
            user: "Usuario",
            timestamp: firstPhoto.created_at,
            icon: <Camera className="w-3 h-3" />,
            color: "bg-cyan-500",
          });
        }
      });

      // Sort by timestamp
      timelineEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setEvents(timelineEvents);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  const filteredEvents = sortedEvents.filter(event => {
    if (filterType === "all") return true;
    return event.type === filterType;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historial de Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historial de Eventos
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredEvents.length})
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="status">Estados</SelectItem>
                <SelectItem value="diagnostico">Diagnósticos</SelectItem>
                <SelectItem value="repuesto">Repuestos</SelectItem>
                <SelectItem value="foto">Fotos</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
            >
              <ArrowUpDown className="w-3 h-3 mr-1" />
              {sortOrder === "desc" ? "Reciente" : "Antiguo"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay eventos registrados</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-4">
              {filteredEvents.map((event, index) => (
                <div key={event.id} className="relative flex gap-4 pl-2">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${event.color} text-white shrink-0`}>
                    {event.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.description}
                        </p>
                      </div>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(event.timestamp), "dd MMM yyyy HH:mm", { locale: es })}
                      </time>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{event.user}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}