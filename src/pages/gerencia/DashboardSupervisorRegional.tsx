import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, TrendingUp, Truck, Package } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CentroStats {
  nombre: string;
  incidentes: number;
  eficiencia: number;
  stock: number;
}

interface DashboardStats {
  centros: CentroStats[];
  transitosActivos: number;
  stockConsolidado: number;
  tiempoPromedioTransferencia: number;
}

export default function DashboardSupervisorRegional() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Centros de servicio
      const { data: centros } = await supabase
        .from('centros_servicio')
        .select('*')
        .eq('activo', true);

      // Incidentes por centro
      const { data: incidentes } = await supabase
        .from('incidentes')
        .select('centro_servicio');

      // Stock por centro
      const { data: stockDept } = await supabase
        .from('stock_departamental')
        .select('centro_servicio_id, cantidad_actual');

      const centroStats: CentroStats[] = centros?.map(centro => {
        const incidentesCentro = incidentes?.filter(i => i.centro_servicio === centro.codigo).length || 0;
        const stockCentro = stockDept?.filter(s => s.centro_servicio_id === centro.id)
          .reduce((sum, s) => sum + s.cantidad_actual, 0) || 0;

        return {
          nombre: centro.nombre,
          incidentes: incidentesCentro,
          eficiencia: 0, // Simplificado
          stock: stockCentro
        };
      }).sort((a, b) => b.incidentes - a.incidentes) || [];

      // Tránsitos activos
      const { data: transitos } = await supabase
        .from('transitos_bodega')
        .select('*')
        .eq('estado', 'en_transito');

      // Stock consolidado
      const stockConsolidado = stockDept?.reduce((sum, s) => sum + s.cantidad_actual, 0) || 0;

      setStats({
        centros: centroStats,
        transitosActivos: transitos?.length || 0,
        stockConsolidado,
        tiempoPromedioTransferencia: 0 // Simplificado
      });

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Supervisor Regional</h1>

      {/* KPIs Regionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Centros Activos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.centros.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tránsitos Activos</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transitosActivos}</div>
            <p className="text-xs text-muted-foreground">Entre centros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock Consolidado</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stockConsolidado}</div>
            <p className="text-xs text-muted-foreground">Total de items</p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Centros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ranking de Centros de Servicio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.centros.map((centro, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{centro.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {centro.incidentes} incidentes • {centro.stock} items en stock
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-muted-foreground">#{idx + 1}</span>
                </div>
                <Progress
                  value={(centro.incidentes / stats.centros[0].incidentes) * 100}
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
