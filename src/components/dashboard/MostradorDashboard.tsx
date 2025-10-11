import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

interface MostradorDashboardProps {
  incidentes: IncidenteDB[];
}

const COLORS = {
  ingresado: 'hsl(var(--info))',
  diagnostico: 'hsl(var(--warning))',
  reparacion: 'hsl(var(--primary))',
  finalizado: 'hsl(var(--success))',
  entregado: 'hsl(var(--muted))',
};

export function MostradorDashboard({ incidentes }: MostradorDashboardProps) {
  // Métricas para mostrador
  const incidentesHoy = incidentes.filter(i => {
    const today = new Date().toDateString();
    return new Date(i.fecha_ingreso).toDateString() === today;
  }).length;

  const incidentesPendientesEntrega = incidentes.filter(i => 
    i.status === "Reparado"
  ).length;

  const incidentesEnProceso = incidentes.filter(i => 
    i.status !== "Rechazado"
  ).length;

  const conGarantia = incidentes.filter(i => i.cobertura_garantia).length;

  // Datos para gráfico de barras - últimos 7 días
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const incidentesPorDia = last7Days.map(date => {
    const count = incidentes.filter(i => 
      i.fecha_ingreso.split('T')[0] === date
    ).length;
    return {
      fecha: new Date(date).toLocaleDateString('es-GT', { weekday: 'short' }),
      cantidad: count
    };
  });

  // Datos para gráfico de pie - distribución por estado
  const statusDistribution = [
    { name: 'Ingresado', value: incidentes.filter(i => i.status === 'Ingresado').length },
    { name: 'En Diagnóstico', value: incidentes.filter(i => i.status === 'En diagnostico' || i.status === 'Pendiente de diagnostico').length },
    { name: 'Pendiente Repuestos', value: incidentes.filter(i => i.status === 'Pendiente por repuestos').length },
    { name: 'Reparado', value: incidentes.filter(i => i.status === 'Reparado').length },
    { name: 'En Ruta', value: incidentes.filter(i => i.status === 'En ruta').length },
  ].filter(item => item.value > 0);

  const statusColors = ['hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--muted))'];

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Hoy</CardTitle>
            <TrendingUp className="h-5 w-5 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-info">{incidentesHoy}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Nuevos registros
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de Entrega</CardTitle>
            <Clock className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{incidentesPendientesEntrega}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Listos para cliente
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <AlertCircle className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{incidentesEnProceso}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Activos totales
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Garantía</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{conGarantia}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cobertura aplicable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos - Últimos 7 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incidentesPorDia}>
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
                <Bar dataKey="cantidad" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
