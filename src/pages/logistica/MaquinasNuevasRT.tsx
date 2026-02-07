import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import type { IncidenteSchema, ClienteSchema } from "@/generated/actions.d";
import { mycsapi } from "@/mics-api";

type IncidenteConCliente = IncidenteSchema & { clienteNombre: string };

export default function MaquinasNuevasRT() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cambios, setCambios] = useState<IncidenteConCliente[]>([]);
  const [autoconsumos, setAutoconsumos] = useState<IncidenteConCliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch data in parallel using apiBackendAction
      const [incidentesResponse, clientesResponse] = await Promise.all([
        mycsapi.get("/api/v1/incidentes", { query: { limit: 2000 } }),
        mycsapi.get("/api/v1/clientes", { query: { limit: 5000 } })
      ]);

      const incidentes = incidentesResponse.results || [];
      const clientes = clientesResponse.results || [];

      // Create client map for quick lookup
      const clienteMap = new Map<number, ClienteSchema>();
      clientes.forEach((c: ClienteSchema) => clienteMap.set(c.id, c));

      // Helper to enrich incidente with client name
      const enrichIncidente = (inc: any): IncidenteConCliente => {
        const cliente = inc.cliente || clienteMap.get(inc.cliente?.id || 0);
        return {
          ...inc,
          clienteNombre: cliente?.nombre || 'Sin cliente'
        };
      };

      // Filter cambios por garantía
      const cambiosData = incidentes
        .filter((i: any) => i.estado === 'CAMBIO_POR_GARANTIA')
        .map(enrichIncidente)
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());

      // Filter autoconsumos - usando descripcion_problema como proxy
      const autoconsumosData = incidentes
        .filter((i: any) =>
          i.descripcion_problema?.toLowerCase().includes('mantenimiento') ||
          i.descripcion_problema?.toLowerCase().includes('autoconsumo')
        )
        .map(enrichIncidente)
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());

      setCambios(cambiosData);
      setAutoconsumos(autoconsumosData);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (data: IncidenteConCliente[], tipo: string) => {
    const filtered = data.filter(item =>
      item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.producto?.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase())
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
              <TableCell>{item.producto?.codigo || '-'}</TableCell>
              <TableCell>{item.clienteNombre}</TableCell>
              <TableCell>
                {new Date(item.created_at || '').toLocaleDateString('es-GT')}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{tipo}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={item.estado === 'CAMBIO_POR_GARANTIA' ? "default" : "secondary"}>
                  {item.estado}
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
                placeholder="Buscar por código, producto o cliente..."
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
