import { useState, useEffect } from "react";
import { Search, Filter, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface Incidente {
  id: string;
  codigo: string;
  status: string;
  fecha_ingreso: string;
  codigo_cliente: string;
  codigo_producto: string;
  codigo_tecnico: string | null;
  descripcion_problema: string;
  familia_producto: string | null;
}

interface Cliente {
  codigo: string;
  nombre: string;
  celular: string;
}

interface Producto {
  codigo: string;
  descripcion: string;
}

interface Diagnostico {
  tecnico_codigo: string;
  fallas: string[];
  causas: string[];
  resolucion: string | null;
  estado: string;
  created_at: string;
}

export default function BusquedaIncidentes() {
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [filteredIncidentes, setFilteredIncidentes] = useState<Incidente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [selectedIncidente, setSelectedIncidente] = useState<Incidente | null>(null);
  const [detalleData, setDetalleData] = useState<{
    cliente: Cliente | null;
    producto: Producto | null;
    diagnostico: Diagnostico | null;
  }>({
    cliente: null,
    producto: null,
    diagnostico: null,
  });
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    fetchIncidentes();
  }, []);

  useEffect(() => {
    filterIncidentes();
  }, [searchTerm, estadoFiltro, incidentes]);

  const fetchIncidentes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("incidentes")
        .select("*")
        .in("status", ["En diagnostico", "Reparado"])
        .order("fecha_ingreso", { ascending: false });

      if (error) throw error;
      setIncidentes(data || []);
    } catch (error) {
      console.error("Error al cargar incidentes:", error);
      toast.error("Error al cargar los incidentes");
    } finally {
      setLoading(false);
    }
  };

  const filterIncidentes = () => {
    let filtered = [...incidentes];

    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (inc) =>
          inc.codigo.toLowerCase().includes(term) ||
          inc.codigo_cliente.toLowerCase().includes(term) ||
          inc.codigo_producto.toLowerCase().includes(term) ||
          inc.descripcion_problema.toLowerCase().includes(term)
      );
    }

    // Filtrar por estado
    if (estadoFiltro !== "todos") {
      filtered = filtered.filter((inc) => inc.status === estadoFiltro);
    }

    setFilteredIncidentes(filtered);
  };

  const handleVerDetalle = async (incidente: Incidente) => {
    setSelectedIncidente(incidente);
    setLoadingDetalle(true);

    try {
      // Obtener cliente
      const { data: clienteData } = await supabase
        .from("clientes")
        .select("codigo, nombre, celular")
        .eq("codigo", incidente.codigo_cliente)
        .single();

      // Obtener producto
      const { data: productoData } = await supabase
        .from("productos")
        .select("codigo, descripcion")
        .eq("codigo", incidente.codigo_producto)
        .single();

      // Obtener diagnóstico
      const { data: diagnosticoData } = await supabase
        .from("diagnosticos")
        .select("*")
        .eq("incidente_id", incidente.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setDetalleData({
        cliente: clienteData,
        producto: productoData,
        diagnostico: diagnosticoData,
      });
    } catch (error) {
      console.error("Error al cargar detalles:", error);
      toast.error("Error al cargar los detalles del incidente");
    } finally {
      setLoadingDetalle(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    if (status === "Reparado") return "default";
    if (status === "En diagnostico") return "secondary";
    return "outline";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda de Incidentes
          </CardTitle>
          <CardDescription>
            Consulta incidentes finalizados y en proceso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por código, cliente, producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="En diagnostico">En diagnóstico</SelectItem>
                <SelectItem value="Reparado">Reparado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de resultados */}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Ingreso</TableHead>
                    <TableHead>Familia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidentes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No se encontraron incidentes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIncidentes.map((incidente) => (
                      <TableRow key={incidente.id}>
                        <TableCell className="font-medium">{incidente.codigo}</TableCell>
                        <TableCell>{incidente.codigo_cliente}</TableCell>
                        <TableCell>{incidente.codigo_producto}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(incidente.status)}>
                            {incidente.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(incidente.fecha_ingreso), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>
                          {incidente.familia_producto || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerDetalle(incidente)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalle */}
      <Dialog open={selectedIncidente !== null} onOpenChange={() => setSelectedIncidente(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Incidente {selectedIncidente?.codigo}</DialogTitle>
            <DialogDescription>
              Información completa del incidente
            </DialogDescription>
          </DialogHeader>

          {loadingDetalle ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Información General */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Información General</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <Badge variant={getStatusBadgeVariant(selectedIncidente?.status || "")}>
                      {selectedIncidente?.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha Ingreso</p>
                    <p className="text-sm">
                      {selectedIncidente?.fecha_ingreso &&
                        format(new Date(selectedIncidente.fecha_ingreso), "dd/MM/yyyy HH:mm", {
                          locale: es,
                        })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Técnico Asignado</p>
                    <p className="text-sm">{selectedIncidente?.codigo_tecnico || "Sin asignar"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Familia Producto</p>
                    <p className="text-sm">{selectedIncidente?.familia_producto || "-"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Cliente */}
              {detalleData.cliente && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                      <p className="text-sm">{detalleData.cliente.nombre}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Código</p>
                      <p className="text-sm">{detalleData.cliente.codigo}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Celular</p>
                      <p className="text-sm">{detalleData.cliente.celular}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Producto */}
              {detalleData.producto && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Producto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                      <p className="text-sm">{detalleData.producto.descripcion}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Código</p>
                      <p className="text-sm">{detalleData.producto.codigo}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Problema */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Problema Reportado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedIncidente?.descripcion_problema}</p>
                </CardContent>
              </Card>

              {/* Diagnóstico */}
              {detalleData.diagnostico && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Diagnóstico</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Estado Diagnóstico</p>
                      <Badge variant="outline">{detalleData.diagnostico.estado}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Fallas Detectadas</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {detalleData.diagnostico.fallas.map((falla, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {falla}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Causas</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {detalleData.diagnostico.causas.map((causa, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {causa}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {detalleData.diagnostico.resolucion && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Resolución</p>
                        <p className="text-sm">{detalleData.diagnostico.resolucion}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
