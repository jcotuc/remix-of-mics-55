import { useState, useEffect, useMemo } from "react";
import { Package, Truck, Search, Clock, CheckCircle, User, ChevronRight, MapPin, Eye, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatFechaRelativa } from "@/utils/dateFormatters";
import { apiBackendAction } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client"; // Hybrid: needed for complex joins and writes

interface Repuesto {
  codigo: string;
  descripcion: string;
  cantidad: number;
}

interface PedidoBodega {
  id: number;
  incidente_id: number;
  centro_servicio_id: number;
  estado: string;
  repuestos: Repuesto[];
  notas: string | null;
  solicitado_por: string;
  aprobado_jefe_taller_id: number | null;
  aprobado_supervisor_id: number | null;
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

function PedidoCard({ 
  pedido, 
  variant,
  onVerDetalle, 
  onDespachar 
}: { 
  pedido: PedidoBodega; 
  variant: 'pending' | 'process' | 'done';
  onVerDetalle: () => void; 
  onDespachar: () => void;
}) {
  const repuestosArray = Array.isArray(pedido.repuestos) ? pedido.repuestos : [];
  const totalRepuestos = repuestosArray.reduce((sum, r) => sum + (r.cantidad || 1), 0);
  
  const variantStyles = {
    pending: "border-blue-300 bg-gradient-to-br from-blue-50/80 to-background dark:from-blue-950/30",
    process: "border-purple-300 bg-gradient-to-br from-purple-50/80 to-background dark:from-purple-950/30",
    done: "border-green-300 bg-gradient-to-br from-green-50/80 to-background dark:from-green-950/30"
  };

  const barColors = {
    pending: "bg-blue-500",
    process: "bg-purple-500",
    done: "bg-green-500"
  };
  
  return (
    <Card className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden ${variantStyles[variant]}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${barColors[variant]}`} />
      <CardContent className="pt-4 pb-3 px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-mono font-bold text-base truncate">
              {pedido.incidentes?.codigo || `INC-${pedido.incidente_id}`}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{pedido.solicitado_por || "Sin asignar"}</span>
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {totalRepuestos} rep
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {(pedido.centros_servicio?.nombre || pedido.incidentes?.centro_servicio || "Sin centro").replace("Centro de Servicio ", "")}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-3 pt-2 border-t">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatFechaRelativa(pedido.created_at)}
          </span>
          {variant === 'pending' && (
            <span className="flex items-center gap-0.5 font-medium text-blue-600" onClick={(e) => { e.stopPropagation(); onDespachar(); }}>
              Despachar
              <ChevronRight className="h-3 w-3" />
            </span>
          )}
          {variant === 'process' && (
            <span className="flex items-center gap-0.5 font-medium text-purple-600" onClick={(e) => { e.stopPropagation(); onVerDetalle(); }}>
              Ver detalle
              <ChevronRight className="h-3 w-3" />
            </span>
          )}
          {variant === 'done' && (
            <span className="flex items-center gap-0.5 font-medium text-green-600" onClick={(e) => { e.stopPropagation(); onVerDetalle(); }}>
              Ver
              <ChevronRight className="h-3 w-3" />
            </span>
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
      // Usar casting para estados que no están en el enum de TypeScript
      const { data, error } = await (supabase as any)
        .from("pedidos_bodega_central")
        .select(`
          *,
          incidentes(codigo),
          centros_de_servicio(nombre)
        `)
        .in("estado", ["APROBADO_JEFE_TALLER", "APROBADO_SUPERVISOR", "ENVIADO", "RECIBIDO"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out Zona 5
      const filtered = (data || []).filter((p: any) => {
        const centro = (p.centros_de_servicio?.nombre || "").toLowerCase();
        return !centro.includes("zona 5");
      });

      // Parse repuestos JSON and normalize estructura
      const parsed = filtered.map((p: any) => ({
        ...p,
        centros_servicio: p.centros_de_servicio,
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

  // Get unique centers with counts (only for non-despachados)
  const centrosConPedidos = useMemo(() => {
    const pedidosPendientes = pedidos.filter(p => p.estado !== "despachado");
    const centroMap = new Map<string, { nombre: string; count: number }>();
    
    pedidosPendientes.forEach(p => {
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

  // Split by estado - usar los estados correctos del enum
  const pendientes = pedidosFiltrados.filter(p => p.estado === "APROBADO_JEFE_TALLER" || p.estado === "APROBADO_SUPERVISOR");
  const enProceso = pedidosFiltrados.filter(p => p.estado === "ENVIADO");
  const despachados = pedidosFiltrados.filter(p => p.estado === "RECIBIDO");

  // KPIs (global counts)
  const totalPendientes = pedidos.filter(p => p.estado === "APROBADO_JEFE_TALLER" || p.estado === "APROBADO_SUPERVISOR").length;
  const totalEnProceso = pedidos.filter(p => p.estado === "ENVIADO").length;
  const totalDespachados = pedidos.filter(p => p.estado === "RECIBIDO").length;

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
      
      // Usar casting para estado que puede no coincidir con enum
      const { error } = await (supabase as any)
        .from("pedidos_bodega_central")
        .update({
          estado: "ENVIADO",
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
    <div className="container mx-auto py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-7 w-7 text-primary" />
            Despachos Departamentales
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestión de envíos a centros de servicio
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-sm">
            <Clock className="h-4 w-4" />
            <span className="font-semibold">{totalPendientes}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-sm">
            <Package className="h-4 w-4" />
            <span className="font-semibold">{totalEnProceso}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span className="font-semibold">{totalDespachados}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
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
              Todos ({pedidos.filter(p => p.estado !== "despachado").length})
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
          {/* 3 Column Layout */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Pendientes (Aprobados) */}
            <Card className="border-blue-200 dark:border-blue-900">
              <CardHeader className="py-3 px-4 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Clock className="h-4 w-4" />
                  Pendientes
                  <Badge className="ml-auto bg-blue-500 text-white">
                    {pendientes.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
                  {pendientes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Package className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm">Sin pedidos pendientes</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-2">
                      {pendientes.map((pedido) => (
                        <PedidoCard
                          key={pedido.id}
                          pedido={pedido}
                          variant="pending"
                          onVerDetalle={() => handleVerDetalle(pedido)}
                          onDespachar={() => handleDespacharClick(pedido)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* En Proceso */}
            <Card className="border-purple-200 dark:border-purple-900">
              <CardHeader className="py-3 px-4 bg-purple-50 dark:bg-purple-950/30 border-b border-purple-200 dark:border-purple-900">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <Package className="h-4 w-4" />
                  En Proceso
                  <Badge className="ml-auto bg-purple-500 text-white">
                    {enProceso.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
                  {enProceso.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Package className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm">Sin pedidos en proceso</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-2">
                      {enProceso.map((pedido) => (
                        <PedidoCard
                          key={pedido.id}
                          pedido={pedido}
                          variant="process"
                          onVerDetalle={() => handleVerDetalle(pedido)}
                          onDespachar={() => handleDespacharClick(pedido)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Despachados */}
            <Card className="border-green-200 dark:border-green-900">
              <CardHeader className="py-3 px-4 bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-900">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-4 w-4" />
                  Despachados
                  <Badge className="ml-auto bg-green-500 text-white">
                    {despachados.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px]">
                  {despachados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Package className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm">Sin despachos recientes</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {despachados.slice(0, 50).map((pedido) => (
                        <div 
                          key={pedido.id}
                          onClick={() => handleVerDetalle(pedido)}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-mono font-medium text-sm truncate">
                              {pedido.incidentes?.codigo || `INC-${pedido.incidente_id}`}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {(pedido.centros_servicio?.nombre || pedido.incidentes?.centro_servicio || "").replace("Centro de Servicio ", "")}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">
                              Despachado
                            </Badge>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
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
              {selectedPedido?.incidentes?.codigo || `INC-${selectedPedido?.incidente_id}`}
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
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Aprobado JT: {new Date(selectedPedido.fecha_aprobacion_jt).toLocaleString()}
                    </p>
                  )}
                  {selectedPedido.fecha_aprobacion_sr && (
                    <p className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Aprobado SR: {new Date(selectedPedido.fecha_aprobacion_sr).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {selectedPedido.notas && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Notas</p>
                  <p className="bg-muted/50 p-2 rounded text-xs whitespace-pre-wrap">{selectedPedido.notas}</p>
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
              {selectedPedido?.incidentes?.codigo} → {(selectedPedido?.centros_servicio?.nombre || selectedPedido?.incidentes?.centro_servicio || "").replace("Centro de Servicio ", "")}
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
