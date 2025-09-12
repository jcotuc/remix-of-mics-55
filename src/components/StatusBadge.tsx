import { Badge } from "@/components/ui/badge";
import { StatusIncidente } from "@/types";

interface StatusBadgeProps {
  status: StatusIncidente;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusVariant = (status: StatusIncidente) => {
    switch (status) {
      case "Pendiente de diagnostico":
        return "secondary";
      case "En diagnostico":
        return "outline";
      case "Pendiente por repuestos":
        return "outline";
      case "Reparado":
        return "default";
      case "Presupuesto":
        return "outline";
      case "Canje":
        return "default";
      case "Nota de credito":
        return "default";
      case "Cambio por garantia":
        return "default";
      default:
        return "secondary";
    }
  };

  const getStatusColor = (status: StatusIncidente) => {
    switch (status) {
      case "Pendiente de diagnostico":
        return "bg-info text-info-foreground";
      case "En diagnostico":
        return "bg-warning text-warning-foreground";
      case "Pendiente por repuestos":
        return "bg-warning text-warning-foreground";
      case "Reparado":
        return "bg-success text-success-foreground";
      case "Presupuesto":
        return "bg-blue-500 text-white";
      case "Canje":
        return "bg-orange-500 text-white";
      case "Nota de credito":
        return "bg-purple-500 text-white";
      case "Cambio por garantia":
        return "bg-green-600 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Badge 
      variant={getStatusVariant(status)}
      className={getStatusColor(status)}
    >
      {status}
    </Badge>
  );
}