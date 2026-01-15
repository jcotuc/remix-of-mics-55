import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  FileText,
  CheckCircle,
  Printer,
  AlertTriangle,
  Wrench,
  Phone,
  Mail,
  Home,
  Truck,
  Edit,
  Save,
  Box,
  Clock,
  History,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { HistorialConObservaciones } from "@/components/HistorialConObservaciones";
import { CompactPhotoGallery } from "@/components/CompactPhotoGallery";
import { GuiaHPCLabel } from "@/components/GuiaHPCLabel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database["public"]["Tables"]["incidentes"]["Row"];
type ClienteDB = Database["public"]["Tables"]["clientes"]["Row"];
type ProductoDB = Database["public"]["Tables"]["productos"]["Row"];
type TecnicoDB = Database["public"]["Tables"]["tecnicos"]["Row"];
type DiagnosticoDB = Database["public"]["Tables"]["diagnosticos"]["Row"];
type DireccionEnvio = Database["public"]["Tables"]["direcciones_envio"]["Row"];
type GuiaEnvio = Database["public"]["Tables"]["guias_envio"]["Row"];

export default function SeguimientoIncidente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<IncidenteDB | null>(null);
  const [cliente, setCliente] = useState<ClienteDB | null>(null);
  const [producto, setProducto] = useState<ProductoDB | null>(null);
  const [tecnico, setTecnico] = useState<TecnicoDB | null>(null);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoDB | null>(null);
  const [direccionEnvio, setDireccionEnvio] = useState<DireccionEnvio | null>(null);
  const [guiasEnvio, setGuiasEnvio] = useState<GuiaEnvio[]>([]);
  const [clienteHistorial, setClienteHistorial] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isEditingProductCode, setIsEditingProductCode] = useState(false);
  const [editedProductCode, setEditedProductCode] = useState("");
  const [guiaSeleccionada, setGuiaSeleccionada] = useState<GuiaEnvio | null>(null);
  useEffect(() => {
    fetchData();
  }, [id]);
  const fetchData = async () => {
    try {
      // Fetch incident
      const { data: incData, error: incError } = await supabase.from("incidentes").select("*").eq("id", id).single();
      if (incError) throw incError;
      setIncidente(incData);

      // Fetch client
      if (incData.codigo_cliente) {
        const { data: clienteData } = await supabase
          .from("clientes")
          .select("*")
          .eq("codigo", incData.codigo_cliente)
          .maybeSingle();
        setCliente(clienteData);

        // Fetch client history
        const { count } = await supabase
          .from("incidentes")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("codigo_cliente", incData.codigo_cliente);
        setClienteHistorial(count || 0);
      }

      // Fetch product
      if (incData.codigo_producto) {
        const { data: prodData } = await supabase
          .from("productos")
          .select("*")
          .eq("codigo", incData.codigo_producto)
          .maybeSingle();
        setProducto(prodData);
      }

      // Fetch technician
      if (incData.codigo_tecnico) {
        const { data: tecData } = await supabase
          .from("tecnicos")
          .select("*")
          .eq("codigo", incData.codigo_tecnico)
          .maybeSingle();
        setTecnico(tecData);
      }

      // Fetch diagnostico
      const { data: diagData } = await supabase.from("diagnosticos").select("*").eq("incidente_id", id).maybeSingle();
      setDiagnostico(diagData);

      // Fetch direccion de envio si existe
      if (incData.direccion_envio_id) {
        const { data: dirData } = await supabase
          .from("direcciones_envio")
          .select("*")
          .eq("id", incData.direccion_envio_id)
          .maybeSingle();
        setDireccionEnvio(dirData);
      }

      // Fetch guías de envío asociadas al incidente
      const { data: guiasData } = await supabase
        .from("guias_envio")
        .select("*")
        .contains("incidentes_codigos", [incData.codigo])
        .order("fecha_guia", { ascending: false });
      setGuiasEnvio(guiasData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
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
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }
  if (!incidente) {
    return (
      <div className="container mx-auto p-6">
        <p>Incidente no encontrado</p>
        <Button onClick={() => navigate(-1)}>Volver</Button>
      </div>
    );
  }
  const handleEditProductCode = () => {
    setEditedProductCode(incidente?.codigo_producto || "");
    setIsEditingProductCode(true);
  };
  const handleSaveProductCode = async () => {
    const codePattern = /^[a-zA-Z0-9-_]+$/;
    if (!editedProductCode.trim() || !codePattern.test(editedProductCode)) {
      toast({
        title: "Error de validación",
        description: "El código solo puede contener letras, números, guiones y guiones bajos",
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase
        .from("incidentes")
        .update({
          codigo_producto: editedProductCode,
        })
        .eq("id", id);
      if (error) throw error;
      setIsEditingProductCode(false);
      toast({
        title: "Código actualizado",
        description: `Nuevo código: ${editedProductCode}`,
      });
      fetchData();
    } catch (error) {
      console.error("Error updating product code:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el código",
        variant: "destructive",
      });
    }
  };
  const handlePrint = () => {
    window.print();
  };
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
              <h1 className="text-2xl font-bold">{incidente.codigo}</h1>
              <StatusBadge status={incidente.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Ingresado:{" "}
              {format(new Date(incidente.fecha_ingreso), "dd 'de' MMMM 'de' yyyy", {
                locale: es,
              })}
            </p>
          </div>
        </div>
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Producto/Máquina Card - TOP PRIORITY */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
                {/* Tool Icon */}
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center shrink-0">
                  {producto?.url_foto ? (
                    <img
                      src={producto.url_foto}
                      alt={producto.descripcion}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Wrench className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {producto?.descripcion || `Producto: ${incidente.codigo_producto}`}
                    </h3>
                    {producto?.clave && <p className="text-sm text-muted-foreground">Clave: {producto.clave}</p>}
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">SKU:</span>
                      <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{incidente.codigo_producto}</code>
                      <Button variant="ghost" size="sm" className="h-6" onClick={handleEditProductCode}>
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                    {incidente.sku_maquina}
                  </div>

                  {producto?.descontinuado && (
                    <Badge variant="destructive">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Producto Descontinuado
                    </Badge>
                  )}
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
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{incidente.descripcion_problema}</p>
                  </div>

                  {incidente.accesorios && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Accesorios Incluidos</h4>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{incidente.accesorios}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Centro de Servicio</p>
                      <p className="text-sm font-medium">{incidente.centro_servicio || "No especificado"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tipología</p>
                      <p className="text-sm font-medium">{incidente.tipologia || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Garantía</p>
                      {incidente.cobertura_garantia ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Con Garantía
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Sin Garantía
                        </Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reingreso</p>
                      <Badge variant={incidente.es_reingreso ? "destructive" : "outline"} className="text-xs">
                        {incidente.es_reingreso ? "Sí" : "No"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Envío</p>
                      <div className="flex items-center gap-1">
                        {incidente.quiere_envio ? (
                          <>
                            <Truck className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">Sí</span>
                          </>
                        ) : (
                          <>
                            <Home className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">Recoge</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diagnóstico existente */}
          {diagnostico && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                  <Wrench className="w-5 h-5 text-primary mt-1" />
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">Estado: {diagnostico.estado}</div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Técnico:</span>
                        <p className="font-medium">{diagnostico.tecnico_codigo}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fecha:</span>
                        <p className="font-medium">
                          {diagnostico.created_at
                            ? format(new Date(diagnostico.created_at), "dd/MM/yyyy HH:mm", {
                                locale: es,
                              })
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    {diagnostico.fallas && diagnostico.fallas.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Fallas Identificadas</h4>
                        <div className="flex flex-wrap gap-2">
                          {diagnostico.fallas.map((falla: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {falla}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {diagnostico.causas && diagnostico.causas.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Causas</h4>
                        <div className="flex flex-wrap gap-2">
                          {diagnostico.causas.map((causa: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              {causa}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {diagnostico.resolucion && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Resolución</h4>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">{diagnostico.resolucion}</p>
                      </div>
                    )}

                    {(diagnostico.costo_estimado || diagnostico.tiempo_estimado) && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        {diagnostico.costo_estimado && (
                          <div>
                            <p className="text-xs text-muted-foreground">Costo Estimado</p>
                            <p className="text-lg font-semibold text-primary">
                              Q {Number(diagnostico.costo_estimado).toFixed(2)}
                            </p>
                          </div>
                        )}
                        {diagnostico.tiempo_estimado && (
                          <div>
                            <p className="text-xs text-muted-foreground">Tiempo Estimado</p>
                            <p className="font-medium">{diagnostico.tiempo_estimado}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historial y Observaciones - Combinado */}
          {id && (
            <HistorialConObservaciones
              incidenteId={id}
              logObservaciones={incidente.log_observaciones}
              headerVariant="clean"
            />
          )}
        </div>

        {/* Right Column - Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Cliente Card */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                <User className="w-4 h-4 text-primary mt-1" />
                <div className="space-y-3">
                  {cliente ? (
                    <>
                      <div>
                        <p className="font-semibold">{cliente.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {cliente.codigo} • NIT: {cliente.nit}
                        </p>
                      </div>
                      <Separator />
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span>{cliente.celular}</span>
                        </div>
                        {cliente.correo && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span className="truncate">{cliente.correo}</span>
                          </div>
                        )}
                        {cliente.direccion && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3 h-3 text-muted-foreground mt-0.5" />
                            <span className="text-xs">{cliente.direccion}</span>
                          </div>
                        )}
                      </div>
                      {clienteHistorial > 1 && (
                        <>
                          <Separator />
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <History className="w-3 h-3" />
                            <span>{clienteHistorial} incidentes en historial</span>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">Cliente no encontrado</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fotos del Incidente */}
          {id && <CompactPhotoGallery incidenteId={id} headerVariant="clean" />}

          {/* Técnico Asignado */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                <Wrench className="w-4 h-4 text-primary mt-1" />
                <div>
                  {tecnico && !["Ingresado", "En ruta", "Pendiente de diagnostico"].includes(incidente.status) ? (
                    <div className="space-y-2">
                      <p className="font-semibold">
                        {tecnico.nombre} {tecnico.apellido}
                      </p>
                      <p className="text-xs text-muted-foreground">Código: {tecnico.codigo}</p>
                      {tecnico.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="_toggle truncate">{tecnico.email}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">—</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Opción de Entrega */}
          {incidente.quiere_envio && direccionEnvio && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                  <Truck className="w-4 h-4 text-primary mt-1" />
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      {direccionEnvio.nombre_referencia && (
                        <p className="font-medium text-sm">{direccionEnvio.nombre_referencia}</p>
                      )}
                      <p className="text-sm">{direccionEnvio.direccion}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guías de Envío */}
          {guiasEnvio.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Guías ({guiasEnvio.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {guiasEnvio.map((guia) => (
                  <div key={guia.id} className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-medium">{guia.numero_guia}</span>
                          <Badge variant={guia.estado === "entregado" ? "default" : "secondary"} className="text-[10px]">
                            {guia.estado}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {guia.ciudad_destino}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={() => setGuiaSeleccionada(guia)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog para editar código de producto */}
      <Dialog open={isEditingProductCode} onOpenChange={setIsEditingProductCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Código de Producto (SKU)</DialogTitle>
            <DialogDescription>
              Modifica el código del producto. Solo se permiten letras, números, guiones y guiones bajos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="product-code-input" className="text-sm font-medium">
                Código de Producto
              </label>
              <Input
                id="product-code-input"
                type="text"
                value={editedProductCode}
                onChange={(e) => setEditedProductCode(e.target.value.replace(/\s/g, ""))}
                placeholder="Ej: PROD-12345"
                className="font-mono"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Formato: Solo alfanuméricos, guiones y guiones bajos (sin espacios)
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
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
