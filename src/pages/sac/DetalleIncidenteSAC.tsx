import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MessageCircle, 
  Package, 
  User, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Send,
  DollarSign,
  MapPin,
  Wrench,
  Share2,
  Printer,
  Camera,
  Truck,
  ExternalLink,
  Eye
} from "lucide-react";
import { SACIncidentePrintSheet } from "@/components/features/sac";
import type { SACPrintData } from "@/components/features/sac";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared";
import { differenceInDays } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { mycsapi } from "@/mics-api";

type IncidenteDB = Database["public"]["Tables"]["incidentes"]["Row"];
type ClienteDB = Database["public"]["Tables"]["clientes"]["Row"];
type ProductoDB = Database["public"]["Tables"]["productos"]["Row"];
type DiagnosticoDB = Database["public"]["Tables"]["diagnosticos"]["Row"];
type UsuarioDB = Database["public"]["Tables"]["usuarios"]["Row"];

interface NotificacionHistorial {
  id: number;
  canal: string;
  mensaje: string;
  fecha: string;
  usuario: string;
}

interface RepuestoSolicitud {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

interface ProductoAlternativo {
  id: number;
  codigo: string;
  descripcion: string;
  precio: number;
}

export default function DetalleIncidenteSAC() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [incidente, setIncidente] = useState<IncidenteDB | null>(null);
  const [cliente, setCliente] = useState<ClienteDB | null>(null);
  const [producto, setProducto] = useState<ProductoDB | null>(null);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoDB | null>(null);
  const [tecnico, setTecnico] = useState<UsuarioDB | null>(null);
  const [asignacion, setAsignacion] = useState<any>(null);
  const [fallas, setFallas] = useState<string[]>([]);
  const [causas, setCausas] = useState<string[]>([]);
  const [repuestos, setRepuestos] = useState<RepuestoSolicitud[]>([]);
  const [accesorios, setAccesorios] = useState<string[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);
  const [guia, setGuia] = useState<any>(null);
  const [productoAlternativo, setProductoAlternativo] = useState<ProductoAlternativo | null>(null);
  const [centroServicio, setCentroServicio] = useState<string>("");
  
  // Estado para notificaciones
  const [canal, setCanal] = useState<string>("whatsapp");
  const [mensaje, setMensaje] = useState<string>("");
  const [notasInternas, setNotasInternas] = useState<string>("");
  const [enviandoNotificacion, setEnviandoNotificacion] = useState(false);
  const [notificaciones, setNotificaciones] = useState<NotificacionHistorial[]>([]);
  const [processingDecision, setProcessingDecision] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const MAX_NOTIFICACIONES = 3;

