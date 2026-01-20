import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Package, ArrowLeft, Check, AlertTriangle, Send, Minus, Plus, 
  MapPin, User, Calendar, Clock, CheckCircle2, Box, Truck, XCircle, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type RepuestoSolicitado = {
  codigo: string;
  descripcion: string;
  cantidad: number;
  ubicacion?: string;
};

type Ubicacion = {
  id: string;
  ubicacion_legacy: string;
  cantidad: number;
  bodega: string | null;
};

type RepuestoDespacho = RepuestoSolicitado & {
  checked: boolean;
  cantidadDespachar: number;
  tieneDescuadre: boolean;
  notaDescuadre: string;
  ubicaciones: Ubicacion[];
  ubicacionSeleccionadaId: string | null;
};

export default function DetalleSolicitud() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState<any>(null);
  const [incidente, setIncidente] = useState<any>(null);
  const [repuestos, setRepuestos] = useState<RepuestoDespacho[]>([]);
  const [loading, setLoading] = useState(true);
  const [despachando, setDespachando] = useState(false);
  const [cerrandoSinStock, setCerrandoSinStock] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSinStockDialog, setShowSinStockDialog] = useState(false);
  const [showDescuadreDialog, setShowDescuadreDialog] = useState(false);
  const [selectedRepuestoIndex, setSelectedRepuestoIndex] = useState<number | null>(null);
  const [tempNotaDescuadre, setTempNotaDescuadre] = useState("");
  const [notaCierreSinStock, setNotaCierreSinStock] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [userCentroServicioId, setUserCentroServicioId] = useState<string | null>(null);
  const [tecnicoUserId, setTecnicoUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (id && userCentroServicioId) fetchSolicitud();
  }, [id, userCentroServicioId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("nombre, apellido, centro_servicio_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        setCurrentUserName(`${profile.nombre} ${profile.apellido}`);
        setUserCentroServicioId(profile.centro_servicio_id);
      }
    }
  };

  const fetchUbicaciones = async (codigos: string[]): Promise<Record<string, Ubicacion[]>> => {
    if (!userCentroServicioId || codigos.length === 0) return {};

    const { data, error } = await supabase
      .from("inventario")
      .select("id, codigo_repuesto, ubicacion_legacy, cantidad, bodega")
      .eq("centro_servicio_id", userCentroServicioId)
      .in("codigo_repuesto", codigos)
      .gt("cantidad", 0)
      .order("cantidad", { ascending: false });

    if (error) {
      console.error("Error fetching ubicaciones:", error);
      return {};
    }

    const ubicacionesPorCodigo: Record<string, Ubicacion[]> = {};
    data?.forEach((item) => {
      if (!ubicacionesPorCodigo[item.codigo_repuesto]) {
        ubicacionesPorCodigo[item.codigo_repuesto] = [];
      }
      ubicacionesPorCodigo[item.codigo_repuesto].push({
        id: item.id,
        ubicacion_legacy: item.ubicacion_legacy,
        cantidad: item.cantidad,
        bodega: item.bodega,
      });
    });

    return ubicacionesPorCodigo;
  };

  const fetchSolicitud = async () => {
    try {
      setLoading(true);
      
      const { data: sol, error: solError } = await supabase
        .from("solicitudes_repuestos")
        .select("*")
        .eq("id", id)
        .single();

      if (solError) throw solError;
      setSolicitud(sol);

      // Fetch incidente info and technician user_id
      if (sol?.incidente_id) {
        const { data: inc } = await supabase
          .from("incidentes")
          .select("codigo, codigo_producto, codigo_cliente, tecnico_asignado_id")
          .eq("id", sol.incidente_id)
          .maybeSingle();
        setIncidente(inc);
        
        // Get technician user_id for notifications
        if (inc?.tecnico_asignado_id) {
          setTecnicoUserId(inc.tecnico_asignado_id);
        }
      }

      // Parse repuestos from JSON field
      if (sol?.repuestos && Array.isArray(sol.repuestos)) {
        const repuestosList = sol.repuestos as RepuestoSolicitado[];
        const codigos = repuestosList.map(r => r.codigo);
        const ubicacionesPorCodigo = await fetchUbicaciones(codigos);

        const repuestosConDespacho: RepuestoDespacho[] = repuestosList.map(rep => {
          const ubicaciones = ubicacionesPorCodigo[rep.codigo] || [];
          return {
            ...rep,
            checked: false,
            cantidadDespachar: rep.cantidad,
            tieneDescuadre: false,
            notaDescuadre: "",
            ubicaciones,
            ubicacionSeleccionadaId: ubicaciones[0]?.id || null
          };
        });
        setRepuestos(repuestosConDespacho);
      }

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar solicitud");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckRepuesto = (index: number, checked: boolean) => {
    setRepuestos(prev => prev.map((rep, i) => 
      i === index ? { ...rep, checked } : rep
    ));
  };

  const handleCantidadChange = (index: number, cantidad: number) => {
    setRepuestos(prev => prev.map((rep, i) => {
      if (i === index) {
        const nuevaCantidad = Math.max(0, Math.min(cantidad, rep.cantidad));
        const tieneDescuadre = nuevaCantidad !== rep.cantidad;
        return { 
          ...rep, 
          cantidadDespachar: nuevaCantidad,
          tieneDescuadre
        };
      }
      return rep;
    }));
  };

  const handleUbicacionChange = (index: number, ubicacionId: string) => {
    setRepuestos(prev => prev.map((rep, i) => 
      i === index ? { ...rep, ubicacionSeleccionadaId: ubicacionId } : rep
    ));
  };

  const handleOpenDescuadreDialog = (index: number) => {
    setSelectedRepuestoIndex(index);
    setTempNotaDescuadre(repuestos[index].notaDescuadre);
    setShowDescuadreDialog(true);
  };

  const handleSaveDescuadre = () => {
    if (selectedRepuestoIndex !== null) {
      setRepuestos(prev => prev.map((rep, i) => 
        i === selectedRepuestoIndex 
          ? { ...rep, notaDescuadre: tempNotaDescuadre }
          : rep
      ));
    }
    setShowDescuadreDialog(false);
    setTempNotaDescuadre("");
    setSelectedRepuestoIndex(null);
  };

  const todosCheckeados = repuestos.length > 0 && repuestos.every(r => r.checked);
  const hayDescuadres = repuestos.some(r => r.tieneDescuadre);
  const descuadresSinNota = repuestos.filter(r => r.tieneDescuadre && !r.notaDescuadre.trim());
  
  // Detectar repuestos sin stock (cantidad a despachar = 0)
  const repuestosSinStock = repuestos.filter(r => r.cantidadDespachar === 0);
  const haySinStock = repuestosSinStock.length > 0;
  const todosSinStock = repuestos.length > 0 && repuestos.every(r => r.cantidadDespachar === 0);
  const hayAlgoParaDespachar = repuestos.some(r => r.cantidadDespachar > 0);

  const handleDespachar = async () => {
    if (descuadresSinNota.length > 0) {
      toast.error("Debe agregar una nota para todos los repuestos con descuadre");
      return;
    }

    setDespachando(true);
    try {
      const despachoInfo = repuestos.map(rep => ({
        codigo: rep.codigo,
        descripcion: rep.descripcion,
        cantidad_solicitada: rep.cantidad,
        cantidad_despachada: rep.cantidadDespachar,
        descuadre: rep.tieneDescuadre,
        nota_descuadre: rep.notaDescuadre || null
      }));

      const fechaDespachoActual = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("solicitudes_repuestos")
        .update({
          estado: "entregado",
          fecha_entrega: fechaDespachoActual,
          fecha_despacho: fechaDespachoActual,
          entregado_por: currentUserId,
          notas: hayDescuadres 
            ? `Despachado con descuadres por ${currentUserName}: ${JSON.stringify(despachoInfo.filter(d => d.descuadre))}`
            : `Despachado completo por ${currentUserName}`
        })
        .eq("id", id);

      if (updateError) throw updateError;

      await supabase.from("audit_logs").insert({
        tabla_afectada: "solicitudes_repuestos",
        registro_id: id,
        accion: "UPDATE",
        usuario_id: currentUserId,
        valores_nuevos: { estado: "entregado", despacho: despachoInfo },
        motivo: `Solicitud despachada por ${currentUserName}${hayDescuadres ? " con descuadres" : ""}`
      });

      toast.success("Solicitud despachada exitosamente");
      navigate("/bodega/solicitudes");

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al despachar solicitud");
    } finally {
      setDespachando(false);
      setShowConfirmDialog(false);
    }
  };

  // Nueva función para notificar falta de stock al técnico (sin cambiar status automáticamente)
  const handleCerrarSinStock = async () => {
    if (!notaCierreSinStock.trim()) {
      toast.error("Debe agregar un motivo para cerrar sin stock");
      return;
    }

    setCerrandoSinStock(true);
    try {
      const repuestosSinStockInfo = repuestosSinStock.map(rep => ({
        codigo: rep.codigo,
        descripcion: rep.descripcion,
        cantidad_solicitada: rep.cantidad,
        cantidad_disponible: 0
      }));

      // 1. Actualizar solicitud a "pendiente_decision_tecnico" en lugar de sin_stock
      const { error: updateSolicitudError } = await supabase
        .from("solicitudes_repuestos")
        .update({
          estado: "pendiente_decision_tecnico",
          notas: `Sin stock reportado por ${currentUserName}: ${notaCierreSinStock}. Repuestos sin stock: ${JSON.stringify(repuestosSinStockInfo)}. Esperando decisión del técnico.`
        })
        .eq("id", id);

      if (updateSolicitudError) throw updateSolicitudError;

      // 2. NO cambiar automáticamente el status del incidente
      // El técnico decidirá si el repuesto es indispensable

      // 3. Crear notificación para el técnico preguntando si desea continuar
      if (tecnicoUserId) {
        await supabase.from("notificaciones").insert({
          user_id: tecnicoUserId,
          incidente_id: solicitud?.incidente_id,
          tipo: "sin_stock_decision",
          mensaje: `⚠️ Sin stock para ${incidente?.codigo || "incidente"}: ${repuestosSinStockInfo.map(r => r.codigo).join(", ")}. ¿Continuar sin estos repuestos o esperar?`,
          metadata: {
            repuestos_sin_stock: repuestosSinStockInfo,
            solicitud_id: id,
            cerrado_por: currentUserName,
            motivo: notaCierreSinStock,
            fecha: new Date().toISOString(),
            requiere_decision: true
          }
        });
      }

      // 4. Registrar en audit_logs
      await supabase.from("audit_logs").insert({
        tabla_afectada: "solicitudes_repuestos",
        registro_id: id,
        accion: "UPDATE",
        usuario_id: currentUserId,
        valores_nuevos: { estado: "pendiente_decision_tecnico", repuestos_sin_stock: repuestosSinStockInfo },
        motivo: `Sin stock reportado por ${currentUserName}: ${notaCierreSinStock}. Pendiente decisión del técnico.`
      });

      toast.success("Se notificó al técnico sobre la falta de stock. Esperando su decisión.");
      navigate("/bodega/solicitudes");

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar solicitud");
    } finally {
      setCerrandoSinStock(false);
      setShowSinStockDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Package className="h-10 w-10 animate-pulse text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando solicitud...</p>
        </div>
      </div>
    );
  }

  const esEditable = solicitud?.estado === "en_proceso";
  const repuestosVerificados = repuestos.filter(r => r.checked).length;
  const stockTotal = repuestos.reduce((sum, r) => {
    const stockRep = r.ubicaciones.reduce((s, u) => s + u.cantidad, 0);
    return sum + stockRep;
  }, 0);

  // Detectar si es una solicitud de presupuesto pendiente de aprobación
  const esBloqueadoPorPresupuesto = 
    solicitud?.tipo_resolucion === "Presupuesto" && 
    solicitud?.presupuesto_aprobado === false;

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Solicitud de Repuestos</h1>
              {solicitud?.estado === "entregado" && (
                <Badge className="bg-green-500/15 text-green-600 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Despachado
                </Badge>
              )}
              {solicitud?.estado === "en_proceso" && (
                <Badge className="bg-blue-500/15 text-blue-600 border-blue-200">
                  <Clock className="h-3 w-3 mr-1" />
                  En Proceso
                </Badge>
              )}
              {solicitud?.estado === "pendiente" && (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
                  Pendiente
                </Badge>
              )}
            </div>
            {incidente && (
              <p className="text-muted-foreground mt-1">
                Incidente: <span className="font-mono font-medium">{incidente.codigo}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Banner de bloqueo por presupuesto pendiente */}
      {esBloqueadoPorPresupuesto && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
          <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-purple-700 dark:text-purple-300">
              Solicitud bloqueada - Pendiente aprobación de presupuesto
            </p>
            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
              Esta solicitud corresponde a un diagnóstico tipo "Presupuesto". 
              El despacho está bloqueado hasta que el cliente apruebe el presupuesto y SAC confirme la aprobación en el sistema.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/15">
                <Box className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{repuestos.length}</p>
                <p className="text-xs text-muted-foreground">Repuestos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/15">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{repuestosVerificados}/{repuestos.length}</p>
                <p className="text-xs text-muted-foreground">Verificados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/15">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stockTotal}</p>
                <p className="text-xs text-muted-foreground">Stock Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${hayDescuadres ? 'from-amber-500/5 to-amber-500/10 border-amber-500/20' : 'from-muted/30 to-muted/50 border-border'}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hayDescuadres ? 'bg-amber-500/15' : 'bg-muted'}`}>
                <AlertTriangle className={`h-5 w-5 ${hayDescuadres ? 'text-amber-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{repuestos.filter(r => r.tieneDescuadre).length}</p>
                <p className="text-xs text-muted-foreground">Descuadres</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Solicitante</p>
                <p className="font-medium text-sm">{solicitud?.tecnico_solicitante || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Truck className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Tipo despacho</p>
                <p className="font-medium text-sm capitalize">{solicitud?.tipo_despacho || "Normal"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Fecha solicitud</p>
                <p className="font-medium text-sm">
                  {solicitud?.created_at 
                    ? new Date(solicitud.created_at).toLocaleDateString("es-GT")
                    : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Tiempo transcurrido</p>
                <p className="font-medium text-sm">
                  {solicitud?.created_at 
                    ? formatDistanceToNow(new Date(solicitud.created_at), { locale: es, addSuffix: false })
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Repuestos Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Repuestos a Despachar
          </h2>
          {esEditable && (
            <p className="text-sm text-muted-foreground">
              Marque cada repuesto al verificar
            </p>
          )}
        </div>

        {repuestos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay repuestos en esta solicitud</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {repuestos.map((rep, index) => {
              const stockRep = rep.ubicaciones.reduce((s, u) => s + u.cantidad, 0);
              const hayStockSuficiente = stockRep >= rep.cantidad;
              const ubicacionSeleccionada = rep.ubicaciones.find(u => u.id === rep.ubicacionSeleccionadaId);

              return (
                <Card 
                  key={`${rep.codigo}-${index}`}
                  className={`overflow-hidden transition-all ${
                    rep.checked 
                      ? "ring-2 ring-green-500/50 bg-green-50/50 dark:bg-green-950/20" 
                      : ""
                  } ${
                    rep.tieneDescuadre 
                      ? "ring-2 ring-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20" 
                      : ""
                  }`}
                >
                  <CardContent className="p-0">
                    <div className="flex">
                      {/* Checkbox Column */}
                      {esEditable && (
                        <div className={`w-14 flex items-center justify-center border-r ${
                          rep.checked ? "bg-green-100 dark:bg-green-900/30" : "bg-muted/30"
                        }`}>
                          <Checkbox
                            checked={rep.checked}
                            onCheckedChange={(checked) => handleCheckRepuesto(index, checked as boolean)}
                            className="h-6 w-6"
                          />
                        </div>
                      )}

                      {/* Main Content */}
                      <div className="flex-1 p-4">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          {/* Repuesto Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="secondary" className="font-mono text-sm">
                                {rep.codigo}
                              </Badge>
                              {rep.tieneDescuadre && (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Descuadre
                                </Badge>
                              )}
                              {rep.checked && (
                                <Badge className="bg-green-100 text-green-700 border-green-300">
                                  <Check className="h-3 w-3 mr-1" />
                                  Verificado
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{rep.descripcion}</p>
                            
                            {rep.notaDescuadre && (
                              <p className="text-xs text-amber-700 mt-2 italic bg-amber-50 rounded px-2 py-1">
                                📝 {rep.notaDescuadre}
                              </p>
                            )}
                          </div>

                          {/* Ubicaciones */}
                          <div className="md:w-72 shrink-0">
                            {rep.ubicaciones.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {esEditable ? "Seleccionar ubicación de despacho" : "Ubicación de despacho"}
                                </p>
                                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                  {rep.ubicaciones.map((ub) => {
                                    const isSelected = ub.id === rep.ubicacionSeleccionadaId;
                                    return (
                                      <div
                                        key={ub.id}
                                        onClick={() => esEditable && handleUbicacionChange(index, ub.id)}
                                        className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 border cursor-pointer transition-all ${
                                          isSelected 
                                            ? "bg-primary/10 border-primary ring-1 ring-primary/30" 
                                            : "bg-background hover:bg-muted/50 border-border"
                                        } ${!esEditable ? "cursor-default" : ""}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {esEditable && (
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                              isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                                            }`}>
                                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>
                                          )}
                                          <span className={`font-mono ${isSelected ? "font-bold" : "font-medium"}`}>
                                            {ub.ubicacion_legacy}
                                          </span>
                                        </div>
                                        <Badge 
                                          variant="secondary" 
                                          className={`text-xs ${
                                            isSelected 
                                              ? (ub.cantidad >= rep.cantidad ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')
                                              : ''
                                          }`}
                                        >
                                          {ub.cantidad} disp.
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                                {ubicacionSeleccionada && ubicacionSeleccionada.cantidad < rep.cantidad && (
                                  <p className="text-xs text-amber-600 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Stock insuficiente en ubicación seleccionada
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 border border-red-200">
                                <p className="text-xs text-red-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Sin stock disponible
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Cantidad */}
                          <div className="md:w-36 shrink-0">
                            <p className="text-xs text-muted-foreground mb-2 text-center">
                              Solicitado: <span className="font-bold text-foreground">{rep.cantidad}</span>
                            </p>
                            {esEditable ? (
                              <div className="flex items-center gap-1 justify-center">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={() => handleCantidadChange(index, rep.cantidadDespachar - 1)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                  type="number"
                                  value={rep.cantidadDespachar}
                                  onChange={(e) => handleCantidadChange(index, parseInt(e.target.value) || 0)}
                                  className="w-14 text-center h-9 font-bold"
                                  min={0}
                                  max={rep.cantidad}
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={() => handleCantidadChange(index, rep.cantidadDespachar + 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <p className="text-center font-bold text-lg">{rep.cantidadDespachar}</p>
                            )}

                            {esEditable && rep.tieneDescuadre && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-2 text-amber-600 hover:text-amber-700 text-xs"
                                onClick={() => handleOpenDescuadreDialog(index)}
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {rep.notaDescuadre ? "Editar nota" : "Agregar nota"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {esEditable && !esBloqueadoPorPresupuesto && (
        <Card className="sticky bottom-4 shadow-lg">
          <CardContent className="py-4">
            {/* Alerta de repuestos sin stock */}
            {haySinStock && todosCheckeados && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                <XCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm">
                  <strong>{repuestosSinStock.length}</strong> repuesto(s) sin stock disponible para despachar
                </p>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm">
                {!todosCheckeados && (
                  <p className="text-muted-foreground">
                    Verifique todos los repuestos para habilitar acciones
                  </p>
                )}
                {todosCheckeados && !hayDescuadres && !haySinStock && (
                  <p className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Todos los repuestos verificados
                  </p>
                )}
                {todosCheckeados && hayDescuadres && !todosSinStock && (
                  <p className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {descuadresSinNota.length > 0 
                      ? `${descuadresSinNota.length} descuadre(s) sin nota`
                      : "Descuadres documentados"
                    }
                  </p>
                )}
                {todosCheckeados && todosSinStock && (
                  <p className="text-red-600 flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    No hay stock para despachar ningún repuesto
                  </p>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Cancelar
                </Button>
                
                {/* Botón Cerrar sin Stock - visible cuando hay repuestos sin stock */}
                {haySinStock && todosCheckeados && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowSinStockDialog(true)}
                    disabled={cerrandoSinStock}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Cerrar sin Stock
                  </Button>
                )}

                {/* Botón Despachar - solo si hay algo para despachar */}
                {hayAlgoParaDespachar && (
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={!todosCheckeados || despachando || descuadresSinNota.length > 0}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Despachar Solicitud
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer bloqueado por presupuesto */}
      {esEditable && esBloqueadoPorPresupuesto && (
        <Card className="sticky bottom-4 shadow-lg border-purple-200 dark:border-purple-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm">
                <p className="text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Despacho bloqueado - Esperando aprobación del presupuesto
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Regresar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Despacho Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Despacho</AlertDialogTitle>
            <AlertDialogDescription>
              {hayDescuadres ? (
                <div className="space-y-2">
                  <p>Esta solicitud tiene <strong>{repuestos.filter(r => r.tieneDescuadre).length}</strong> repuesto(s) con descuadre.</p>
                  <p className="text-amber-600">
                    Asegúrese de haber documentado el motivo de cada descuadre.
                  </p>
                </div>
              ) : (
                <p>¿Está seguro de que desea marcar esta solicitud como despachada?</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDespachar} disabled={despachando}>
              {despachando ? "Despachando..." : "Confirmar Despacho"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Cerrar sin Stock */}
      <Dialog open={showSinStockDialog} onOpenChange={setShowSinStockDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Cerrar Solicitud sin Stock
            </DialogTitle>
            <DialogDescription>
              Esta acción cerrará la solicitud y el incidente pasará a estado <strong>"Pendiente por repuestos"</strong>.
              Se notificará al técnico asignado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Lista de repuestos sin stock */}
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                Repuestos sin stock:
              </p>
              <ul className="text-sm space-y-1">
                {repuestosSinStock.map((rep, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <span className="font-mono text-xs bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                      {rep.codigo}
                    </span>
                    <span className="truncate text-xs">{rep.descripcion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Motivo */}
            <div>
              <Label htmlFor="nota-sin-stock" className="text-sm font-medium">
                Motivo del cierre (obligatorio)
              </Label>
              <Textarea
                id="nota-sin-stock"
                value={notaCierreSinStock}
                onChange={(e) => setNotaCierreSinStock(e.target.value)}
                placeholder="Ej: Descuadre de inventario, repuesto dañado, etc..."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSinStockDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCerrarSinStock}
              disabled={cerrandoSinStock || !notaCierreSinStock.trim()}
            >
              {cerrandoSinStock ? "Cerrando..." : "Confirmar Cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Descuadre Dialog */}
      <Dialog open={showDescuadreDialog} onOpenChange={setShowDescuadreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Reportar Descuadre
            </DialogTitle>
            <DialogDescription>
              {selectedRepuestoIndex !== null && (
                <>
                  Código: <strong>{repuestos[selectedRepuestoIndex]?.codigo}</strong>
                  <br />
                  Solicitado: {repuestos[selectedRepuestoIndex]?.cantidad} | 
                  Despachando: {repuestos[selectedRepuestoIndex]?.cantidadDespachar}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="nota-descuadre">Motivo del descuadre</Label>
            <Textarea
              id="nota-descuadre"
              value={tempNotaDescuadre}
              onChange={(e) => setTempNotaDescuadre(e.target.value)}
              placeholder="Describa el motivo del descuadre..."
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDescuadreDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDescuadre}>
              Guardar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
