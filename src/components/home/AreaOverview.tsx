import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ClipboardList, Wrench, Truck, MessageSquare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncidenteSchema } from "@/generated/actions.d";

interface AreaOverviewProps {
  incidentes: IncidenteSchema[];
}

interface AreaMetric {
  label: string;
  value: number;
  path: string;
  trend?: "up" | "down" | "neutral";
  alert?: boolean;
}

export function AreaOverview({ incidentes }: AreaOverviewProps) {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate metrics for each area using valid EstadoIncidente values
  const mostradorMetrics: AreaMetric[] = [
    {
      label: "Registrados",
      value: incidentes.filter((i) => i.estado === "REGISTRADO").length,
      path: "/mostrador/incidentes",
    },
    {
      label: "En Diagnóstico",
      value: incidentes.filter((i) => i.estado === "EN_DIAGNOSTICO").length,
      path: "/mostrador/incidentes",
    },
    {
      label: "En Entrega",
      value: incidentes.filter((i) => i.estado === "EN_ENTREGA").length,
      path: "/mostrador/entrega-maquinas",
      alert: incidentes.filter((i) => i.estado === "EN_ENTREGA").length >= 5,
    },
    {
      label: "Entregados Hoy",
      value: incidentes.filter((i) => {
        if (i.estado !== "ENTREGADO") return false;
        const updated = new Date(i.updated_at || i.created_at || "");
        updated.setHours(0, 0, 0, 0);
        return updated.getTime() === today.getTime();
      }).length,
      path: "/mostrador/incidentes",
      trend: "up",
    },
  ];

  const tallerMetrics: AreaMetric[] = [
    {
      label: "En Reparación",
      value: incidentes.filter((i) => i.estado === "EN_REPARACION").length,
      path: "/taller/asignaciones",
    },
    {
      label: "Espera Repuestos",
      value: incidentes.filter((i) => i.estado === "ESPERA_REPUESTOS").length,
      path: "/taller/pendientes-repuestos",
      alert: incidentes.filter((i) => i.estado === "ESPERA_REPUESTOS").length >= 5,
    },
    {
      label: "Espera Aprobación",
      value: incidentes.filter((i) => i.estado === "ESPERA_APROBACION").length,
      path: "/taller/busqueda",
    },
    {
      label: "Reparados",
      value: incidentes.filter((i) => i.estado === "REPARADO").length,
      path: "/taller/busqueda",
      trend: "up",
    },
  ];

  const logisticaMetrics: AreaMetric[] = [
    {
      label: "Registrados",
      value: incidentes.filter((i) => i.estado === "REGISTRADO").length,
      path: "/logistica/embarques",
    },
    {
      label: "En Diagnóstico",
      value: incidentes.filter((i) => i.estado === "EN_DIAGNOSTICO").length,
      path: "/logistica/guias",
    },
    {
      label: "Ingresos Hoy",
      value: incidentes.filter((i) => {
        const created = new Date(i.created_at || "");
        created.setHours(0, 0, 0, 0);
        return created.getTime() === today.getTime();
      }).length,
      path: "/logistica/ingreso-maquinas",
      trend: "neutral",
    },
    {
      label: "Cambio Garantía",
      value: incidentes.filter((i) => i.estado === "CAMBIO_POR_GARANTIA").length,
      path: "/logistica/garantias-manuales",
    },
  ];

  const sacMetrics: AreaMetric[] = [
    {
      label: "Sin Notificar",
      value: incidentes.filter((i) => i.estado === "REPARADO").length,
      path: "/sac/incidentes",
      alert: incidentes.filter((i) => i.estado === "REPARADO").length >= 3,
    },
    {
      label: "En Entrega",
      value: incidentes.filter((i) => i.estado === "EN_ENTREGA").length,
      path: "/sac/incidentes",
    },
    {
      label: "Casos Abiertos",
      value: incidentes.filter((i) =>
        !["ENTREGADO", "CANCELADO", "CERRADO", "COMPLETADO"].includes(i.estado || "")
      ).length,
      path: "/sac/incidentes",
    },
    {
      label: "Cerrados Hoy",
      value: incidentes.filter((i) => {
        if (i.estado !== "ENTREGADO") return false;
        const updated = new Date(i.updated_at || i.created_at || "");
        updated.setHours(0, 0, 0, 0);
        return updated.getTime() === today.getTime();
      }).length,
      path: "/sac/incidentes",
      trend: "up",
    },
  ];

  // Define which tabs each role can see
  const getVisibleTabs = () => {
    switch (userRole) {
      case "mostrador":
        return ["mostrador"];
      case "taller":
      case "tecnico":
        return ["taller"];
      case "jefe_taller":
        return ["taller", "mostrador"]; // Jefe puede ver ambos
      case "logistica":
      case "jefe_logistica":
      case "auxiliar_logistica":
        return ["logistica"];
      case "sac":
      case "supervisor_sac":
        return ["sac"];
      case "control_calidad":
      case "supervisor_calidad":
        return ["taller", "mostrador"]; // Calidad supervisa taller y mostrador
      case "admin":
      case "gerente_centro":
      case "supervisor_regional":
        return ["mostrador", "taller", "logistica", "sac"]; // Admin ve todo
      default:
        return ["mostrador"];
    }
  };

  const visibleTabs = getVisibleTabs();

  const getDefaultTab = () => {
    if (visibleTabs.includes("mostrador") && userRole === "mostrador") return "mostrador";
    if (visibleTabs.includes("taller") && (userRole === "taller" || userRole === "tecnico" || userRole === "jefe_taller")) return "taller";
    if (visibleTabs.includes("logistica") && userRole === "logistica") return "logistica";
    if (visibleTabs.includes("sac") && userRole === "sac") return "sac";
    return visibleTabs[0] || "mostrador";
  };

  const getTotalForArea = (metrics: AreaMetric[]) => 
    metrics.reduce((sum, m) => sum + m.value, 0);

  const areaConfig = {
    mostrador: { icon: ClipboardList, color: "text-blue-500", bgColor: "bg-blue-500" },
    taller: { icon: Wrench, color: "text-orange-500", bgColor: "bg-orange-500" },
    logistica: { icon: Truck, color: "text-purple-500", bgColor: "bg-purple-500" },
    sac: { icon: MessageSquare, color: "text-green-500", bgColor: "bg-green-500" },
  };

  const renderMetrics = (metrics: AreaMetric[], areaKey: keyof typeof areaConfig) => {
    const total = getTotalForArea(metrics);
    const config = areaConfig[areaKey];
    
    return (
      <div className="space-y-4">
        {/* Progress bar showing distribution */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
            {metrics.map((metric, idx) => (
              <div
                key={metric.label}
                className={cn(
                  "h-full transition-all",
                  idx === 0 && config.bgColor,
                  idx === 1 && `${config.bgColor}/70`,
                  idx === 2 && `${config.bgColor}/40`,
                  idx === 3 && `${config.bgColor}/20`
                )}
                style={{ width: total > 0 ? `${(metric.value / total) * 100}%` : '25%' }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-muted-foreground">{total}</span>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-4 gap-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={cn(
                "p-2.5 rounded-lg cursor-pointer transition-all group",
                "hover:bg-muted/50 hover:scale-[1.02]",
                metric.alert && "bg-destructive/5 border border-destructive/20"
              )}
              onClick={() => navigate(metric.path)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-xl font-bold",
                  metric.alert && "text-destructive"
                )}>
                  {metric.value}
                </span>
                {metric.trend && (
                  <span className={cn(
                    "opacity-60",
                    metric.trend === "up" && "text-green-500",
                    metric.trend === "down" && "text-red-500"
                  )}>
                    {metric.trend === "up" && <TrendingUp className="h-3 w-3" />}
                    {metric.trend === "down" && <TrendingDown className="h-3 w-3" />}
                    {metric.trend === "neutral" && <Minus className="h-3 w-3" />}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight group-hover:text-foreground transition-colors">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTabTrigger = (value: string, label: string, metrics: AreaMetric[], areaKey: keyof typeof areaConfig) => {
    const config = areaConfig[areaKey];
    const Icon = config.icon;
    const total = getTotalForArea(metrics);
    const hasAlert = metrics.some(m => m.alert);

    return (
      <TabsTrigger 
        value={value} 
        className={cn(
          "text-xs gap-1.5 relative data-[state=active]:shadow-sm",
          hasAlert && "after:absolute after:top-1 after:right-1 after:h-1.5 after:w-1.5 after:rounded-full after:bg-destructive"
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", config.color)} />
        <span className="hidden sm:inline">{label}</span>
        <span className={cn(
          "ml-1 text-[10px] px-1.5 py-0.5 rounded-full",
          "bg-muted text-muted-foreground"
        )}>
          {total}
        </span>
      </TabsTrigger>
    );
  };

  // If only one tab, render without tabs UI
  if (visibleTabs.length === 1) {
    const singleTab = visibleTabs[0];
    const config = areaConfig[singleTab as keyof typeof areaConfig];
    const Icon = config.icon;
    const metricsMap = {
      mostrador: mostradorMetrics,
      taller: tallerMetrics,
      logistica: logisticaMetrics,
      sac: sacMetrics,
    };
    const labelsMap = {
      mostrador: "Mostrador",
      taller: "Taller",
      logistica: "Logística",
      sac: "SAC",
    };

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon className={cn("h-4 w-4", config.color)} />
            <span className="font-medium text-sm">{labelsMap[singleTab as keyof typeof labelsMap]}</span>
          </div>
          {renderMetrics(metricsMap[singleTab as keyof typeof metricsMap], singleTab as keyof typeof areaConfig)}
        </CardContent>
      </Card>
    );
  }

  // Multiple tabs
  const gridCols = visibleTabs.length === 2 ? "grid-cols-2" : 
                   visibleTabs.length === 3 ? "grid-cols-3" : "grid-cols-4";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <Tabs defaultValue={getDefaultTab()}>
          <TabsList className={cn("grid w-full mb-4 h-auto p-1", gridCols)}>
            {visibleTabs.includes("mostrador") && renderTabTrigger("mostrador", "Mostrador", mostradorMetrics, "mostrador")}
            {visibleTabs.includes("taller") && renderTabTrigger("taller", "Taller", tallerMetrics, "taller")}
            {visibleTabs.includes("logistica") && renderTabTrigger("logistica", "Logística", logisticaMetrics, "logistica")}
            {visibleTabs.includes("sac") && renderTabTrigger("sac", "SAC", sacMetrics, "sac")}
          </TabsList>

          {visibleTabs.includes("mostrador") && (
            <TabsContent value="mostrador" className="mt-0">
              {renderMetrics(mostradorMetrics, "mostrador")}
            </TabsContent>
          )}

          {visibleTabs.includes("taller") && (
            <TabsContent value="taller" className="mt-0">
              {renderMetrics(tallerMetrics, "taller")}
            </TabsContent>
          )}

          {visibleTabs.includes("logistica") && (
            <TabsContent value="logistica" className="mt-0">
              {renderMetrics(logisticaMetrics, "logistica")}
            </TabsContent>
          )}

          {visibleTabs.includes("sac") && (
            <TabsContent value="sac" className="mt-0">
              {renderMetrics(sacMetrics, "sac")}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
