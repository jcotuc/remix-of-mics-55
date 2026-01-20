import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Calendar,
  User,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  FileText,
  Wrench,
  Save,
  MapPin,
  Phone,
  Mail,
  History,
  Box,
  Eye,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { DiagnosticoTecnico } from "@/components/DiagnosticoTecnico";
import { IncidentTimeline } from "@/components/IncidentTimeline";
import { ObservacionesLog } from "@/components/ObservacionesLog";
import { CompactPhotoGallery } from "@/components/CompactPhotoGallery";
import { GuiaHPCLabel } from "@/components/GuiaHPCLabel";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toastHelpers";
import { formatFechaLarga, formatFechaHora } from "@/utils/dateFormatters";
import type { Database } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";

type IncidenteDB = Database["public"]["Tables"]["incidentes"]["Row"];

export default function DetalleIncidente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incidenteDB, setIncidenteDB] = useState<IncidenteDB | null>(null);
  const [productoInfo, setProductoInfo] = useState<any>(null);
  const [clienteInfo, setClienteInfo] = useState<any>(null);
  const [diagnosticoInfo, setDiagnosticoInfo] = useState<any>(null);
  const [guiasEnvio, setGuiasEnvio] = useState<any[]>([]);
  const [clienteHistorial, setClienteHistorial] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Estado para editar código de producto
  const [isEditingProductCode, setIsEditingProductCode] = useState(false);
  const [editedProductCode, setEditedProductCode] = useState("");
  
  // Estado para visualizar etiqueta de guía
  const [guiaSeleccionada, setGuiaSeleccionada] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchIncidente();
    }
  }, [id]);

  const fetchIncidente = async () => {
    setLoading(true);
    try {
      // Obtener incidente de la base de datos
      const { data: dbIncidente, error } = await supabase.from("incidentes").select("*").eq("id", id).maybeSingle();

      if (dbIncidente && !error) {
        setIncidenteDB(dbIncidente);

        // Fetch producto
        const { data: producto } = await supabase
          .from("productos")
          .select("*")
          .eq("codigo", dbIncidente.codigo_producto)
          .maybeSingle();
        if (producto) setProductoInfo(producto);

        // Fetch cliente
        const { data: cliente } = await supabase
          .from("clientes")
          .select("*")
          .eq("codigo", dbIncidente.codigo_cliente)
          .maybeSingle();
        if (cliente) setClienteInfo(cliente);

        // Fetch diagnóstico
        const { data: diagnostico } = await supabase
          .from("diagnosticos")
          .select("*")
          .eq("incidente_id", id)
          .maybeSingle();
        if (diagnostico) setDiagnosticoInfo(diagnostico);

        // Fetch guías de envío
        const { data: guias } = await supabase
          .from("guias_envio")
          .select("*")
          .contains("incidentes_codigos", [dbIncidente.codigo])
          .order("fecha_guia", { ascending: false });
        if (guias) setGuiasEnvio(guias);

        // Fetch historial del cliente (count de incidentes anteriores)
        const { count } = await supabase
          .from("incidentes")
          .select("*", { count: "exact", head: true })
          .eq("codigo_cliente", dbIncidente.codigo_cliente);
        setClienteHistorial(count || 0);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Editar código de producto
  const handleEditProductCode = () => {
    setEditedProductCode(incidenteDB?.codigo_producto || "");
    setIsEditingProductCode(true);
  };

  const handleSaveProductCode = async () => {
    const codePattern = /^[a-zA-Z0-9-_]+$/;
    if (!editedProductCode.trim() || !codePattern.test(editedProductCode)) {
      showError("El código solo puede contener letras, números, guiones y guiones bajos", "Error de validación");
      return;
    }

    try {
      const { error } = await supabase.from("incidentes").update({ codigo_producto: editedProductCode }).eq("id", id);

      if (error) throw error;

      setIncidenteDB((prev) => (prev ? { ...prev, codigo_producto: editedProductCode } : null));

      const { data: nuevoProducto } = await supabase
        .from("productos")
        .select("*")
        .eq("codigo", editedProductCode)
        .maybeSingle();

      if (nuevoProducto) setProductoInfo(nuevoProducto);
      setIsEditingProductCode(false);

      showSuccess(`Nuevo código: ${editedProductCode}`, "Código actualizado");
    } catch (error) {
      console.error("Error:", error);
      showError("No se pudo actualizar el código");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!incidenteDB) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate("/incidentes")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Incidentes
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Incidente no encontrado</h2>
            <p className="text-muted-foreground">El incidente con ID "{id}" no existe.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine status and other data from DB
  const currentStatus = incidenteDB?.status || "Pendiente de diagnostico";
  const currentCodigo = incidenteDB?.codigo || "";
  const codigoProducto = incidenteDB?.codigo_producto || "";
  const codigoCliente = incidenteDB?.codigo_cliente || "";
  const fechaIngreso = incidenteDB?.fecha_ingreso || "";
  const descripcionProblema = incidenteDB?.descripcion_problema || "";
  const accesorios = incidenteDB?.accesorios || "";
  const coberturaGarantia = incidenteDB?.cobertura_garantia ?? false;
  const logObservaciones = incidenteDB?.log_observaciones || null;
  const skuMaquina = incidenteDB?.sku_maquina || "";

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{currentCodigo}</h1>
              <StatusBadge status={currentStatus as any} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Ingresado:{" "}
              {fechaIngreso ? formatFechaLarga(fechaIngreso) : "N/A"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {coberturaGarantia ? (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
              <CheckCircle className="w-3 h-3 mr-1" />
              Con Garantía
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              Sin Garantía
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Producto/Máquina Card - TOP PRIORITY */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                <Package className="w-5 h-5 text-primary mt-1" />
                <div className="flex gap-6">
                  {/* Product Image */}
                  <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    {productoInfo?.url_foto ? (
                      <img
                        src={productoInfo.url_foto}
                        alt={productoInfo.descripcion}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Box className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {productoInfo?.descripcion || `Producto: ${codigoProducto}`}
                      </h3>
                      {productoInfo?.clave && (
                        <p className="text-sm text-muted-foreground">Clave: {productoInfo.clave}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Código SKU:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{codigoProducto}</code>
                          <Button variant="ghost" size="sm" className="h-6" onClick={handleEditProductCode}>
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {skuMaquina && (
                        <div>
                          <span className="text-muted-foreground">SKU Máquina:</span>
                          <p className="font-mono text-xs mt-1">{skuMaquina}</p>
                        </div>
                      )}
                    </div>

                    {productoInfo?.descontinuado && (
                      <Badge variant="destructive" className="mt-2">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Producto Descontinuado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detalles del Incidente */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                <FileText className="w-5 h-5 text-primary mt-1" />
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Problema Reportado</h4>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{descripcionProblema}</p>
                  </div>

                  {accesorios && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Accesorios Incluidos</h4>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{accesorios}</p>
                    </div>
                  )}

                  {/* Guías de envío si existen */}
                  {guiasEnvio.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Guías de Envío ({guiasEnvio.length})
                      </h4>
                      <div className="space-y-2">
                        {guiasEnvio.map((guia) => (
                          <div key={guia.id} className="bg-muted/50 p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-mono font-medium text-sm">{guia.numero_guia}</span>
                                <p className="text-xs text-muted-foreground">
                                  {guia.destinatario}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {guia.ciudad_destino}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setGuiaSeleccionada(guia)}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Ver Etiqueta
                                </Button>
                                <Badge variant={guia.estado === "entregado" ? "default" : "secondary"}>
                                  {guia.estado}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diagnóstico Section (si está en diagnóstico) */}
          {incidenteDB && incidenteDB.status === "En diagnostico" && (
            <DiagnosticoTecnico incidente={incidenteDB} onDiagnosticoCompleto={fetchIncidente} />
          )}

          {/* Diagnóstico existente */}
          {diagnosticoInfo && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                  <Wrench className="w-5 h-5 text-primary mt-1" />
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Técnico:</span>
                        <p className="font-medium">{diagnosticoInfo.tecnico_codigo}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fecha:</span>
                        <p className="font-medium">
                          {diagnosticoInfo.created_at
                            ? formatFechaHora(diagnosticoInfo.created_at)
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    {diagnosticoInfo.fallas && diagnosticoInfo.fallas.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Fallas Identificadas</h4>
                        <div className="flex flex-wrap gap-2">
                          {diagnosticoInfo.fallas.map((falla: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {falla}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {diagnosticoInfo.resolucion && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Resolución</h4>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">{diagnosticoInfo.resolucion}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historial de Eventos - Timeline */}
          {id && <IncidentTimeline incidenteId={id} />}

          {/* Log de Observaciones */}
          {logObservaciones && <ObservacionesLog logObservaciones={logObservaciones} />}
        </div>

        {/* Right Column - Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Cliente Card */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                <User className="w-4 h-4 text-primary mt-1" />
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold">{clienteInfo?.nombre || "Cliente no encontrado"}</h4>
                    <p className="text-sm text-muted-foreground">Código: {codigoCliente}</p>
                  </div>

                  {clienteInfo && (
                    <>
                      <div className="space-y-2 text-sm">
                        {clienteInfo.nit && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-muted-foreground" />
                            <span>{clienteInfo.nit}</span>
                          </div>
                        )}
                        {clienteInfo.celular && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span>{clienteInfo.celular}</span>
                          </div>
                        )}
                        {clienteInfo.correo && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span className="truncate">{clienteInfo.correo}</span>
                          </div>
                        )}
                        {clienteInfo.direccion && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3 h-3 text-muted-foreground mt-0.5" />
                            <span className="text-xs">{clienteInfo.direccion}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Historial del cliente */}
                  {clienteHistorial > 1 && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <History className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {clienteHistorial} incidente{clienteHistorial > 1 ? "s" : ""} en total
                        </span>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        className="px-0 h-auto text-xs"
                        onClick={() => navigate(`/clientes/${clienteInfo?.id || codigoCliente}`)}
                      >
                        Ver historial completo →
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fotos del Incidente */}
          {id && <CompactPhotoGallery incidenteId={id} headerVariant="clean" />}

          {/* Técnico Asignado */}
          {incidenteDB?.codigo_tecnico && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                  <Wrench className="w-4 h-4 text-primary mt-1" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        Técnico: {incidenteDB.codigo_tecnico}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Código: {incidenteDB.codigo_tecnico}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estado Rápido */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                <Calendar className="w-4 h-4 text-primary mt-1" />
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Centro de Servicio</span>
                    <span className="font-medium">{incidenteDB?.centro_servicio || "Central"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipología</span>
                    <span className="font-medium">{incidenteDB?.tipologia || "N/A"}</span>
                  </div>
                  {incidenteDB?.es_reingreso && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reingreso</span>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Sí
                      </Badge>
                    </div>
                  )}
                  {incidenteDB?.quiere_envio && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Envío</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Solicitado
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog para editar código de producto */}
      <Dialog open={isEditingProductCode} onOpenChange={setIsEditingProductCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Código de Producto</DialogTitle>
            <DialogDescription>Modifica el código de producto asociado a este incidente.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nuevo Código</label>
              <Input
                value={editedProductCode}
                onChange={(e) => setEditedProductCode(e.target.value.toUpperCase())}
                placeholder="Ej: PROD-001"
              />
              <p className="text-xs text-muted-foreground">Solo letras, números, guiones y guiones bajos</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingProductCode(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProductCode}>
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver etiqueta de guía */}
      <Dialog open={guiaSeleccionada !== null} onOpenChange={() => setGuiaSeleccionada(null)}>
        <DialogContent className="sm:max-w-md print:max-w-full print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Etiqueta de Guía</DialogTitle>
            <DialogDescription>Vista previa de la etiqueta para impresión</DialogDescription>
          </DialogHeader>

          {guiaSeleccionada && (
            <div className="print-content">
              <GuiaHPCLabel guia={guiaSeleccionada} />
            </div>
          )}

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setGuiaSeleccionada(null)}>
              Cerrar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
