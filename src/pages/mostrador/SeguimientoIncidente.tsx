import { useEffect, useState, useRef } from "react";
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
import { StatusBadge, CompactPhotoGallery } from "@/components/shared";
import { HistorialConObservaciones, IncidentePrintSheet } from "@/components/features/incidentes";
import { GuiaHPCLabel } from "@/components/features/logistica";
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
import { showSuccess, showError } from "@/utils/toastHelpers";
import { formatFechaLarga, formatFechaHora } from "@/utils/dateFormatters";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database["public"]["Tables"]["incidentes"]["Row"];
type ClienteDB = Database["public"]["Tables"]["clientes"]["Row"];
type ProductoDB = Database["public"]["Tables"]["productos"]["Row"];
type DiagnosticoDB = Database["public"]["Tables"]["diagnosticos"]["Row"];
type DireccionEnvio = Database["public"]["Tables"]["direcciones_envio"]["Row"];
type GuiaDB = Database["public"]["Tables"]["guias"]["Row"];
type UsuarioDB = Database["public"]["Tables"]["usuarios"]["Row"];

export default function SeguimientoIncidente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<IncidenteDB | null>(null);
  const [cliente, setCliente] = useState<ClienteDB | null>(null);
  const [producto, setProducto] = useState<ProductoDB | null>(null);
  const [tecnico, setTecnico] = useState<UsuarioDB | null>(null);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoDB | null>(null);
  const [direccionEnvio, setDireccionEnvio] = useState<DireccionEnvio | null>(null);
  const [guiasEnvio, setGuiasEnvio] = useState<GuiaDB[]>([]);
  const [clienteHistorial, setClienteHistorial] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isEditingProductCode, setIsEditingProductCode] = useState(false);
  const [editedProductCode, setEditedProductCode] = useState("");
  const [guiaSeleccionada, setGuiaSeleccionada] = useState<GuiaDB | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch incident
      const { data: incData, error: incError } = await supabase
        .from("incidentes")
        .select("*")
        .eq("id", Number(id))
        .single();
      if (incError) throw incError;
      setIncidente(incData);

      // Fetch client
      if (incData.cliente_id) {
        const { data: clienteData } = await supabase
          .from("clientes")
          .select("*")
          .eq("id", incData.cliente_id)
          .maybeSingle();
        setCliente(clienteData);

        // Fetch client history
        if (clienteData) {
          const { count } = await supabase
            .from("incidentes")
            .select("*", { count: "exact", head: true })
            .eq("cliente_id", clienteData.id);
          setClienteHistorial(count || 0);
        }
      }

      // Fetch product
      if (incData.producto_id) {
        const { data: prodData } = await supabase
          .from("productos")
          .select("*")
          .eq("id", incData.producto_id)
          .maybeSingle();
        setProducto(prodData);
      }

      // Fetch technician from incidente_tecnico
      const { data: incTecData } = await supabase
        .from("incidente_tecnico")
        .select("tecnico_id")
        .eq("incidente_id", Number(id))
        .eq("es_principal", true)
        .maybeSingle();
      
      if (incTecData?.tecnico_id) {
        const { data: tecData } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", incTecData.tecnico_id)
          .maybeSingle();
        setTecnico(tecData);
      }

      // Fetch diagnostico
      const { data: diagData } = await supabase
        .from("diagnosticos")
        .select("*")
        .eq("incidente_id", Number(id))
        .maybeSingle();
      setDiagnostico(diagData);

      // Fetch direccion de envio si existe
      if (incData.direccion_entrega_id) {
        const { data: dirData } = await supabase
          .from("direcciones_envio")
          .select("*")
          .eq("id", incData.direccion_entrega_id)
          .maybeSingle();
        setDireccionEnvio(dirData);
      }

      // Fetch guías de envío asociadas al incidente
      const { data: guiasData } = await supabase
        .from("guias")
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        </div>
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

  const handleEditProductCode = () => {
    setEditedProductCode(producto?.codigo || "");
    setIsEditingProductCode(true);
  };

  const handleSaveProductCode = async () => {
    if (!editedProductCode.trim()) {
      showError("El código de producto no puede estar vacío");
      return;
    }

    try {
      // Buscar el producto por código
      const { data: newProdData, error: prodError } = await supabase
        .from("productos")
        .select("*")
        .eq("codigo", editedProductCode.toUpperCase())
        .maybeSingle();

      if (prodError) throw prodError;

      if (!newProdData) {
        showError("Producto no encontrado");
        return;
      }

      // Actualizar el incidente
      const { error: updateError } = await supabase
        .from("incidentes")
        .update({ producto_id: newProdData.id })
        .eq("id", incidente.id);

      if (updateError) throw updateError;

      setProducto(newProdData);
      setIsEditingProductCode(false);
      showSuccess("Código de producto actualizado");
    } catch (error) {
      console.error("Error updating product code:", error);
      showError("Error al actualizar el código de producto");
    }
  };

  const handlePrintIngreso = () => {
    setShowPrintPreview(true);
  };

  const handlePrintFromPreview = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Hoja de Ingreso - ${incidente.codigo}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                @media print { body { padding: 0; } }
              </style>
            </head>
            <body>${printContent}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{incidente.codigo}</h1>
            <p className="text-muted-foreground">Seguimiento de incidente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={incidente.estado} />
          <Button variant="outline" size="sm" onClick={handlePrintIngreso}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Producto Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Información del Producto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Código SKU</p>
                  {isEditingProductCode ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={editedProductCode}
                        onChange={(e) => setEditedProductCode(e.target.value.toUpperCase())}
                        className="w-40"
                      />
                      <Button size="sm" onClick={handleSaveProductCode}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{producto?.codigo || "Sin asignar"}</p>
                      <Button variant="ghost" size="icon" onClick={handleEditProductCode}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <Badge>{diagnostico.estado}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Es Reparable</p>
                    <p className="font-semibold">
                      {diagnostico.es_reparable ? "Sí" : "No"}
                    </p>
                  </div>
                </div>
                {diagnostico.recomendaciones && (
                  <div>
                    <p className="text-sm text-muted-foreground">Recomendaciones</p>
                    <p className="mt-1">{diagnostico.recomendaciones}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Historial */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial y Observaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HistorialConObservaciones incidenteId={String(incidente.id)} />
            </CardContent>
          </Card>

          {/* Fotos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Fotos del Incidente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CompactPhotoGallery incidenteId={String(incidente.id)} />
            </CardContent>
          </Card>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cliente Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold">{cliente?.nombre || "Desconocido"}</p>
                <p className="text-sm text-muted-foreground">Código: {cliente?.codigo}</p>
              </div>
              {cliente?.telefono_principal && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{cliente.telefono_principal}</span>
                </div>
              )}
              {cliente?.correo && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{cliente.correo}</span>
                </div>
              )}
              {cliente?.direccion && (
                <div className="flex items-center gap-2 text-sm">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>{cliente.direccion}</span>
                </div>
              )}
              <Separator />
              <div className="text-sm text-muted-foreground">
                {clienteHistorial} incidentes en historial
              </div>
            </CardContent>
          </Card>

          {/* Técnico */}
          {tecnico && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Técnico Asignado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{tecnico.nombre} {tecnico.apellido}</p>
                <p className="text-sm text-muted-foreground">{tecnico.email}</p>
              </CardContent>
            </Card>
          )}

          {/* Dirección de Envío */}
          {direccionEnvio && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Dirección de Envío
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>{direccionEnvio.direccion_completa}</p>
                {direccionEnvio.nombre_contacto && (
                  <p className="text-sm">Contacto: {direccionEnvio.nombre_contacto}</p>
                )}
                {direccionEnvio.telefono_contacto && (
                  <p className="text-sm">Tel: {direccionEnvio.telefono_contacto}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Guías de Envío */}
          {guiasEnvio.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Guías de Envío
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {guiasEnvio.map((guia) => (
                  <div
                    key={guia.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => setGuiaSeleccionada(guia)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{guia.numero_guia || "Sin número"}</span>
                      <Badge variant="outline">{guia.estado}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {guia.fecha_guia ? formatFechaCorta(new Date(guia.fecha_guia)) : "-"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa de Impresión</DialogTitle>
            <DialogDescription>
              Revise el documento antes de imprimir
            </DialogDescription>
          </DialogHeader>
          <div ref={printRef}>
            <IncidentePrintSheet
              data={{
                codigo: incidente.codigo,
                fechaIngreso: new Date(incidente.fecha_ingreso || incidente.created_at || ""),
                cliente: cliente?.nombre || "Desconocido",
                telefono: cliente?.telefono_principal || "",
                producto: producto?.codigo || "",
                descripcionProducto: producto?.descripcion || "",
                problema: incidente.descripcion_problema || "",
                observaciones: incidente.observaciones || ""
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrintPreview(false)}>
              Cerrar
            </Button>
            <Button onClick={handlePrintFromPreview}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guia Detail Dialog */}
      {guiaSeleccionada && (
        <Dialog open={!!guiaSeleccionada} onOpenChange={() => setGuiaSeleccionada(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalle de Guía</DialogTitle>
            </DialogHeader>
            <GuiaHPCLabel guia={guiaSeleccionada} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function formatFechaCorta(date: Date): string {
  return date.toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
