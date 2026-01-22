import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; // Only for auth
import { apiBackendAction } from "@/lib/api-backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Phone, Mail, MessageCircle, Package, User, AlertTriangle, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared";
import { differenceInDays } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database["public"]["Tables"]["incidentes"]["Row"];
type ClienteDB = Database["public"]["Tables"]["clientes"]["Row"];
type ProductoDB = Database["public"]["Tables"]["productos"]["Row"];
type DiagnosticoDB = Database["public"]["Tables"]["diagnosticos"]["Row"];
type UsuarioDB = Database["public"]["Tables"]["usuarios"]["Row"];

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
  
  // Estado para nueva notificación
  const [canal, setCanal] = useState<string>("whatsapp");
  const [mensaje, setMensaje] = useState<string>("");
  const [processingDecision, setProcessingDecision] = useState(false);

  useEffect(() => {
    fetchData();
    assignIncident();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const assignIncident = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile via apiBackendAction
      const { result: userProfile } = await apiBackendAction("usuarios.getByEmail", { email: user.email || "" });

      if (!userProfile) return;

      // Check if already assigned to someone via apiBackendAction
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
        // Assign to current user via apiBackendAction
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

      // Fetch incident using apiBackendAction
      const incidenteResult = await apiBackendAction("incidentes.get", { id: Number(id) });
      const incData = incidenteResult.result;
      
      if (!incData) {
        toast.error("Incidente no encontrado");
        return;
      }
      
      // Map schema to local types - schema uses nested cliente/producto objects
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
        tipo_resolucion: null,
        tracking_token: null,
      } as unknown as IncidenteDB;
      
      setIncidente(incidenteData);

      // Set cliente from nested object
      if (incData.cliente) {
        setCliente(incData.cliente as unknown as ClienteDB);
      }

      // Set producto from nested object
      if (incData.producto) {
        setProducto(incData.producto as unknown as ProductoDB);
      }

      // Fetch diagnosis via apiBackendAction
      const diagnosticoResult = await apiBackendAction("diagnosticos.search", { incidente_id: Number(id) });
      const diagnosticoData = diagnosticoResult.results?.[0] || null;
      setDiagnostico(diagnosticoData as unknown as DiagnosticoDB | null);

      // Fetch tecnico info from nested tecnico object in diagnostico
      if (diagnosticoData?.tecnico) {
        setTecnico(diagnosticoData.tecnico as unknown as UsuarioDB);
      }

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

  const handleAprobarPresupuesto = async () => {
    if (!incidente) return;
    
    try {
      setProcessingDecision(true);

      // Update to En Reparación via apiBackendAction
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

      // Update to En Entrega (for return) via apiBackendAction
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cliente Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-semibold">{cliente?.nombre || "Desconocido"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Código</p>
                  <p className="font-semibold">{cliente?.codigo || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{cliente?.telefono_principal || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{cliente?.correo || "-"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Producto Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Información del Producto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Código SKU</p>
                  <p className="font-semibold font-mono">{producto?.codigo || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="font-semibold">{producto?.descripcion || "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Problema Reportado</p>
                <p className="mt-1">{incidente.descripcion_problema || "Sin descripción"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Diagnóstico */}
          {diagnostico && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Diagnóstico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <Badge>{diagnostico.estado}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Es Reparable</p>
                    <p className="font-semibold">{diagnostico.es_reparable ? "Sí" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aplica Garantía</p>
                    <p className="font-semibold">{diagnostico.aplica_garantia ? "Sí" : "No"}</p>
                  </div>
                </div>
                {tecnico && (
                  <div>
                    <p className="text-sm text-muted-foreground">Técnico</p>
                    <p className="font-semibold">{tecnico.nombre} {tecnico.apellido}</p>
                  </div>
                )}
                {diagnostico.recomendaciones && (
                  <div>
                    <p className="text-sm text-muted-foreground">Recomendaciones</p>
                    <p className="mt-1">{diagnostico.recomendaciones}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Acciones */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {incidente.estado === "ESPERA_APROBACION" && (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full gap-2" disabled={processingDecision}>
                        <CheckCircle className="h-4 w-4" />
                        Cliente Aprobó
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
                        <AlertDialogDescription>
                          ¿El cliente aprobó el presupuesto? El incidente pasará a reparación.
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
                      <Button variant="destructive" className="w-full gap-2" disabled={processingDecision}>
                        <XCircle className="h-4 w-4" />
                        Cliente Rechazó
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
                </>
              )}

              <Separator />

              <Button variant="outline" className="w-full gap-2" onClick={handleReleaseIncident}>
                Liberar Incidente
              </Button>
            </CardContent>
          </Card>

          {/* Contacto Rápido */}
          <Card>
            <CardHeader>
              <CardTitle>Contacto Rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cliente?.telefono_principal && (
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => window.open(`https://wa.me/502${cliente.telefono_principal?.replace(/\D/g, '')}`, '_blank')}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              )}
              {cliente?.telefono_principal && (
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => window.open(`tel:${cliente.telefono_principal}`, '_blank')}
                >
                  <Phone className="h-4 w-4" />
                  Llamar
                </Button>
              )}
              {cliente?.correo && (
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => window.open(`mailto:${cliente.correo}`, '_blank')}
                >
                  <Mail className="h-4 w-4" />
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
