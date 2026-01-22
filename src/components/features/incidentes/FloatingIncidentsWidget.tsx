import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useActiveIncidents } from "@/contexts/ActiveIncidentsContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, X, ChevronUp, ChevronDown, Bell, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingIncidentsWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeIncidents, currentAssignments, maxAssignments, isLoading } = useActiveIncidents();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // No mostrar si no hay incidentes activos o está cargando
  if (isLoading || activeIncidents.length === 0) {
    return null;
  }

  // No mostrar si estamos en la página de diagnóstico
  const isDiagnosticoPage = location.pathname.startsWith("/taller/diagnostico/");

  const totalNotificaciones = activeIncidents.reduce((sum, inc) => sum + inc.notificacionesPendientes, 0);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="relative rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90"
        >
          <Wrench className="h-6 w-6" />
          {totalNotificaciones > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center animate-pulse">
              {totalNotificaciones}
            </span>
          )}
          <span className="absolute -bottom-1 -left-1 h-5 w-5 bg-blue-500 rounded-full text-xs text-white flex items-center justify-center">
            {currentAssignments}
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 w-72 bg-card border border-border rounded-lg shadow-xl transition-all duration-300",
        isDiagnosticoPage && "opacity-70 hover:opacity-100",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Mis Asignaciones</span>
          <Badge
            variant="secondary"
            className={cn(
              "text-xs",
              currentAssignments >= maxAssignments ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700",
            )}
          >
            {currentAssignments}/{maxAssignments}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(true)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lista de incidentes */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto">
          {activeIncidents.map((incident, index) => {
            const isCurrentPage = location.pathname === `/taller/diagnostico/${incident.id}`;

            return (
              <div
                key={incident.id}
                className={cn(
                  "flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer border-b border-border/50 last:border-0 transition-all",
                  isCurrentPage && "bg-primary/10 border-l-2 border-l-primary",
                )}
                onClick={() => navigate(`/taller/diagnostico/${incident.id}`)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-sm font-medium truncate">{incident.codigo}</span>
                      {isCurrentPage && <span className="text-[10px] text-primary">(actual)</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{incident.codigo_producto}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {incident.notificacionesPendientes > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 w-5 p-0 flex items-center justify-center text-[10px] animate-pulse"
                    >
                      {incident.notificacionesPendientes}
                    </Badge>
                  )}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer con notificaciones totales */}
      {totalNotificaciones > 0 && isExpanded && (
        <div className="p-2 bg-amber-50 border-t border-amber-200 rounded-b-lg">
          <div className="flex items-center gap-2 text-amber-700 text-xs">
            <Bell className="h-3 w-3 animate-pulse" />
            <span>
              {totalNotificaciones} notificación{totalNotificaciones > 1 ? "es" : ""} pendiente
              {totalNotificaciones > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
