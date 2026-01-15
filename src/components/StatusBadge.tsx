import { Badge } from "@/components/ui/badge";
import { StatusIncidente } from "@/types";

interface StatusBadgeProps {
  status: StatusIncidente;
  size?: "sm" | "default";
}

const statusConfig: Record<StatusIncidente, { bg: string; text: string; border?: string }> = {
  "Ingresado": { bg: "bg-slate-200", text: "text-slate-900", border: "border-slate-400" },
  "En ruta": { bg: "bg-sky-200", text: "text-sky-900", border: "border-sky-400" },
  "Pendiente de diagnostico": { bg: "bg-amber-200", text: "text-amber-900", border: "border-amber-400" },
  "En diagnostico": { bg: "bg-orange-200", text: "text-orange-900", border: "border-orange-400" },
  "Pendiente por repuestos": { bg: "bg-violet-200", text: "text-violet-900", border: "border-violet-400" },
  "Presupuesto": { bg: "bg-blue-200", text: "text-blue-900", border: "border-blue-400" },
  "Porcentaje": { bg: "bg-pink-200", text: "text-pink-900", border: "border-pink-400" },
  "Reparado": { bg: "bg-emerald-200", text: "text-emerald-900", border: "border-emerald-400" },
  "Cambio por garantia": { bg: "bg-teal-200", text: "text-teal-900", border: "border-teal-400" },
  "Nota de credito": { bg: "bg-purple-200", text: "text-purple-900", border: "border-purple-400" },
  "Bodega pedido": { bg: "bg-indigo-200", text: "text-indigo-900", border: "border-indigo-400" },
  "Rechazado": { bg: "bg-red-200", text: "text-red-900", border: "border-red-400" },
  "Pendiente entrega": { bg: "bg-cyan-200", text: "text-cyan-900", border: "border-cyan-400" },
  "Logistica envio": { bg: "bg-fuchsia-200", text: "text-fuchsia-900", border: "border-fuchsia-400" },
  "Pendiente de aprobación NC": { bg: "bg-rose-200", text: "text-rose-900", border: "border-rose-400" },
  "NC Autorizada": { bg: "bg-lime-200", text: "text-lime-900", border: "border-lime-400" },
  "NC Emitida": { bg: "bg-green-200", text: "text-green-900", border: "border-green-400" },
  "Entregado": { bg: "bg-green-300", text: "text-green-900", border: "border-green-500" },
};

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const config = statusConfig[status] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
  
  return (
    <Badge 
      variant="outline"
      className={`${config.bg} ${config.text} ${config.border} border font-medium ${
        size === "sm" ? "text-xs px-2 py-0.5" : "px-2.5 py-1"
      }`}
    >
      {status}
    </Badge>
  );
}