import { useState, useEffect } from "react";
import { Bell, AlertTriangle, Clock, Package, Wrench, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { apiBackendAction } from "@/lib/api-backend";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface SystemAlert {
  id: string;
  type: "urgente" | "espera_repuestos" | "sin_notificar" | "entrega_vencida";
  title: string;
  description: string;
  count: number;
  route: string;
  icon: React.ReactNode;
  severity: "high" | "medium" | "low";
}

export function NotificationBadge() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const result = await apiBackendAction("incidentes.list", {});
        const incidentes = result.results || [];
        const today = new Date();
        const eightDaysAgo = new Date(today);
        eightDaysAgo.setDate(today.getDate() - 8);

        const systemAlerts: SystemAlert[] = [];

        // Alert: Incidents waiting for parts > 8 days
        const esperaRepuestos = incidentes.filter((inc: any) => {
          if (inc.estado !== "ESPERA_REPUESTOS") return false;
          const fechaIngreso = new Date(inc.fecha_ingreso || inc.created_at);
          return fechaIngreso < eightDaysAgo;
        });

        if (esperaRepuestos.length > 0) {
          systemAlerts.push({
            id: "espera_repuestos",
            type: "espera_repuestos",
            title: "Espera de Repuestos Prolongada",
            description: `${esperaRepuestos.length} incidentes con más de 8 días esperando repuestos`,
            count: esperaRepuestos.length,
            route: "/taller/pendientes-repuestos",
            icon: <Package className="h-4 w-4" />,
            severity: "high",
          });
        }

        // Alert: Repaired machines without client notification
        const sinNotificar = incidentes.filter(
          (inc: any) => inc.estado === "REPARADO"
        );

        if (sinNotificar.length > 0) {
          systemAlerts.push({
            id: "sin_notificar",
            type: "sin_notificar",
            title: "Máquinas Sin Notificar",
            description: `${sinNotificar.length} máquinas reparadas pendientes de notificar al cliente`,
            count: sinNotificar.length,
            route: "/sac/incidentes",
            icon: <Wrench className="h-4 w-4" />,
            severity: "high",
          });
        }

        // Alert: Overdue deliveries
        const entregasVencidas = incidentes.filter((inc: any) => {
          if (!["PENDIENTE_ENTREGA", "EN_ENTREGA"].includes(inc.estado)) return false;
          if (!inc.fecha_entrega) return false;
          const fechaEntrega = new Date(inc.fecha_entrega);
          return fechaEntrega < today;
        });

        if (entregasVencidas.length > 0) {
          systemAlerts.push({
            id: "entrega_vencida",
            type: "entrega_vencida",
            title: "Entregas Vencidas",
            description: `${entregasVencidas.length} entregas pasadas de su fecha programada`,
            count: entregasVencidas.length,
            route: "/mostrador/entrega-maquinas",
            icon: <Clock className="h-4 w-4" />,
            severity: "medium",
          });
        }

        // Alert: High priority incidents (in REGISTRADO for > 24h)
        const oneDayAgo = new Date(today);
        oneDayAgo.setDate(today.getDate() - 1);
        
        const urgentes = incidentes.filter((inc: any) => {
          if (inc.estado !== "REGISTRADO") return false;
          const fechaIngreso = new Date(inc.fecha_ingreso || inc.created_at);
          return fechaIngreso < oneDayAgo;
        });

        if (urgentes.length > 0) {
          systemAlerts.push({
            id: "urgentes",
            type: "urgente",
            title: "Incidentes Sin Procesar",
            description: `${urgentes.length} incidentes registrados hace más de 24 horas`,
            count: urgentes.length,
            route: "/taller/asignaciones",
            icon: <AlertTriangle className="h-4 w-4" />,
            severity: "medium",
          });
        }

        setAlerts(systemAlerts);
      } catch (error) {
        console.error("Error fetching alerts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const totalAlerts = alerts.reduce((sum, alert) => sum + alert.count, 0);
  const hasHighSeverity = alerts.some((a) => a.severity === "high");

  const handleAlertClick = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-orange-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={`h-5 w-5 ${hasHighSeverity ? "text-destructive" : ""}`} />
          {totalAlerts > 0 && (
            <span
              className={`absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${
                hasHighSeverity
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-orange-500 text-white"
              }`}
            >
              {totalAlerts > 99 ? "99+" : totalAlerts}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Alertas del Sistema</h4>
            {totalAlerts > 0 && (
              <Badge variant="secondary">{totalAlerts} pendientes</Badge>
            )}
          </div>
        </div>
        
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">
              Cargando alertas...
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Sin alertas pendientes
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ¡Todo está bajo control!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => handleAlertClick(alert.route)}
                  className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-start gap-3"
                >
                  <div
                    className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}
                  >
                    {alert.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{alert.title}</span>
                      <Badge
                        variant={alert.severity === "high" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {alert.count}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {alert.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {alerts.length > 0 && (
          <div className="p-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              Las alertas se actualizan cada 5 minutos
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
