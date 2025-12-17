import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, Search, Clock, User, Eye } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface IncidentePendiente {
  id: string;
  codigo: string;
  codigo_producto: string;
  codigo_tecnico: string | null;
  updated_at: string;
  created_at: string;
  cliente: { nombre: string } | null;
  producto: { descripcion: string } | null;
  solicitudes_repuestos: {
    id: string;
    estado: string;
    repuestos: any;
    created_at: string;
  }[];
}

interface FamiliaAbuelo {
  id: number;
  Categoria: string;
}

export default function PendientesRepuestos() {
  const [incidentes, setIncidentes] = useState<IncidentePendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTecnico, setFilterTecnico] = useState<string>("all");
  const [tecnicos, setTecnicos] = useState<string[]>([]);
  const [selectedIncidente, setSelectedIncidente] = useState<IncidentePendiente | null>(null);

  useEffect(() => {
    fetchIncidentes();
  }, []);

  const fetchIncidentes = async () => {
    try {
      const { data, error } = await supabase
        .from("incidentes")
        .select(`
          id,
          codigo,
          codigo_producto,
          codigo_tecnico,
          updated_at,
          created_at,
          clientes!incidentes_codigo_cliente_fkey(nombre),
          productos!incidentes_codigo_producto_fkey(descripcion),
          solicitudes_repuestos(id, estado, repuestos, created_at)
        `)
        .eq("status", "Pendiente por repuestos")
        .order("updated_at", { ascending: true });

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        ...item,
        cliente: item.clientes,
        producto: item.productos,
      }));

      setIncidentes(formattedData);

      // Extract unique technicians
      const uniqueTecnicos = [...new Set(formattedData.map(i => i.codigo_tecnico).filter(Boolean))] as string[];
      setTecnicos(uniqueTecnicos);
    } catch (error) {
      console.error("Error fetching incidentes:", error);
      toast.error("Error al cargar incidentes");
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidentes = incidentes.filter(inc => {
    const matchesSearch = 
      inc.codigo.toLowerCase().includes(search.toLowerCase()) ||
      inc.codigo_producto.toLowerCase().includes(search.toLowerCase()) ||
      inc.cliente?.nombre?.toLowerCase().includes(search.toLowerCase());
    
    const matchesTecnico = filterTecnico === "all" || inc.codigo_tecnico === filterTecnico;
    
    return matchesSearch && matchesTecnico;
  });

  const getDaysWaiting = (date: string) => {
    return differenceInDays(new Date(), new Date(date));
  };

  const getPriorityBadge = (days: number) => {
    if (days > 7) return <Badge variant="destructive">Crítico ({days}d)</Badge>;
    if (days > 3) return <Badge className="bg-orange-500">Alto ({days}d)</Badge>;
    return <Badge variant="secondary">{days}d</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pendientes por Repuestos</h1>
          <p className="text-muted-foreground">
            {incidentes.length} incidentes esperando repuestos
          </p>
        </div>
        <Button onClick={fetchIncidentes} variant="outline">
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pendientes</p>
                <p className="text-2xl font-bold">{incidentes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <Clock className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Críticos (&gt;7 días)</p>
                <p className="text-2xl font-bold text-destructive">
                  {incidentes.filter(i => getDaysWaiting(i.updated_at) > 7).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-full">
                <User className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Técnicos Afectados</p>
                <p className="text-2xl font-bold">{tecnicos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, producto o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTecnico} onValueChange={setFilterTecnico}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por técnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los técnicos</SelectItem>
                {tecnicos.map(tec => (
                  <SelectItem key={tec} value={tec}>{tec}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Incidentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Días Esperando</TableHead>
                  <TableHead>Solicitudes</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidentes.map((inc) => (
                  <TableRow key={inc.id}>
                    <TableCell className="font-medium">{inc.codigo}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inc.codigo_producto}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {inc.producto?.descripcion}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{inc.cliente?.nombre || "N/A"}</TableCell>
                    <TableCell>{inc.codigo_tecnico || "Sin asignar"}</TableCell>
                    <TableCell>{getPriorityBadge(getDaysWaiting(inc.updated_at))}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {inc.solicitudes_repuestos?.length || 0} solicitudes
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setSelectedIncidente(inc)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver detalle
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Detalle de Solicitudes - {inc.codigo}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Producto</p>
                                <p className="font-medium">{inc.codigo_producto}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Técnico</p>
                                <p className="font-medium">{inc.codigo_tecnico || "Sin asignar"}</p>
                              </div>
                            </div>
                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2">Repuestos Solicitados:</h4>
                              {inc.solicitudes_repuestos?.length > 0 ? (
                                <div className="space-y-2">
                                  {inc.solicitudes_repuestos.map((sol) => (
                                    <div key={sol.id} className="p-3 bg-muted rounded-lg">
                                      <div className="flex justify-between items-center mb-2">
                                        <Badge variant={sol.estado === "pendiente" ? "secondary" : "default"}>
                                          {sol.estado}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {format(new Date(sol.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                        </span>
                                      </div>
                                      <div className="text-sm">
                                        {Array.isArray(sol.repuestos) && sol.repuestos.map((rep: any, idx: number) => (
                                          <p key={idx}>
                                            • {rep.codigo || rep.codigo_repuesto} - Cant: {rep.cantidad}
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground">No hay solicitudes registradas</p>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredIncidentes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay incidentes pendientes por repuestos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}