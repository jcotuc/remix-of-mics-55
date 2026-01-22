import { cn } from "@/lib/utils";

interface ProgressBarWithLabelProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  showFraction?: boolean;
  size?: "sm" | "md" | "lg";
  colorByProgress?: boolean;
  className?: string;
}

export function ProgressBarWithLabel({
  value,
  max,
  label,
  showPercentage = false,
  showFraction = false,
  size = "md",
  colorByProgress = true,
  className,
}: ProgressBarWithLabelProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  const getProgressColor = () => {
    if (!colorByProgress) return "bg-primary";
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-orange-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage || showFraction) && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <span className="text-xs font-medium text-muted-foreground">
              {label}
            </span>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {showFraction && (
              <span className="font-medium">
                {value}/{max}
              </span>
            )}
            {showPercentage && (
              <span className="font-medium">{Math.round(percentage)}%</span>
            )}
          </div>
        </div>
      )}
      <div
        className={cn(
          "w-full bg-muted rounded-full overflow-hidden",
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            getProgressColor()
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