  useEffect(() => {
    fetchData();
    assignIncident();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const assignIncident = async () => {
    try {
      const { user } = await mycsapi.get("/api/v1/auth/me") as any;
      if (!user) return;

      const userProfile = await mycsapi.fetch("/api/v1/usuarios/by-email", { method: "GET", query: { email: user.email || "" } }) as any;
      if (!userProfile) return;

      const { results: existingAssignments } = await mycsapi.fetch("/api/v1/asignaciones-sac", { method: "GET", query: { 
        incidente_id: Number(id),
        activo: true 
      } }) as any;

      const existingAssignment = existingAssignments?.[0] as any;

      if (existingAssignment) {
        if (existingAssignment.user_id !== (userProfile as any).id) {
          toast.error("Este incidente está siendo atendido por otro agente");
          navigate("/sac/incidentes");
          return;
        }
        setAsignacion(existingAssignment);
      } else {
        const newAssignment = await mycsapi.fetch("/api/v1/asignaciones-sac", { method: "POST", body: {
          incidente_id: Number(id),
          user_id: (userProfile as any).id,
          activo: true
        } }) as any;
        setAsignacion(newAssignment);
        toast.success("Incidente asignado exitosamente");
      }
    } catch (error: any) {
      console.error("Error assigning incident:", error);
      toast.error("Error al asignar el incidente");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const incidenteResult = await mycsapi.get("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: Number(id) } }) as any;
      const incData = incidenteResult.result;
      
      if (!incData) {
        toast.error("Incidente no encontrado");
        return;
      }
      
      const incidenteData = {
        id: incData.id,
        codigo: incData.codigo,
        estado: incData.estado,
        descripcion_problema: incData.descripcion_problema || null,
        observaciones: incData.observaciones || null,
        created_at: incData.created_at || new Date().toISOString(),
        updated_at: incData.updated_at || null,
        cliente_id: incData.cliente?.id || 0,
        producto_id: incData.producto?.id || null,
        centro_de_servicio_id: incData.centro_de_servicio_id || 0,
        fecha_ingreso: incData.created_at || null,
        quiere_envio: incData.quiere_envio || null,
        tipologia: incData.tipologia || null,
        aplica_garantia: incData.aplica_garantia || false,
        deleted_at: null,
        direccion_entrega_id: null,
        empresa_id: null,
        fecha_promesa_entrega: null,
        numero_serie: null,
        presupuesto_aprobado: null,
        sku_maquina: incData.producto?.codigo || null,
        fecha_entrega: null,
        incidente_origen_id: null,
        propietario_id: null,
        tipo_resolucion: (incData as any).tipo_resolucion || null,
        tracking_token: null,
      } as unknown as IncidenteDB;
      
      setIncidente(incidenteData);

      if (incData.cliente) {
        setCliente(incData.cliente as unknown as ClienteDB);
      }

      if (incData.producto) {
        setProducto(incData.producto as unknown as ProductoDB);
      }

      // Fetch diagnosis
      const diagnosticoResult = await mycsapi.fetch("/api/v1/diagnosticos/search", { method: "GET", query: { incidente_id: Number(id) } }) as any;
      const diagnosticoData = diagnosticoResult.results?.[0] || null;
      setDiagnostico(diagnosticoData as unknown as DiagnosticoDB | null);

      if (diagnosticoData?.tecnico) {
        setTecnico(diagnosticoData.tecnico as unknown as UsuarioDB);
      }

      // Fetch fallas, causas and repuestos if diagnostico exists
      if (diagnosticoData) {
        const [fallasRes, causasRes, repuestosRes] = await Promise.all([
          mycsapi.fetch("/api/v1/diagnostico-fallas", { method: "GET", query: { diagnostico_id: diagnosticoData.id } }),
          mycsapi.fetch("/api/v1/diagnostico-causas", { method: "GET", query: { diagnostico_id: diagnosticoData.id } }),
          mycsapi.fetch("/api/v1/solicitudes-repuestos/search", { method: "GET", query: { incidente_id: Number(id) } }),
        ]);

        setFallas(((fallasRes as any).results || []).map((f: any) => f.fallas?.nombre).filter(Boolean));
        setCausas(((causasRes as any).results || []).map((c: any) => c.causas?.nombre).filter(Boolean));
        setRepuestos(((repuestosRes as any).results || []).map((r: any) => ({
          codigo: r.repuestos?.codigo || r.codigo_repuesto,
          descripcion: r.repuestos?.descripcion || "Repuesto",
          cantidad: r.cantidad || 1,
          precioUnitario: r.precio_unitario || 0,
        })));

        // Fetch producto alternativo if tipo_resolucion is CANJE
        if (diagnosticoData.producto_alternativo_id) {
          const prodAlt = await mycsapi.get("/api/v1/productos/{producto_id}", { path: { producto_id: diagnosticoData.producto_alternativo_id } }) as any;
          
          if (prodAlt) {
            setProductoAlternativo({
              id: (prodAlt as any).id,
              codigo: (prodAlt as any).codigo,
              descripcion: (prodAlt as any).descripcion,
              precio: (prodAlt as any).precio_cliente || 0
            });
          }
        }
      }

      // Fetch accesorios del incidente
      const { results: accesoriosData } = await mycsapi.fetch("/api/v1/incidente-accesorios", { method: "GET", query: { incidente_id: Number(id) as any } }) as any;
      
      setAccesorios((accesoriosData || []).map((a: any) => a.accesorios?.nombre).filter(Boolean));

      // Fetch fotos del incidente
      const { results: fotosData } = await mycsapi.fetch("/api/v1/incidente-fotos", { method: "GET", query: { incidente_id: Number(id) as any } }) as any;
      setFotos(fotosData || []);

      // Fetch guía del incidente
      try {
        const { results: guiasData } = await mycsapi.fetch("/api/v1/guias/search", { method: "GET", query: { incidente_id: Number(id) as any, limit: 1 } }) as any;
        setGuia(guiasData?.[0] || null);
      } catch (e) {
        console.warn("Could not fetch guia:", e);
      }

      // Fetch centro de servicio
      if (incData.centro_de_servicio_id) {
        const centro = await mycsapi.get("/api/v1/centros-de-servicio/{centro_de_servicio_id}", { path: { centro_de_servicio_id: incData.centro_de_servicio_id } }) as any;
        setCentroServicio((centro as any)?.nombre || "Centro de Servicio");
      }

      // Fetch notificaciones (mock for now - would need a table)
      // TODO: Implement notificaciones_cliente table query
      setNotificaciones([]);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseIncident = async () => {
    try {
      if (asignacion) {
        await mycsapi.fetch("/api/v1/asignaciones-sac/{id}".replace("{id}", String(asignacion.id)), { method: "PATCH", body: { activo: false } as any }) as any;
        toast.success("Incidente liberado");
        navigate("/sac/incidentes");
      }
    } catch (error: any) {
      console.error("Error releasing incident:", error);
      toast.error("Error al liberar el incidente");
    }
  };

  const handleEnviarNotificacion = async () => {
    if (!mensaje.trim()) {
      toast.error("El mensaje no puede estar vacío");
      return;
    }

    if (notificaciones.length >= MAX_NOTIFICACIONES) {
      toast.error(`Límite de ${MAX_NOTIFICACIONES} notificaciones alcanzado`);
      return;
    }

    try {
      setEnviandoNotificacion(true);
      
      // TODO: Implement notification creation via API
      // For now just show success
      toast.success(`Notificación enviada por ${canal}`);
      
      // Add to local state
      setNotificaciones(prev => [...prev, {
        id: Date.now(),
        canal,
        mensaje,
        fecha: new Date().toISOString(),
        usuario: "Agente SAC"
      }]);
      
      setMensaje("");
      setNotasInternas("");
      
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast.error("Error al enviar la notificación");
    } finally {
      setEnviandoNotificacion(false);
    }
  };

  const handleAprobarPresupuesto = async () => {
    if (!incidente) return;
    
    try {
      setProcessingDecision(true);

      await mycsapi.patch("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: incidente.id }, body: { 
          estado: "EN_REPARACION",
          updated_at: new Date().toISOString()
        } as any }) as any;

      toast.success("Cliente aprobó. El incidente pasa a reparación.");
      await handleReleaseIncident();
      
    } catch (error: any) {
      console.error("Error al aprobar presupuesto:", error);
      toast.error("Error al aprobar el presupuesto");
    } finally {
      setProcessingDecision(false);
    }
  };

  const handleRechazarPresupuesto = async () => {
    if (!incidente) return;
    
    try {
      setProcessingDecision(true);

      await mycsapi.patch("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: incidente.id }, body: { 
          estado: "EN_ENTREGA",
          updated_at: new Date().toISOString()
        } as any }) as any;

      toast.success("Cliente rechazó. El incidente pasa a entrega.");
      await handleReleaseIncident();
      
    } catch (error: any) {
      console.error("Error al rechazar presupuesto:", error);
      toast.error("Error al rechazar el presupuesto");
    } finally {
      setProcessingDecision(false);
    }
  };

  // Calcular costos
  const tipoResolucion = (incidente as any)?.tipo_resolucion || (diagnostico as any)?.tipo_resolucion;
  const isCanje = tipoResolucion === "CANJE";
  
  const subtotalRepuestos = repuestos.reduce((sum, r) => sum + (r.cantidad * r.precioUnitario), 0);
  const costoManoObra = 20; // Consumibles fijo
  const subtotalGeneral = isCanje 
    ? (productoAlternativo?.precio || 0) 
    : subtotalRepuestos + costoManoObra;
  const porcentajeDescuento = (diagnostico as any)?.descuento_porcentaje || 0;
  const descuento = subtotalGeneral * (porcentajeDescuento / 100);
  const totalFinal = subtotalGeneral - descuento;

  const formatCurrency = (amount: number) => `Q ${amount.toFixed(2)}`;

  const getTipoResolucionLabel = () => {
    const labels: Record<string, string> = {
      CANJE: "Canje",
      PRESUPUESTO: "Presupuesto",
      REPARACION: "Reparar en Garantía",
      CAMBIO: "Cambio por Garantía",
      NOTA_CREDITO: "Nota de Crédito",
    };
    return labels[tipoResolucion] || tipoResolucion || "Pendiente";
  };

  // Prepare print data
  const preparePrintData = (): SACPrintData => ({
    codigo: incidente?.codigo || "",
    fechaIngreso: new Date(incidente?.fecha_ingreso || incidente?.created_at || new Date()),
    estado: incidente?.estado || "INGRESADO",
    centroServicio,
    diasEnTaller: dias,
    codigoCliente: cliente?.codigo || "",
    nombreCliente: cliente?.nombre || "",
    nitCliente: cliente?.nit || "",
    telefonoCliente: cliente?.telefono_principal || "",
    celularCliente: cliente?.celular || "",
    correoCliente: cliente?.correo || "",
    direccionCliente: cliente?.direccion || "",
    municipio: cliente?.municipio || "Guatemala",
    departamento: cliente?.departamento || "Guatemala",
    codigoProducto: producto?.codigo || "",
    descripcionProducto: producto?.descripcion || "",
    problemaReportado: incidente?.descripcion_problema || "",
    accesorios,
    tieneDiagnostico: !!diagnostico,
    fallas,
    causas,
    recomendaciones: (diagnostico as any)?.recomendaciones || "",
    tecnicoNombre: tecnico?.nombre || "Técnico",
    tipoResolucion: getTipoResolucionLabel(),
    aplicaGarantia: (diagnostico as any)?.aplica_garantia || incidente?.aplica_garantia || false,
    repuestos: repuestos.map(r => ({
      codigo: r.codigo,
      descripcion: r.descripcion,
      cantidad: r.cantidad,
      precioUnitario: r.precioUnitario,
    })),
    costoManoObra,
    porcentajeDescuento,
    subtotalGeneral,
    descuento,
    totalFinal,
    productoAlternativo: productoAlternativo ? {
      codigo: productoAlternativo.codigo,
      descripcion: productoAlternativo.descripcion,
      precio: productoAlternativo.precio,
    } : undefined,
    fotos: fotos.map(f => ({ url: f.url, tipo: f.tipo })),
    quiereEnvio: incidente?.quiere_envio || false,
    guia: guia ? {
      numero_guia: guia.numero_guia,
      tracking_number: guia.tracking_number,
      estado: guia.estado,
    } : undefined,
  });

  const handlePrintIncidente = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !printRef.current) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Incidente SAC - ${incidente?.codigo}</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div id="print-root"></div>
        </body>
      </html>
    `);

    const container = printRef.current.cloneNode(true);
    printWindow.document.getElementById("print-root")?.appendChild(container);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleShareIncidente = async () => {
    const shareData = {
      title: `Incidente ${incidente?.codigo}`,
      text: `Incidente ${incidente?.codigo}\nCliente: ${cliente?.nombre}\nProducto: ${producto?.codigo}\nEstado: ${incidente?.estado}\nResolución: ${getTipoResolucionLabel()}\nTotal: ${formatCurrency(totalFinal)}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Compartido exitosamente");
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      await navigator.clipboard.writeText(shareData.text);
      toast.success("Información copiada al portapapeles");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!incidente) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold">Incidente no encontrado</h2>
        <Button variant="link" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    );
  }

  const dias = incidente.fecha_ingreso 
    ? differenceInDays(new Date(), new Date(incidente.fecha_ingreso)) 
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Hidden print component */}
      <div ref={printRef} className="hidden">
        <SACIncidentePrintSheet data={preparePrintData()} />
      </div>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Vista Previa - {incidente.codigo}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-4">
              <SACIncidentePrintSheet data={preparePrintData()} />
            </div>
          </ScrollArea>
          <DialogFooter className="p-4 border-t gap-2">
            <Button variant="outline" onClick={() => setShowPrintPreview(false)}>
              Cerrar
            </Button>
            <Button onClick={handlePrintIncidente} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{incidente.codigo}</h1>
            <p className="text-muted-foreground">Detalle del incidente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={incidente.estado} />
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {dias} días
          </Badge>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleShareIncidente}>
            <Share2 className="h-4 w-4" />
            Compartir
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowPrintPreview(true)}>
            <Eye className="h-4 w-4" />
            Vista Previa
          </Button>
          <Button variant="outline" size="sm" onClick={handleReleaseIncident}>
            Liberar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Row 1: Cliente Info + Producto Info side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-5 w-5 text-primary" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-semibold">{cliente?.nombre || "Desconocido"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Código / NIT</p>
                  <p className="font-medium">{cliente?.codigo || "-"} | {cliente?.nit || "-"}</p>
                </div>
                <div className="space-y-1 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <span>{cliente?.celular || cliente?.telefono_principal || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span>{cliente?.telefono_principal || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-orange-600" />
                    <span>{cliente?.correo || "na"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {cliente?.direccion && <p>{cliente.direccion}</p>}
                    <p className="text-muted-foreground">{cliente?.municipio || "Guatemala"}, {cliente?.departamento || "Guatemala"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Producto Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-5 w-5" />
                  Producto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {(producto as any)?.url_foto ? (
                      <img 
                        src={(producto as any).url_foto} 
                        alt={producto?.descripcion || "Producto"} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-muted-foreground">Código</p>
                    <p className="font-semibold font-mono text-lg">{producto?.codigo || "-"}</p>
                    <p className="text-sm text-muted-foreground mt-2">Descripción</p>
                    <p className="font-medium text-sm">{producto?.descripcion || "-"}</p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Problema Reportado</p>
                  <p className="text-sm mt-1">{incidente.descripcion_problema || "Sin descripción"}</p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Accesorios de Ingreso</p>
                  {accesorios.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {accesorios.map((acc, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">{acc}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Ingresó sin accesorios</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Diagnóstico Técnico */}
          {diagnostico && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-5 w-5" />
                  Diagnóstico Técnico
                  <Badge variant="secondary" className="ml-auto">{getTipoResolucionLabel()}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Fallas Encontradas</p>
                    <ul className="space-y-1">
                      {fallas.length > 0 ? fallas.map((falla, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          {falla}
                        </li>
                      )) : (
                        <li className="text-sm text-muted-foreground">Sin fallas registradas</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Causas</p>
                    <ul className="space-y-1">
                      {causas.length > 0 ? causas.map((causa, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">•</span>
                          {causa}
                        </li>
                      )) : (
                        <li className="text-sm text-muted-foreground">Sin causas registradas</li>
                      )}
                    </ul>
                  </div>
                </div>
                {(diagnostico as any)?.recomendaciones && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Recomendaciones</p>
                    <p className="text-sm">{(diagnostico as any).recomendaciones}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Row 3: Resumen de Costos */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Resumen de Costos - {getTipoResolucionLabel()}
              </CardTitle>
              {porcentajeDescuento > 0 && (
                <p className="text-sm text-green-600">Con descuento de {porcentajeDescuento}% aplicado</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show alternative product for CANJE */}
              {isCanje && productoAlternativo ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Máquina Alternativa Ofrecida</p>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono font-bold text-lg">{productoAlternativo.codigo}</p>
                        <p className="text-sm text-muted-foreground">{productoAlternativo.descripcion}</p>
                      </div>
                      <p className="font-bold text-xl text-blue-600">{formatCurrency(productoAlternativo.precio)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Show spare parts for PRESUPUESTO */
                <>
                  {repuestos.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No hay repuestos registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-1 text-sm">
                      {repuestos.map((r, idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-dashed last:border-0">
                          <span className="text-muted-foreground">{r.descripcion} x{r.cantidad}</span>
                          <span className="font-medium">{formatCurrency(r.cantidad * r.precioUnitario)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2">
                        <span className="text-muted-foreground">Consumibles:</span>
                        <span>{formatCurrency(costoManoObra)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Separator />
              
              <div className="space-y-2 text-sm">
                {porcentajeDescuento > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="line-through text-muted-foreground">{formatCurrency(subtotalGeneral)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Descuento ({porcentajeDescuento}%):</span>
                      <span>- {formatCurrency(descuento)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">TOTAL A PAGAR:</span>
                  <span className="font-bold text-2xl text-primary">{formatCurrency(totalFinal)}</span>
                </div>
              </div>

              {/* Botones de Decisión */}
              {incidente.estado === "ESPERA_APROBACION" && (
                <>
                  <Separator />
                  <p className="text-center text-sm text-muted-foreground">¿Cuál fue la decisión del cliente?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          className="w-full gap-2 bg-green-600 hover:bg-green-700" 
                          disabled={processingDecision}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Aprobó
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿El cliente aprobó el {isCanje ? "canje" : "presupuesto"}? El incidente pasará a reparación.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleAprobarPresupuesto}>
                            Confirmar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          className="w-full gap-2 bg-orange-500 hover:bg-orange-600" 
                          disabled={processingDecision}
                        >
                          <XCircle className="h-4 w-4" />
                          Rechazó
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Rechazo</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿El cliente rechazó el {isCanje ? "canje" : "presupuesto"}? El incidente pasará a entrega sin reparar.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRechazarPresupuesto}>
                            Confirmar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Enviar Notificación */}
          <Card className="border-t-4 border-t-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="h-5 w-5 text-orange-600" />
                Notificación ({notificaciones.length}/{MAX_NOTIFICACIONES})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Canal</label>
                <Select value={canal} onValueChange={setCanal}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="llamada">Llamada</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Textarea
                  placeholder="Mensaje para el cliente"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  className="min-h-[80px] border-orange-200 focus:border-orange-400"
                />
              </div>

              <div>
                <Textarea
                  placeholder="Notas Internas (opcional)"
                  value={notasInternas}
                  onChange={(e) => setNotasInternas(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>

              <Button 
                className="w-full gap-2 bg-orange-500 hover:bg-orange-600"
                onClick={handleEnviarNotificacion}
                disabled={enviandoNotificacion || notificaciones.length >= MAX_NOTIFICACIONES}
              >
                <Send className="h-4 w-4" />
                Enviar
              </Button>
            </CardContent>
          </Card>

          {/* Historial de Notificaciones */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historial</CardTitle>
            </CardHeader>
            <CardContent>
              {notificaciones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay notificaciones enviadas
                </p>
              ) : (
                <div className="space-y-3">
                  {notificaciones.map((notif) => (
                    <div key={notif.id} className="border-l-2 border-orange-400 pl-3 py-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{notif.canal}</Badge>
                        <span>{new Date(notif.fecha).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm mt-1">{notif.mensaje}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contacto Rápido */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contacto Rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {cliente?.telefono_principal && (
                <Button 
                  variant="outline" 
                  className="w-full gap-2 justify-start"
                  onClick={() => window.open(`https://wa.me/502${(cliente.celular || cliente.telefono_principal)?.replace(/\D/g, '')}`, '_blank')}
                >
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  WhatsApp
                </Button>
              )}
              {cliente?.telefono_principal && (
                <Button 
                  variant="outline" 
                  className="w-full gap-2 justify-start"
                  onClick={() => window.open(`tel:${cliente.telefono_principal}`, '_blank')}
                >
                  <Phone className="h-4 w-4 text-blue-600" />
                  Llamar
                </Button>
              )}
              {cliente?.correo && (
                <Button 
                  variant="outline" 
                  className="w-full gap-2 justify-start"
                  onClick={() => window.open(`mailto:${cliente.correo}`, '_blank')}
                >
                  <Mail className="h-4 w-4 text-orange-600" />
                  Email
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Fotos del Incidente */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="h-5 w-5" />
                Fotos ({fotos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fotos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin fotos registradas
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {fotos.slice(0, 6).map((foto, idx) => (
                    <div 
                      key={foto.id || idx} 
                      className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(foto.url, '_blank')}
                    >
                      <img 
                        src={foto.url} 
                        alt={`Foto ${idx + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
              {fotos.length > 6 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  +{fotos.length - 6} fotos más
                </p>
              )}
            </CardContent>
          </Card>

          {/* Guía de Envío */}
          <Card className={guia ? "border-l-4 border-l-blue-500" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-5 w-5" />
                {incidente?.quiere_envio ? "Guía de Envío" : "Recolección"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!incidente?.quiere_envio ? (
                <div className="text-center py-2">
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    Recoger en centro
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    {centroServicio || "Centro de servicio"}
                  </p>
                </div>
              ) : guia ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">No. Guía</span>
                    <span className="font-mono font-medium text-sm">{guia.numero_guia || guia.tracking_number || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estado</span>
                    <Badge variant={guia.estado === "ENTREGADA" ? "default" : "secondary"} className="text-xs">
                      {guia.estado || "Pendiente"}
                    </Badge>
                  </div>
                  {guia.tracking_number && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-2 mt-2"
                      onClick={() => window.open(`https://tracking.zigo.com.mx/${guia.tracking_number}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Rastrear envío
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Guía pendiente de generar
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
