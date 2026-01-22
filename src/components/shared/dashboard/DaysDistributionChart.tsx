import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DaysDistributionData {
  range: string;
  count: number;
  color: string;
}

interface DaysDistributionChartProps {
  title: string;
  data: DaysDistributionData[];
  height?: number;
}

export function DaysDistributionChart({
  title,
  data,
  height = 150,
}: DaysDistributionChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 50, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="range"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [value, "Incidentes"]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 mt-3 justify-center">
          {data.map((item) => (
            <div key={item.range} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">
                {item.range}: <span className="font-medium">{item.count}</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
