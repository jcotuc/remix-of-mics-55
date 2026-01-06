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
  Camera,
  Wrench,
  Package,
  MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface TimelineEvent {
  id: string;
  type: 'create' | 'update' | 'delete' | 'diagnostico' | 'repuesto' | 'foto' | 'status';
  title: string;
  description: string;
  user: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
  observacion?: string | null;
}

interface HistorialConObservacionesProps {
  incidenteId: string;
  logObservaciones: string | null;
  headerVariant?: "default" | "clean";
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

interface ParsedObservacion {
  timestamp: Date | null;
  user: string | null;
  message: string;
  raw: string;
}

function parseObservaciones(log: string | null): ParsedObservacion[] {
  if (!log || log.trim() === "") return [];
  
  const observaciones: ParsedObservacion[] = [];
  const lines = log.split('\n').filter(line => line.trim() !== "");
  
  lines.forEach(line => {
    // Try [timestamp] user: message
    const bracketMatch = line.match(/^\[(\d{4}-\d{2}-\d{2}[^\]]*)\]\s*([^:]+)?:\s*(.+)$/);
    if (bracketMatch) {
      observaciones.push({
        timestamp: new Date(bracketMatch[1]),
        user: bracketMatch[2]?.trim() || null,
        message: bracketMatch[3].trim(),
        raw: line
      });
      return;
    }

    // Try timestamp - message
    const dashMatch = line.match(/^(\d{4}-\d{2}-\d{2}[^-]*)\s*-\s*(.+)$/);
    if (dashMatch) {
      observaciones.push({
        timestamp: new Date(dashMatch[1].trim()),
        user: null,
        message: dashMatch[2].trim(),
        raw: line
      });
      return;
    }

    // Plain text
    observaciones.push({
      timestamp: null,
      user: null,
      message: line.trim(),
      raw: line
    });
  });

  return observaciones;
}

function assignObservacionesToEvents(
  timelineEvents: TimelineEvent[], 
  observaciones: ParsedObservacion[]
): void {
  if (observaciones.length === 0 || timelineEvents.length === 0) return;

  // Sort events by timestamp ascending
  const sortedEvents = [...timelineEvents].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // For each observation, find the closest event
  observaciones.forEach(obs => {
    let bestMatch: TimelineEvent | null = null;
    let smallestDiff = Infinity;

    sortedEvents.forEach(event => {
      if (event.observacion) return; // Already has an observation
      
      const eventDate = new Date(event.timestamp);
      let obsDatenew: Date;
      
      if (obs.timestamp) {
        obsDatenew = obs.timestamp;
      } else {
        // For observations without timestamp, assign to earliest event without observation
        if (!bestMatch) {
          bestMatch = event;
        }
        return;
      }

      const diff = Math.abs(eventDate.getTime() - obsDatenew.getTime());
      // Within 1 hour window
      if (diff < 60 * 60 * 1000 && diff < smallestDiff) {
        smallestDiff = diff;
        bestMatch = event;
      }
    });

    if (bestMatch) {
      bestMatch.observacion = obs.message;
    } else if (sortedEvents.length > 0) {
      // Assign to the first event without observation
      const eventWithoutObs = sortedEvents.find(e => !e.observacion);
      if (eventWithoutObs) {
        eventWithoutObs.observacion = obs.message;
      }
    }
  });
}

export function HistorialConObservaciones({ incidenteId, logObservaciones, headerVariant = "default" }: HistorialConObservacionesProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [filterType, setFilterType] = useState<string>("all");

  const observaciones = parseObservaciones(logObservaciones);

  useEffect(() => {
    fetchHistory();
  }, [incidenteId]);

  const fetchHistory = async () => {
    try {
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .or(`registro_id.eq.${incidenteId},tabla_afectada.eq.incidentes`)
        .order('created_at', { ascending: false });

      if (auditError) throw auditError;

      const relevantLogs = (auditLogs || []).filter(log => {
        if (log.registro_id === incidenteId) return true;
        return false;
      });

      const { data: diagnosticos } = await supabase
        .from('diagnosticos')
        .select('*')
        .eq('incidente_id', incidenteId)
        .order('created_at', { ascending: false });

      const { data: solicitudes } = await supabase
        .from('solicitudes_repuestos')
        .select('*')
        .eq('incidente_id', incidenteId)
        .order('created_at', { ascending: false });

      const { data: fotos } = await supabase
        .from('incidente_fotos')
        .select('*')
        .eq('incidente_id', incidenteId)
        .order('created_at', { ascending: false });

      const timelineEvents: TimelineEvent[] = [];

      relevantLogs.forEach(log => {
        const config = actionConfig[log.accion as keyof typeof actionConfig];
        let description = "";
        
        if (log.accion === 'UPDATE' && log.campos_modificados) {
          const changes = log.campos_modificados
            .filter(f => f !== 'updated_at')
            .map(f => getFieldLabel(f))
            .join(", ");
          description = `Campos modificados: ${changes || "Sin cambios significativos"}`;
          
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
          observacion: null,
        });
      });

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
          observacion: null,
        });
      });

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
          observacion: null,
        });
      });

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
            observacion: null,
          });
        }
      });

      // Assign observations to events (no separate observation events)
      assignObservacionesToEvents(timelineEvents, observaciones);

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
          {headerVariant === "default" ? (
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Historial y Observaciones
            </CardTitle>
          ) : (
            <Clock className="w-5 h-5 text-primary" />
          )}
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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {headerVariant === "default" ? (
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Historial y Observaciones
              <span className="text-sm font-normal text-muted-foreground">
                ({filteredEvents.length})
              </span>
            </CardTitle>
          ) : (
            <Clock className="w-5 h-5 text-primary" />
          )}
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
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
          <div className="max-h-[500px] overflow-y-auto">
            {/* Header row */}
            <div className="flex gap-3 mb-3 pb-2 border-b border-border sticky top-0 bg-background z-10">
              <div className="w-1/2 text-xs font-medium text-muted-foreground">Evento</div>
              <div className="w-1/2 text-xs font-medium text-muted-foreground">Observación</div>
            </div>
            
            {/* Events */}
            <div className="space-y-2">
              {filteredEvents.map((event) => (
                <div key={event.id} className="flex gap-3">
                  {/* Left - Event (50%) */}
                  <div className="w-1/2 flex gap-2">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${event.color} text-white shrink-0 mt-1`}>
                      {event.icon}
                    </div>
                    <div className="flex-1 min-w-0 bg-muted/40 rounded-lg p-2 border border-border/50">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-medium leading-tight">{event.title}</p>
                        <time className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {format(new Date(event.timestamp), "dd/MM HH:mm", { locale: es })}
                        </time>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <User className="w-2.5 h-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground truncate">{event.user}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right - Observation (50%) */}
                  <div className="w-1/2">
                    {event.observacion ? (
                      <div className="h-full bg-primary/5 border border-primary/20 rounded-lg p-2 flex items-start gap-2">
                        <MessageSquare className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-foreground/80">
                          {event.observacion}
                        </p>
                      </div>
                    ) : (
                      <div className="h-full bg-muted/10 border border-dashed border-border/30 rounded-lg p-2 flex items-center justify-center min-h-[40px]">
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      </div>
                    )}
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
