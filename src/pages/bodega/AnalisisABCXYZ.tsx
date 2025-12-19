import { useState, useEffect } from "react";
import { Package, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AnalisisABCXYZ() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalUnidades: 0,
    stockBajo: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventario")
        .select("*");

      if (error) throw error;

      const items = data || [];
      setStats({
        totalItems: items.length,
        totalUnidades: items.reduce((acc, item) => acc + (item.cantidad || 0), 0),
        stockBajo: items.filter(item => item.cantidad < 5).length
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Package className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          Análisis ABC/XYZ
        </h1>
        <p className="text-muted-foreground mt-2">
          Clasificación de inventario por rotación y variabilidad
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Items</CardTitle>
            <CardDescription>SKUs en inventario</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalItems.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Unidades</CardTitle>
            <CardDescription>Unidades en stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUnidades.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock Bajo</CardTitle>
            <CardDescription>Items con menos de 5 unidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{stats.stockBajo}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Módulo en desarrollo</CardTitle>
          <CardDescription>
            El análisis ABC/XYZ se reconfigurará con la nueva estructura de inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta funcionalidad estará disponible próximamente con la nueva tabla de inventario.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
