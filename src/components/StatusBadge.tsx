import { Badge } from "@/components/ui/badge";
import { StatusIncidente } from "@/types";

interface StatusBadgeProps {
  status: StatusIncidente;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusVariant = (status: StatusIncidente) => {
    switch (status) {
      case "Ingresado":
        return "secondary";
      case "Diagnostico":
        return "outline";
      case "Repuestos solicitados":
        return "outline";
      case "Reparado":
        return "default";
      case "Documentado":
        return "default";
      case "Entregado":
        return "default";
      default:
        return "secondary";
    }
  };

  const getStatusColor = (status: StatusIncidente) => {
    switch (status) {
      case "Ingresado":
        return "bg-info text-info-foreground";
      case "Diagnostico":
        return "bg-warning text-warning-foreground";
      case "Repuestos solicitados":
        return "bg-warning text-warning-foreground";
      case "Reparado":
        return "bg-success text-success-foreground";
      case "Documentado":
        return "bg-success text-success-foreground";
      case "Entregado":
        return "bg-success text-success-foreground";
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