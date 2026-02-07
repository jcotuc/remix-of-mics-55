import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Package, User, Clock, Wrench, AlertTriangle, CheckCircle, Box, Truck, Plus,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { mycsapi } from "@/mics-api";

interface RepuestoSolicitado {
  codigo: string;
  cantidad: number;
  descripcion?: string;
}

interface SolicitudRepuesto {
  id: number;
  estado: string;
  repuestos: RepuestoSolicitado[];
  created_at: string;
}

interface InventarioItem {
  codigo_repuesto: string;
  cantidad: number;
  descripcion: string | null;
  ubicacion_legacy: string;
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
  const [pedidoBodega, setPedidoBodega] = useState<any>(null);

  const [showPedidoDialog, setShowPedidoDialog] = useState(false);
  const [pedidoNotas, setPedidoNotas] = useState("");
  const [isCreatingPedido, setIsCreatingPedido] = useState(false);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const numericId = Number(id);
      if (isNaN(numericId)) {
        toast.error("ID de incidente inválido");
        navigate("/taller/pendientes-repuestos");
        return;
      }

      // Fetch incidente with API
      const incidenteData = await mycsapi.get("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: numericId } }) as any;
      
      if (!incidenteData) {
        toast.error("Incidente no encontrado");
        navigate("/taller/pendientes-repuestos");
        return;
      }

      setIncidente(incidenteData);
      setCliente(incidenteData.cliente);
      setProducto(incidenteData.producto);

      // Fetch solicitudes de repuestos
      const solicitudesRes = await mycsapi.fetch("/api/v1/solicitudes-repuestos", { method: "GET", query: { limit: 100 } }) as any;
      const solicitudesData = ((solicitudesRes as any).data || (solicitudesRes as any).results || [])
        .filter((s: any) => s.incidente_id === numericId);

      const solicitudesFormateadas: SolicitudRepuesto[] = solicitudesData.map((sol: any) => ({
        id: sol.id,
        estado: sol.estado || "",
        repuestos: Array.isArray(sol.repuestos) ? sol.repuestos : [],
        created_at: sol.created_at || "",
      }));
      setSolicitudes(solicitudesFormateadas);

      // Fetch pedido a bodega central
      const pedidosRes = await mycsapi.fetch("/api/v1/pedidos-bodega-central", { method: "GET", query: { limit: 500 } }) as any;
      const pedidosData = ((pedidosRes as any).data || (pedidosRes as any).results || [])
        .filter((p: any) => p.incidente_id === numericId);
      if (pedidosData?.[0]) setPedidoBodega(pedidosData[0]);

      // Fetch técnico asignado
      if ((incidenteData as any).propietario_id) {
        const tecnicoData = await mycsapi.fetch("/api/v1/usuarios/{usuario_id}".replace("{usuario_id}", String((incidenteData as any).propietario_id)), { method: "GET" }) as any;
        if (tecnicoData) setTecnico(tecnicoData);
      }

      // Fetch inventario del centro de servicio
      const inventarioRes = await mycsapi.get("/api/v1/inventario", { query: { 
        centro_servicio_id: incidenteData.centro_de_servicio_id 
      } }) as any;
      const inventarioData = (inventarioRes as any).data || (inventarioRes as any).results || [];
      setInventario(inventarioData);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleCrearPedido = async () => {
    if (!incidente || !user) return;

    setIsCreatingPedido(true);
    try {
      const { results: usuarios } = await mycsapi.get("/api/v1/usuarios/") as any;
      const userData = (usuarios || []).find((u: any) => u.email === user.email);

      if (!userData) {
        toast.error("No se encontró el usuario");
        return;
      }

      await mycsapi.fetch("/api/v1/pedidos-bodega-central", { method: "POST", body: {
        incidente_id: incidente.id,
        centro_servicio_id: incidente.centro_de_servicio_id,
        estado: "PENDIENTE",
        solicitado_por_id: userData.id,
      } }) as any;

      toast.success("Pedido a bodega central creado");
      setShowPedidoDialog(false);
      fetchData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al crear pedido");
    } finally {
      setIsCreatingPedido(false);
    }
  };

  const getDiasEspera = () => {
    if (!incidente?.updated_at) return 0;
    return differenceInDays(new Date(), new Date(incidente.updated_at));
  };

  const getStockDisponible = (codigo: string) => {
    const item = inventario.find((i) => i.codigo_repuesto === codigo);
    return item?.cantidad || 0;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><Skeleton className="h-96" /></div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!incidente) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Incidente no encontrado
          </CardContent>
        </Card>
      </div>
    );
  }

  const diasEspera = getDiasEspera();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Incidente {incidente.codigo}</h1>
          <p className="text-muted-foreground">Pendiente por repuestos • {diasEspera} días en espera</p>
        </div>
        <Badge variant={diasEspera > 7 ? "destructive" : diasEspera > 3 ? "secondary" : "default"}>
          {diasEspera > 7 ? "Urgente" : diasEspera > 3 ? "En espera" : "Reciente"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Repuestos Solicitados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {solicitudes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No hay solicitudes de repuestos</p>
              ) : (
                <div className="space-y-4">
                  {solicitudes.map((sol) => (
                    <div key={sol.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="secondary">{sol.estado}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(sol.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                        </span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right">Cant.</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sol.repuestos.map((rep, idx) => {
                            const stock = getStockDisponible(rep.codigo);
                            const disponible = stock >= rep.cantidad;
                            return (
                              <TableRow key={idx}>
                                <TableCell className="font-mono text-sm">{rep.codigo}</TableCell>
                                <TableCell>{rep.descripcion || "-"}</TableCell>
                                <TableCell className="text-right">{rep.cantidad}</TableCell>
                                <TableCell className="text-right">{stock}</TableCell>
                                <TableCell className="text-center">
                                  {disponible ? (
                                    <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto" />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {pedidoBodega ? (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Truck className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Pedido a Bodega Central</p>
                    <p className="text-sm text-muted-foreground">Estado: {pedidoBodega.estado}</p>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowPedidoDialog(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Pedido a Bodega Central
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{cliente?.nombre || "N/A"}</p>
              <p className="text-muted-foreground">{cliente?.celular || cliente?.telefono_principal || "Sin teléfono"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Box className="h-4 w-4" />Producto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-mono">{producto?.codigo || "N/A"}</p>
              <p className="text-muted-foreground">{producto?.descripcion || "Sin descripción"}</p>
            </CardContent>
          </Card>

          {tecnico && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" />Técnico Asignado</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-medium">{tecnico.nombre} {tecnico.apellido}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" />Tiempos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ingreso:</span>
                <span>{incidente.fecha_ingreso ? format(new Date(incidente.fecha_ingreso), "dd/MM/yyyy", { locale: es }) : "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">En espera:</span>
                <span className={diasEspera > 7 ? "text-destructive font-medium" : ""}>{diasEspera} días</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showPedidoDialog} onOpenChange={setShowPedidoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Pedido a Bodega Central</DialogTitle>
            <DialogDescription>Se creará una solicitud de repuestos a la bodega central para este incidente.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea placeholder="Notas adicionales (opcional)" value={pedidoNotas} onChange={(e) => setPedidoNotas(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPedidoDialog(false)}>Cancelar</Button>
            <Button onClick={handleCrearPedido} disabled={isCreatingPedido}>
              {isCreatingPedido ? "Creando..." : "Crear Pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
