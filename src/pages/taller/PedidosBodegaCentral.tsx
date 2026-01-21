import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package, Search, CheckCircle, XCircle, Clock, Truck, AlertTriangle, Eye } from "lucide-react";
import { differenceInDays } from "date-fns";
import { formatFechaHora } from "@/utils/dateFormatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type PedidoBodegaCentralDB = Database['public']['Tables']['pedidos_bodega_central']['Row'];
type EstadoPedidoBodega = Database['public']['Enums']['estadopedidobodega'];

interface PedidoBodegaExtended extends PedidoBodegaCentralDB {
  incidente?: {
    codigo: string;
    producto_id: number | null;
    cliente_id: number | null;
    cliente?: { nombre: string } | null;
    producto?: { descripcion: string } | null;
  } | null;
  centro_servicio?: { nombre: string } | null;
  solicitante?: { nombre: string; apellido: string | null } | null;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDIENTE: { label: "Pendiente Aprobación", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock },
  APROBADO_JEFE_TALLER: { label: "Aprobado por Jefe Taller", color: "bg-blue-100 text-blue-800 border-blue-300", icon: CheckCircle },
  APROBADO_SUPERVISOR: { label: "Aprobado por Supervisor", color: "bg-indigo-100 text-indigo-800 border-indigo-300", icon: CheckCircle },
  ENVIADO: { label: "En Proceso (Bodega)", color: "bg-purple-100 text-purple-800 border-purple-300", icon: Package },
  RECIBIDO: { label: "Recibido", color: "bg-green-100 text-green-800 border-green-300", icon: Truck },
  RECHAZADO: { label: "Rechazado", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
};

export default function PedidosBodegaCentral() {
  const [pedidos, setPedidos] = useState<PedidoBodegaExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("PENDIENTE");
  const [selectedPedido, setSelectedPedido] = useState<PedidoBodegaExtended | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos_bodega_central")
        .select(`
          *,
          incidentes!incidente_id(
            codigo,
            producto_id,
            cliente_id,
            clientes!cliente_id(nombre),
            productos!producto_id(descripcion)
          ),
          centros_de_servicio!centro_servicio_id(nombre)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch solicitantes info
      const solicitanteIds = [...new Set((data || []).map(p => p.solicitado_por_id).filter(Boolean))] as number[];
      
      let profilesMap = new Map<number, { nombre: string; apellido: string | null }>();
      if (solicitanteIds.length > 0) {
        const { data: usuariosData } = await supabase
          .from("usuarios")
          .select("id, nombre, apellido")
          .in("id", solicitanteIds);

        profilesMap = new Map(
          (usuariosData || []).map(u => [u.id, { nombre: u.nombre, apellido: u.apellido }])
        );
      }

      const formattedData: PedidoBodegaExtended[] = (data || []).map(item => ({
        ...item,
        incidente: item.incidentes ? {
          codigo: (item.incidentes as any).codigo,
          producto_id: (item.incidentes as any).producto_id,
          cliente_id: (item.incidentes as any).cliente_id,
          cliente: (item.incidentes as any).clientes,
          producto: (item.incidentes as any).productos,
        } : null,
        centro_servicio: item.centros_de_servicio as any,
        solicitante: item.solicitado_por_id ? profilesMap.get(item.solicitado_por_id) || null : null,
      }));

      setPedidos(formattedData);
    } catch (error) {
      console.error("Error fetching pedidos:", error);
      toast.error("Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const filteredPedidos = pedidos.filter(p => {
    const matchesSearch = 
      p.incidente?.codigo?.toLowerCase().includes(search.toLowerCase()) ||
      p.incidente?.cliente?.nombre?.toLowerCase().includes(search.toLowerCase());
    
    const matchesTab = p.estado === activeTab || 
      (activeTab === "todos") ||
      (activeTab === "aprobados" && (p.estado === "APROBADO_JEFE_TALLER" || p.estado === "APROBADO_SUPERVISOR"));
    
    return matchesSearch && matchesTab;
  });

  const handleAprobar = async () => {
    if (!selectedPedido || !user) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("pedidos_bodega_central")
        .update({
          estado: "APROBADO_JEFE_TALLER" as EstadoPedidoBodega,
          aprobado_jefe_taller_id: typeof user.id === 'string' ? parseInt(user.id) || 0 : user.id,
        })
        .eq("id", selectedPedido.id);

      if (error) throw error;

      toast.success("Pedido aprobado exitosamente");
      setShowApprovalDialog(false);
      setSelectedPedido(null);
      fetchPedidos();
    } catch (error: any) {
      console.error("Error approving:", error);
      toast.error(error.message || "Error al aprobar");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRechazar = async () => {
    if (!selectedPedido || !rejectReason.trim()) {
      toast.error("Debe indicar el motivo del rechazo");
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("pedidos_bodega_central")
        .update({
          estado: "RECHAZADO" as EstadoPedidoBodega,
        })
        .eq("id", selectedPedido.id);

      if (error) throw error;

      toast.success("Pedido rechazado");
      setShowRejectDialog(false);
      setRejectReason("");
      setSelectedPedido(null);
      fetchPedidos();
    } catch (error: any) {
      console.error("Error rejecting:", error);
      toast.error(error.message || "Error al rechazar");
    } finally {
      setIsProcessing(false);
    }
  };

  const getDaysWaiting = (date: string) => differenceInDays(new Date(), new Date(date));

  const getEstadoBadge = (estado: string) => {
    const config = ESTADO_CONFIG[estado] || ESTADO_CONFIG.PENDIENTE;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const countByEstado = (estado: string) => pedidos.filter(p => p.estado === estado).length;

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
          <h1 className="text-2xl font-bold text-foreground">Pedidos a Bodega Central</h1>
          <p className="text-muted-foreground">
            Gestión de pedidos de repuestos desde centros de servicio
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/taller/pendientes-repuestos")} variant="outline">
            Ver Pendientes
          </Button>
          <Button onClick={fetchPedidos} variant="outline">
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className={countByEstado("PENDIENTE") > 0 ? "border-yellow-500" : ""}>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{countByEstado("PENDIENTE")}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{countByEstado("APROBADO_JEFE_TALLER")}</p>
              <p className="text-xs text-muted-foreground">Aprobados JT</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{countByEstado("APROBADO_SUPERVISOR")}</p>
              <p className="text-xs text-muted-foreground">Aprobados SR</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{countByEstado("ENVIADO")}</p>
              <p className="text-xs text-muted-foreground">En Proceso</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{countByEstado("RECIBIDO")}</p>
              <p className="text-xs text-muted-foreground">Recibidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Tabs */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="PENDIENTE">Pendientes</TabsTrigger>
            <TabsTrigger value="aprobados">Aprobados</TabsTrigger>
            <TabsTrigger value="ENVIADO">En Proceso</TabsTrigger>
            <TabsTrigger value="RECIBIDO">Recibidos</TabsTrigger>
            <TabsTrigger value="todos">Todos</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPedidos.map((pedido) => {
                const days = getDaysWaiting(pedido.created_at);
                const isUrgent = days >= 5;
                const isCritical = days >= 8;

                return (
                  <Card 
                    key={pedido.id}
                    className={`relative overflow-hidden ${isCritical ? "ring-2 ring-red-500" : isUrgent ? "ring-1 ring-orange-400" : ""}`}
                  >
                    {isCritical && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
                    )}
                    
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">
                            {pedido.incidente?.codigo || "Sin incidente"}
                          </CardTitle>
                          <CardDescription className="truncate">
                            {pedido.incidente?.producto?.descripcion || `Producto #${pedido.incidente?.producto_id}`}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {days}d
                          </Badge>
                          {isCritical && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              CXG
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="mb-2">
                        {getEstadoBadge(pedido.estado)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Cliente</p>
                          <p className="font-medium truncate">{pedido.incidente?.cliente?.nombre || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Centro</p>
                          <p className="font-medium truncate">{pedido.centro_servicio?.nombre || "N/A"}</p>
                        </div>
                      </div>

                      <div className="text-sm">
                        <p className="text-muted-foreground text-xs mb-1">Días sin stock</p>
                        <Badge variant="secondary">{pedido.dias_sin_stock} días</Badge>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="flex-1"
                          onClick={() => setSelectedPedido(pedido)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detalle
                        </Button>

                        {pedido.estado === "PENDIENTE" && (
                          <>
                            <Button 
                              size="sm" 
                              variant="default"
                              className="flex-1"
                              onClick={() => {
                                setSelectedPedido(pedido);
                                setShowApprovalDialog(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                setSelectedPedido(pedido);
                                setShowRejectDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredPedidos.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay pedidos en este estado</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPedido && !showApprovalDialog && !showRejectDialog} onOpenChange={(open) => !open && setSelectedPedido(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Pedido</DialogTitle>
            <DialogDescription>
              Incidente: {selectedPedido?.incidente?.codigo}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                {getEstadoBadge(selectedPedido.estado)}
                <span className="text-sm text-muted-foreground">
                  {formatFechaHora(selectedPedido.created_at)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedPedido.incidente?.cliente?.nombre || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Centro de Servicio</p>
                  <p className="font-medium">{selectedPedido.centro_servicio?.nombre || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Solicitante</p>
                  <p className="font-medium">
                    {selectedPedido.solicitante 
                      ? `${selectedPedido.solicitante.nombre} ${selectedPedido.solicitante.apellido || ''}`
                      : "N/A"
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Días sin stock</p>
                  <p className="font-medium">{selectedPedido.dias_sin_stock} días</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-2">Producto</p>
                <p className="font-medium">
                  {selectedPedido.incidente?.producto?.descripcion || `Producto #${selectedPedido.incidente?.producto_id}`}
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedPedido(null)}>
                  Cerrar
                </Button>
                {selectedPedido.incidente && (
                  <Button onClick={() => navigate(`/mostrador/seguimiento/${selectedPedido.incidente_id}`)}>
                    Ver Incidente
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Aprobación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de aprobar este pedido a bodega central?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button onClick={handleAprobar} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Pedido</DialogTitle>
            <DialogDescription>
              Indique el motivo del rechazo
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo del rechazo..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRechazar} disabled={isProcessing || !rejectReason.trim()}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
