import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package, Search, Clock, User, Eye, Truck, AlertTriangle, ArrowRight, DollarSign } from "lucide-react";
import { differenceInDays } from "date-fns";
import { formatFechaCorta, formatFechaHora } from "@/utils/dateFormatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
interface IncidentePendiente {
  id: string;
  codigo: string;
  codigo_producto: string;
  codigo_tecnico: string | null;
  tecnico_asignado_id: string | null;
  updated_at: string;
  created_at: string;
  centro_servicio: string | null;
  presupuesto_cliente_aprobado: boolean | null;
  cliente: { nombre: string } | null;
  producto: { descripcion: string } | null;
  tecnico: { nombre: string; apellido: string } | null;
  solicitudes_repuestos: {
    id: string;
    estado: string;
    repuestos: any;
    created_at: string;
    presupuesto_aprobado: boolean | null;
  }[];
  pedido_bodega?: {
    id: string;
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
  const navigate = useNavigate();
  const { user } = useAuth();

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
          tecnico_asignado_id,
          updated_at,
          created_at,
          centro_servicio,
          presupuesto_cliente_aprobado,
          clientes!incidentes_codigo_cliente_fkey(nombre),
          productos!incidentes_codigo_producto_fkey(descripcion),
          solicitudes_repuestos(id, estado, repuestos, created_at, presupuesto_aprobado)
        `)
        .eq("status", "Pendiente por repuestos")
        .order("updated_at", { ascending: true });

      if (error) throw error;

      // Fetch existing pedidos for these incidentes
      const incidenteIds = (data || []).map(i => i.id);
      const { data: pedidosData } = await supabase
        .from("pedidos_bodega_central")
        .select("id, incidente_id, estado, created_at")
        .in("incidente_id", incidenteIds);

      const pedidosMap = new Map(
        (pedidosData || []).map(p => [p.incidente_id, { id: p.id, estado: p.estado, created_at: p.created_at }])
      );

      // Fetch technician names from profiles
      const tecnicoIds = [...new Set((data || []).map(i => i.tecnico_asignado_id).filter(Boolean))] as string[];
      const { data: tecnicosData } = await supabase
        .from("profiles")
        .select("user_id, nombre, apellido")
        .in("user_id", tecnicoIds);

      const tecnicosMap = new Map(
        (tecnicosData || []).map(t => [t.user_id, { nombre: t.nombre, apellido: t.apellido }])
      );

      const formattedData = (data || []).map(item => ({
        ...item,
        cliente: item.clientes,
        producto: item.productos,
        tecnico: item.tecnico_asignado_id ? tecnicosMap.get(item.tecnico_asignado_id) || null : null,
        pedido_bodega: pedidosMap.get(item.id) || null,
      }));

      setIncidentes(formattedData as IncidentePendiente[]);

      // Extract unique technicians with names
      const uniqueTecnicos = [...new Set(formattedData.map(i => 
        i.tecnico ? `${i.tecnico.nombre} ${i.tecnico.apellido}` : null
      ).filter(Boolean))] as string[];
      setTecnicos(uniqueTecnicos);
    } catch (error) {
      console.error("Error fetching incidentes:", error);
      toast.error("Error al cargar incidentes");
    } finally {
      setLoading(false);
    }
  };

  // Separar incidentes por tipo
  const incidentesGarantia = incidentes.filter(inc => !inc.presupuesto_cliente_aprobado);
  const incidentesPresupuesto = incidentes.filter(inc => inc.presupuesto_cliente_aprobado);

  const getFilteredIncidentes = (lista: IncidentePendiente[]) => {
    return lista.filter(inc => {
      const matchesSearch = 
        inc.codigo.toLowerCase().includes(search.toLowerCase()) ||
        inc.codigo_producto.toLowerCase().includes(search.toLowerCase()) ||
        inc.cliente?.nombre?.toLowerCase().includes(search.toLowerCase());
      
      const matchesTecnico = filterTecnico === "all" || inc.codigo_tecnico === filterTecnico;
      
      return matchesSearch && matchesTecnico;
    });
  };

  const filteredIncidentes = vistaActiva === "garantia" 
    ? getFilteredIncidentes(incidentesGarantia)
    : getFilteredIncidentes(incidentesPresupuesto);

  const getDaysWaiting = (date: string) => {
    return differenceInDays(new Date(), new Date(date));
  };

  const getPriorityInfo = (days: number) => {
    if (days >= 8) return { color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50 dark:bg-red-950", label: "CXG Automático", urgent: true };
    if (days > 5) return { color: "bg-orange-500", textColor: "text-orange-700", bgLight: "bg-orange-50 dark:bg-orange-950", label: "Urgente", urgent: false };
    if (days > 3) return { color: "bg-yellow-500", textColor: "text-yellow-700", bgLight: "bg-yellow-50 dark:bg-yellow-950", label: "Alto", urgent: false };
    return { color: "bg-muted", textColor: "text-muted-foreground", bgLight: "bg-muted/30", label: "Normal", urgent: false };
  };

  const handleCrearPedido = async () => {
    if (!selectedIncidente || !user) return;

    setIsCreatingPedido(true);
    try {
      // Get user's profile to get centro_servicio_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("centro_servicio_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.centro_servicio_id) {
        toast.error("No se encontró tu centro de servicio asignado");
        return;
      }

      // Build repuestos array from solicitudes
      const repuestos = selectedIncidente.solicitudes_repuestos?.flatMap(sol => 
        Array.isArray(sol.repuestos) ? sol.repuestos.map((rep: any) => ({
          codigo: rep.codigo || rep.codigo_repuesto,
          cantidad: rep.cantidad,
          descripcion: rep.descripcion || ""
        })) : []
      ) || [];

      const { error } = await supabase
        .from("pedidos_bodega_central")
        .insert({
          incidente_id: selectedIncidente.id,
          centro_servicio_id: profile.centro_servicio_id,
          solicitado_por: user.id,
          repuestos: repuestos,
          notas: pedidoNotas,
          estado: "pendiente"
        });

      if (error) throw error;

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
      const { error } = await supabase
        .from("incidentes")
        .update({ status: "Cambio por garantia" })
        .eq("id", incidente.id);

      if (error) throw error;

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

  const criticalCount = incidentes.filter(i => getDaysWaiting(i.updated_at) >= 8).length;
  const urgentCount = incidentes.filter(i => getDaysWaiting(i.updated_at) > 5 && getDaysWaiting(i.updated_at) < 8).length;
  const withPedidoCount = incidentes.filter(i => i.pedido_bodega).length;
  const presupuestoCount = incidentesPresupuesto.length;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pendientes por Repuestos</h1>
          <p className="text-muted-foreground">
            {incidentes.length} incidentes esperando repuestos
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/taller/pedidos-bodega")} variant="default">
            <Truck className="h-4 w-4 mr-2" />
            Ver Pedidos
          </Button>
          <Button onClick={fetchIncidentes} variant="outline">
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
        <Card className={criticalCount > 0 ? "border-red-500" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CXG Automático (≥8d)</p>
                <p className="text-2xl font-bold text-red-500">{criticalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-full">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Urgentes (5-7d)</p>
                <p className="text-2xl font-bold text-orange-500">{urgentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <Truck className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Con Pedido Creado</p>
                <p className="text-2xl font-bold text-green-600">{withPedidoCount}</p>
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

      {/* Tabs para separar Garantía vs Presupuesto */}
      <Tabs value={vistaActiva} onValueChange={(v) => setVistaActiva(v as "garantia" | "presupuesto")} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="garantia" className="gap-2">
            <Package className="h-4 w-4" />
            Garantía ({incidentesGarantia.length})
          </TabsTrigger>
          <TabsTrigger value="presupuesto" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Presupuesto ({presupuestoCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="garantia" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredIncidentes(incidentesGarantia).map((inc) => renderIncidentCard(inc, false))}
            
            {getFilteredIncidentes(incidentesGarantia).length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay incidentes de garantía pendientes por repuestos</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="presupuesto" className="mt-0">
          <div className="space-y-4">
            {presupuestoCount > 0 && (
              <Card className="border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <DollarSign className="h-5 w-5" />
                    <p className="text-sm font-medium">
                      Estos incidentes tienen presupuesto aprobado por el cliente. El técnico verificó que no hay stock local.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredIncidentes(incidentesPresupuesto).map((inc) => renderIncidentCard(inc, true))}
              
              {getFilteredIncidentes(incidentesPresupuesto).length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay incidentes con presupuesto pendientes por repuestos</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Pedido Dialog */}
      <Dialog open={showPedidoDialog} onOpenChange={setShowPedidoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Pedido a Bodega Central</DialogTitle>
            <DialogDescription>
              Se solicitarán los repuestos para el incidente {selectedIncidente?.codigo}
            </DialogDescription>
          </DialogHeader>
          
          {selectedIncidente && (
            <div className="space-y-4">
              {selectedIncidente.presupuesto_cliente_aprobado && (
                <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-400/50">
                  ✓ Cliente pagó presupuesto
                </Badge>
              )}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Repuestos a solicitar:</p>
                <div className="space-y-1 text-sm">
                  {selectedIncidente.solicitudes_repuestos?.flatMap(sol => 
                    Array.isArray(sol.repuestos) ? sol.repuestos.map((rep: any, idx: number) => (
                      <p key={`${sol.id}-${idx}`} className="flex justify-between">
                        <span>{rep.codigo || rep.codigo_repuesto}</span>
                        <span className="text-muted-foreground">x{rep.cantidad}</span>
                      </p>
                    )) : []
                  )}
                  {(!selectedIncidente.solicitudes_repuestos || selectedIncidente.solicitudes_repuestos.length === 0) && (
                    <p className="text-muted-foreground">No hay repuestos especificados en las solicitudes</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notas adicionales (opcional)</label>
                <Textarea 
                  placeholder="Agregar observaciones o urgencia..."
                  value={pedidoNotas}
                  onChange={(e) => setPedidoNotas(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPedidoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearPedido} disabled={isCreatingPedido}>
              {isCreatingPedido && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderIncidentCard(inc: IncidentePendiente, isPresupuesto: boolean) {
    const days = getDaysWaiting(inc.updated_at);
    const priority = getPriorityInfo(days);
    const hasPedido = !!inc.pedido_bodega;

    return (
      <Card
        key={inc.id} 
        className={`relative overflow-hidden transition-all hover:shadow-lg cursor-pointer ${isPresupuesto ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20' : priority.bgLight} ${priority.urgent ? "ring-2 ring-red-500" : ""}`}
        onClick={() => navigate(`/taller/pendientes-repuestos/${inc.id}`)}
      >
        {/* Priority indicator bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${isPresupuesto ? 'bg-emerald-500' : priority.color}`} />
        
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{inc.codigo}</CardTitle>
              <CardDescription className="truncate max-w-[200px]">
                {inc.producto?.descripcion || inc.codigo_producto}
              </CardDescription>
              {isPresupuesto && (
                <Badge className="mt-1 text-xs bg-emerald-500/20 text-emerald-700 border-emerald-400/50">
                  ✓ Presupuesto Aprobado
                </Badge>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={priority.urgent ? "destructive" : "secondary"} className="font-mono">
                {days}d
              </Badge>
              {hasPedido && (
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                  Pedido: {inc.pedido_bodega?.estado}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-medium truncate">{inc.cliente?.nombre || "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Técnico</p>
              <p className="font-medium">{inc.tecnico ? `${inc.tecnico.nombre} ${inc.tecnico.apellido}` : "Sin asignar"}</p>
            </div>
          </div>

          <div className="text-sm">
            <p className="text-muted-foreground">Repuestos solicitados</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {inc.solicitudes_repuestos?.slice(0, 3).flatMap(sol => 
                Array.isArray(sol.repuestos) ? sol.repuestos.slice(0, 2).map((rep: any, idx: number) => (
                  <Badge key={`${sol.id}-${idx}`} variant="outline" className="text-xs">
                    {rep.codigo || rep.codigo_repuesto}
                  </Badge>
                )) : []
              )}
              {(inc.solicitudes_repuestos?.reduce((acc, sol) => 
                acc + (Array.isArray(sol.repuestos) ? sol.repuestos.length : 0), 0) || 0) > 4 && (
                <Badge variant="outline" className="text-xs">+más</Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setSelectedIncidente(inc)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Detalle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Detalle - {inc.codigo}</DialogTitle>
                  <DialogDescription>
                    {days} días esperando repuestos
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {inc.presupuesto_cliente_aprobado && (
                    <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-400/50">
                      ✓ Cliente pagó presupuesto
                    </Badge>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Producto</p>
                      <p className="font-medium">{inc.codigo_producto}</p>
                      <p className="text-xs text-muted-foreground">{inc.producto?.descripcion}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Técnico</p>
                      <p className="font-medium">{inc.tecnico ? `${inc.tecnico.nombre} ${inc.tecnico.apellido}` : "Sin asignar"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cliente</p>
                      <p className="font-medium">{inc.cliente?.nombre || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Desde</p>
                      <p className="font-medium">{formatFechaCorta(inc.updated_at)}</p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Repuestos Solicitados:</h4>
                    {inc.solicitudes_repuestos?.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {inc.solicitudes_repuestos.map((sol) => (
                          <div key={sol.id} className="p-3 bg-muted rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <Badge variant={sol.estado === "pendiente" ? "secondary" : "default"}>
                                {sol.estado}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatFechaHora(sol.created_at)}
                              </span>
                            </div>
                            <div className="text-sm space-y-1">
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

            {!hasPedido ? (
              <Button 
                size="sm" 
                variant="default"
                className="flex-1"
                onClick={() => {
                  setSelectedIncidente(inc);
                  setShowPedidoDialog(true);
                }}
              >
                <Truck className="h-4 w-4 mr-1" />
                Crear Pedido
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/taller/pedidos-bodega")}
              >
                Ver Pedido
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {days >= 8 && !isPresupuesto && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => handleConvertirCXG(inc)}
              >
                CXG
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
}
