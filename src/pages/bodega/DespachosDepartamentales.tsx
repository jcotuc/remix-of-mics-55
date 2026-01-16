import { useState, useEffect, useMemo } from "react";
import { Package, Truck, Search, Clock, CheckCircle2, AlertCircle, User, MapPin, Calendar, Eye, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Repuesto {
  codigo: string;
  descripcion: string;
  cantidad: number;
}

interface PedidoBodega {
  id: string;
  incidente_id: string;
  centro_servicio_id: string;
  estado: string;
  repuestos: Repuesto[];
  notas: string | null;
  solicitado_por: string;
  aprobado_jefe_taller_id: string | null;
  aprobado_supervisor_id: string | null;
  fecha_aprobacion_jt: string | null;
  fecha_aprobacion_sr: string | null;
  created_at: string;
  incidentes: {
    codigo: string;
    codigo_producto: string;
    centro_servicio: string;
    clientes: { nombre: string } | null;
    productos: { descripcion: string } | null;
  } | null;
  centros_servicio: { nombre: string } | null;
}

const estadoConfig: Record<string, { color: string; label: string; bgClass: string }> = {
  aprobado_jt: { color: "bg-blue-500", label: "Aprobado JT", bgClass: "bg-blue-50 border-blue-200" },
  aprobado_sr: { color: "bg-indigo-500", label: "Aprobado SR", bgClass: "bg-indigo-50 border-indigo-200" },
  en_proceso: { color: "bg-purple-500", label: "En Proceso", bgClass: "bg-purple-50 border-purple-200" },
};

function PedidoCard({ 
  pedido, 
  onVerDetalle, 
  onDespachar 
}: { 
  pedido: PedidoBodega; 
  onVerDetalle: () => void; 
  onDespachar: () => void;
}) {
  const config = estadoConfig[pedido.estado] || estadoConfig.aprobado_jt;
  const repuestosArray = Array.isArray(pedido.repuestos) ? pedido.repuestos : [];
  const totalRepuestos = repuestosArray.reduce((sum, r) => sum + (r.cantidad || 1), 0);
  
  return (
    <Card className={`relative overflow-hidden hover:shadow-md transition-shadow ${config.bgClass}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${config.color}`} />
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between mb-2">
          <p className="font-mono font-bold text-sm">
            {pedido.incidentes?.codigo || pedido.incidente_id.slice(0, 8)}
          </p>
          <Badge variant="secondary" className="text-xs">
            {config.label}
          </Badge>
        </div>
        
        <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3" />
            <span className="truncate">{pedido.solicitado_por || "Sin asignar"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="h-3 w-3" />
            <span>{totalRepuestos} repuesto{totalRepuestos !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" />
            <span className="truncate">
              {pedido.centros_servicio?.nombre || pedido.incidentes?.centro_servicio || "Sin centro"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(pedido.created_at), { addSuffix: true, locale: es })}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={onVerDetalle}>
            <Eye className="h-3 w-3 mr-1" />
            Detalle
          </Button>
          {(pedido.estado === "aprobado_jt" || pedido.estado === "aprobado_sr") && (
            <Button size="sm" className="flex-1 text-xs h-7" onClick={onDespachar}>
              <Send className="h-3 w-3 mr-1" />
              Despachar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DespachosDepartamentales() {
  const [pedidos, setPedidos] = useState<PedidoBodega[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("todos");
  
  // Dialog states
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [despacharOpen, setDespacharOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<PedidoBodega | null>(null);
  const [notasDespacho, setNotasDespacho] = useState("");
  const [despachando, setDespachando] = useState(false);

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos_bodega_central")
        .select(`
          *,
          incidentes!pedidos_bodega_central_incidente_id_fkey(
            codigo,
            codigo_producto,
            centro_servicio,
            clientes!incidentes_codigo_cliente_fkey(nombre),
            productos!incidentes_codigo_producto_fkey(descripcion)
          ),
          centros_servicio!pedidos_bodega_central_centro_servicio_id_fkey(nombre)
        `)
        .in("estado", ["aprobado_jt", "aprobado_sr", "en_proceso"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Filter out Zona 5
      const filtered = (data || []).filter((p: any) => {
        const centro = (p.incidentes?.centro_servicio || p.centros_servicio?.nombre || "").toLowerCase();
        return !centro.includes("zona 5");
      });

      // Parse repuestos JSON
      const parsed = filtered.map((p: any) => ({
        ...p,
        repuestos: typeof p.repuestos === 'string' ? JSON.parse(p.repuestos) : (p.repuestos || [])
      }));

      setPedidos(parsed);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  };

  // Get unique centers with counts
  const centrosConPedidos = useMemo(() => {
    const centroMap = new Map<string, { nombre: string; count: number }>();
    
    pedidos.forEach(p => {
      const nombreCentro = p.centros_servicio?.nombre || p.incidentes?.centro_servicio || "Sin centro";
      const existing = centroMap.get(nombreCentro);
      if (existing) {
        existing.count++;
      } else {
        centroMap.set(nombreCentro, { nombre: nombreCentro, count: 1 });
      }
    });
    
    return Array.from(centroMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [pedidos]);

  // Filter pedidos
  const pedidosFiltrados = useMemo(() => {
    let result = pedidos;
    
    // Filter by tab
    if (activeTab !== "todos") {
      result = result.filter(p => {
        const centro = p.centros_servicio?.nombre || p.incidentes?.centro_servicio || "";
        return centro === activeTab;
      });
    }
    
    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(p => 
        p.incidentes?.codigo?.toLowerCase().includes(searchLower) ||
        p.incidentes?.codigo_producto?.toLowerCase().includes(searchLower) ||
        p.incidentes?.clientes?.nombre?.toLowerCase().includes(searchLower) ||
        p.solicitado_por?.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [pedidos, activeTab, search]);

  // Split by estado
  const pedidosAprobados = pedidosFiltrados.filter(p => p.estado === "aprobado_jt" || p.estado === "aprobado_sr");
  const pedidosEnProceso = pedidosFiltrados.filter(p => p.estado === "en_proceso");

  // KPIs
  const totalPedidos = pedidos.length;
  const enProceso = pedidos.filter(p => p.estado === "en_proceso").length;
  const hoy = pedidos.filter(p => {
    const created = new Date(p.created_at);
    const today = new Date();
    return created.toDateString() === today.toDateString();
  }).length;

  const handleVerDetalle = (pedido: PedidoBodega) => {
    setSelectedPedido(pedido);
    setDetalleOpen(true);
  };

  const handleDespacharClick = (pedido: PedidoBodega) => {
    setSelectedPedido(pedido);
    setNotasDespacho("");
    setDespacharOpen(true);
  };

  const handleDespachar = async () => {
    if (!selectedPedido) return;
    
    try {
      setDespachando(true);
      
      const { error } = await supabase
        .from("pedidos_bodega_central")
        .update({
          estado: "despachado",
          notas: selectedPedido.notas 
            ? `${selectedPedido.notas}\n---\nDespacho: ${notasDespacho}`
            : `Despacho: ${notasDespacho}`,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedPedido.id);

      if (error) throw error;

      toast.success("Pedido despachado correctamente");
      setDespacharOpen(false);
      fetchPedidos();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al despachar pedido");
    } finally {
      setDespachando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Truck className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Truck className="h-8 w-8 text-primary" />
          Despachos Departamentales
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestión de envíos a centros de servicio
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPedidos}</p>
                <p className="text-xs text-muted-foreground">Total Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{enProceso}</p>
                <p className="text-xs text-muted-foreground">En Proceso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pedidosAprobados.length}</p>
                <p className="text-xs text-muted-foreground">Listos para Despacho</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{hoy}</p>
                <p className="text-xs text-muted-foreground">Ingresados Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por incidente, producto o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs by Centro */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex h-auto p-1 bg-muted/50">
            <TabsTrigger value="todos" className="text-xs px-3 py-1.5">
              Todos ({pedidos.length})
            </TabsTrigger>
            {centrosConPedidos.map(centro => (
              <TabsTrigger 
                key={centro.nombre} 
                value={centro.nombre}
                className="text-xs px-3 py-1.5 whitespace-nowrap"
              >
                {centro.nombre.replace("Centro de Servicio ", "")} ({centro.count})
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        <TabsContent value={activeTab} className="mt-4">
          {pedidosFiltrados.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay pedidos pendientes</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Aprobados Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <h3 className="font-semibold">Aprobados - Listos para Despacho</h3>
                  <Badge variant="secondary">{pedidosAprobados.length}</Badge>
                </div>
                <div className="space-y-3">
                  {pedidosAprobados.map(pedido => (
                    <PedidoCard
                      key={pedido.id}
                      pedido={pedido}
                      onVerDetalle={() => handleVerDetalle(pedido)}
                      onDespachar={() => handleDespacharClick(pedido)}
                    />
                  ))}
                  {pedidosAprobados.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No hay pedidos aprobados
                    </p>
                  )}
                </div>
              </div>

              {/* En Proceso Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <h3 className="font-semibold">En Proceso</h3>
                  <Badge variant="secondary">{pedidosEnProceso.length}</Badge>
                </div>
                <div className="space-y-3">
                  {pedidosEnProceso.map(pedido => (
                    <PedidoCard
                      key={pedido.id}
                      pedido={pedido}
                      onVerDetalle={() => handleVerDetalle(pedido)}
                      onDespachar={() => handleDespacharClick(pedido)}
                    />
                  ))}
                  {pedidosEnProceso.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No hay pedidos en proceso
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detalle Dialog */}
      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalle del Pedido
            </DialogTitle>
            <DialogDescription>
              {selectedPedido?.incidentes?.codigo || selectedPedido?.incidente_id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Centro de Servicio</p>
                  <p className="font-medium">
                    {selectedPedido.centros_servicio?.nombre || selectedPedido.incidentes?.centro_servicio}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Solicitado por</p>
                  <p className="font-medium">{selectedPedido.solicitado_por}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Producto</p>
                  <p className="font-medium">{selectedPedido.incidentes?.codigo_producto}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedPedido.incidentes?.clientes?.nombre || "-"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Repuestos Solicitados</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Array.isArray(selectedPedido.repuestos) ? selectedPedido.repuestos : []).map((rep, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{rep.codigo}</TableCell>
                        <TableCell className="text-xs">{rep.descripcion}</TableCell>
                        <TableCell className="text-right">{rep.cantidad}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {(selectedPedido.fecha_aprobacion_jt || selectedPedido.fecha_aprobacion_sr) && (
                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                  {selectedPedido.fecha_aprobacion_jt && (
                    <p className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Aprobado JT: {new Date(selectedPedido.fecha_aprobacion_jt).toLocaleString()}
                    </p>
                  )}
                  {selectedPedido.fecha_aprobacion_sr && (
                    <p className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Aprobado SR: {new Date(selectedPedido.fecha_aprobacion_sr).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {selectedPedido.notas && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Notas</p>
                  <p className="bg-muted/50 p-2 rounded text-xs">{selectedPedido.notas}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Despachar Dialog */}
      <Dialog open={despacharOpen} onOpenChange={setDespacharOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Confirmar Despacho
            </DialogTitle>
            <DialogDescription>
              {selectedPedido?.incidentes?.codigo} → {selectedPedido?.centros_servicio?.nombre || selectedPedido?.incidentes?.centro_servicio}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPedido && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Repuestos a Despachar</p>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  {(Array.isArray(selectedPedido.repuestos) ? selectedPedido.repuestos : []).map((rep, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{rep.codigo} - {rep.descripcion}</span>
                      <Badge variant="outline">{rep.cantidad}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notas de Despacho (opcional)</label>
                <Textarea
                  placeholder="Ej: Enviado con transportista X, guía #123..."
                  value={notasDespacho}
                  onChange={(e) => setNotasDespacho(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDespacharOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDespachar} disabled={despachando}>
              {despachando ? "Despachando..." : "Confirmar Despacho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
