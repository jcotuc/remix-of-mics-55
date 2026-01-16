import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StockAlert {
  codigo: string;
  descripcion: string;
  cantidad: number;
  ubicacion?: string;
}

interface StockAlertBannerProps {
  alerts: StockAlert[];
  onAlertClick?: (codigo: string) => void;
  onDismiss?: () => void;
  isLoading?: boolean;
}

export function StockAlertBanner({
  alerts,
  onAlertClick,
  onDismiss,
  isLoading = false
}: StockAlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || (!isLoading && alerts.length === 0)) return null;

  const criticalAlerts = alerts.filter(a => a.cantidad === 0);
  const warningAlerts = alerts.filter(a => a.cantidad > 0);

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden transition-all duration-300",
      criticalAlerts.length > 0 
        ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800" 
        : "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800"
    )}>
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            criticalAlerts.length > 0 
              ? "bg-red-100 dark:bg-red-900/30" 
              : "bg-orange-100 dark:bg-orange-900/30"
          )}>
            <AlertTriangle className={cn(
              "h-5 w-5",
              criticalAlerts.length > 0 ? "text-red-600" : "text-orange-600"
            )} />
          </div>
          <div>
            <p className="font-medium text-sm">
              {isLoading ? (
                "Verificando alertas de stock..."
              ) : (
                <>
                  {alerts.length} item{alerts.length !== 1 ? "s" : ""} con stock bajo
                  {criticalAlerts.length > 0 && (
                    <span className="text-red-600 ml-1">
                      ({criticalAlerts.length} sin stock)
                    </span>
                  )}
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Click para {isExpanded ? "ocultar" : "ver"} detalles
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
                onDismiss();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-inherit">
          <div className="flex flex-wrap gap-2 mt-3">
            {alerts.slice(0, 20).map((alert) => (
              <Badge
                key={alert.codigo}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-all hover:scale-105",
                  alert.cantidad === 0
                    ? "bg-red-100 border-red-300 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300"
                    : "bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:border-orange-700 dark:text-orange-300"
                )}
                onClick={() => onAlertClick?.(alert.codigo)}
              >
                <span className="font-mono text-xs">{alert.codigo}</span>
                <span className="ml-1 font-bold">({alert.cantidad})</span>
              </Badge>
            ))}
            {alerts.length > 20 && (
              <Badge variant="secondary" className="bg-muted">
                +{alerts.length - 20} más
              </Badge>
            )}
          </div>
          {criticalAlerts.length > 0 && (
            <p className="text-xs text-red-600 mt-3">
              ⚠️ Los items en rojo tienen 0 unidades y requieren reabastecimiento urgente
            </p>
          )}
        </div>
      )}
    </div>
  );
}
