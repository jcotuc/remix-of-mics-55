import { cn } from "@/lib/utils";

interface PriorityIndicatorProps {
  level: "critical" | "high" | "medium" | "low" | "normal";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const priorityConfig = {
  critical: {
    color: "bg-red-500",
    ring: "ring-red-500/30",
    label: "Crítico",
    emoji: "🔴",
  },
  high: {
    color: "bg-orange-500",
    ring: "ring-orange-500/30",
    label: "Alto",
    emoji: "🟠",
  },
  medium: {
    color: "bg-yellow-500",
    ring: "ring-yellow-500/30",
    label: "Medio",
    emoji: "🟡",
  },
  low: {
    color: "bg-blue-500",
    ring: "ring-blue-500/30",
    label: "Bajo",
    emoji: "🔵",
  },
  normal: {
    color: "bg-green-500",
    ring: "ring-green-500/30",
    label: "Normal",
    emoji: "🟢",
  },
};

const sizeConfig = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

export function PriorityIndicator({
  level,
  showLabel = false,
  size = "md",
  className,
}: PriorityIndicatorProps) {
  const config = priorityConfig[level];
  const sizeClass = sizeConfig[size];

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        className={cn(
          "rounded-full ring-2",
          config.color,
          config.ring,
          sizeClass,
          level === "critical" && "animate-pulse"
        )}
      />
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">
          {config.label}
        </span>
      )}
    </div>
  );
}

export function getPriorityLevel(days: number): PriorityIndicatorProps["level"] {
  if (days >= 8) return "critical";
  if (days >= 6) return "high";
  if (days >= 4) return "medium";
  if (days >= 2) return "low";
  return "normal";
}

export function getPriorityFromLoad(current: number, max: number): PriorityIndicatorProps["level"] {
  const ratio = current / max;
  if (ratio >= 1) return "critical";
  if (ratio >= 0.8) return "high";
  if (ratio >= 0.6) return "medium";
  if (ratio >= 0.4) return "low";
  return "normal";
}
