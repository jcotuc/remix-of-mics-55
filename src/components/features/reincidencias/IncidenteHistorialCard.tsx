import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { formatFechaCorta } from "@/utils/dateFormatters";
import type { IncidenteHistorial } from "./types";

interface IncidenteHistorialCardProps {
  incidente: IncidenteHistorial;
  isSelected: boolean;
  onSelect: () => void;
}

export function IncidenteHistorialCard({
  incidente,
  isSelected,
  onSelect,
}: IncidenteHistorialCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected
          ? "ring-2 ring-primary border-primary bg-primary/5"
          : "hover:border-primary/50"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                isSelected
                  ? "border-primary bg-primary"
                  : "border-muted-foreground"
              )}
            >
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              )}
            </div>
            <span className="font-bold text-sm">{incidente.codigo}</span>
            <Badge variant="outline" className="text-xs">
              {incidente.estado}
            </Badge>
          </div>
          {incidente.mismo_producto && (
            <Badge variant="secondary" className="text-xs">
              <Package className="h-3 w-3 mr-1" />
              Mismo producto
            </Badge>
          )}
        </div>

        {/* Descripción */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          "{incidente.descripcion_problema || "Sin descripción"}"
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {incidente.fecha_entrega
              ? `Entregado: ${formatFechaCorta(incidente.fecha_entrega)}`
              : `Ingresado: ${formatFechaCorta(incidente.fecha_ingreso || "")}`}
          </div>

          {/* Indicador de garantía */}
          {incidente.dias_desde_reparacion >= 0 && (
            <Badge
              variant={incidente.dentro_garantia ? "destructive" : "secondary"}
              className="text-xs"
            >
              {incidente.dentro_garantia ? (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Hace {incidente.dias_desde_reparacion} días (EN garantía)
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Hace {incidente.dias_desde_reparacion} días (FUERA)
                </>
              )}
            </Badge>
          )}
        </div>

        {/* Producto */}
        {incidente.producto && (
          <div className="text-xs text-muted-foreground pt-1 border-t">
            <span className="font-medium">Producto:</span>{" "}
            {incidente.producto.descripcion || incidente.producto.codigo}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
