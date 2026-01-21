import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Send, Phone, Mail, MessageCircle, FileText, Package, MapPin, User, DollarSign, Percent, AlertTriangle, Clock, Printer, Download, CheckCircle, XCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared";
import { OutlinedSelect, OutlinedTextarea } from "@/components/ui/outlined-input";
import { differenceInDays } from "date-fns";
import { DiagnosticoPrintSheet, DiagnosticoPrintData } from "@/components/features/diagnostico";

type RepuestoConPrecio = {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  origen: 'diagnostico' | 'solicitud';
  estado?: string;
};

export default function DetalleIncidenteSAC() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [incidente, setIncidente] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [producto, setProducto] = useState<any>(null);
  const [diagnostico, setDiagnostico] = useState<any>(null);
  const [solicitudRepuestos, setSolicitudRepuestos] = useState<any>(null);
  const [repuestosConPrecios, setRepuestosConPrecios] = useState<RepuestoConPrecio[]>([]);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [asignacion, setAsignacion] = useState<any>(null);
  const [tecnico, setTecnico] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  // Estado para nueva notificación
  const [canal, setCanal] = useState<string>("whatsapp");
  const [mensaje, setMensaje] = useState<string>("");
  const [notas, setNotas] = useState<string>("");
  const [processingDecision, setProcessingDecision] = useState(false);

  useEffect(() => {
    fetchData();
    assignIncident();
  }, [id]);

  const assignIncident = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
      const { data: userProfile } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_uid', user.id)
        .single();

      if (!userProfile) return;

      // Check if already assigned to someone
      const { data: existingAssignment } = await supabase
        .from("asignaciones_sac")
        .select("*")
        .eq("incidente_id", Number(id))
        .eq("activo", true)
        .single();

      if (existingAssignment) {
        if (existingAssignment.user_id !== userProfile.id) {
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
            incidente_id: Number(id),
            user_id: userProfile.id,
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
        .eq("id", Number(id))
        .single();

      if (incidenteError) throw incidenteError;
      setIncidente(incidenteData);

      // Fetch client
      const { data: clienteData, error: clienteError } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", incidenteData.cliente_id)
        .single();

      if (!clienteError) setCliente(clienteData);

      // Fetch product
      if (incidenteData.producto_id) {
        const { data: productoData, error: productoError } = await supabase
          .from("productos")
          .select("*")
          .eq("id", incidenteData.producto_id)
          .single();

        if (!productoError) setProducto(productoData);
      }

      // Fetch diagnosis
      const { data: diagnosticoData, error: diagnosticoError } = await supabase
        .from("diagnosticos")
        .select("*")
        .eq("incidente_id", Number(id))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (diagnosticoError) {
        console.error("Error fetching diagnostico:", diagnosticoError);
      }

      setDiagnostico(diagnosticoData);

      // Fetch solicitud de repuestos
      const { data: solicitudData, error: solicitudError } = await (supabase as any)
        .from("solicitudes_repuestos")
        .select("*")
        .eq("incidente_id", Number(id))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (solicitudError) {
        console.error("Error fetching solicitud repuestos:", solicitudError);
      }

      setSolicitudRepuestos(solicitudData);

      // Collect all spare part codes to fetch prices
      const codigosRepuestos: string[] = [];
      const repuestosTemp: RepuestoConPrecio[] = [];

      // From diagnostico_repuestos table
      if (diagnosticoData) {
        const { data: diagRepuestos } = await supabase
          .from("diagnostico_repuestos")
          .select("repuesto_id")
          .eq("diagnostico_id", diagnosticoData.id);

        if (diagRepuestos && diagRepuestos.length > 0) {
          const repuestoIds = diagRepuestos.map(dr => dr.repuesto_id);
          const { data: repuestosData } = await supabase
            .from("repuestos")
            .select("*")
            .in("id", repuestoIds);

          repuestosData?.forEach(r => {
            codigosRepuestos.push(r.codigo);
            repuestosTemp.push({
              codigo: r.codigo,
              descripcion: r.descripcion || 'Sin descripción',
              cantidad: 1,
              precio_unitario: 0,
              subtotal: 0,
              origen: 'diagnostico'
            });
          });
        }
      }

      // Fetch detalle de repuestos si existe solicitud
      if (solicitudData) {
        // Try from repuestos_solicitud_detalle first
        const { data: detalleData, error: detalleError } = await supabase
          .from("repuestos_solicitud_detalle")
          .select("*")
          .eq("solicitud_id", solicitudData.id);

        if (detalleError) {
          console.error("Error fetching detalle repuestos:", detalleError);
        }

        if (detalleData && detalleData.length > 0) {
          // Get repuesto info
          const codigosDeDetalle = detalleData.map((d: any) => d.codigo_repuesto);
          codigosDeDetalle.forEach(c => {
            if (!codigosRepuestos.includes(c)) codigosRepuestos.push(c);
          });

          const { data: repuestosInfo } = await supabase
            .from("repuestos")
            .select("codigo, descripcion")
            .in("codigo", codigosDeDetalle);

          detalleData.forEach((detalle: any) => {
            const info = repuestosInfo?.find(r => r.codigo === detalle.codigo_repuesto);
            // Avoid duplicates from diagnostico
            const exists = repuestosTemp.find(rt => rt.codigo === detalle.codigo_repuesto);
            if (!exists) {
              repuestosTemp.push({
                codigo: detalle.codigo_repuesto,
                descripcion: info?.descripcion || detalle.codigo_repuesto,
                cantidad: detalle.cantidad_solicitada || 1,
                precio_unitario: 0,
                subtotal: 0,
                origen: 'solicitud',
                estado: detalle.estado
              });
            }
          });
        } else if (solicitudData.repuestos) {
          // Fallback: use JSON field 'repuestos' from solicitud
          const repuestosFromJson = Array.isArray(solicitudData.repuestos) 
            ? solicitudData.repuestos 
            : [];
          
          if (repuestosFromJson.length > 0) {
            const codigosFromJson = repuestosFromJson.map((r: any) => r.codigo).filter(Boolean);
            codigosFromJson.forEach((c: string) => {
              if (!codigosRepuestos.includes(c)) codigosRepuestos.push(c);
            });

            const { data: repuestosInfo } = await supabase
              .from("repuestos")
              .select("codigo, descripcion")
              .in("codigo", codigosFromJson);

            repuestosFromJson.forEach((rep: any) => {
              const info = repuestosInfo?.find(r => r.codigo === rep.codigo);
              // Avoid duplicates from diagnostico
              const exists = repuestosTemp.find(rt => rt.codigo === rep.codigo);
              if (!exists) {
                repuestosTemp.push({
                  codigo: rep.codigo || 'N/A',
                  descripcion: info?.descripcion || rep.descripcion || rep.codigo || 'Sin descripción',
                  cantidad: rep.cantidad || 1,
                  precio_unitario: 0,
                  subtotal: 0,
                  origen: 'solicitud',
                  estado: rep.estado
                });
              }
            });
          }
        }
      }

      // Fetch tecnico info if diagnostico exists
      if (diagnosticoData?.tecnico_codigo) {
        const { data: tecnicoData } = await supabase
          .from("profiles")
          .select("nombre, apellido, codigo_empleado")
          .eq("codigo_empleado", diagnosticoData.tecnico_codigo)
          .maybeSingle();
        
        setTecnico(tecnicoData);
      }

      // Fetch prices from inventario
      if (codigosRepuestos.length > 0) {
        const { data: preciosData } = await supabase
          .from("inventario")
          .select("codigo_repuesto, costo_unitario")
          .in("codigo_repuesto", codigosRepuestos);

        // Update prices
        repuestosTemp.forEach(r => {
          const precio = preciosData?.find(p => p.codigo_repuesto === r.codigo);
          r.precio_unitario = precio?.costo_unitario || 0;
          r.subtotal = r.precio_unitario * r.cantidad;
        });
      }

      setRepuestosConPrecios(repuestosTemp);

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

  const handleAprobarPresupuesto = async () => {
    try {
      setProcessingDecision(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Determinar el flujo según el tipo de incidente
      const esCanjeoPorcentaje = incidente.status === "Porcentaje";
      
      if (esCanjeoPorcentaje) {
        // CANJE: Va directo a "Bodega pedido" (mismo flujo que CXG pero cliente pagó)
        const { error } = await supabase
          .from("incidentes")
          .update({ 
            status: "Bodega pedido" as const,
            presupuesto_cliente_aprobado: true,
            updated_at: new Date().toISOString()
          })
          .eq("id", id);

        if (error) throw error;

        // Registrar la notificación de aprobación
        await supabase
          .from("notificaciones_cliente")
          .insert({
            incidente_id: id,
            numero_notificacion: notificaciones.length + 1,
            canal: "sistema",
            mensaje: `Cliente aprobó canje (pago ${incidente.porcentaje_descuento || 40}%)`,
            notas: `Aprobación registrada por agente SAC. Incidente pasa a Bodega Pedido.`,
            enviado_por: user?.id,
            respondido: true,
            fecha_respuesta: new Date().toISOString()
          });

        toast.success("Cliente aprobó el canje. El incidente pasó a Bodega Pedido.");
      } else {
        // PRESUPUESTO: Vuelve a cola de reparación para que técnico verifique stock
        // Marcar la solicitud como aprobada
        if (solicitudRepuestos) {
          await supabase
            .from("solicitudes_repuestos")
            .update({ 
              presupuesto_aprobado: true,
              updated_at: new Date().toISOString()
            })
            .eq("id", solicitudRepuestos.id);
        }

        // Volver a "Ingresado" para que entre a la cola de reparación
        // Con marca de presupuesto aprobado y sin técnico asignado
        const { error } = await supabase
          .from("incidentes")
          .update({ 
            status: "Ingresado" as const,
            presupuesto_cliente_aprobado: true,
            tecnico_asignado_id: null, // Desasignar para que vuelva a la cola
            updated_at: new Date().toISOString()
          })
          .eq("id", id);

        if (error) throw error;

        // Registrar la notificación de aprobación
        await supabase
          .from("notificaciones_cliente")
          .insert({
            incidente_id: id,
            numero_notificacion: notificaciones.length + 1,
            canal: "sistema",
            mensaje: `Cliente aprobó presupuesto`,
            notas: `Aprobación registrada por agente SAC. Incidente vuelve a cola de reparación para verificar stock.`,
            enviado_por: user?.id,
            respondido: true,
            fecha_respuesta: new Date().toISOString()
          });

        toast.success("Cliente aprobó presupuesto. El incidente vuelve a cola de reparación.");
      }
      
      // Liberar el incidente y volver a la lista
      await handleReleaseIncident();
      
    } catch (error: any) {
      console.error("Error al aprobar presupuesto:", error);
      toast.error("Error al aprobar el presupuesto");
    } finally {
      setProcessingDecision(false);
    }
  };

  const handleRechazarPresupuesto = async () => {
    try {
      setProcessingDecision(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Rechazado - va a Pendiente Entrega para que el waterspider lo prepare
      const nuevoEstado = "Pendiente entrega" as const;

      // Actualizar estado del incidente
      const { error } = await supabase
        .from("incidentes")
        .update({ 
          status: nuevoEstado,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      // Registrar la notificación de rechazo
      await supabase
        .from("notificaciones_cliente")
        .insert({
          incidente_id: id,
          numero_notificacion: notificaciones.length + 1,
          canal: "sistema",
          mensaje: `Cliente rechazó ${incidente.status === "Porcentaje" ? "canje" : "presupuesto"}`,
          notas: `Rechazo registrado por agente SAC. Máquina lista para entrega.`,
          enviado_por: user?.id,
          respondido: true,
          fecha_respuesta: new Date().toISOString()
        });

      toast.success("Presupuesto rechazado. El incidente pasó a Pendiente Entrega para el Waterspider.");
      
      // Liberar el incidente y volver a la lista
      await handleReleaseIncident();
      
    } catch (error: any) {
      console.error("Error al rechazar presupuesto:", error);
      toast.error("Error al rechazar el presupuesto");
    } finally {
      setProcessingDecision(false);
    }
  };

  // Check if current status allows budget decisions
  const puedeTomarDecision = incidente?.status === "Presupuesto" || incidente?.status === "Porcentaje";

  // Calculate totals
  const totales = useMemo(() => {
    const subtotalRepuestos = repuestosConPrecios.reduce((sum, r) => sum + r.subtotal, 0);
    const manoObra = diagnostico?.costo_estimado ? 
      Number(diagnostico.costo_estimado) - subtotalRepuestos : 0;
    const total = diagnostico?.costo_estimado || subtotalRepuestos;
    
    // Calculate discount if Porcentaje
    let porcentajeDescuento = 0;
    if (incidente?.status === "Porcentaje") {
      // Try to detect from status or default to 40%
      porcentajeDescuento = 40; // Default discount percentage
    }
    const descuento = total * (porcentajeDescuento / 100);
    const totalConDescuento = total - descuento;

    return {
      subtotalRepuestos,
      manoObra: Math.max(0, manoObra),
      total,
      porcentajeDescuento,
      descuento,
      totalConDescuento
    };
  }, [repuestosConPrecios, diagnostico, incidente]);

  const canalOptions = [
    { value: "whatsapp", label: "WhatsApp" },
    { value: "email", label: "Email" },
    { value: "telefono", label: "Teléfono" }
  ];

  const diasDesdeIngreso = incidente ? differenceInDays(new Date(), new Date(incidente.fecha_ingreso)) : 0;

  // Prepare print data for diagnostico
  const printData: DiagnosticoPrintData | null = incidente && diagnostico ? {
    codigo: incidente.codigo,
    fechaIngreso: new Date(incidente.fecha_ingreso),
    fechaDiagnostico: diagnostico?.created_at ? new Date(diagnostico.created_at) : new Date(),
    centroServicio: incidente.centro_servicio || 'Centro de Servicio',
    codigoCliente: incidente.codigo_cliente,
    nombreCliente: cliente?.nombre || 'N/A',
    telefonoCliente: cliente?.celular || cliente?.telefono_principal || 'N/A',
    direccionEnvio: cliente?.direccion,
    codigoProducto: incidente.codigo_producto,
    descripcionProducto: producto?.descripcion || 'N/A',
    skuMaquina: incidente.sku_maquina || '',
    accesorios: incidente.accesorios ? incidente.accesorios.split(',').map((a: string) => a.trim()) : [],
    fallas: diagnostico?.fallas || [],
    causas: diagnostico?.causas || [],
    recomendaciones: diagnostico?.recomendaciones || '',
    tecnicoNombre: tecnico ? `${tecnico.nombre} ${tecnico.apellido}` : diagnostico?.tecnico_codigo || 'N/A',
    tipoResolucion: solicitudRepuestos?.tipo_resolucion || (incidente.status === 'Porcentaje' ? 'Canje' : incidente.status === 'Presupuesto' ? 'Presupuesto' : 'Diagnóstico'),
    aplicaGarantia: incidente.cobertura_garantia,
    repuestos: repuestosConPrecios.map(r => ({
      codigo: r.codigo,
      descripcion: r.descripcion,
      cantidad: r.cantidad,
      precioUnitario: r.precio_unitario
    })),
    costoManoObra: totales.manoObra,
    porcentajeDescuento: totales.porcentajeDescuento > 0 ? totales.porcentajeDescuento : undefined
  } : null;

  const handlePrintDiagnostico = () => {
    if (!printData) {
      toast.error("No hay diagnóstico disponible para imprimir");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Diagnóstico ${incidente.codigo}</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 0.5in; size: letter; }
          }
          body { font-size: 11px; font-family: Arial, sans-serif; }
        </style>
      </head>
      <body class="bg-white p-4">
        ${printRef.current?.innerHTML || ''}
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
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
      {/* Hidden print component */}
      <div className="hidden">
        <div ref={printRef}>
          {printData && <DiagnosticoPrintSheet data={printData} />}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" onClick={() => navigate("/sac/incidentes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Incidentes
        </Button>
        <div className="flex gap-2">
          {diagnostico && (
            <Button variant="outline" onClick={handlePrintDiagnostico}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Diagnóstico
            </Button>
          )}
          <Button variant="outline" onClick={handleReleaseIncident}>
            Liberar Incidente
          </Button>
        </div>
      </div>

      {/* Header with key info */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Incidente</p>
          <p className="text-xl font-bold">{incidente.codigo}</p>
        </div>
        <Separator orientation="vertical" className="h-10 hidden md:block" />
        <div>
          <p className="text-sm text-muted-foreground">Estado</p>
          <StatusBadge status={incidente.status as any} />
        </div>
        <Separator orientation="vertical" className="h-10 hidden md:block" />
        <div>
          <p className="text-sm text-muted-foreground">Días en sistema</p>
          <Badge variant={diasDesdeIngreso > 7 ? "destructive" : "secondary"} className="gap-1">
            <Clock className="h-3 w-3" />
            {diasDesdeIngreso} días
          </Badge>
        </div>
        <Separator orientation="vertical" className="h-10 hidden md:block" />
        <div>
          <p className="text-sm text-muted-foreground">Notificaciones</p>
          <Badge variant={notificaciones.length >= 3 ? "destructive" : "outline"}>
            {notificaciones.length}/3 enviadas
          </Badge>
        </div>
        {incidente.cobertura_garantia && (
          <>
            <Separator orientation="vertical" className="h-10 hidden md:block" />
            <Badge variant="default" className="bg-green-600">Con Garantía</Badge>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Contact Card - Prominent */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3 bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Información del Cliente
              </CardTitle>
              <CardDescription>Datos de contacto para notificación</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="font-semibold text-lg">{cliente?.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Código / NIT</p>
                    <p className="font-medium">{cliente?.codigo} | {cliente?.nit}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {cliente?.celular && (
                    <a 
                      href={`https://wa.me/502${cliente.celular.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                    >
                      <MessageCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Celular (WhatsApp)</p>
                        <p className="font-semibold text-green-700">{cliente.celular}</p>
                      </div>
                    </a>
                  )}
                  {cliente?.telefono_principal && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50">
                      <Phone className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Teléfono Principal</p>
                        <p className="font-semibold text-blue-700">{cliente.telefono_principal}</p>
                      </div>
                    </div>
                  )}
                  {cliente?.correo && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50">
                      <Mail className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Correo</p>
                        <p className="font-semibold text-purple-700 text-sm">{cliente.correo}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {(cliente?.direccion || cliente?.departamento) && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm">{cliente?.direccion}</p>
                      <p className="text-sm text-muted-foreground">
                        {cliente?.municipio && `${cliente.municipio}, `}{cliente?.departamento}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Summary - Very Prominent */}
          <Card className="border-2 border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-3 bg-orange-100/50">
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <DollarSign className="h-5 w-5" />
                Resumen de Costos
              </CardTitle>
              <CardDescription className="text-orange-700">
                {incidente.status === "Porcentaje" ? (
                  <span className="flex items-center gap-1">
                    <Percent className="h-4 w-4" />
                    Con descuento de {totales.porcentajeDescuento}% aplicado
                  </span>
                ) : (
                  "Presupuesto pendiente de aprobación"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {repuestosConPrecios.length > 0 ? (
                <div className="rounded-lg border bg-white overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Código</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-center">Cant.</TableHead>
                        <TableHead className="text-right">P. Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repuestosConPrecios.map((r, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">{r.codigo}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{r.descripcion}</TableCell>
                          <TableCell className="text-center">{r.cantidad}</TableCell>
                          <TableCell className="text-right">
                            {r.precio_unitario > 0 ? `Q ${r.precio_unitario.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {r.subtotal > 0 ? `Q ${r.subtotal.toFixed(2)}` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay repuestos registrados</p>
                </div>
              )}

              {/* Totals */}
              <div className="mt-4 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal Repuestos:</span>
                  <span>Q {totales.subtotalRepuestos.toFixed(2)}</span>
                </div>
                {totales.manoObra > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mano de Obra (estimada):</span>
                    <span>Q {totales.manoObra.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                {incidente.status === "Porcentaje" ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="line-through">Q {totales.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento ({totales.porcentajeDescuento}%):</span>
                      <span>- Q {totales.descuento.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-green-700 bg-green-100 p-3 rounded-lg">
                      <span>TOTAL A PAGAR:</span>
                      <span>Q {totales.totalConDescuento.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-lg font-bold text-orange-700 bg-orange-100 p-3 rounded-lg">
                    <span>TOTAL PRESUPUESTO:</span>
                    <span>Q {totales.total.toFixed(2)}</span>
                  </div>
                )}

                {/* Botones de decisión */}
                {puedeTomarDecision && (
                  <div className="mt-6 pt-4 border-t border-orange-200">
                    <p className="text-sm text-center text-muted-foreground mb-4">
                      ¿Cuál fue la decisión del cliente?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            className="w-full bg-green-600 hover:bg-green-700"
                            disabled={processingDecision}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Aprobó {incidente.status === "Porcentaje" ? "Canje" : "Presupuesto"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-green-700">
                              <CheckCircle className="h-5 w-5" />
                              Confirmar Aprobación
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <p>El cliente <strong>aprobó</strong> el {incidente.status === "Porcentaje" ? "canje" : "presupuesto"}.</p>
                              {incidente.status === "Porcentaje" ? (
                                <p className="text-sm bg-blue-50 p-2 rounded">
                                  El incidente pasará a <strong>Bodega Pedido</strong> y seguirá el flujo de cambio (cliente ya pagó).
                                </p>
                              ) : (
                                <p className="text-sm bg-blue-50 p-2 rounded">
                                  El incidente pasará a <strong>Pendiente por Repuestos</strong> y la solicitud aparecerá en bodega.
                                </p>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleAprobarPresupuesto}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Confirmar Aprobación
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive"
                            className="w-full"
                            disabled={processingDecision}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Rechazó {incidente.status === "Porcentaje" ? "Canje" : "Presupuesto"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                              <XCircle className="h-5 w-5" />
                              Confirmar Rechazo
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <p>El cliente <strong>rechazó</strong> el {incidente.status === "Porcentaje" ? "canje" : "presupuesto"}.</p>
                              <p className="text-sm bg-amber-50 p-2 rounded">
                                El incidente pasará a <strong>Pendiente Entrega</strong> para que el Waterspider prepare la devolución al cliente.
                              </p>
                              {incidente.quiere_envio ? (
                                <p className="text-xs text-muted-foreground">
                                  📦 El cliente indicó que quiere <strong>envío</strong>.
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  🏪 El cliente vendrá a <strong>recoger</strong> la máquina.
                                </p>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleRechazarPresupuesto}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Confirmar Rechazo
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Diagnosis Summary */}
          {diagnostico && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Diagnóstico Técnico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {diagnostico.fallas && diagnostico.fallas.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Fallas Encontradas</p>
                      <ul className="space-y-1">
                        {diagnostico.fallas.map((falla: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            {falla}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {diagnostico.causas && diagnostico.causas.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Causas</p>
                      <ul className="space-y-1">
                        {diagnostico.causas.map((causa: string, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground">• {causa}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {diagnostico.recomendaciones && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-1">Recomendaciones</p>
                    <p className="text-sm text-blue-700">{diagnostico.recomendaciones}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Product Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Producto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Código</p>
                  <p className="font-semibold">{producto?.codigo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="font-semibold">{producto?.descripcion}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Problema Reportado</p>
                  <p className="bg-muted p-2 rounded text-sm">{incidente.descripcion_problema}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Notifications */}
        <div className="space-y-6">
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-600" />
                Enviar Notificación ({notificaciones.length}/3)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <OutlinedSelect
                label="Canal de Notificación"
                value={canal}
                onValueChange={setCanal}
                options={canalOptions}
              />

              <OutlinedTextarea
                label="Mensaje para el cliente"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                required
              />

              <OutlinedTextarea
                label="Notas Internas (opcional)"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />

              <Button 
                className="w-full" 
                onClick={handleEnviarNotificacion}
                disabled={notificaciones.length >= 3}
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar Notificación
              </Button>

              {notificaciones.length >= 3 && (
                <p className="text-sm text-destructive text-center">
                  Límite de notificaciones alcanzado
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Notificaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notificaciones.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay notificaciones enviadas
                  </p>
                ) : (
                  notificaciones.map((notif) => (
                    <div key={notif.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={notif.respondido ? "default" : "secondary"}>
                          #{notif.numero_notificacion}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notif.fecha_envio).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {notif.canal === "whatsapp" && <MessageCircle className="h-4 w-4 text-green-600" />}
                        {notif.canal === "email" && <Mail className="h-4 w-4 text-purple-600" />}
                        {notif.canal === "telefono" && <Phone className="h-4 w-4 text-blue-600" />}
                        <span className="capitalize">{notif.canal}</span>
                        {notif.respondido && (
                          <Badge variant="outline" className="text-green-600 ml-auto">
                            Respondido
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notif.mensaje}</p>
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
