import { useState, useEffect } from "react";
import { BarChart3, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = {
  A: "#ef4444",
  B: "#f59e0b",
  C: "#10b981"
};

interface CentroServicio {
  id: number;
  nombre: string;
}

export default function StockDepartamento() {
  const [centrosServicio, setCentrosServicio] = useState<CentroServicio[]>([]);
  const [centroSeleccionado, setCentroSeleccionado] = useState("");
  const [inventario, setInventario] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCentros();
  }, []);

  useEffect(() => {
    if (centroSeleccionado) {
      fetchInventario(centroSeleccionado);
    }
  }, [centroSeleccionado]);

  const fetchCentros = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("centros_de_servicio")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setCentrosServicio((data || []) as CentroServicio[]);

      if (data && data.length > 0) {
        setCentroSeleccionado(String(data[0].id));
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventario = async (centroId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventario")
        .select("*")
        .eq("centro_servicio_id", Number(centroId))
        .order("cantidad", { ascending: false });

      if (error) throw error;
      setInventario(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  const stockTotal = inventario.reduce((acc, item) => acc + (item.cantidad || 0), 0);
  const stockBajo = inventario.filter(item => item.cantidad < 5).length;
  const sinStock = inventario.filter(item => item.cantidad === 0).length;

  // Data para gráfico de barras (top 10)
  const topItems = inventario.slice(0, 10).map(item => ({
    codigo: item.codigo_repuesto?.slice(0, 10) || "",
    cantidad: item.cantidad || 0
  }));

  // Data para pie chart
  const pieData = [
    { name: "Normal", value: inventario.filter(i => i.cantidad >= 5).length },
    { name: "Bajo", value: stockBajo },
    { name: "Sin stock", value: sinStock }
  ];

  const pieColors = ["#10b981", "#f59e0b", "#ef4444"];

  if (loading && !centroSeleccionado) {
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
          <BarChart3 className="h-8 w-8 text-primary" />
          Stock Departamental
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualización de inventario por centro de servicio
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Centro</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={centroSeleccionado} onValueChange={setCentroSeleccionado}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Seleccionar centro..." />
            </SelectTrigger>
            <SelectContent>
              {centrosServicio.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventario.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Unidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockTotal.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stockBajo}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{sinStock}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topItems}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="codigo" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="cantidad" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución de Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventario Detallado</CardTitle>
          <CardDescription>
            {inventario.length} items en este centro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventario.slice(0, 20).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.codigo_repuesto}</TableCell>
                  <TableCell className="max-w-xs truncate">{item.descripcion || "-"}</TableCell>
                  <TableCell>{item.ubicacion_legacy || "-"}</TableCell>
                  <TableCell className="text-right">{item.cantidad}</TableCell>
                  <TableCell>
                    {item.cantidad === 0 ? (
                      <Badge variant="destructive">Sin stock</Badge>
                    ) : item.cantidad < 5 ? (
                      <Badge className="bg-orange-500">Bajo</Badge>
                    ) : (
                      <Badge className="bg-green-500">Normal</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}