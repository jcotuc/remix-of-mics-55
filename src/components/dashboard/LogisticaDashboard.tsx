import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, MapPin, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { IncidenteSchema, Embarque } from "@/generated/actions.d";
import { mycsapi } from "@/mics-api";

interface LogisticaDashboardProps {
  incidentes: IncidenteSchema[];
}

export function LogisticaDashboard({ incidentes }: LogisticaDashboardProps) {
  const [embarques, setEmbarques] = useState<Embarque[]>([]);

  useEffect(() => {
    fetchEmbarques();
  }, []);

  const fetchEmbarques = async () => {
    try {
      const response = await mycsapi.fetch("/api/v1/embarques", { method: "GET", query: { limit: 200 } }) as any;
      setEmbarques(response.data || []);
    } catch (error) {
      console.error("Error fetching embarques:", error);
    }
  };

  // Métricas para logística - usando campo 'estado' con valores uppercase
  const conEnvio = incidentes.filter((i) => i.quiere_envio).length;
  const enRuta = incidentes.filter((i) => i.estado === "EN_ENTREGA").length;
  const embarquesActivos = embarques.length;
  // Pendientes de asignar: quieren envío pero aún no están EN_ENTREGA ni ENTREGADO
  const pendientesAsignar = incidentes.filter(
    (i) => i.quiere_envio && !["EN_ENTREGA", "ENTREGADO"].includes(i.estado || "")
  ).length;

  // Embarques por mes
  const embarquesPorMes = embarques.reduce(
    (acc, embarque) => {
      const mes = new Date(embarque.fecha_llegada).toLocaleDateString("es-GT", { month: "short" });
      acc[mes] = (acc[mes] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const embarquesData = Object.entries(embarquesPorMes)
    .map(([mes, cantidad]) => ({ mes, cantidad }))
    .slice(0, 6);

  // Distribución por transportista
  const transportistaDistribution = embarques.reduce(
    (acc, embarque) => {
      const transportista = embarque.transportista || "Sin asignar";
      acc[transportista] = (acc[transportista] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const transportistaData = Object.entries(transportistaDistribution)
    .map(([transportista, cantidad]) => ({ transportista, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitan Envío</CardTitle>
            <MapPin className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{conEnvio}</div>
            <p className="text-xs text-muted-foreground mt-1">Clientes con envío</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Ruta al Centro</CardTitle>
            <Package className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{enRuta}</div>
            <p className="text-xs text-muted-foreground mt-1">Pendientes de formalizar ingreso</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embarques Activos</CardTitle>
            <Truck className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{embarquesActivos}</div>
            <p className="text-xs text-muted-foreground mt-1">Total registrados</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes Asignar</CardTitle>
            <TrendingUp className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{pendientesAsignar}</div>
            <p className="text-xs text-muted-foreground mt-1">Sin embarque</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Embarques por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={embarquesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="cantidad" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Transportista</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transportistaData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="transportista" type="category" width={100} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="cantidad" fill="hsl(var(--success))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
