import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface InventoryKPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  color?: "primary" | "success" | "warning" | "danger";
  sparklineData?: number[];
  onClick?: () => void;
  isClickable?: boolean;
  isLoading?: boolean;
}

const colorVariants = {
  primary: {
    bg: "from-primary/10 to-primary/5",
    icon: "text-primary bg-primary/10",
    sparkline: "hsl(var(--primary))"
  },
  success: {
    bg: "from-green-500/10 to-green-500/5",
    icon: "text-green-600 bg-green-500/10",
    sparkline: "#22c55e"
  },
  warning: {
    bg: "from-orange-500/10 to-orange-500/5",
    icon: "text-orange-600 bg-orange-500/10",
    sparkline: "#f97316"
  },
  danger: {
    bg: "from-red-500/10 to-red-500/5",
    icon: "text-red-600 bg-red-500/10",
    sparkline: "#ef4444"
  }
};

export function InventoryKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "primary",
  sparklineData,
  onClick,
  isClickable = false,
  isLoading = false
}: InventoryKPICardProps) {
  const colors = colorVariants[color];

  const chartData = sparklineData?.map((v, i) => ({ value: v, index: i })) || [];

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 border-0",
        `bg-gradient-to-br ${colors.bg}`,
        isClickable && "cursor-pointer hover:scale-[1.02] hover:shadow-lg",
        isLoading && "animate-pulse"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                "text-xs font-medium flex items-center gap-1",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                <span className="text-muted-foreground ml-1">vs ayer</span>
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-xl", colors.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-12 opacity-50">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.sparkline} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={colors.sparkline} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={colors.sparkline}
                  strokeWidth={2}
                  fill={`url(#gradient-${color})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {isClickable && (
          <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
            Click para ver →
          </div>
        )}
      </CardContent>
    </Card>
  );
}
