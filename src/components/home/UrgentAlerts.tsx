import { useState } from "react";
import { AlertBanner } from "@/components/shared/dashboard";
import { useNavigate } from "react-router-dom";
import type { IncidenteSchema } from "@/generated/actions.d";

interface UrgentAlertsProps {
  incidentes: IncidenteSchema[];
}

interface Alert {
  id: string;
  variant: "error" | "warning";
  title: string;
  description?: string;
  action?: {
    label: string;
    path: string;
  };
}

export function UrgentAlerts({ incidentes }: UrgentAlertsProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Calculate alerts based on incidents
  const alerts: Alert[] = [];

  // Alert: Incidents waiting for parts > 8 days
  const esperaRepuestos = incidentes.filter((inc) => {
    if (inc.estado !== "ESPERA_REPUESTOS") return false;
    const created = new Date(inc.created_at || "");
    const days = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    return days >= 8;
  });

  if (esperaRepuestos.length > 0) {
    alerts.push({
      id: "espera-repuestos",
      variant: "error",
      title: `${esperaRepuestos.length} incidente${esperaRepuestos.length > 1 ? "s" : ""} con más de 8 días en espera de repuestos`,
      description: "Requieren atención urgente para evitar retrasos mayores",
      action: {
        label: "Ver pendientes",
        path: "/taller/pendientes-repuestos",
      },
    });
  }

  // Alert: Repaired machines without notification (REPARADO status)
  const reparadosSinNotificar = incidentes.filter(
    (inc) => inc.estado === "REPARADO"
  );

  if (reparadosSinNotificar.length > 0) {
    alerts.push({
      id: "sin-notificar",
      variant: "warning",
      title: `${reparadosSinNotificar.length} máquina${reparadosSinNotificar.length > 1 ? "s" : ""} reparada${reparadosSinNotificar.length > 1 ? "s" : ""} sin notificar al cliente`,
      description: "El cliente está esperando ser contactado",
      action: {
        label: "Ver SAC",
        path: "/sac/incidentes",
      },
    });
  }

  // Alert: Pending deliveries (EN_ENTREGA status)
  const entregasPendientes = incidentes.filter(
    (inc) => inc.estado === "EN_ENTREGA"
  );

  if (entregasPendientes.length >= 5) {
    alerts.push({
      id: "entregas-pendientes",
      variant: "warning",
      title: `${entregasPendientes.length} entregas pendientes`,
      description: "Máquinas listas esperando ser recogidas",
      action: {
        label: "Ver entregas",
        path: "/mostrador/entrega-maquinas",
      },
    });
  }

  const visibleAlerts = alerts.filter((alert) => !dismissed.has(alert.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <AlertBanner
          key={alert.id}
          variant={alert.variant}
          title={alert.title}
          description={alert.description}
          action={
            alert.action
              ? {
                  label: alert.action.label,
                  onClick: () => navigate(alert.action!.path),
                }
              : undefined
          }
          onDismiss={() => setDismissed((prev) => new Set([...prev, alert.id]))}
        />
      ))}
    </div>
  );
}
