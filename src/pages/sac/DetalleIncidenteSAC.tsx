import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { apiBackendAction } from "@/lib/api-backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Wrench
} from "lucide-react";
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

export default function DetalleIncidenteSAC() {
  const { id } = useParams();
  const navigate = useNavigate();
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
  
  // Estado para notificaciones
  const [canal, setCanal] = useState<string>("whatsapp");
  const [mensaje, setMensaje] = useState<string>("");
  const [notasInternas, setNotasInternas] = useState<string>("");
  const [enviandoNotificacion, setEnviandoNotificacion] = useState(false);
  const [notificaciones, setNotificaciones] = useState<NotificacionHistorial[]>([]);
  const [processingDecision, setProcessingDecision] = useState(false);

  const MAX_NOTIFICACIONES = 3;

  useEffect(() => {
    fetchData();
    assignIncident();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const assignIncident = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { result: userProfile } = await apiBackendAction("usuarios.getByEmail", { email: user.email || "" });
      if (!userProfile) return;

      const { results: existingAssignments } = await apiBackendAction("asignaciones_sac.list", { 
        incidente_id: Number(id),
        activo: true 
      });

      const existingAssignment = existingAssignments?.[0] as any;

      if (existingAssignment) {
        if (existingAssignment.user_id !== (userProfile as any).id) {
          toast.error("Este incidente está siendo atendido por otro agente");
          navigate("/sac/incidentes");
          return;
        }
        setAsignacion(existingAssignment);
      } else {
        const newAssignment = await apiBackendAction("asignaciones_sac.create", {
          incidente_id: Number(id),
          user_id: (userProfile as any).id,
          activo: true
        });
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

      const incidenteResult = await apiBackendAction("incidentes.get", { id: Number(id) });
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
      const diagnosticoResult = await apiBackendAction("diagnosticos.search", { incidente_id: Number(id) });
      const diagnosticoData = diagnosticoResult.results?.[0] || null;
      setDiagnostico(diagnosticoData as unknown as DiagnosticoDB | null);

      if (diagnosticoData?.tecnico) {
        setTecnico(diagnosticoData.tecnico as unknown as UsuarioDB);
      }

      // Fetch fallas, causas and repuestos if diagnostico exists
      if (diagnosticoData) {
        const [fallasRes, causasRes, repuestosRes] = await Promise.all([
          supabase
            .from("diagnostico_fallas")
            .select("fallas:falla_id(nombre)")
            .eq("diagnostico_id", diagnosticoData.id),
          supabase
            .from("diagnostico_causas")
            .select("causas:causa_id(nombre)")
            .eq("diagnostico_id", diagnosticoData.id),
          supabase
            .from("solicitudes_repuestos")
            .select("*, repuestos:repuesto_id(codigo, descripcion)")
            .eq("incidente_id", Number(id)),
        ]);

        setFallas((fallasRes.data || []).map((f: any) => f.fallas?.nombre).filter(Boolean));
        setCausas((causasRes.data || []).map((c: any) => c.causas?.nombre).filter(Boolean));
        setRepuestos((repuestosRes.data || []).map((r: any) => ({
          codigo: r.repuestos?.codigo || r.codigo_repuesto,
          descripcion: r.repuestos?.descripcion || "Repuesto",
          cantidad: r.cantidad || 1,
          precioUnitario: r.precio_unitario || 0,
        })));
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
        await apiBackendAction("asignaciones_sac.update", {
          id: asignacion.id,
          data: { activo: false }
        });
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

      await apiBackendAction("incidentes.update", {
        id: incidente.id,
        data: { 
          estado: "EN_REPARACION",
          updated_at: new Date().toISOString()
        }
      } as any);

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

      await apiBackendAction("incidentes.update", {
        id: incidente.id,
        data: { 
          estado: "EN_ENTREGA",
          updated_at: new Date().toISOString()
        }
      } as any);

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
  const subtotalRepuestos = repuestos.reduce((sum, r) => sum + (r.cantidad * r.precioUnitario), 0);
  const costoManoObra = 20; // Consumibles fijo
  const subtotalGeneral = subtotalRepuestos + costoManoObra;
  const porcentajeDescuento = (diagnostico as any)?.descuento_porcentaje || 0;
  const descuento = subtotalGeneral * (porcentajeDescuento / 100);
  const totalFinal = subtotalGeneral - descuento;

  const formatCurrency = (amount: number) => `Q ${amount.toFixed(2)}`;

  const getTipoResolucionLabel = () => {
    const tipo = (incidente as any)?.tipo_resolucion || (diagnostico as any)?.tipo_resolucion;
    const labels: Record<string, string> = {
      CANJE: "Canje",
      PRESUPUESTO: "Presupuesto",
      REPARACION: "Reparar en Garantía",
      CAMBIO: "Cambio por Garantía",
      NOTA_CREDITO: "Nota de Crédito",
    };
    return labels[tipo] || tipo || "Pendiente";
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
          <Button variant="outline" size="sm" onClick={handleReleaseIncident}>
            Liberar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cliente Info - Improved Design */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-5 w-5 text-primary" />
                Información del Cliente
              </CardTitle>
              <p className="text-sm text-muted-foreground">Datos de contacto para notificación</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="font-semibold text-lg">{cliente?.nombre || "Desconocido"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Código / NIT</p>
                    <p className="font-medium">{cliente?.codigo || "-"} | {cliente?.nit || "-"}</p>
                  </div>
                </div>
                <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Celular (WhatsApp)</p>
                      <p className="font-semibold">{cliente?.celular || cliente?.telefono_principal || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Teléfono Principal</p>
                      <p className="font-semibold">{cliente?.telefono_principal || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Correo</p>
                      <p className="font-medium text-sm">{cliente?.correo || "na"}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Dirección */}
              <div className="flex items-start gap-2 pt-2 border-t">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Ciudad</p>
                  <p className="text-sm">{cliente?.municipio || "Guatemala"}, {cliente?.departamento || "Guatemala"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de Costos */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Resumen de Costos
              </CardTitle>
              {porcentajeDescuento > 0 && (
                <p className="text-sm text-green-600">% Con descuento de {porcentajeDescuento}% aplicado</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {repuestos.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay repuestos registrados</p>
                </div>
              ) : (
                <div className="space-y-1 text-sm">
                  {repuestos.map((r, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-muted-foreground">{r.descripcion} x{r.cantidad}</span>
                      <span>{formatCurrency(r.cantidad * r.precioUnitario)}</span>
                    </div>
                  ))}
                </div>
              )}

              <Separator />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal Repuestos:</span>
                  <span>{formatCurrency(subtotalRepuestos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="line-through text-muted-foreground">{formatCurrency(subtotalGeneral)}</span>
                </div>
                {porcentajeDescuento > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento ({porcentajeDescuento}%):</span>
                    <span>- {formatCurrency(descuento)}</span>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-bold">TOTAL A PAGAR:</span>
                  <span className="font-bold text-xl">{formatCurrency(totalFinal)}</span>
                </div>
              </div>

              {/* Botones de Decisión */}
              {incidente.estado === "ESPERA_APROBACION" && (
                <>
                  <p className="text-center text-sm text-muted-foreground">¿Cuál fue la decisión del cliente?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          className="w-full gap-2 bg-green-600 hover:bg-green-700" 
                          disabled={processingDecision}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Aprobó Canje
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿El cliente aprobó el presupuesto/canje? El incidente pasará a reparación.
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
                          Rechazó Canje
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Rechazo</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿El cliente rechazó el presupuesto? El incidente pasará a entrega sin reparar.
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

          {/* Diagnóstico Técnico */}
          {diagnostico && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-5 w-5" />
                  Diagnóstico Técnico
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
              </CardContent>
            </Card>
          )}

          {/* Producto Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5" />
                Producto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Código</p>
                  <p className="font-semibold font-mono">{producto?.codigo || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="font-semibold">{producto?.descripcion || "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Problema Reportado</p>
                <p className="mt-1 text-sm">{incidente.descripcion_problema || "Sin descripción"}</p>
              </div>
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
                Enviar Notificación ({notificaciones.length}/{MAX_NOTIFICACIONES})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Canal de Notificación</label>
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
                Enviar Notificación
              </Button>
            </CardContent>
          </Card>

          {/* Historial de Notificaciones */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historial de Notificaciones</CardTitle>
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
        </div>
      </div>
    </div>
  );
}
