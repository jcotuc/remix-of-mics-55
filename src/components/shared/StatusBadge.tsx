import { Badge } from "@/components/ui/badge";

// Using the actual enum from the database: estadoincidente
type EstadoIncidente = "CANCELADO" | "EN_DIAGNOSTICO" | "EN_ENTREGA" | "ESPERA_REPUESTOS" | "RECHAZADO" | "REGISTRADO" | "REPARADO";

interface StatusBadgeProps {
  status: EstadoIncidente | string;
  size?: "sm" | "default";
}

const statusConfig: Record<string, { bg: string; text: string; border?: string; label: string }> = {
  "REGISTRADO": { bg: "bg-slate-200", text: "text-slate-900", border: "border-slate-400", label: "Registrado" },
  "EN_DIAGNOSTICO": { bg: "bg-amber-200", text: "text-amber-900", border: "border-amber-400", label: "En Diagnóstico" },
  "ESPERA_REPUESTOS": { bg: "bg-violet-200", text: "text-violet-900", border: "border-violet-400", label: "Espera Repuestos" },
  "REPARADO": { bg: "bg-emerald-200", text: "text-emerald-900", border: "border-emerald-400", label: "Reparado" },
  "EN_ENTREGA": { bg: "bg-cyan-200", text: "text-cyan-900", border: "border-cyan-400", label: "En Entrega" },
  "RECHAZADO": { bg: "bg-red-200", text: "text-red-900", border: "border-red-400", label: "Rechazado" },
  "CANCELADO": { bg: "bg-gray-200", text: "text-gray-900", border: "border-gray-400", label: "Cancelado" },
};

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const config = statusConfig[status] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: status };
  
  return (
    <Badge 
      variant="outline"
      className={`${config.bg} ${config.text} ${config.border} border font-medium ${
        size === "sm" ? "text-xs px-2 py-0.5" : "px-2.5 py-1"
      }`}
    >
      {config.label}
    </Badge>
  );
}
