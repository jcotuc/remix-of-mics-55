import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, PackageCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Incidente = Database['public']['Tables']['incidentes']['Row'];
type Cliente = Database['public']['Tables']['clientes']['Row'];

export default function MaquinasNuevasRT() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cambios, setCambios] = useState<(Incidente & { cliente: Cliente })[]>([]);
  const [autoconsumos, setAutoconsumos] = useState<(Incidente & { cliente: Cliente })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Cambios por garantía desde bodega
      const { data: cambiosData, error: cambiosError } = await supabase
        .from('incidentes')
        .select('*, clientes!inner(*)')
        .eq('status', 'Cambio por garantia')
        .order('updated_at', { ascending: false });

      if (cambiosError) throw cambiosError;

      // Autoconsumos (productos nuevos como cintas, Truper, etc)
      // Estos podrían venir de una tabla específica de autoconsumos
      // Por ahora usamos incidentes marcados como herramienta_manual
      const { data: autoconsumosData, error: autoconsumosError } = await supabase
        .from('incidentes')
        .select('*, clientes!inner(*)')
        .eq('es_herramienta_manual', true)
        .order('updated_at', { ascending: false });

      if (autoconsumosError) throw autoconsumosError;

      setCambios((cambiosData || []).map((i: any) => ({ ...i, cliente: i.clientes })));
      setAutoconsumos((autoconsumosData || []).map((i: any) => ({ ...i, cliente: i.clientes })));

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (data: (Incidente & { cliente: Cliente })[], tipo: string) => {
    const filtered = data.filter(item =>
      (item.sku_maquina?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      item.codigo_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filtered.length === 0) {
      return (
        <div className="text-center py-12">
          <PackageCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay {tipo} registrados</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Fecha Ingreso</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.codigo}</TableCell>
              <TableCell>{item.sku_maquina || '-'}</TableCell>
              <TableCell>{item.codigo_producto}</TableCell>
              <TableCell>{item.cliente.nombre}</TableCell>
              <TableCell>
                {new Date(item.fecha_ingreso).toLocaleDateString('es-GT')}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{tipo}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={item.status === 'Cambio por garantia' ? "default" : "secondary"}>
                  {item.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline">Ver Detalle</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <PackageCheck className="h-8 w-8 text-primary" />
          Máquinas Nuevas RT
        </h1>
        <p className="text-muted-foreground mt-2">
          Cambios por garantía y autoconsumos despachados desde bodega
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5" />
                Productos Nuevos
              </CardTitle>
              <CardDescription>Cambios por garantía y autoconsumos</CardDescription>
            </div>
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por SKU, producto o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cambios" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cambios">
                Cambios por Garantía ({cambios.length})
              </TabsTrigger>
              <TabsTrigger value="autoconsumos">
                Autoconsumos ({autoconsumos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cambios" className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando...</p>
                </div>
              ) : (
                renderTable(cambios, "Cambio")
              )}
            </TabsContent>

            <TabsContent value="autoconsumos" className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando...</p>
                </div>
              ) : (
                renderTable(autoconsumos, "Autoconsumo")
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
