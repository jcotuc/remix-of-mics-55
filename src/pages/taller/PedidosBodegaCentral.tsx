import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package, Search, CheckCircle, XCircle, Clock, Truck, AlertTriangle, Eye } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface PedidoBodega {
  id: string;
  incidente_id: string;
  centro_servicio_id: string;
  solicitado_por: string;
  repuestos: any;
  estado: string;
  notas: string | null;
  notas_rechazo: string | null;
  dias_sin_stock: number;
  convertido_cxg: boolean;
  created_at: string;
  updated_at: string;
  aprobado_jefe_taller_id: string | null;
  fecha_aprobacion_jt: string | null;
  incidente?: {
    codigo: string;
    codigo_producto: string;
    codigo_cliente: string;
    codigo_tecnico: string | null;
    cliente?: { nombre: string } | null;
    producto?: { descripcion: string } | null;
  };
  centro_servicio?: { nombre: string };
  solicitante?: { nombre: string; apellido: string };
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pendiente: { label: "Pendiente Aprobación", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock },
  aprobado_jt: { label: "Aprobado por Jefe Taller", color: "bg-blue-100 text-blue-800 border-blue-300", icon: CheckCircle },
  aprobado_sr: { label: "Aprobado por Supervisor", color: "bg-indigo-100 text-indigo-800 border-indigo-300", icon: CheckCircle },
  en_proceso: { label: "En Proceso (Bodega)", color: "bg-purple-100 text-purple-800 border-purple-300", icon: Package },
  despachado: { label: "Despachado", color: "bg-green-100 text-green-800 border-green-300", icon: Truck },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
};

export default function PedidosBodegaCentral() {
  const [pedidos, setPedidos] = useState<PedidoBodega[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pendiente");
  const [selectedPedido, setSelectedPedido] = useState<PedidoBodega | null>(null);
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
          incidentes!pedidos_bodega_central_incidente_id_fkey(
            codigo,
            codigo_producto,
            codigo_cliente,
            codigo_tecnico,
            clientes!incidentes_codigo_cliente_fkey(nombre),
            productos!incidentes_codigo_producto_fkey(descripcion)
          ),
          centros_servicio!pedidos_bodega_central_centro_servicio_id_fkey(nombre)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch solicitantes info
      const solicitanteIds = [...new Set((data || []).map(p => p.solicitado_por))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, nombre, apellido")
        .in("user_id", solicitanteIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, { nombre: p.nombre, apellido: p.apellido }])
      );

      const formattedData = (data || []).map(item => ({
        ...item,
        incidente: item.incidentes ? {
          ...item.incidentes,
          cliente: item.incidentes.clientes,
          producto: item.incidentes.productos,
        } : undefined,
        centro_servicio: item.centros_servicio,
        solicitante: profilesMap.get(item.solicitado_por) || null,
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
      p.incidente?.codigo_producto?.toLowerCase().includes(search.toLowerCase()) ||
      p.incidente?.cliente?.nombre?.toLowerCase().includes(search.toLowerCase());
    
    const matchesTab = p.estado === activeTab || 
      (activeTab === "todos") ||
      (activeTab === "aprobados" && (p.estado === "aprobado_jt" || p.estado === "aprobado_sr"));
    
    return matchesSearch && matchesTab;
  });

  const handleAprobar = async () => {
    if (!selectedPedido || !user) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("pedidos_bodega_central")
        .update({
          estado: "aprobado_jt",
          aprobado_jefe_taller_id: user.id,
          fecha_aprobacion_jt: new Date().toISOString(),
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
          estado: "cancelado",
          notas_rechazo: rejectReason,
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
    const config = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente;
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
        <Card className={countByEstado("pendiente") > 0 ? "border-yellow-500" : ""}>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{countByEstado("pendiente")}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{countByEstado("aprobado_jt")}</p>
              <p className="text-xs text-muted-foreground">Aprobados JT</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{countByEstado("aprobado_sr")}</p>
              <p className="text-xs text-muted-foreground">Aprobados SR</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{countByEstado("en_proceso")}</p>
              <p className="text-xs text-muted-foreground">En Proceso</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{countByEstado("despachado")}</p>
              <p className="text-xs text-muted-foreground">Despachados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Tabs */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, producto o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
            <TabsTrigger value="aprobados">Aprobados</TabsTrigger>
            <TabsTrigger value="en_proceso">En Proceso</TabsTrigger>
            <TabsTrigger value="despachado">Despachados</TabsTrigger>
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
                            {pedido.incidente?.producto?.descripcion || pedido.incidente?.codigo_producto}
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
                        <p className="text-muted-foreground text-xs mb-1">Repuestos ({pedido.repuestos?.length || 0})</p>
                        <div className="flex flex-wrap gap-1">
                          {pedido.repuestos?.slice(0, 3).map((rep: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {rep.codigo} x{rep.cantidad}
                            </Badge>
                          ))}
                          {(pedido.repuestos?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs">+{pedido.repuestos.length - 3}</Badge>
                          )}
                        </div>
                      </div>

                      {pedido.notas && (
                        <p className="text-xs text-muted-foreground italic truncate">
                          Nota: {pedido.notas}
                        </p>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Dialog>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="flex-1"
                            onClick={() => setSelectedPedido(pedido)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detalle
                          </Button>
                        </Dialog>

                        {pedido.estado === "pendiente" && (
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
                  {format(new Date(selectedPedido.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Producto</p>
                  <p className="font-medium">{selectedPedido.incidente?.codigo_producto}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedPedido.incidente?.cliente?.nombre || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Centro de Servicio</p>
                  <p className="font-medium">{selectedPedido.centro_servicio?.nombre}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Solicitante</p>
                  <p className="font-medium">
                    {selectedPedido.solicitante 
                      ? `${selectedPedido.solicitante.nombre} ${selectedPedido.solicitante.apellido}`
                      : "N/A"
                    }
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Repuestos solicitados:</p>
                <div className="space-y-2 p-3 bg-muted rounded-lg max-h-48 overflow-y-auto">
                  {selectedPedido.repuestos?.map((rep: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{rep.codigo}</span>
                      <span className="text-muted-foreground">x{rep.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPedido.notas && (
                <div>
                  <p className="text-sm font-medium">Notas:</p>
                  <p className="text-sm text-muted-foreground">{selectedPedido.notas}</p>
                </div>
              )}

              {selectedPedido.notas_rechazo && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-sm font-medium text-red-700">Motivo de rechazo:</p>
                  <p className="text-sm text-red-600">{selectedPedido.notas_rechazo}</p>
                </div>
              )}

              {selectedPedido.fecha_aprobacion_jt && (
                <div className="text-sm text-muted-foreground">
                  Aprobado por Jefe de Taller: {format(new Date(selectedPedido.fecha_aprobacion_jt), "dd/MM/yyyy HH:mm", { locale: es })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Aprobación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de aprobar este pedido a Bodega Central?
            </DialogDescription>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="py-4">
              <p><strong>Incidente:</strong> {selectedPedido.incidente?.codigo}</p>
              <p><strong>Repuestos:</strong> {selectedPedido.repuestos?.length} items</p>
              <p><strong>Centro:</strong> {selectedPedido.centro_servicio?.nombre}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAprobar} disabled={isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aprobar Pedido
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
          
          <div className="py-4">
            <Textarea
              placeholder="Escriba el motivo del rechazo..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRechazar} disabled={isProcessing || !rejectReason.trim()}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rechazar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
