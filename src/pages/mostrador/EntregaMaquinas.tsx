import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, PackageCheck, Calendar, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiBackendAction } from "@/lib/api-backend";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared";
import type { Database } from "@/integrations/supabase/types";
import type { IncidenteSchema, ClienteSchema, ProductoSchema } from "@/generated/actions.d";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { es } from "date-fns/locale";
import { formatFechaCorta } from "@/utils/dateFormatters";

type EstadoIncidente = Database["public"]["Enums"]["estadoincidente"];

type IncidenteConRelaciones = IncidenteSchema & {
  clienteData?: ClienteSchema;
  productoData?: ProductoSchema;
};

export default function EntregaMaquinas() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [incidentesReparados, setIncidentesReparados] = useState<IncidenteConRelaciones[]>([]);

  const autoFixReparadoEnGarantiaSinRepuestos = async (incidentes: IncidenteSchema[]) => {
    const candidatosIds = incidentes
      .filter((i) => i.estado === "ESPERA_REPUESTOS")
      .map((i) => i.id)
      .filter((id): id is number => typeof id === "number");

    if (candidatosIds.length === 0) return { incidentes, fixedIds: [] as number[] };

    // 1) Diagnósticos de reparación en garantía para esos incidentes
    const { results: diagnosticos } = await apiBackendAction("diagnosticos.list", { limit: 2000 });
    const garantiaIds = Array.from(
      new Set(
        (diagnosticos || [])
          .filter((d: any) => candidatosIds.includes(d.incidente_id) && d.tipo_resolucion === "REPARAR_EN_GARANTIA")
          .map((d: any) => d.incidente_id)
          .filter((id: any): id is number => typeof id === "number")
      )
    );
    if (garantiaIds.length === 0) return { incidentes, fixedIds: [] as number[] };

    // 2) Ver si existen solicitudes de repuestos
    const solicitudesRes = await apiBackendAction("solicitudes_repuestos.list", {});
    const solicitudes = (solicitudesRes as any).data || (solicitudesRes as any).results || [];
    const conSolicitud = new Set(
      (solicitudes || [])
        .filter((s: any) => garantiaIds.includes(s.incidente_id))
        .map((s: any) => s.incidente_id)
        .filter((id: any): id is number => typeof id === "number")
    );

    const idsParaCorregir = garantiaIds.filter((id) => !conSolicitud.has(id));
    if (idsParaCorregir.length === 0) return { incidentes, fixedIds: [] as number[] };

    // 3) Corregir estado del incidente uno por uno
    for (const id of idsParaCorregir) {
      await apiBackendAction("incidentes.update", { id, data: { estado: "REPARADO" } } as any);
    }

    const idsSet = new Set(idsParaCorregir);
    const incidentesCorregidos = incidentes.map((inc) =>
      idsSet.has(inc.id) ? ({ ...inc, estado: "REPARADO" } as IncidenteSchema) : inc
    );

    return { incidentes: incidentesCorregidos, fixedIds: idsParaCorregir };
  };
  
  // Filtros
  const [filtroTexto, setFiltroTexto] = useState("");
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>();
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>();

  useEffect(() => {
    fetchIncidentesReparados();
  }, []);

  const fetchIncidentesReparados = async () => {
    setLoading(true);
    try {
      // Fetch incidentes, clientes, y productos en paralelo
      const [incidentesResult, clientesResult, productosResult] = await Promise.all([
        apiBackendAction("incidentes.list", { limit: 1000 }),
        apiBackendAction("clientes.list", { limit: 5000 }),
        apiBackendAction("productos.list", { limit: 2000 }),
      ]);

      // Hotfix: si es REPARAR_EN_GARANTIA y NO hay solicitudes_repuestos, debe pasar a REPARADO
      let incidentesNormalizados = incidentesResult.results;
      try {
        const { incidentes, fixedIds } = await autoFixReparadoEnGarantiaSinRepuestos(incidentesResult.results);
        incidentesNormalizados = incidentes;
        if (fixedIds.length > 0) {
          toast.success(`Se corrigieron ${fixedIds.length} incidente(s) a REPARADO (sin repuestos solicitados)`);
        }
      } catch (e) {
        console.warn("No se pudo auto-corregir REPARAR_EN_GARANTIA sin repuestos:", e);
        toast.error("No se pudo auto-corregir a REPARADO (revisa permisos/RLS). Igual se cargó la lista.");
      }

      // Filtrar solo los REPARADOS
      const incidentesData = incidentesNormalizados.filter((i) => i.estado === "REPARADO");
      
      // Crear mapas para búsqueda rápida
      const clientesMap = new Map(clientesResult.results.map(c => [c.id, c]));
      const productosMap = new Map(productosResult.results.map(p => [p.id, p]));

      const incidentesConRelaciones: IncidenteConRelaciones[] = incidentesData.map(inc => ({
        ...inc,
        clienteData: inc.cliente ? clientesMap.get(inc.cliente.id) : undefined,
        productoData: inc.producto ? productosMap.get(inc.producto.id) : undefined
      }));
      
      // Ordenar por fecha de ingreso descendente
      incidentesConRelaciones.sort((a, b) => 
        new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
      );
      
      setIncidentesReparados(incidentesConRelaciones);
    } catch (error) {
      console.error('Error al cargar incidentes:', error);
      toast.error("Error al cargar las máquinas listas para entrega");
    } finally {
      setLoading(false);
    }
  };

  // Incidentes filtrados
  const incidentesFiltrados = useMemo(() => {
    return incidentesReparados.filter(inc => {
      // Filtro de texto (código incidente o nombre cliente)
      const matchTexto = !filtroTexto || 
        inc.codigo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        inc.clienteData?.nombre?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        inc.productoData?.codigo?.toLowerCase().includes(filtroTexto.toLowerCase());
      
      // Filtro fecha desde
      const fechaIngreso = new Date(inc.created_at || "");
      const matchFechaDesde = !fechaDesde || fechaIngreso >= fechaDesde;
      
      // Filtro fecha hasta
      const matchFechaHasta = !fechaHasta || fechaIngreso <= new Date(fechaHasta.getTime() + 86400000);
      
      return matchTexto && matchFechaDesde && matchFechaHasta;
    });
  }, [incidentesReparados, filtroTexto, fechaDesde, fechaHasta]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Ingrese un código de incidente para buscar");
      return;
    }
    
    setSearching(true);
    try {
      // Use apiBackendAction to search by code
      const { results } = await apiBackendAction("incidentes.search", { 
        search: searchTerm.toUpperCase(), 
        limit: 5 
      });
      
      // Find exact match by code
      const incidenteData = results.find(inc => inc.codigo === searchTerm.toUpperCase());
      
      if (!incidenteData) {
        toast.error("Incidente no encontrado");
        return;
      }

      if (incidenteData.estado !== 'REPARADO') {
        toast.error("Este incidente no está en estado 'Reparado' y listo para entrega");
        return;
      }

      // Navegar a la vista de detalle
      navigate(`/mostrador/entrega-maquinas/${incidenteData.id}`);
    } catch (error) {
      console.error('Error al buscar incidente:', error);
      toast.error("Error al buscar el incidente");
    } finally {
      setSearching(false);
    }
  };

  const handleEntregar = (incidenteId: number) => {
    navigate(`/mostrador/entrega-maquinas/${incidenteId}`);
  };

  const limpiarFiltros = () => {
    setFiltroTexto("");
    setFechaDesde(undefined);
    setFechaHasta(undefined);
  };

  const hayFiltrosActivos = filtroTexto || fechaDesde || fechaHasta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Entrega de Máquinas</h1>
      </div>

      {/* Búsqueda Rápida */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda Rápida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="INC-000001"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="uppercase"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Indicador de Pendientes de Entrega */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-lg">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <CardContent className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/15">
                  <PackageCheck className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Pendientes de Entrega
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary">{incidentesReparados.length}</span>
                <span className="text-lg text-muted-foreground">máquinas</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Reparadas y listas para entregar al cliente
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 ring-4 ring-primary/5">
              <PackageCheck className="h-10 w-10 text-primary/70" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            {hayFiltrosActivos && (
              <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro de texto */}
            <div className="space-y-2">
              <Label className="text-sm">Buscar por código o cliente</Label>
              <Input
                placeholder="Código incidente, cliente o producto..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
              />
            </div>

            {/* Fecha desde */}
            <div className="space-y-2">
              <Label className="text-sm">Fecha desde</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {fechaDesde ? formatFechaCorta(fechaDesde) : "Seleccionar..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={fechaDesde}
                    onSelect={setFechaDesde}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Fecha hasta */}
            <div className="space-y-2">
              <Label className="text-sm">Fecha hasta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {fechaHasta ? formatFechaCorta(fechaHasta) : "Seleccionar..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={fechaHasta}
                    onSelect={setFechaHasta}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Máquinas Listas para Entrega */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Máquinas Listas para Entrega
            {hayFiltrosActivos && (
              <span className="text-sm font-normal text-muted-foreground">
                ({incidentesFiltrados.length} de {incidentesReparados.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando máquinas...</p>
            </div>
          ) : incidentesFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <PackageCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              {hayFiltrosActivos ? (
                <>
                  <p className="text-muted-foreground">No se encontraron máquinas con los filtros aplicados</p>
                  <Button variant="link" onClick={limpiarFiltros} className="mt-2">
                    Limpiar filtros
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">No hay máquinas listas para entrega en este momento</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Las máquinas aparecerán aquí cuando tengan estado "Reparado"
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Fecha Ingreso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidentesFiltrados.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell className="font-medium">{inc.codigo}</TableCell>
                      <TableCell>
                        {inc.clienteData?.nombre || inc.cliente?.nombre || "Desconocido"}
                      </TableCell>
                      <TableCell>{inc.productoData?.codigo || inc.producto?.codigo || "-"}</TableCell>
                      <TableCell>
                        {new Date(inc.created_at || "").toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inc.estado as EstadoIncidente} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleEntregar(inc.id)}>
                          Entregar
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
