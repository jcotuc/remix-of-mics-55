import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useActiveIncidents } from "@/contexts/ActiveIncidentsContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, X, ChevronUp, ChevronDown, Bell, ExternalLink, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInMinutes } from "date-fns";

export function FloatingIncidentsWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeIncidents, currentAssignments, maxAssignments, isLoading, refreshIncidents } = useActiveIncidents();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Check which incidents have been in review for more than 1 hour
  const incidentsWithTimeInfo = useMemo(() => {
    const now = new Date();
    return activeIncidents.map(inc => {
      const createdAt = inc.created_at ? new Date(inc.created_at) : null;
      const minutesElapsed = createdAt ? differenceInMinutes(now, createdAt) : 0;
      const isOverOneHour = minutesElapsed >= 60;
      return {
        ...inc,
        minutesElapsed,
        isOverOneHour
      };
    });
  }, [activeIncidents]);

  const incidentsOverOneHour = incidentsWithTimeInfo.filter(inc => inc.isOverOneHour).length;

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
          {incidentsOverOneHour > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 rounded-full text-xs text-white flex items-center justify-center animate-pulse">
              <AlertTriangle className="h-3 w-3" />
            </span>
          )}
          {totalNotificaciones > 0 && (
            <span className="absolute -top-1 -left-1 h-5 w-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center animate-pulse">
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
          {incidentsOverOneHour > 0 && (
            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {incidentsOverOneHour}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refreshIncidents()}>
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </Button>
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
        <div className="max-h-64 overflow-y-auto divide-y divide-border/40">
          {incidentsWithTimeInfo.map((incident) => {
            const isCurrentPage = location.pathname === `/taller/diagnostico/${incident.id}`;

            return (
              <div
                key={incident.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors",
                  isCurrentPage && "bg-primary/5 border-l-2 border-l-primary",
                  incident.isOverOneHour && !isCurrentPage && "bg-orange-50/50 border-l-2 border-l-orange-400",
                )}
                onClick={() => navigate(`/taller/diagnostico/${incident.id}`)}
              >
                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-semibold text-foreground truncate">
                      {incident.codigo}
                    </span>
                    {isCurrentPage && (
                      <span className="text-[10px] text-primary font-medium bg-primary/10 px-1 rounded">
                        actual
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {incident.producto?.codigo || incident.codigo_producto || "Sin producto"}
                  </p>
                </div>

                {/* Badges y tiempo */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {incident.isOverOneHour && (
                    <div className="flex items-center gap-1 text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                      <Clock className="h-3 w-3" />
                      <span>{Math.floor(incident.minutesElapsed / 60)}h{incident.minutesElapsed % 60}m</span>
                    </div>
                  )}
                  {incident.notificacionesPendientes > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 min-w-5 px-1 flex items-center justify-center text-[10px] animate-pulse"
                    >
                      {incident.notificacionesPendientes}
                    </Badge>
                  )}
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer con notificaciones y advertencias */}
      {isExpanded && (incidentsOverOneHour > 0 || totalNotificaciones > 0) && (
        <div className={cn(
          "p-2 border-t rounded-b-lg",
          incidentsOverOneHour > 0 ? "bg-orange-50 border-orange-200" : "bg-amber-50 border-amber-200"
        )}>
          {incidentsOverOneHour > 0 && (
            <div className="flex items-center gap-2 text-orange-700 text-xs mb-1">
              <AlertTriangle className="h-3 w-3" />
              <span>
                {incidentsOverOneHour} incidente{incidentsOverOneHour > 1 ? "s" : ""} con más de 1 hora
              </span>
            </div>
          )}
          {totalNotificaciones > 0 && (
            <div className="flex items-center gap-2 text-amber-700 text-xs">
              <Bell className="h-3 w-3 animate-pulse" />
              <span>
                {totalNotificaciones} notificación{totalNotificaciones > 1 ? "es" : ""} pendiente
                {totalNotificaciones > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}