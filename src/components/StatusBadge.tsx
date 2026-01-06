import { Badge } from "@/components/ui/badge";
import { StatusIncidente } from "@/types";

interface StatusBadgeProps {
  status: StatusIncidente;
  size?: "sm" | "default";
}

const statusConfig: Record<StatusIncidente, { bg: string; text: string; border?: string }> = {
  "Ingresado": { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  "En ruta": { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-300" },
  "Pendiente de diagnostico": { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  "En diagnostico": { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  "Pendiente por repuestos": { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-300" },
  "Presupuesto": { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  "Porcentaje": { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-300" },
  "Reparado": { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  "Cambio por garantia": { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-300" },
  "Nota de credito": { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
  "Bodega pedido": { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" },
  "Rechazado": { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
  "Pendiente entrega": { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-300" },
  "Logistica envio": { bg: "bg-fuchsia-100", text: "text-fuchsia-800", border: "border-fuchsia-300" },
  "Pendiente de aprobación NC": { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-300" },
  "Entregado": { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
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