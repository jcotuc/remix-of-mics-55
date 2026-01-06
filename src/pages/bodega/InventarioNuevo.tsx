import { useState, useEffect } from "react";
import { Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type InventarioItem = {
  codigo_repuesto: string;
  descripcion: string | null;
  cantidad: number;
  ubicacion_legacy: string | null;
};

export default function InventarioNuevo() {
  const [searchTerm, setSearchTerm] = useState("");
  const [centroSeleccionado, setCentroSeleccionado] = useState("");
  const [centrosServicio, setCentrosServicio] = useState<any[]>([]);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCentrosServicio();
  }, []);

  useEffect(() => {
    if (centroSeleccionado) {
      fetchInventario(centroSeleccionado);
    }
  }, [centroSeleccionado]);

  const fetchCentrosServicio = async () => {
    try {
      const { data, error } = await supabase
        .from("centros_servicio")
        .select("*")
        .eq("activo", true);

      if (error) throw error;
      setCentrosServicio(data || []);
      
      // Seleccionar primer centro por defecto
      if (data && data.length > 0) {
        setCentroSeleccionado(data[0].id);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchInventario = async (centroId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventario")
        .select("codigo_repuesto, descripcion, cantidad, ubicacion_legacy")
        .eq("centro_servicio_id", centroId)
        .order("codigo_repuesto");

      if (error) throw error;
      setInventario(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  const filteredInventario = inventario.filter(item =>
    item.codigo_repuesto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ubicacion_legacy?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stockTotal = inventario.reduce((acc, item) => acc + item.cantidad, 0);
  const stockBajo = inventario.filter(item => item.cantidad < 5).length;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          Inventario
        </h1>
        <p className="text-muted-foreground mt-2">
          Consulta y gestión de inventario por centro de servicio
        </p>
      </div>

      <Tabs defaultValue="consulta" className="space-y-4">
        <TabsList>
          <TabsTrigger value="consulta">Consulta de Inventario</TabsTrigger>
          <TabsTrigger value="ciclico">Inventario Cíclico</TabsTrigger>
        </TabsList>

        <TabsContent value="consulta" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
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
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inventario</CardTitle>
              <CardDescription>
                {filteredInventario.length} items encontrados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Select value={centroSeleccionado} onValueChange={setCentroSeleccionado}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Centro de servicio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {centrosServicio.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código, descripción o ubicación..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">Cargando...</div>
              ) : (
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
                    {filteredInventario.slice(0, 50).map((item, idx) => (
                      <TableRow key={idx}>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ciclico">
          <Card>
            <CardHeader>
              <CardTitle>Inventario Cíclico</CardTitle>
              <CardDescription>
                Esta funcionalidad se configurará con la nueva estructura de inventario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Próximamente disponible.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
