import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkloadDataItem {
  name: string;
  value: number;
  max?: number;
}

interface WorkloadChartProps {
  title: string;
  data: WorkloadDataItem[];
  average?: number;
  maxValue?: number;
  height?: number;
  horizontal?: boolean;
}

const getBarColor = (value: number, max: number = 10) => {
  const ratio = value / max;
  if (ratio >= 1) return "hsl(var(--destructive))";
  if (ratio >= 0.8) return "#f97316"; // orange
  if (ratio >= 0.6) return "#eab308"; // yellow
  return "#22c55e"; // green
};

export function WorkloadChart({
  title,
  data,
  average,
  maxValue = 10,
  height = 200,
  horizontal = false,
}: WorkloadChartProps) {
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
              layout={horizontal ? "vertical" : "horizontal"}
              margin={{ top: 5, right: 10, left: horizontal ? 60 : 0, bottom: 5 }}
            >
              {horizontal ? (
                <>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis hide />
                </>
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ fontWeight: 600 }}
              />
              {average !== undefined && (
                <ReferenceLine
                  y={horizontal ? undefined : average}
                  x={horizontal ? average : undefined}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Promedio: ${average}`,
                    position: "top",
                    fontSize: 10,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                />
              )}
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.value, entry.max || maxValue)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
