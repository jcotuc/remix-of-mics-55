import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

interface MostradorDashboardProps {
  incidentes: IncidenteDB[];
}

export function MostradorDashboard({ incidentes }: MostradorDashboardProps) {
  // Métricas para mostrador using correct column names
  const incidentesHoy = incidentes.filter(i => {
    if (!i.fecha_ingreso) return false;
    const today = new Date().toDateString();
    return new Date(i.fecha_ingreso).toDateString() === today;
  }).length;

  const incidentesPendientesEntrega = incidentes.filter(i => 
    i.estado === "REPARADO"
  ).length;

  const incidentesEnProceso = incidentes.filter(i => 
    i.estado !== "RECHAZADO" && i.estado !== "CANCELADO"
  ).length;

  const conGarantia = incidentes.filter(i => i.aplica_garantia).length;

  // Datos para gráfico de barras - últimos 7 días
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const incidentesPorDia = last7Days.map(date => {
    const count = incidentes.filter(i => 
      i.fecha_ingreso && i.fecha_ingreso.split('T')[0] === date
    ).length;
    return {
      fecha: new Date(date).toLocaleDateString('es-GT', { weekday: 'short' }),
      cantidad: count
    };
  });

  // Datos para gráfico de pie - distribución por estado
  const statusDistribution = [
    { name: 'Registrado', value: incidentes.filter(i => i.estado === 'REGISTRADO').length },
    { name: 'En Diagnóstico', value: incidentes.filter(i => i.estado === 'EN_DIAGNOSTICO').length },
    { name: 'Espera Repuestos', value: incidentes.filter(i => i.estado === 'ESPERA_REPUESTOS').length },
    { name: 'Reparado', value: incidentes.filter(i => i.estado === 'REPARADO').length },
    { name: 'En Entrega', value: incidentes.filter(i => i.estado === 'EN_ENTREGA').length },
  ].filter(item => item.value > 0);

  const statusColors = ['hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--muted))'];

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Hoy</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{incidentesHoy}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Nuevos registros
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de Entrega</CardTitle>
            <Clock className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{incidentesPendientesEntrega}</div>
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
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{conGarantia}</div>
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
