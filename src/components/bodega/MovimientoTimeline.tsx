import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { formatFechaRelativa, formatFechaCorta } from "@/utils/dateFormatters";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface Movimiento {
  id: string;
  tipo_movimiento: "entrada" | "salida";
  cantidad: number;
  motivo?: string | null;
  created_at: string;
  stock_anterior?: number | null;
  stock_nuevo?: number | null;
  ubicacion?: string | null;
}

interface MovimientoTimelineProps {
  movimientos: Movimiento[];
  isLoading?: boolean;
  maxHeight?: string;
  showEmpty?: boolean;
}

export function MovimientoTimeline({
  movimientos,
  isLoading = false,
  maxHeight = "300px",
  showEmpty = true
}: MovimientoTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (movimientos.length === 0 && showEmpty) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No hay movimientos registrados</p>
      </div>
    );
  }

  return (
    <ScrollArea style={{ maxHeight }} className="pr-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
        
        <div className="space-y-4">
          {movimientos.map((mov, index) => {
            const isEntrada = mov.tipo_movimiento === "entrada";
            const date = new Date(mov.created_at);
            
            return (
              <div key={mov.id} className="flex gap-4 relative">
                {/* Icon */}
                <div className={cn(
                  "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-background",
                  isEntrada 
                    ? "border-green-500 text-green-600" 
                    : "border-red-500 text-red-600"
                )}>
                  {isEntrada ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">
                        <span className={isEntrada ? "text-green-600" : "text-red-600"}>
                          {isEntrada ? "+" : "-"}{mov.cantidad}
                        </span>
                        {" "}unidades
                      </p>
                      {mov.motivo && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {mov.motivo}
                        </p>
                      )}
                      {(mov.stock_anterior !== null && mov.stock_nuevo !== null) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Stock: {mov.stock_anterior} → {mov.stock_nuevo}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {formatFechaRelativa(mov.created_at)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(date, "dd/MM HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
