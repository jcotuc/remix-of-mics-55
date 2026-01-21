import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Send, TruckIcon } from "lucide-react";
import { toast } from "sonner";
import { apiBackendAction } from "@/lib/api";
import type { IncidenteSchema } from "@/generated/actions.d";

type IncidenteConCliente = IncidenteSchema;

export default function SalidaMaquinas() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [reparadas, setReparadas] = useState<IncidenteConCliente[]>([]);
  const [rechazadas, setRechazadas] = useState<IncidenteConCliente[]>([]);
  const [excesoDias, setExcesoDias] = useState<IncidenteConCliente[]>([]);
  const [cambios, setCambios] = useState<IncidenteConCliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all incidentes
      const incidentesRes = await apiBackendAction("incidentes.list", { limit: 2000 });
      const incidentes = incidentesRes.results || [];

      // Máquinas reparadas que requieren envío
      const reparadasData = incidentes.filter(inc => 
        inc.estado === 'REPARADO' && inc.quiere_envio
      );

      // Máquinas rechazadas por cliente
      const rechazadasData = incidentes.filter(inc => 
        inc.estado === 'RECHAZADO'
      );

      // Cambios por garantía que necesitan envío
      const cambiosData = incidentes.filter(inc => 
        inc.estado === 'CAMBIO_POR_GARANTIA' && inc.quiere_envio
      );

      // Note: excesoDias requires notificaciones_cliente which isn't in registry yet
      setReparadas(reparadasData);
      setRechazadas(rechazadasData);
      setExcesoDias([]);
      setCambios(cambiosData);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (data: IncidenteConCliente[], tipo: string) => {
    const filtered = data.filter(inc =>
      inc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inc.producto?.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inc.cliente?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filtered.length === 0) {
      return (
        <div className="text-center py-12">
          <TruckIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay máquinas en esta categoría</p>
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
            <TableHead>Municipio</TableHead>
            <TableHead>Motivo Salida</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((incidente) => (
            <TableRow key={incidente.id}>
              <TableCell className="font-medium">{incidente.codigo}</TableCell>
              <TableCell>{incidente.producto?.descripcion || '-'}</TableCell>
              <TableCell>{incidente.cliente?.nombre || '-'}</TableCell>
              <TableCell>{incidente.cliente?.municipio || '-'}</TableCell>
              <TableCell>
                <Badge variant="outline">{tipo}</Badge>
              </TableCell>
              <TableCell>
                {new Date(incidente.updated_at || incidente.created_at || '').toLocaleDateString('es-GT')}
              </TableCell>
              <TableCell>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => navigate('/logistica/guias')}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Crear Guía
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TruckIcon className="h-8 w-8 text-primary" />
            Salida de Máquinas
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestionar salida de máquinas para envío
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Máquinas Listas para Envío</CardTitle>
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          <Tabs defaultValue="reparadas" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="reparadas">
                Reparadas ({reparadas.length})
              </TabsTrigger>
              <TabsTrigger value="cambios">
                Cambios ({cambios.length})
              </TabsTrigger>
              <TabsTrigger value="rechazadas">
                Rechazadas ({rechazadas.length})
              </TabsTrigger>
              <TabsTrigger value="exceso">
                Exceso Días ({excesoDias.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reparadas" className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando...</p>
                </div>
              ) : (
                renderTable(reparadas, "Reparada")
              )}
            </TabsContent>

            <TabsContent value="cambios" className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando...</p>
                </div>
              ) : (
                renderTable(cambios, "Cambio")
              )}
            </TabsContent>

            <TabsContent value="rechazadas" className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando...</p>
                </div>
              ) : (
                renderTable(rechazadas, "Rechazada")
              )}
            </TabsContent>

            <TabsContent value="exceso" className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando...</p>
                </div>
              ) : (
                renderTable(excesoDias, "Exceso Días")
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
