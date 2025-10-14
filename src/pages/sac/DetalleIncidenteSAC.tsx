import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Send, Phone, Mail, MessageCircle, FileText, Package } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";

export default function DetalleIncidenteSAC() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [incidente, setIncidente] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [producto, setProducto] = useState<any>(null);
  const [diagnostico, setDiagnostico] = useState<any>(null);
  const [solicitudRepuestos, setSolicitudRepuestos] = useState<any>(null);
  const [repuestosDetalle, setRepuestosDetalle] = useState<any[]>([]);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [asignacion, setAsignacion] = useState<any>(null);
  
  // Estado para nueva notificación
  const [canal, setCanal] = useState<string>("whatsapp");
  const [mensaje, setMensaje] = useState<string>("");
  const [notas, setNotas] = useState<string>("");

  useEffect(() => {
    fetchData();
    assignIncident();
  }, [id]);

  const assignIncident = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already assigned to someone
      const { data: existingAssignment } = await supabase
        .from("asignaciones_sac")
        .select("*")
        .eq("incidente_id", id)
        .eq("activo", true)
        .single();

      if (existingAssignment) {
        if (existingAssignment.user_id !== user.id) {
          toast.error("Este incidente está siendo atendido por otro agente");
          navigate("/sac/incidentes");
          return;
        }
        setAsignacion(existingAssignment);
      } else {
        // Assign to current user
        const { data: newAssignment, error } = await supabase
          .from("asignaciones_sac")
          .insert({
            incidente_id: id,
            user_id: user.id,
            activo: true
          })
          .select()
          .single();

        if (error) throw error;
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

      // Fetch incident
      const { data: incidenteData, error: incidenteError } = await supabase
        .from("incidentes")
        .select("*")
        .eq("id", id)
        .single();

      if (incidenteError) throw incidenteError;
      setIncidente(incidenteData);

      // Fetch client
      const { data: clienteData, error: clienteError } = await supabase
        .from("clientes")
        .select("*")
        .eq("codigo", incidenteData.codigo_cliente)
        .single();

      if (clienteError) throw clienteError;
      setCliente(clienteData);

      // Fetch product
      const { data: productoData, error: productoError } = await supabase
        .from("productos")
        .select("*")
        .eq("codigo", incidenteData.codigo_producto)
        .single();

      if (productoError) throw productoError;
      setProducto(productoData);

      // Fetch diagnosis
      const { data: diagnosticoData, error: diagnosticoError } = await supabase
        .from("diagnosticos")
        .select("*")
        .eq("incidente_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (diagnosticoError) {
        console.error("Error fetching diagnostico:", diagnosticoError);
      }

      setDiagnostico(diagnosticoData);

      // Fetch solicitud de repuestos
      const { data: solicitudData, error: solicitudError } = await supabase
        .from("solicitudes_repuestos")
        .select("*")
        .eq("incidente_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (solicitudError) {
        console.error("Error fetching solicitud repuestos:", solicitudError);
      }

      setSolicitudRepuestos(solicitudData);

      // Fetch detalle de repuestos si existe solicitud
      if (solicitudData) {
        const { data: detalleData, error: detalleError } = await supabase
          .from("repuestos_solicitud_detalle")
          .select("*")
          .eq("solicitud_id", solicitudData.id);

        if (detalleError) {
          console.error("Error fetching detalle repuestos:", detalleError);
        }

        // Si hay detalles, obtener información de los repuestos
        if (detalleData && detalleData.length > 0) {
          const codigosRepuestos = detalleData.map((d: any) => d.codigo_repuesto);
          
          const { data: repuestosData, error: repuestosError } = await supabase
            .from("repuestos")
            .select("codigo, clave, descripcion, url_foto")
            .in("codigo", codigosRepuestos);

          if (repuestosError) {
            console.error("Error fetching repuestos info:", repuestosError);
          }

          // Combinar los datos
          const detalleConRepuestos = detalleData.map((detalle: any) => ({
            ...detalle,
            repuestos: repuestosData?.find((r: any) => r.codigo === detalle.codigo_repuesto)
          }));

          setRepuestosDetalle(detalleConRepuestos);
        }
      }

      // Fetch notifications
      const { data: notificacionesData } = await supabase
        .from("notificaciones_cliente")
        .select("*")
        .eq("incidente_id", id)
        .order("fecha_envio", { ascending: false });

      setNotificaciones(notificacionesData || []);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarNotificacion = async () => {
    if (!mensaje.trim()) {
      toast.error("Debes escribir un mensaje");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const numeroNotificacion = notificaciones.length + 1;
      
      if (numeroNotificacion > 3) {
        toast.error("Ya se han enviado las 3 notificaciones máximas");
        return;
      }

      const { error } = await supabase
        .from("notificaciones_cliente")
        .insert({
          incidente_id: id,
          numero_notificacion: numeroNotificacion,
          canal,
          mensaje,
          notas,
          enviado_por: user?.id
        });

      if (error) throw error;

      toast.success(`Notificación ${numeroNotificacion} enviada exitosamente`);
      setMensaje("");
      setNotas("");
      fetchData();
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast.error("Error al enviar la notificación");
    }
  };

  const handleMarcarRespondido = async (notifId: string) => {
    try {
      const { error } = await supabase
        .from("notificaciones_cliente")
        .update({ 
          respondido: true,
          fecha_respuesta: new Date().toISOString()
        })
        .eq("id", notifId);

      if (error) throw error;
      toast.success("Notificación marcada como respondida");
      fetchData();
    } catch (error: any) {
      console.error("Error updating notification:", error);
      toast.error("Error al actualizar la notificación");
    }
  };

  const handleReleaseIncident = async () => {
    try {
      if (asignacion) {
        const { error } = await supabase
          .from("asignaciones_sac")
          .update({ activo: false })
          .eq("id", asignacion.id);

        if (error) throw error;
        toast.success("Incidente liberado");
        navigate("/sac/incidentes");
      }
    } catch (error: any) {
      console.error("Error releasing incident:", error);
      toast.error("Error al liberar el incidente");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando información...</p>
      </div>
    );
  }

  if (!incidente) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">Incidente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/sac/incidentes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Incidentes
        </Button>
        <Button variant="outline" onClick={handleReleaseIncident}>
          Liberar Incidente
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Información del Incidente</span>
                <StatusBadge status={incidente.status as any} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Código</Label>
                  <p className="font-semibold">{incidente.codigo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha Ingreso</Label>
                  <p className="font-semibold">
                    {new Date(incidente.fecha_ingreso).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cliente</Label>
                  <p className="font-semibold">{cliente?.nombre}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Producto</Label>
                  <p className="font-semibold">{producto?.descripcion}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Problema Reportado</Label>
                  <p>{incidente.descripcion_problema}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {diagnostico && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Diagnóstico Técnico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {diagnostico.fallas && (
                  <div>
                    <Label className="text-muted-foreground">Fallas Encontradas</Label>
                    <ul className="list-disc list-inside mt-2">
                      {diagnostico.fallas.map((falla: string, idx: number) => (
                        <li key={idx}>{falla}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diagnostico.causas && (
                  <div>
                    <Label className="text-muted-foreground">Causas</Label>
                    <ul className="list-disc list-inside mt-2">
                      {diagnostico.causas.map((causa: string, idx: number) => (
                        <li key={idx}>{causa}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diagnostico.recomendaciones && (
                  <div>
                    <Label className="text-muted-foreground">Recomendaciones</Label>
                    <p className="mt-2">{diagnostico.recomendaciones}</p>
                  </div>
                )}
                {diagnostico.costo_estimado && (
                  <div>
                    <Label className="text-muted-foreground">Costo Estimado</Label>
                    <p className="text-2xl font-bold text-primary mt-2">
                      Q {Number(diagnostico.costo_estimado).toFixed(2)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(diagnostico?.repuestos_utilizados || repuestosDetalle.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Repuestos Utilizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Repuestos del diagnóstico si existen */}
                  {diagnostico?.repuestos_utilizados?.map((repuesto: any, idx: number) => (
                    <div key={`diag-${idx}`} className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                      <Package className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{repuesto.descripcion}</p>
                        {repuesto.codigo && (
                          <p className="text-xs text-muted-foreground">Código: {repuesto.codigo}</p>
                        )}
                      </div>
                      <Badge variant="secondary">Cant: {repuesto.cantidad}</Badge>
                    </div>
                  ))}
                  
                  {/* Repuestos de la solicitud si existen */}
                  {repuestosDetalle.map((detalle: any, idx: number) => (
                    <div key={`sol-${idx}`} className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                      <Package className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{detalle.repuestos?.descripcion || detalle.codigo_repuesto}</p>
                        <p className="text-xs text-muted-foreground">
                          {detalle.repuestos?.codigo && `Código: ${detalle.repuestos.codigo}`}
                          {detalle.repuestos?.clave && ` | Clave: ${detalle.repuestos.clave}`}
                        </p>
                        {detalle.estado && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {detalle.estado}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">Solicitado: {detalle.cantidad_solicitada}</Badge>
                        {detalle.cantidad_encontrada > 0 && (
                          <Badge variant="default" className="ml-1">
                            Entregado: {detalle.cantidad_encontrada}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cliente?.celular && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{cliente.celular}</span>
                </div>
              )}
              {cliente?.telefono_principal && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{cliente.telefono_principal}</span>
                </div>
              )}
              {cliente?.correo && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{cliente.correo}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enviar Notificación ({notificaciones.length}/3)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Canal</Label>
                <Select value={canal} onValueChange={setCanal}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="telefono">Teléfono</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mensaje</Label>
                <Textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Escriba el mensaje para el cliente..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Notas Internas (opcional)</Label>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas para uso interno..."
                  rows={2}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleEnviarNotificacion}
                disabled={notificaciones.length >= 3}
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar Notificación
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Notificaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notificaciones.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">
                    No hay notificaciones enviadas
                  </p>
                ) : (
                  notificaciones.map((notif) => (
                    <div key={notif.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={notif.respondido ? "default" : "secondary"}>
                          Notificación #{notif.numero_notificacion}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notif.fecha_envio).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {notif.canal === "whatsapp" && <MessageCircle className="h-4 w-4" />}
                        {notif.canal === "email" && <Mail className="h-4 w-4" />}
                        {notif.canal === "telefono" && <Phone className="h-4 w-4" />}
                        <span className="capitalize">{notif.canal}</span>
                      </div>
                      <p className="text-sm">{notif.mensaje}</p>
                      {!notif.respondido && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleMarcarRespondido(notif.id)}
                        >
                          Marcar como Respondido
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
