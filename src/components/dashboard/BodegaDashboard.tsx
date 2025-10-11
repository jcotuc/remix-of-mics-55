import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type RepuestoDb = Database['public']['Tables']['repuestos']['Row'];

export function BodegaDashboard() {
  const [repuestos, setRepuestos] = useState<RepuestoDb[]>([]);

  useEffect(() => {
    fetchRepuestos();
  }, []);

  const fetchRepuestos = async () => {
    const { data } = await supabase
      .from('repuestos')
      .select('*')
      .order('codigo_producto');
    if (data) setRepuestos(data);
  };

  // Métricas para bodega
  const stockBajo = repuestos.filter(r => (r.stock_actual || 0) < 5).length;
  const disponibleMostrador = repuestos.filter(r => r.disponible_mostrador).length;
  const catalogoTruper = repuestos.filter(r => r.es_catalogo_truper).length;
  const totalRepuestos = repuestos.length;

  // Distribución por producto
  const repuestosPorProducto = repuestos.reduce((acc, rep) => {
    const producto = rep.codigo_producto || 'Sin clasificar';
    acc[producto] = (acc[producto] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const productoData = Object.entries(repuestosPorProducto)
    .map(([producto, cantidad]) => ({ producto, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 6);

  // Stock por producto
  const stockPorProducto = repuestos.reduce((acc, rep) => {
    const producto = rep.codigo_producto || 'Sin clasificar';
    acc[producto] = (acc[producto] || 0) + (rep.stock_actual || 0);
    return acc;
  }, {} as Record<string, number>);

  const stockData = Object.entries(stockPorProducto)
    .map(([producto, stock]) => ({ producto, stock }))
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 6);

  // Distribución de disponibilidad
  const availabilityData = [
    { name: 'Mostrador', value: disponibleMostrador },
    { name: 'Solo Bodega', value: totalRepuestos - disponibleMostrador },
  ];

  const availabilityColors = ['hsl(var(--success))', 'hsl(var(--muted))'];

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repuestos</CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{totalRepuestos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En catálogo
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <TrendingDown className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stockBajo}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Menos de 5 unidades
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Mostrador</CardTitle>
            <CheckCircle className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{disponibleMostrador}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Disponibles
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Catálogo Truper</CardTitle>
            <AlertTriangle className="h-5 w-5 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-info">{catalogoTruper}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Referencia externa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Repuestos por Producto (Top 6)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="producto" stroke="hsl(var(--muted-foreground))" />
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
            <CardTitle>Stock por Producto (Top 6)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="producto" type="category" width={80} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="stock" fill="hsl(var(--success))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Disponibilidad en Mostrador</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={availabilityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {availabilityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={availabilityColors[index % availabilityColors.length]} />
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
  );
}
