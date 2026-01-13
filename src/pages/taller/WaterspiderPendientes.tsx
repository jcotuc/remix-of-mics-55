import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Search, Filter, Clock, MapPin, Package, User, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface IncidenteReparado {
  id: string;
  codigo: string;
  codigo_cliente: string;
  codigo_producto: string;
  ingresado_en_mostrador: boolean | null;
  updated_at: string;
  descripcion_problema: string;
}

interface ClienteMap {
  [codigo: string]: { nombre: string; celular: string };
}

export default function WaterspiderPendientes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [incidentes, setIncidentes] = useState<IncidenteReparado[]>([]);
  const [clientes, setClientes] = useState<ClienteMap>({});
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroDestino, setFiltroDestino] = useState<string>("todos");

  const fetchIncidentes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("incidentes")
        .select("id, codigo, codigo_cliente, codigo_producto, ingresado_en_mostrador, updated_at, descripcion_problema")
        .eq("status", "Reparado")
        .order("updated_at", { ascending: true });

      if (error) throw error;

      setIncidentes(data || []);

      // Fetch client data
      const codigosClientes = [...new Set((data || []).map(i => i.codigo_cliente))];
      if (codigosClientes.length > 0) {
        const { data: clientesData } = await supabase
          .from("clientes")
          .select("codigo, nombre, celular")
          .in("codigo", codigosClientes);

        const clientesMap: ClienteMap = {};
        (clientesData || []).forEach(c => {
          clientesMap[c.codigo] = { nombre: c.nombre, celular: c.celular };
        });
        setClientes(clientesMap);
      }
    } catch (error) {
      console.error("Error fetching incidentes:", error);
      toast.error("Error al cargar incidentes reparados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentes();
  }, []);

  const incidentesFiltrados = useMemo(() => {
    return incidentes.filter(inc => {
      // Filtro por texto
      const textoMatch = !filtroTexto || 
        inc.codigo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        inc.codigo_cliente.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        inc.codigo_producto.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        clientes[inc.codigo_cliente]?.nombre?.toLowerCase().includes(filtroTexto.toLowerCase());

      // Filtro por destino
      const destinoMatch = filtroDestino === "todos" ||
        (filtroDestino === "mostrador" && inc.ingresado_en_mostrador === true) ||
        (filtroDestino === "logistica" && inc.ingresado_en_mostrador !== true);

      return textoMatch && destinoMatch;
    });
  }, [incidentes, filtroTexto, filtroDestino, clientes]);

  const handleRecoger = (incidenteId: string) => {
    navigate(`/taller/waterspider/${incidenteId}`);
  };

  const getDestinoBadge = (ingresadoEnMostrador: boolean | null) => {
    if (ingresadoEnMostrador === true) {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Mostrador</Badge>;
    }
    return <Badge className="bg-orange-500 hover:bg-orange-600">Logística</Badge>;
  };

  const getTiempoEspera = (updatedAt: string) => {
    return formatDistanceToNow(new Date(updatedAt), { locale: es, addSuffix: false });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Waterspider - Pendientes de Recolección
          </h1>
          <p className="text-muted-foreground">
            Máquinas reparadas listas para entregar a su destino
          </p>
        </div>
        <Button onClick={fetchIncidentes} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pendientes</p>
                <p className="text-2xl font-bold">{incidentes.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">Para Mostrador</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {incidentes.filter(i => i.ingresado_en_mostrador === true).length}
                </p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400">Para Logística</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {incidentes.filter(i => i.ingresado_en_mostrador !== true).length}
                </p>
              </div>
              <Truck className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, cliente o producto..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroDestino} onValueChange={setFiltroDestino}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los destinos</SelectItem>
                <SelectItem value="mostrador">Solo Mostrador</SelectItem>
                <SelectItem value="logistica">Solo Logística</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Incidentes Reparados ({incidentesFiltrados.length})</CardTitle>
          <CardDescription>
            Ordenados por antigüedad (FIFO - primero en repararse, primero en recoger)
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
              <p>No hay incidentes pendientes de recolección</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Fecha Reparación</TableHead>
                    <TableHead>Tiempo Espera</TableHead>
                    <TableHead>Destino</TableHead>
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
                          <p className="text-xs text-muted-foreground">{inc.codigo_cliente}</p>
                        </div>
                      </TableCell>
                      <TableCell>{inc.codigo_producto}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(inc.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                          <Clock className="h-3 w-3" />
                          {getTiempoEspera(inc.updated_at)}
                        </div>
                      </TableCell>
                      <TableCell>{getDestinoBadge(inc.ingresado_en_mostrador)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleRecoger(inc.id)} className="gap-1">
                          <MapPin className="h-4 w-4" />
                          Recoger
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
