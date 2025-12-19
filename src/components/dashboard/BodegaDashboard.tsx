import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";

type InventarioItem = {
  id: string;
  codigo_repuesto: string;
  descripcion: string | null;
  cantidad: number;
  ubicacion: string | null;
  bodega: string | null;
};

export function BodegaDashboard() {
  const [inventario, setInventario] = useState<InventarioItem[]>([]);

  useEffect(() => {
    fetchInventario();
  }, []);

  const fetchInventario = async () => {
    const { data } = await supabase
      .from('inventario')
      .select('*')
      .order('codigo_repuesto');
    if (data) setInventario(data);
  };

  // Métricas para bodega
  const stockBajo = inventario.filter(item => item.cantidad < 5).length;
  const sinUbicacion = inventario.filter(item => !item.ubicacion).length;
  const totalItems = inventario.length;
  const totalUnidades = inventario.reduce((acc, item) => acc + item.cantidad, 0);

  // Distribución por bodega
  const itemsPorBodega = inventario.reduce((acc, item) => {
    const bodega = item.bodega || 'Sin bodega';
    acc[bodega] = (acc[bodega] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const bodegaData = Object.entries(itemsPorBodega)
    .map(([bodega, cantidad]) => ({ bodega, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 6);

  // Stock por bodega
  const stockPorBodega = inventario.reduce((acc, item) => {
    const bodega = item.bodega || 'Sin bodega';
    acc[bodega] = (acc[bodega] || 0) + item.cantidad;
    return acc;
  }, {} as Record<string, number>);

  const stockData = Object.entries(stockPorBodega)
    .map(([bodega, stock]) => ({ bodega, stock }))
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 6);

  // Distribución de estado
  const estadoData = [
    { name: 'Con ubicación', value: totalItems - sinUbicacion },
    { name: 'Sin ubicación', value: sinUbicacion },
  ];

  const estadoColors = ['hsl(var(--success))', 'hsl(var(--muted))'];

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En inventario
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
            <CheckCircle className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{totalUnidades.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En stock
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
            <CardTitle className="text-sm font-medium">Sin Ubicación</CardTitle>
            <AlertTriangle className="h-5 w-5 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-info">{sinUbicacion}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pendientes de ubicar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SKUs por Bodega (Top 6)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bodegaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="bodega" stroke="hsl(var(--muted-foreground))" />
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
            <CardTitle>Stock por Bodega (Top 6)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="bodega" type="category" width={80} stroke="hsl(var(--muted-foreground))" />
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
          <CardTitle>Estado de Ubicación</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={estadoData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {estadoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={estadoColors[index % estadoColors.length]} />
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
