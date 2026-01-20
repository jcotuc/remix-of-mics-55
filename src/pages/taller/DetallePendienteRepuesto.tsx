import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared";
import {
  ArrowLeft,
  Package,
  User,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Search,
  Box,
  Truck,
  Plus,
  ShoppingCart,
  RefreshCw,
  FileText,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface RepuestoSolicitado {
  codigo: string;
  codigo_repuesto?: string;
  cantidad: number;
  descripcion?: string;
}

interface SolicitudRepuesto {
  id: string;
  estado: string;
  repuestos: RepuestoSolicitado[];
  created_at: string;
  tipo_resolucion?: string;
  presupuesto_aprobado?: boolean;
  notas?: string;
}

interface InventarioItem {
  codigo_repuesto: string;
  cantidad: number;
  descripcion: string | null;
  ubicacion_legacy: string;
}

interface DespieceDisponible {
  id: string;
  sku_maquina: string;
  descripcion: string;
  codigo_producto: string;
  estado: string;
  repuestos_disponibles: {
    codigo: string;
    descripcion: string;
    cantidadDisponible: number;
  }[];
}

export default function DetallePendienteRepuesto() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [incidente, setIncidente] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [producto, setProducto] = useState<any>(null);
  const [tecnico, setTecnico] = useState<any>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudRepuesto[]>([]);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [despieces, setDespieces] = useState<DespieceDisponible[]>([]);
  const [pedidoBodega, setPedidoBodega] = useState<any>(null);

  // Estados para diálogos
  const [showPedidoDialog, setShowPedidoDialog] = useState(false);
  const [showAutoconsumoDialog, setShowAutoconsumoDialog] = useState(false);
  const [pedidoNotas, setPedidoNotas] = useState("");
  const [isCreatingPedido, setIsCreatingPedido] = useState(false);
  const [selectedDespiece, setSelectedDespiece] = useState<string>("");
  const [selectedRepuestoDespiece, setSelectedRepuestoDespiece] = useState<string>("");
  const [searchDespiece, setSearchDespiece] = useState("");

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch incidente
      const { data: incidenteData, error: incidenteError } = await supabase
        .from("incidentes")
        .select("*")
        .eq("id", id)
        .single();

      if (incidenteError || !incidenteData) {
        toast.error("Incidente no encontrado");
        navigate("/taller/pendientes-repuestos");
        return;
      }

      setIncidente(incidenteData);

      // Fetch relacionados en paralelo
      const [clienteRes, productoRes, solicitudesRes, pedidoRes] = await Promise.all([
        supabase.from("clientes").select("*").eq("codigo", incidenteData.codigo_cliente).single(),
        supabase.from("productos").select("*").eq("codigo", incidenteData.codigo_producto).single(),
        supabase.from("solicitudes_repuestos").select("*").eq("incidente_id", id).order("created_at", { ascending: false }),
        supabase.from("pedidos_bodega_central").select("*").eq("incidente_id", id).maybeSingle(),
      ]);

      if (clienteRes.data) setCliente(clienteRes.data);
      if (productoRes.data) setProducto(productoRes.data);
      if (pedidoRes.data) setPedidoBodega(pedidoRes.data);

      // Procesar solicitudes
      const solicitudesFormateadas: SolicitudRepuesto[] = (solicitudesRes.data || []).map((sol) => ({
        id: sol.id,
        estado: sol.estado || "",
        repuestos: Array.isArray(sol.repuestos) 
          ? (sol.repuestos as unknown as RepuestoSolicitado[]) 
          : [],
        created_at: sol.created_at || "",
        tipo_resolucion: sol.tipo_resolucion || undefined,
        presupuesto_aprobado: sol.presupuesto_aprobado || undefined,
        notas: sol.notas || undefined,
      }));
      setSolicitudes(solicitudesFormateadas);

      // Fetch técnico si está asignado
      if (incidenteData.tecnico_asignado_id) {
        const { data: tecnicoData } = await supabase
          .from("profiles")
          .select("nombre, apellido, codigo_empleado")
          .eq("user_id", incidenteData.tecnico_asignado_id)
          .single();
        if (tecnicoData) setTecnico(tecnicoData);
      }

      // Obtener códigos de repuestos solicitados
      const codigosRepuestos = solicitudesFormateadas.flatMap((sol) =>
        sol.repuestos.map((r) => r.codigo || r.codigo_repuesto)
      ).filter(Boolean) as string[];

      // Fetch inventario para esos repuestos
      if (codigosRepuestos.length > 0) {
        const { data: inventarioData } = await supabase
          .from("inventario")
          .select("codigo_repuesto, cantidad, descripcion, ubicacion_legacy")
          .in("codigo_repuesto", codigosRepuestos);
        setInventario(inventarioData || []);
      }

      // Fetch despieces disponibles
      const { data: despiecesData } = await supabase
        .from("despieces")
        .select("*")
        .in("estado", ["disponible", "en_uso"])
        .order("fecha_ingreso", { ascending: false });

      if (despiecesData) {
        const despiecesFormateados = despiecesData.map((d) => ({
          id: d.id,
          sku_maquina: d.sku_maquina,
          descripcion: d.descripcion,
          codigo_producto: d.codigo_producto,
          estado: d.estado,
          repuestos_disponibles: (d.repuestos_disponibles as any) || [],
        }));
        setDespieces(despiecesFormateados);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const getStockForRepuesto = (codigo: string): number => {
    const item = inventario.find((i) => i.codigo_repuesto === codigo);
    return item?.cantidad || 0;
  };

  const getUbicacionForRepuesto = (codigo: string): string => {
    const item = inventario.find((i) => i.codigo_repuesto === codigo);
    return item?.ubicacion_legacy || "-";
  };

  const getDaysWaiting = () => {
    if (!incidente) return 0;
    return differenceInDays(new Date(), new Date(incidente.updated_at));
  };

  const allRepuestos = solicitudes.flatMap((sol) =>
    sol.repuestos.map((r) => ({
      ...r,
      codigo: r.codigo || r.codigo_repuesto || "",
      solicitudId: sol.id,
      solicitudEstado: sol.estado,
      tipoResolucion: sol.tipo_resolucion,
    }))
  );

  const handleCrearPedido = async () => {
    if (!incidente || !user) return;

    setIsCreatingPedido(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("centro_servicio_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.centro_servicio_id) {
        toast.error("No se encontró tu centro de servicio asignado");
        return;
      }

      const repuestos = allRepuestos.map((rep) => ({
        codigo: rep.codigo,
        cantidad: rep.cantidad,
        descripcion: rep.descripcion || "",
      }));

      const { error } = await supabase.from("pedidos_bodega_central").insert({
        incidente_id: incidente.id,
        centro_servicio_id: profile.centro_servicio_id,
        solicitado_por: user.id,
        repuestos: repuestos,
        notas: pedidoNotas,
        estado: "pendiente",
      });

      if (error) throw error;

      toast.success("Pedido a Bodega Central creado exitosamente");
      setShowPedidoDialog(false);
      setPedidoNotas("");
      fetchData();
    } catch (error: any) {
      console.error("Error creating pedido:", error);
      toast.error(error.message || "Error al crear el pedido");
    } finally {
      setIsCreatingPedido(false);
    }
  };

  const handleUsarRepuestoDespiece = async () => {
    if (!selectedDespiece || !selectedRepuestoDespiece || !user) return;

    try {
      const despiece = despieces.find((d) => d.id === selectedDespiece);
      if (!despiece) return;

      const repuesto = despiece.repuestos_disponibles.find(
        (r) => r.codigo === selectedRepuestoDespiece
      );
      if (!repuesto || repuesto.cantidadDisponible <= 0) {
        toast.error("Repuesto no disponible");
        return;
      }

      // Actualizar despiece
      const updatedRepuestos = despiece.repuestos_disponibles.map((r) => {
        if (r.codigo === selectedRepuestoDespiece) {
          return { ...r, cantidadDisponible: r.cantidadDisponible - 1 };
        }
        return r;
      });

      const todosAgotados = updatedRepuestos.every((r) => r.cantidadDisponible === 0);
      const nuevoEstado = todosAgotados ? "agotado" : "en_uso";

      const { error: despieceError } = await supabase
        .from("despieces")
        .update({
          repuestos_disponibles: updatedRepuestos as any,
          estado: nuevoEstado,
        })
        .eq("id", despiece.id);

      if (despieceError) throw despieceError;

      // Registrar movimiento
      const { error: movimientoError } = await supabase
        .from("movimientos_inventario")
        .insert({
          codigo_repuesto: selectedRepuestoDespiece,
          tipo_movimiento: "salida",
          cantidad: 1,
          ubicacion: `DESPIECE-${despiece.sku_maquina}`,
          referencia: incidente.codigo,
          motivo: `Autoconsumo de despiece para incidente ${incidente.codigo}`,
          created_by: user.id,
        });

      if (movimientoError) {
        console.error("Error registrando movimiento:", movimientoError);
      }

      toast.success(`Repuesto ${selectedRepuestoDespiece} asignado desde despiece`);
      setShowAutoconsumoDialog(false);
      setSelectedDespiece("");
      setSelectedRepuestoDespiece("");
      fetchData();
    } catch (error) {
      console.error("Error usando repuesto de despiece:", error);
      toast.error("Error al usar repuesto");
    }
  };

  // Filtrar despieces que tienen los repuestos que necesitamos
  const despiecesConRepuestosNecesarios = despieces.filter((d) => {
    if (searchDespiece && !d.sku_maquina.toLowerCase().includes(searchDespiece.toLowerCase()) && 
        !d.descripcion.toLowerCase().includes(searchDespiece.toLowerCase())) {
      return false;
    }
    return d.repuestos_disponibles.some((r) =>
      allRepuestos.some((ar) => ar.codigo === r.codigo && r.cantidadDisponible > 0)
    );
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!incidente) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Incidente no encontrado</h2>
            <Button onClick={() => navigate("/taller/pendientes-repuestos")}>Volver</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const days = getDaysWaiting();

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/taller/pendientes-repuestos")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{incidente.codigo}</h1>
              <StatusBadge status={incidente.status} />
              <Badge variant={days >= 8 ? "destructive" : days > 5 ? "secondary" : "outline"}>
                {days} días esperando
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Ingresado: {format(new Date(incidente.fecha_ingreso), "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Producto */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  {producto?.url_foto ? (
                    <img src={producto.url_foto} alt={producto.descripcion} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Box className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{producto?.descripcion || incidente.codigo_producto}</h3>
                  <p className="text-sm text-muted-foreground">SKU: {incidente.codigo_producto}</p>
                  {incidente.sku_maquina && (
                    <p className="text-sm text-muted-foreground">SKU Máquina: {incidente.sku_maquina}</p>
                  )}
                  <p className="text-sm mt-2">{incidente.descripcion_problema}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Repuestos Solicitados */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Repuestos Solicitados
                  </CardTitle>
                  <CardDescription>
                    {allRepuestos.length} repuesto(s) en {solicitudes.length} solicitud(es)
                  </CardDescription>
                </div>
                {solicitudes.some((s) => s.tipo_resolucion === "Presupuesto") && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                    <FileText className="w-3 h-3 mr-1" />
                    Presupuesto
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRepuestos.map((rep, idx) => {
                    const stock = getStockForRepuesto(rep.codigo);
                    const ubicacion = getUbicacionForRepuesto(rep.codigo);
                    const suficiente = stock >= rep.cantidad;

                    return (
                      <TableRow key={`${rep.solicitudId}-${idx}`}>
                        <TableCell className="font-mono text-sm">{rep.codigo}</TableCell>
                        <TableCell>{rep.descripcion || "-"}</TableCell>
                        <TableCell className="text-center font-medium">{rep.cantidad}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={suficiente ? "default" : "destructive"}>
                            {stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{ubicacion}</TableCell>
                        <TableCell>
                          {suficiente ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle className="w-3 h-3" />
                              Disponible
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600 text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              Sin stock
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {allRepuestos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No hay repuestos solicitados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Notas de solicitud */}
              {solicitudes.some((s) => s.notas) && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Notas:</p>
                  {solicitudes.filter((s) => s.notas).map((s) => (
                    <p key={s.id} className="text-sm text-muted-foreground">{s.notas}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Despieces disponibles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Autoconsumo de Despieces
              </CardTitle>
              <CardDescription>
                Máquinas disponibles para despiezar y obtener repuestos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar despiece por SKU o descripción..."
                  value={searchDespiece}
                  onChange={(e) => setSearchDespiece(e.target.value)}
                  className="pl-10"
                />
              </div>

              {despiecesConRepuestosNecesarios.length > 0 ? (
                <div className="space-y-3">
                  {despiecesConRepuestosNecesarios.slice(0, 5).map((despiece) => {
                    const repuestosCoincidentes = despiece.repuestos_disponibles.filter((r) =>
                      allRepuestos.some((ar) => ar.codigo === r.codigo && r.cantidadDisponible > 0)
                    );

                    return (
                      <div
                        key={despiece.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">{despiece.descripcion}</p>
                            <p className="text-xs text-muted-foreground font-mono">{despiece.sku_maquina}</p>
                          </div>
                          <Badge variant={despiece.estado === "disponible" ? "default" : "secondary"}>
                            {despiece.estado}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {repuestosCoincidentes.map((r) => (
                            <Badge
                              key={r.codigo}
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-300 cursor-pointer hover:bg-green-100"
                              onClick={() => {
                                setSelectedDespiece(despiece.id);
                                setSelectedRepuestoDespiece(r.codigo);
                                setShowAutoconsumoDialog(true);
                              }}
                            >
                              {r.codigo} (x{r.cantidadDisponible})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No hay despieces disponibles con los repuestos necesarios</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => navigate("/bodega/despieces")}
                  >
                    Ir a gestión de despieces
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cliente */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-primary mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium">Cliente</h4>
                  <p className="text-sm">{cliente?.nombre || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">{incidente.codigo_cliente}</p>
                  {cliente?.celular && (
                    <p className="text-xs text-muted-foreground mt-1">{cliente.celular}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Técnico */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Wrench className="w-5 h-5 text-primary mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium">Técnico Asignado</h4>
                  {tecnico ? (
                    <>
                      <p className="text-sm">{tecnico.nombre} {tecnico.apellido}</p>
                      {tecnico.codigo_empleado && (
                        <p className="text-xs text-muted-foreground">{tecnico.codigo_empleado}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin asignar</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tiempos */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-1" />
                <div className="flex-1 space-y-2">
                  <div>
                    <h4 className="font-medium">Tiempo en estado</h4>
                    <p className={`text-sm ${days >= 8 ? "text-red-600 font-medium" : days > 5 ? "text-orange-600" : ""}`}>
                      {days} días
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted-foreground">Última actualización</h4>
                    <p className="text-sm">
                      {format(new Date(incidente.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!pedidoBodega ? (
                <Button className="w-full" onClick={() => setShowPedidoDialog(true)}>
                  <Truck className="h-4 w-4 mr-2" />
                  Crear Pedido a Bodega Central
                </Button>
              ) : (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Pedido creado
                  </p>
                  <Badge variant="outline" className="mt-1">{pedidoBodega.estado}</Badge>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1 p-0"
                    onClick={() => navigate("/taller/pedidos-bodega")}
                  >
                    Ver pedidos
                  </Button>
                </div>
              )}

              {despiecesConRepuestosNecesarios.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAutoconsumoDialog(true)}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Usar de Despiece
                </Button>
              )}

              {days >= 8 && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={async () => {
                    try {
                      await supabase
                        .from("incidentes")
                        .update({ status: "Cambio por garantia" })
                        .eq("id", incidente.id);
                      toast.success("Convertido a Cambio por Garantía");
                      navigate("/taller/pendientes-repuestos");
                    } catch (e) {
                      toast.error("Error al convertir");
                    }
                  }}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Convertir a CXG
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog: Crear Pedido */}
      <Dialog open={showPedidoDialog} onOpenChange={setShowPedidoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Pedido a Bodega Central</DialogTitle>
            <DialogDescription>
              Solicitar repuestos para el incidente {incidente.codigo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg max-h-48 overflow-y-auto">
              <p className="text-sm font-medium mb-2">Repuestos a solicitar:</p>
              {allRepuestos.map((rep, idx) => (
                <p key={idx} className="text-sm flex justify-between">
                  <span>{rep.codigo}</span>
                  <span className="text-muted-foreground">x{rep.cantidad}</span>
                </p>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium">Notas adicionales</label>
              <Textarea
                placeholder="Agregar observaciones o urgencia..."
                value={pedidoNotas}
                onChange={(e) => setPedidoNotas(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPedidoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearPedido} disabled={isCreatingPedido}>
              {isCreatingPedido ? "Creando..." : "Crear Pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Autoconsumo */}
      <Dialog open={showAutoconsumoDialog} onOpenChange={setShowAutoconsumoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Usar Repuesto de Despiece</DialogTitle>
            <DialogDescription>
              Seleccione el despiece y repuesto a usar para este incidente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Despiece</label>
              <Select value={selectedDespiece} onValueChange={setSelectedDespiece}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar despiece" />
                </SelectTrigger>
                <SelectContent>
                  {despiecesConRepuestosNecesarios.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.descripcion} ({d.sku_maquina})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDespiece && (
              <div>
                <label className="text-sm font-medium">Repuesto</label>
                <Select value={selectedRepuestoDespiece} onValueChange={setSelectedRepuestoDespiece}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar repuesto" />
                  </SelectTrigger>
                  <SelectContent>
                    {despieces
                      .find((d) => d.id === selectedDespiece)
                      ?.repuestos_disponibles.filter((r) =>
                        allRepuestos.some((ar) => ar.codigo === r.codigo) && r.cantidadDisponible > 0
                      )
                      .map((r) => (
                        <SelectItem key={r.codigo} value={r.codigo}>
                          {r.codigo} - {r.descripcion} (Disp: {r.cantidadDisponible})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoconsumoDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUsarRepuestoDespiece}
              disabled={!selectedDespiece || !selectedRepuestoDespiece}
            >
              Usar Repuesto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
