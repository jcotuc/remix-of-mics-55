import { useState, useEffect } from "react";
import { apiBackendAction } from "@/lib/api-backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, Search, Clock, Eye, Truck, AlertTriangle, DollarSign, RefreshCw } from "lucide-react";
import { differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import {
  AlertBanner,
  MetricCard,
  PriorityIndicator,
  getPriorityLevel,
  ProgressBarWithLabel,
  DaysDistributionChart,
  DistributionPieChart,
} from "@/components/shared/dashboard";

type SolicitudRepuestoDB = Database['public']['Tables']['solicitudes_repuestos']['Row'];

interface IncidentePendiente {
  id: number;
  codigo: string;
  estado: string;
  aplica_garantia?: boolean | null;
  updated_at: string | null;
  cliente?: { nombre: string } | null;
  producto?: { descripcion: string; id?: number } | null;
  tecnico?: { nombre: string; apellido: string | null } | null;
  solicitudes_repuestos?: SolicitudRepuestoDB[];
  pedido_bodega?: {
    id: number;
    estado: string;
    created_at: string;
  } | null;
}

export default function PendientesRepuestos() {
  const [incidentes, setIncidentes] = useState<IncidentePendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTecnico, setFilterTecnico] = useState<string>("all");
  const [tecnicos, setTecnicos] = useState<string[]>([]);
  const [selectedIncidente, setSelectedIncidente] = useState<IncidentePendiente | null>(null);
  const [isCreatingPedido, setIsCreatingPedido] = useState(false);
  const [pedidoNotas, setPedidoNotas] = useState("");
  const [showPedidoDialog, setShowPedidoDialog] = useState(false);
  const [vistaActiva, setVistaActiva] = useState<"garantia" | "presupuesto">("garantia");
  const [showCriticalAlert, setShowCriticalAlert] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchIncidentes();
  }, []);

  const fetchIncidentes = async () => {
    try {
      const { results: allIncidentes } = await apiBackendAction("incidentes.list", { limit: 1000 });
      
      const data = allIncidentes
        .filter(i => i.estado === "ESPERA_REPUESTOS")
        .sort((a, b) => new Date(a.updated_at || "").getTime() - new Date(b.updated_at || "").getTime());

      const incidenteIds = data.map(i => i.id);

      const [clientesResult, productosResult] = await Promise.all([
        apiBackendAction("clientes.list", { limit: 5000 }),
        apiBackendAction("productos.list", { limit: 2000 }),
      ]);

      const clientesMap = new Map(clientesResult.results.map(c => [c.id, c]));
      const productosMap = new Map(productosResult.results.map(p => [p.id, p]));

      const pedidosSearchResults = await Promise.all(
        incidenteIds.map(id => apiBackendAction("pedidos_bodega_central.search", { incidente_id: id }))
      );
      const pedidosData = pedidosSearchResults.flatMap(r => r.results || []);

      const pedidosMap = new Map(
        (pedidosData || []).map((p: any) => [p.incidente_id, { id: p.id, estado: p.estado, created_at: p.created_at }])
      );

      const solicitudesResult = await apiBackendAction("solicitudes_repuestos.list", {});
      const solicitudesData = (solicitudesResult as any).data || (solicitudesResult as any).results || [];

      const solicitudesMap = new Map<number, any[]>();
      (solicitudesData || []).forEach((sol: any) => {
        if (incidenteIds.includes(sol.incidente_id)) {
          const existing = solicitudesMap.get(sol.incidente_id) || [];
          existing.push(sol);
          solicitudesMap.set(sol.incidente_id, existing);
        }
      });

      const { results: asignaciones } = await apiBackendAction("incidente_tecnico.list", { es_principal: true });
      const filteredAsignaciones = (asignaciones as any[]).filter(a => incidenteIds.includes(a.incidente_id));

      const tecnicoIds = [...new Set(filteredAsignaciones.map(a => a.tecnico_id).filter(Boolean))] as number[];
      
      let tecnicosMap = new Map<number, { nombre: string; apellido: string | null }>();
      if (tecnicoIds.length > 0) {
        const { results: usuariosData } = await apiBackendAction("usuarios.list", {});
        (usuariosData as any[]).filter(u => tecnicoIds.includes(u.id)).forEach(u => {
          tecnicosMap.set(u.id, { nombre: u.nombre, apellido: u.apellido });
        });
      }

      const asignacionesMap = new Map(
        filteredAsignaciones.map(a => [a.incidente_id, a.tecnico_id])
      );

      const formattedData: IncidentePendiente[] = data.map(item => {
        const tecnicoId = asignacionesMap.get(item.id);
        const cliente = item.cliente ? item.cliente : undefined;
        const producto = item.producto ? item.producto : undefined;
        return {
          id: item.id,
          codigo: item.codigo,
          estado: item.estado,
          aplica_garantia: item.aplica_garantia,
          updated_at: item.updated_at,
          cliente: cliente ? { nombre: cliente.nombre || "" } : null,
          producto: producto ? { descripcion: producto.descripcion || "", id: producto.id } : null,
          tecnico: tecnicoId ? tecnicosMap.get(tecnicoId) || null : null,
          solicitudes_repuestos: solicitudesMap.get(item.id) || [],
          pedido_bodega: pedidosMap.get(item.id) || null,
        };
      });

      setIncidentes(formattedData);

      const uniqueTecnicos = [...new Set(formattedData.map(i => 
        i.tecnico ? `${i.tecnico.nombre} ${i.tecnico.apellido || ''}`.trim() : null
      ).filter(Boolean))] as string[];
      setTecnicos(uniqueTecnicos);
    } catch (error) {
      console.error("Error fetching incidentes:", error);
      toast.error("Error al cargar incidentes");
    } finally {
      setLoading(false);
    }
  };

  const incidentesGarantia = incidentes.filter(inc => inc.aplica_garantia);
  const incidentesPresupuesto = incidentes.filter(inc => !inc.aplica_garantia);

  const getFilteredIncidentes = (lista: IncidentePendiente[]) => {
    return lista.filter(inc => {
      const matchesSearch = 
        inc.codigo.toLowerCase().includes(search.toLowerCase()) ||
        inc.cliente?.nombre?.toLowerCase().includes(search.toLowerCase());
      
      const tecnicoNombre = inc.tecnico ? `${inc.tecnico.nombre} ${inc.tecnico.apellido || ''}`.trim() : "";
      const matchesTecnico = filterTecnico === "all" || tecnicoNombre === filterTecnico;
      
      return matchesSearch && matchesTecnico;
    });
  };

  const filteredIncidentes = vistaActiva === "garantia" 
    ? getFilteredIncidentes(incidentesGarantia)
    : getFilteredIncidentes(incidentesPresupuesto);

  const getDaysWaiting = (date: string | null) => {
    if (!date) return 0;
    return differenceInDays(new Date(), new Date(date));
  };

  const handleCrearPedido = async () => {
    if (!selectedIncidente || !user) return;

    setIsCreatingPedido(true);
    try {
      const { result: usuario } = await apiBackendAction("usuarios.getByEmail", { email: user.email || "" });

      if (!(usuario as any)?.centro_de_servicio_id) {
        toast.error("No se encontró tu centro de servicio asignado");
        return;
      }

      await apiBackendAction("pedidos_bodega_central.create", {
        incidente_id: selectedIncidente.id,
        centro_servicio_id: (usuario as any).centro_de_servicio_id,
        solicitado_por_id: (usuario as any).id,
        dias_sin_stock: getDaysWaiting(selectedIncidente.updated_at),
        estado: "PENDIENTE"
      } as any);

      toast.success("Pedido a Bodega Central creado exitosamente");
      setShowPedidoDialog(false);
      setPedidoNotas("");
      setSelectedIncidente(null);
      fetchIncidentes();
    } catch (error: any) {
      console.error("Error creating pedido:", error);
      toast.error(error.message || "Error al crear el pedido");
    } finally {
      setIsCreatingPedido(false);
    }
  };

  const handleConvertirCXG = async (incidente: IncidentePendiente) => {
    try {
      await apiBackendAction("incidentes.update", {
        id: incidente.id,
        data: { estado: "CAMBIO_POR_GARANTIA" }
      } as any);

      toast.success(`Incidente ${incidente.codigo} convertido a Cambio por Garantía`);
      fetchIncidentes();
    } catch (error) {
      console.error("Error converting to CXG:", error);
      toast.error("Error al convertir a CXG");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate metrics
  const criticalCount = incidentes.filter(i => getDaysWaiting(i.updated_at) >= 8).length;
  const urgentCount = incidentes.filter(i => {
    const days = getDaysWaiting(i.updated_at);
    return days >= 6 && days < 8;
  }).length;
  const highCount = incidentes.filter(i => {
    const days = getDaysWaiting(i.updated_at);
    return days >= 4 && days < 6;
  }).length;
  const normalCount = incidentes.filter(i => getDaysWaiting(i.updated_at) < 4).length;
  const withPedidoCount = incidentes.filter(i => i.pedido_bodega).length;

  // Days distribution data
  const daysDistributionData = [
    { range: "0-3 días", count: normalCount, color: "#22c55e" },
    { range: "4-5 días", count: highCount, color: "#eab308" },
    { range: "6-7 días", count: urgentCount, color: "#f97316" },
    { range: "8+ días", count: criticalCount, color: "#ef4444" },
  ];

  // Type distribution data
  const typeDistributionData = [
    { name: "Garantía", value: incidentesGarantia.length, color: "#22c55e" },
    { name: "Presupuesto", value: incidentesPresupuesto.length, color: "#3b82f6" },
  ];

  const criticalIncidentes = incidentes.filter(i => getDaysWaiting(i.updated_at) >= 8 && i.aplica_garantia);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pendientes por Repuestos</h1>
          <p className="text-muted-foreground">
            Dashboard de control y seguimiento
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/taller/pedidos-bodega")} variant="default">
            <Truck className="h-4 w-4 mr-2" />
            Ver Pedidos
          </Button>
          <Button onClick={fetchIncidentes} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Critical Alert Banner */}
      {criticalCount > 0 && showCriticalAlert && (
        <AlertBanner
          variant="error"
          title={`⚠️ ${criticalCount} incidente${criticalCount > 1 ? 's' : ''} requiere${criticalCount === 1 ? '' : 'n'} CXG automático`}
          description="Incidentes con 8+ días de espera necesitan acción inmediata"
          action={{
            label: "Ver Críticos",
            onClick: () => {
              setVistaActiva("garantia");
              setSearch("");
              setFilterTecnico("all");
            },
          }}
          onDismiss={() => setShowCriticalAlert(false)}
          pulse
        />
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Total Pendientes"
          value={incidentes.length}
          icon={<Package className="h-5 w-5" />}
          iconColor="bg-primary/10 text-primary"
          subtitle={`${withPedidoCount} con pedido creado`}
        />
        <MetricCard
          title="Críticos (≥8 días)"
          value={criticalCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          iconColor="bg-red-500/10 text-red-500"
          alert={criticalCount > 0}
          onClick={() => {
            setVistaActiva("garantia");
          }}
        />
        <MetricCard
          title="Urgentes (6-7 días)"
          value={urgentCount}
          icon={<Clock className="h-5 w-5" />}
          iconColor="bg-orange-500/10 text-orange-500"
        />
        <MetricCard
          title="Presupuesto"
          value={incidentesPresupuesto.length}
          icon={<DollarSign className="h-5 w-5" />}
          iconColor="bg-blue-500/10 text-blue-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DaysDistributionChart
          title="Distribución por Días de Espera"
          data={daysDistributionData}
          height={140}
        />
        <DistributionPieChart
          title="Tipo de Incidente"
          data={typeDistributionData}
          height={180}
        />
      </div>

      {/* Filters & Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <Tabs value={vistaActiva} onValueChange={(v) => setVistaActiva(v as "garantia" | "presupuesto")}>
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="garantia" className="gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Garantía ({incidentesGarantia.length})
                </TabsTrigger>
                <TabsTrigger value="presupuesto" className="gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Presupuesto ({incidentesPresupuesto.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código o cliente..."
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
                  {tecnicos.map((tec) => (
                    <SelectItem key={tec} value={tec}>{tec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Incidentes en Espera</span>
            <Badge variant="secondary">{filteredIncidentes.length} resultados</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Prioridad</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Estado Pedido</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidentes.map((inc) => {
                  const days = getDaysWaiting(inc.updated_at);
                  const priority = getPriorityLevel(days);
                  const isCritical = days >= 8;
                  
                  return (
                    <TableRow 
                      key={inc.id}
                      className={isCritical ? "bg-red-50 dark:bg-red-950/20" : ""}
                    >
                      <TableCell>
                        <PriorityIndicator level={priority} size="lg" />
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium">{inc.codigo}</span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium text-sm truncate">
                            {inc.producto?.descripcion || `#${inc.producto?.id}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{inc.cliente?.nombre || "N/A"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {inc.tecnico 
                            ? `${inc.tecnico.nombre} ${inc.tecnico.apellido || ''}`.trim() 
                            : "Sin asignar"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={isCritical ? "destructive" : "outline"}
                          className="font-mono"
                        >
                          {days}d
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[120px]">
                        <ProgressBarWithLabel
                          value={days}
                          max={8}
                          size="sm"
                          colorByProgress
                        />
                      </TableCell>
                      <TableCell>
                        {inc.pedido_bodega ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-200">
                            <Truck className="h-3 w-3 mr-1" />
                            Creado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => navigate(`/mostrador/seguimiento/${inc.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!inc.pedido_bodega && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedIncidente(inc);
                                setShowPedidoDialog(true);
                              }}
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                          {isCritical && vistaActiva === "garantia" && (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleConvertirCXG(inc)}
                            >
                              CXG
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredIncidentes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No hay incidentes pendientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Pedido Dialog */}
      <Dialog open={showPedidoDialog} onOpenChange={setShowPedidoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Pedido a Bodega Central</DialogTitle>
            <DialogDescription>
              Se creará un pedido para el incidente {selectedIncidente?.codigo}
            </DialogDescription>
          </DialogHeader>
          
          {selectedIncidente && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Incidente:</span>
                  <span className="font-medium">{selectedIncidente.codigo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Días esperando:</span>
                  <Badge variant={getDaysWaiting(selectedIncidente.updated_at) >= 8 ? "destructive" : "secondary"}>
                    {getDaysWaiting(selectedIncidente.updated_at)} días
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notas adicionales (opcional)</label>
                <Textarea
                  value={pedidoNotas}
                  onChange={(e) => setPedidoNotas(e.target.value)}
                  placeholder="Agregar notas sobre el pedido..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPedidoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearPedido} disabled={isCreatingPedido}>
              {isCreatingPedido ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  Crear Pedido
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
