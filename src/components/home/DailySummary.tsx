import { useNavigate } from "react-router-dom";
import { MetricCard } from "@/components/shared/dashboard";
import { Package, Wrench, Clock, CheckCircle } from "lucide-react";
import type { IncidenteSchema } from "@/generated/actions.d";

interface DailySummaryProps {
  incidentes: IncidenteSchema[];
}

export function DailySummary({ incidentes }: DailySummaryProps) {
  const navigate = useNavigate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate metrics
  const ingresosHoy = incidentes.filter((inc) => {
    const created = new Date(inc.created_at || "");
    created.setHours(0, 0, 0, 0);
    return created.getTime() === today.getTime();
  }).length;

  // Valid states: REPARADO, EN_ENTREGA, ENTREGADO, COMPLETADO
  const reparadosHoy = incidentes.filter((inc) => {
    if (!["REPARADO", "EN_ENTREGA", "ENTREGADO", "COMPLETADO"].includes(inc.estado || "")) {
      return false;
    }
    const updated = new Date(inc.updated_at || inc.created_at || "");
    updated.setHours(0, 0, 0, 0);
    return updated.getTime() === today.getTime();
  }).length;

  // Valid states: EN_DIAGNOSTICO, EN_REPARACION, ESPERA_REPUESTOS, ESPERA_APROBACION
  const enProceso = incidentes.filter((inc) =>
    ["EN_DIAGNOSTICO", "EN_REPARACION", "ESPERA_REPUESTOS", "ESPERA_APROBACION"].includes(inc.estado || "")
  ).length;

  // EN_ENTREGA = ready for delivery
  const entregasPendientes = incidentes.filter(
    (inc) => inc.estado === "EN_ENTREGA"
  ).length;

  // Generate sparkline data (last 7 days simulation based on total)
  const generateSparkline = (base: number): number[] => {
    return Array.from({ length: 7 }, (_, i) =>
      Math.max(0, Math.round(base * (0.7 + Math.random() * 0.6)))
    );
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Resumen del Día
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Ingresos Hoy"
          value={ingresosHoy}
          subtitle="Nuevos incidentes"
          icon={<Package className="h-5 w-5" />}
          iconColor="bg-blue-500/10 text-blue-500"
          sparklineData={generateSparkline(ingresosHoy)}
          sparklineColor="hsl(217, 91%, 60%)"
          onClick={() => navigate("/mostrador/incidentes")}
        />
        <MetricCard
          title="Reparados Hoy"
          value={reparadosHoy}
          subtitle="Completados"
          icon={<Wrench className="h-5 w-5" />}
          iconColor="bg-green-500/10 text-green-500"
          sparklineData={generateSparkline(reparadosHoy)}
          sparklineColor="hsl(142, 71%, 45%)"
          onClick={() => navigate("/taller/busqueda")}
        />
        <MetricCard
          title="En Proceso"
          value={enProceso}
          subtitle="Activos"
          icon={<Clock className="h-5 w-5" />}
          iconColor="bg-orange-500/10 text-orange-500"
          sparklineData={generateSparkline(enProceso)}
          sparklineColor="hsl(25, 95%, 53%)"
          onClick={() => navigate("/taller/busqueda")}
        />
        <MetricCard
          title="Entregas"
          value={entregasPendientes}
          subtitle="Pendientes"
          icon={<CheckCircle className="h-5 w-5" />}
          iconColor="bg-purple-500/10 text-purple-500"
          sparklineData={generateSparkline(entregasPendientes)}
          sparklineColor="hsl(262, 83%, 58%)"
          onClick={() => navigate("/mostrador/entrega-maquinas")}
          alert={entregasPendientes >= 10}
        />
      </div>
    </div>
  );
}
