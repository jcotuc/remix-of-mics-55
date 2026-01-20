import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Search, Filter, Clock, Package, User, Calendar, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatFechaRelativa } from "@/utils/dateFormatters";

interface IncidenteEnvio {
  id: string;
  codigo: string;
  codigo_cliente: string;
  codigo_producto: string;
  updated_at: string;
  descripcion_problema: string;
  quiere_envio: boolean | null;
}

interface ClienteMap {
  [codigo: string]: { nombre: string; celular: string; direccion: string | null };
}

export default function MaquinasPendientesEnvio() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [incidentes, setIncidentes] = useState<IncidenteEnvio[]>([]);
  const [clientes, setClientes] = useState<ClienteMap>({});
  const [filtroTexto, setFiltroTexto] = useState("");

  const fetchIncidentes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("incidentes")
        .select("id, codigo, codigo_cliente, codigo_producto, updated_at, descripcion_problema, quiere_envio")
        .eq("status", "Logistica envio")
        .order("updated_at", { ascending: true });

      if (error) throw error;

      setIncidentes(data || []);

      // Fetch client data
      const codigosClientes = [...new Set((data || []).map(i => i.codigo_cliente))];
      if (codigosClientes.length > 0) {
        const { data: clientesData } = await supabase
          .from("clientes")
          .select("codigo, nombre, celular, direccion")
          .in("codigo", codigosClientes);

        const clientesMap: ClienteMap = {};
        (clientesData || []).forEach(c => {
          clientesMap[c.codigo] = { nombre: c.nombre, celular: c.celular, direccion: c.direccion };
        });
        setClientes(clientesMap);
      }
    } catch (error) {
      console.error("Error fetching incidentes:", error);
      toast.error("Error al cargar incidentes pendientes de envío");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentes();
  }, []);

  const incidentesFiltrados = useMemo(() => {
    return incidentes.filter(inc => {
      if (!filtroTexto) return true;
      const texto = filtroTexto.toLowerCase();
      return (
        inc.codigo.toLowerCase().includes(texto) ||
        inc.codigo_cliente.toLowerCase().includes(texto) ||
        inc.codigo_producto.toLowerCase().includes(texto) ||
        clientes[inc.codigo_cliente]?.nombre?.toLowerCase().includes(texto)
      );
    });
  }, [incidentes, filtroTexto, clientes]);

  const getTiempoEspera = (updatedAt: string) => {
    return formatFechaRelativa(updatedAt).replace(/^hace /, "");
  };

  const handleVerDetalle = (incidenteId: string) => {
    navigate(`/logistica/salida-maquinas?incidente=${incidenteId}`);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Send className="h-6 w-6 text-primary" />
            Máquinas Pendientes de Envío
          </h1>
          <p className="text-muted-foreground">
            Máquinas reparadas listas para despacho a clientes
          </p>
        </div>
        <Button onClick={fetchIncidentes} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Stats Card */}
      <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 dark:text-orange-400">Total Pendientes de Envío</p>
              <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{incidentes.length}</p>
            </div>
            <Truck className="h-10 w-10 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, cliente o producto..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Incidentes Pendientes de Envío ({incidentesFiltrados.length})</CardTitle>
          <CardDescription>
            Ordenados por antigüedad (FIFO)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando...</span>
            </div>
          ) : incidentesFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay incidentes pendientes de envío</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Tiempo Espera</TableHead>
                    <TableHead>Envío</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidentesFiltrados.map((inc) => (
                    <TableRow key={inc.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{inc.codigo}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{clientes[inc.codigo_cliente]?.nombre || inc.codigo_cliente}</p>
                          <p className="text-xs text-muted-foreground">{clientes[inc.codigo_cliente]?.celular}</p>
                        </div>
                      </TableCell>
                      <TableCell>{inc.codigo_producto}</TableCell>
                      <TableCell>
                        <p className="text-sm max-w-[200px] truncate">
                          {clientes[inc.codigo_cliente]?.direccion || "Sin dirección"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                          <Clock className="h-3 w-3" />
                          {getTiempoEspera(inc.updated_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {inc.quiere_envio ? (
                          <Badge className="bg-green-500">Con envío</Badge>
                        ) : (
                          <Badge variant="outline">Recoger</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleVerDetalle(inc.id)} className="gap-1">
                          <Send className="h-4 w-4" />
                          Procesar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
