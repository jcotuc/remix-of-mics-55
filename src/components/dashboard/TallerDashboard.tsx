import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Package, AlertTriangle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

interface TallerDashboardProps {
  incidentes: IncidenteDB[];
}

export function TallerDashboard({ incidentes }: TallerDashboardProps) {
  // Métricas para taller
  const pendienteDiagnostico = incidentes.filter(i => i.status === "Pendiente de diagnostico").length;
  const enDiagnostico = incidentes.filter(i => i.status === "En diagnostico").length;
  const enReparacion = incidentes.filter(i => i.status === "Reparado").length;
  const pendienteRepuestos = incidentes.filter(i => i.status === "Pendiente por repuestos").length;

  // Distribución por familia de producto
  const familiaDistribution = incidentes.reduce((acc, inc) => {
    const familia = inc.familia_producto || 'Sin clasificar';
    acc[familia] = (acc[familia] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const familiaData = Object.entries(familiaDistribution)
    .map(([familia, cantidad]) => ({ familia, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  // Tendencia de reparaciones - últimos 30 días
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  const reparacionesPorDia = last30Days.map(date => {
    const count = incidentes.filter(i => 
      i.status === 'Reparado' && i.updated_at.split('T')[0] === date
    ).length;
    return {
      fecha: new Date(date).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit' }),
      cantidad: count
    };
  });

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente Diagnóstico</CardTitle>
            <AlertTriangle className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{pendienteDiagnostico}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Diagnóstico</CardTitle>
            <TrendingUp className="h-5 w-5 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-info">{enDiagnostico}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En proceso
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Reparación</CardTitle>
            <Wrench className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{enReparacion}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Siendo reparados
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esperando Repuestos</CardTitle>
            <Package className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{pendienteRepuestos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En espera
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Familias de Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={familiaData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="familia" type="category" width={100} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="cantidad" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Reparaciones - 30 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reparacionesPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="fecha" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line type="monotone" dataKey="cantidad" stroke="hsl(var(--success))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
