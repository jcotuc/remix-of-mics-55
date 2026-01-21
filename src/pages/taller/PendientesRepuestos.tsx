import { useState, useEffect } from "react";
import { apiBackendAction } from "@/lib/api-backend";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package, Search, Clock, Eye, Truck, AlertTriangle, DollarSign } from "lucide-react";
import { differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import type { IncidenteSchema } from "@/generated/actions.d";

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
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchIncidentes();
  }, []);

  const fetchIncidentes = async () => {
    try {
      // Fetch incidentes using apiBackendAction
      const { results: allIncidentes } = await apiBackendAction("incidentes.list", { limit: 1000 });
      
      // Filter only ESPERA_REPUESTOS
      const data = allIncidentes
        .filter(i => i.estado === "ESPERA_REPUESTOS")
        .sort((a, b) => new Date(a.updated_at || "").getTime() - new Date(b.updated_at || "").getTime());

      const incidenteIds = data.map(i => i.id);

      // Fetch clientes and productos
      const [clientesResult, productosResult] = await Promise.all([
        apiBackendAction("clientes.list", { limit: 5000 }),
        apiBackendAction("productos.list", { limit: 2000 }),
      ]);

      const clientesMap = new Map(clientesResult.results.map(c => [c.id, c]));
      const productosMap = new Map(productosResult.results.map(p => [p.id, p]));

      // Fetch existing pedidos for these incidentes
      const { data: pedidosData } = await supabase
        .from("pedidos_bodega_central")
        .select("id, incidente_id, estado, created_at")
        .in("incidente_id", incidenteIds);

      const pedidosMap = new Map(
        (pedidosData || []).map(p => [p.incidente_id, { id: p.id, estado: p.estado, created_at: p.created_at }])
      );

      // Fetch solicitudes_repuestos
      const { data: solicitudesData } = await supabase
        .from("solicitudes_repuestos")
        .select("*")
        .in("incidente_id", incidenteIds);

      const solicitudesMap = new Map<number, SolicitudRepuestoDB[]>();
      (solicitudesData || []).forEach(sol => {
        const existing = solicitudesMap.get(sol.incidente_id) || [];
        existing.push(sol);
        solicitudesMap.set(sol.incidente_id, existing);
      });

      // Fetch technician names from incidente_tecnico junction
      const { data: asignaciones } = await supabase
        .from("incidente_tecnico")
        .select("incidente_id, tecnico_id")
        .in("incidente_id", incidenteIds)
        .eq("es_principal", true);

      const tecnicoIds = [...new Set((asignaciones || []).map(a => a.tecnico_id).filter(Boolean))] as number[];
      
      let tecnicosMap = new Map<number, { nombre: string; apellido: string | null }>();
      if (tecnicoIds.length > 0) {
        const { data: usuariosData } = await supabase
          .from("usuarios")
          .select("id, nombre, apellido")
          .in("id", tecnicoIds);

        tecnicosMap = new Map(
          (usuariosData || []).map(u => [u.id, { nombre: u.nombre, apellido: u.apellido }])
        );
      }

      // Map asignaciones to incidentes
      const asignacionesMap = new Map(
        (asignaciones || []).map(a => [a.incidente_id, a.tecnico_id])
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

      // Extract unique technician names
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

  // Separar incidentes por tipo (usando aplica_garantia)
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
      // Get user's info to get centro_servicio_id
      const { data: usuario } = await (supabase as any)
        .from("usuarios")
        .select("id, centro_de_servicio_id")
        .eq("auth_uid", user.id)
        .single();

      if (!usuario?.centro_de_servicio_id) {
        toast.error("No se encontró tu centro de servicio asignado");
        return;
      }

      // Build repuestos array from solicitudes
      const repuestos = selectedIncidente.solicitudes_repuestos?.flatMap(sol => 
        Array.isArray(sol.repuestos) ? (sol.repuestos as any[]).map((rep: any) => ({
          codigo: rep.codigo || rep.codigo_repuesto,
          cantidad: rep.cantidad,
          descripcion: rep.descripcion || ""
        })) : []
      ) || [];

      const { error } = await supabase
        .from("pedidos_bodega_central")
        .insert({
          incidente_id: selectedIncidente.id,
          centro_servicio_id: usuario.centro_de_servicio_id,
          solicitado_por_id: usuario.id,
          dias_sin_stock: getDaysWaiting(selectedIncidente.updated_at),
          estado: "PENDIENTE"
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
        .update({ estado: "CAMBIO_POR_GARANTIA" })
        .eq("id", incidente.id);

      if (error) throw error;

      toast.success(`Incidente ${incidente.codigo} convertido a Cambio por Garantía`);
      fetchIncidentes();
    } catch (error) {
      console.error("Error converting to CXG:", error);
      toast.error("Error al convertir a CXG");
    }
  };

  const renderIncidentCard = (inc: IncidentePendiente, esPresupuesto: boolean) => {
    const days = getDaysWaiting(inc.updated_at);
    const priority = getPriorityInfo(days);

    return (
      <Card 
        key={inc.id}
        className={`relative overflow-hidden ${priority.urgent ? "ring-2 ring-red-500" : ""}`}
      >
        {priority.urgent && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
        )}
        
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{inc.codigo}</CardTitle>
              <CardDescription className="truncate">
                {inc.producto?.descripcion || `Producto #${inc.producto?.id || "N/A"}`}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline" className={`font-mono text-xs ${priority.textColor}`}>
                {days}d
              </Badge>
              {priority.urgent && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  CXG
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Cliente</p>
              <p className="font-medium truncate">{inc.cliente?.nombre || "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Técnico</p>
              <p className="font-medium truncate">
                {inc.tecnico ? `${inc.tecnico.nombre} ${inc.tecnico.apellido || ''}`.trim() : "Sin asignar"}
              </p>
            </div>
          </div>

          {inc.pedido_bodega ? (
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              <Truck className="h-3 w-3 mr-1" />
              Pedido creado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              <Clock className="h-3 w-3 mr-1" />
              Sin pedido
            </Badge>
          )}

          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="ghost"
              className="flex-1"
              onClick={() => navigate(`/mostrador/seguimiento/${inc.id}`)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>

            {!inc.pedido_bodega && (
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
                Pedir
              </Button>
            )}

            {priority.urgent && !esPresupuesto && (
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
                      Estos incidentes son de presupuesto (no garantía). El técnico verificó que no hay stock local.
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
              {!selectedIncidente.aplica_garantia && (
                <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-400/50">
                  Incidente de presupuesto
                </Badge>
              )}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Repuestos a solicitar:</p>
                <div className="space-y-1 text-sm">
                  {selectedIncidente.solicitudes_repuestos?.flatMap(sol => 
                    Array.isArray(sol.repuestos) ? (sol.repuestos as any[]).map((rep: any, idx: number) => (
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
                  placeholder="Agregar notas..."
                  value={pedidoNotas}
                  onChange={(e) => setPedidoNotas(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPedidoDialog(false)} disabled={isCreatingPedido}>
                  Cancelar
                </Button>
                <Button onClick={handleCrearPedido} disabled={isCreatingPedido}>
                  {isCreatingPedido ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
                  Crear Pedido
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
