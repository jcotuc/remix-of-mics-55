import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared";
import { ArrowRight, ClipboardList, MessageSquare, Package, Truck } from "lucide-react";
import type { IncidenteSchema } from "@/generated/actions.d";

interface MyActivityProps {
  incidentes: IncidenteSchema[];
}

interface ActivityConfig {
  title: string;
  icon: React.ElementType;
  filter: (inc: IncidenteSchema) => boolean;
  emptyMessage: string;
  actionLabel: string;
  actionPath: string;
}

const activityByRole: Record<string, ActivityConfig> = {
  admin: {
    title: "Actividad Reciente",
    icon: ClipboardList,
    filter: () => true,
    emptyMessage: "No hay actividad reciente",
    actionLabel: "Ver todo",
    actionPath: "/taller/busqueda",
  },
  mostrador: {
    title: "Entregas del Día",
    icon: Package,
    filter: (inc) => inc.estado === "EN_ENTREGA",
    emptyMessage: "No hay entregas pendientes",
    actionLabel: "Ver entregas",
    actionPath: "/mostrador/entrega-maquinas",
  },
  tecnico: {
    title: "Mis Asignaciones",
    icon: ClipboardList,
    filter: (inc) => ["EN_DIAGNOSTICO", "EN_REPARACION", "ESPERA_REPUESTOS"].includes(inc.estado || ""),
    emptyMessage: "No tienes asignaciones pendientes",
    actionLabel: "Ver asignaciones",
    actionPath: "/taller/mis-asignaciones",
  },
  taller: {
    title: "Mis Asignaciones",
    icon: ClipboardList,
    filter: (inc) => ["EN_DIAGNOSTICO", "EN_REPARACION", "ESPERA_REPUESTOS"].includes(inc.estado || ""),
    emptyMessage: "No tienes asignaciones pendientes",
    actionLabel: "Ver asignaciones",
    actionPath: "/taller/mis-asignaciones",
  },
  sac: {
    title: "Pendientes de Notificar",
    icon: MessageSquare,
    filter: (inc) => inc.estado === "REPARADO",
    emptyMessage: "Todos los clientes han sido notificados",
    actionLabel: "Ver SAC",
    actionPath: "/sac/incidentes",
  },
  logistica: {
    title: "Incidentes Activos",
    icon: Truck,
    filter: (inc) => !["ENTREGADO", "CERRADO", "CANCELADO", "COMPLETADO"].includes(inc.estado || ""),
    emptyMessage: "No hay incidentes activos",
    actionLabel: "Ver logística",
    actionPath: "/logistica/embarques",
  },
  jefe_taller: {
    title: "Alertas Críticas",
    icon: ClipboardList,
    filter: (inc) => {
      if (inc.estado !== "ESPERA_REPUESTOS") return false;
      const created = new Date(inc.created_at || "");
      const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 8;
    },
    emptyMessage: "Sin alertas críticas",
    actionLabel: "Ver pendientes",
    actionPath: "/taller/pendientes-repuestos",
  },
};

export function MyActivity({ incidentes }: MyActivityProps) {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const config = activityByRole[userRole || "admin"] || activityByRole.admin;
  const filteredIncidentes = incidentes.filter(config.filter).slice(0, 5);
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {config.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => navigate(config.actionPath)}
          >
            {config.actionLabel}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {filteredIncidentes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {config.emptyMessage}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredIncidentes.map((incidente) => (
              <div
                key={incidente.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/incidentes/${incidente.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {incidente.codigo}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {incidente.producto?.codigo || "Sin producto"}
                  </p>
                </div>
                <StatusBadge status={incidente.estado} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
