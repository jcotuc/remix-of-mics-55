import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  trend?: {
    value: number;
    label?: string;
  };
  sparklineData?: number[];
  sparklineColor?: string;
  className?: string;
  onClick?: () => void;
  alert?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = "bg-primary/10 text-primary",
  trend,
  sparklineData,
  sparklineColor = "hsl(var(--primary))",
  className,
  onClick,
  alert = false,
}: MetricCardProps) {
  const trendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null;

  const trendColor = trend
    ? trend.value > 0
      ? "text-green-500"
      : trend.value < 0
      ? "text-red-500"
      : "text-muted-foreground"
    : "";

  const chartData = sparklineData?.map((value, index) => ({ value, index }));

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all",
        onClick && "cursor-pointer hover:shadow-md",
        alert && "ring-2 ring-destructive animate-pulse",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium truncate">
              {title}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {trend && trendIcon && (
                <div className={cn("flex items-center gap-0.5 text-xs", trendColor)}>
                  {React.createElement(trendIcon, { className: "h-3 w-3" })}
                  <span>{Math.abs(trend.value)}%</span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
            {trend?.label && (
              <p className="text-xs text-muted-foreground">{trend.label}</p>
            )}
          </div>

          {icon && (
            <div className={cn("p-2.5 rounded-full flex-shrink-0", iconColor)}>
              {icon}
            </div>
          )}
        </div>

        {chartData && chartData.length > 0 && (
          <div className="h-12 mt-3 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparklineColor}
                  strokeWidth={2}
                  fill={`url(#gradient-${title})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import React from "react";
