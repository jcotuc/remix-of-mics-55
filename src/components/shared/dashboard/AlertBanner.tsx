import { AlertTriangle, Info, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AlertBannerProps {
  variant: "error" | "warning" | "info" | "success";
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
  pulse?: boolean;
}

const variantStyles = {
  error: {
    bg: "bg-destructive/10 border-destructive/30",
    icon: "text-destructive",
    title: "text-destructive",
  },
  warning: {
    bg: "bg-orange-500/10 border-orange-500/30",
    icon: "text-orange-500",
    title: "text-orange-600 dark:text-orange-400",
  },
  info: {
    bg: "bg-blue-500/10 border-blue-500/30",
    icon: "text-blue-500",
    title: "text-blue-600 dark:text-blue-400",
  },
  success: {
    bg: "bg-green-500/10 border-green-500/30",
    icon: "text-green-500",
    title: "text-green-600 dark:text-green-400",
  },
};

const iconMap = {
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

export function AlertBanner({
  variant,
  title,
  description,
  action,
  onDismiss,
  className,
  pulse = false,
}: AlertBannerProps) {
  const styles = variantStyles[variant];
  const Icon = iconMap[variant];

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 p-4 rounded-lg border",
        styles.bg,
        pulse && "animate-pulse",
        className
      )}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0", styles.icon)} />
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium text-sm", styles.title)}>{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && (
        <Button
          size="sm"
          variant={variant === "error" ? "destructive" : "secondary"}
          onClick={action.onClick}
          className="flex-shrink-0"
        >
          {action.label}
        </Button>
      )}
      {onDismiss && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 flex-shrink-0"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
