import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TareaWS } from "@/types/waterspider";

interface TaskCardProps {
  tarea: TareaWS;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
}

function getPrioridadStyles(prioridad: string) {
  switch (prioridad) {
    case "critico":
      return "border-l-red-500 bg-red-50/50";
    case "urgente":
      return "border-l-amber-500 bg-amber-50/50";
    default:
      return "border-l-green-500 bg-card";
  }
}

function getTipoStyles(tipo: string) {
  switch (tipo) {
    case "mostrador":
      return { bg: "bg-blue-100", text: "text-blue-700" };
    case "logistica":
      return { bg: "bg-orange-100", text: "text-orange-700" };
    case "repuesto":
      return { bg: "bg-green-100", text: "text-green-700" };
    case "depuracion":
      return { bg: "bg-red-100", text: "text-red-700" };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground" };
  }
}

function getTipoLabel(tipo: string) {
  switch (tipo) {
    case "mostrador":
      return "Mostrador";
    case "logistica":
      return "Logística";
    case "repuesto":
      return "Repuesto";
    case "depuracion":
      return "Depuración";
    default:
      return tipo;
  }
}

function formatTiempoEspera(minutos: number): string {
  if (minutos < 60) return `${minutos}min`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}

export function TaskCard({ tarea, isSelected, onToggleSelect }: TaskCardProps) {
  const prioridadStyles = getPrioridadStyles(tarea.prioridad);
  const tipoStyles = getTipoStyles(tarea.tipo);

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border-l-4 border transition-all",
        prioridadStyles,
        isSelected && "ring-2 ring-primary"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggleSelect(tarea.id)}
        className="h-5 w-5"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-foreground">{tarea.codigo_incidente}</span>
          <Badge variant="secondary" className={cn("text-xs", tipoStyles.bg, tipoStyles.text)}>
            {getTipoLabel(tarea.tipo)}
          </Badge>
          {tarea.prioridad === "critico" && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              ¡Urgente!
            </Badge>
          )}
        </div>

        {tarea.producto_descripcion && (
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {tarea.producto_descripcion}
          </p>
        )}

        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {tarea.ubicacion_tecnico}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {tarea.nombre_tecnico}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatTiempoEspera(tarea.tiempo_espera_minutos)}
          </span>
        </div>
      </div>
    </div>
  );
}
