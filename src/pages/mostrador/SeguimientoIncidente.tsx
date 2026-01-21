import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  FileText,
  Printer,
  AlertTriangle,
  Wrench,
  Phone,
  Mail,
  Home,
  Truck,
  Edit,
  Save,
  Clock,
  History,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiBackendAction } from "@/lib/api-backend";
import { StatusBadge, CompactPhotoGallery } from "@/components/shared";
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

type IncidenteData = {
  id: number;
  codigo: string;
  estado: string;
  tipologia: string | null;
  descripcion_problema: string | null;
  observaciones: string | null;
  quiere_envio: boolean | null;
  aplica_garantia: boolean | null;
  direccion_entrega_id: number | null;
  created_at: string | null;
};

type ClienteData = {
  id: number;
  codigo: string;
  nombre: string;
  telefono_principal?: string | null;
  correo?: string | null;
  direccion?: string | null;
  celular?: string | null;
};

type ProductoData = {
  id: number;
  codigo: string;
  descripcion: string | null;
};

type DiagnosticoData = {
  id: number;
  estado: string;
  es_reparable: boolean | null;
  recomendaciones: string | null;
};

type DireccionEnvioData = {
  id: number;
  direccion_completa: string;
  nombre_contacto?: string | null;
  telefono_contacto?: string | null;
};

type GuiaData = {
  id: number;
  numero_guia: string | null;
  estado: string;
  fecha_guia: string | null;
};

type UsuarioData = {
  id: number;
  nombre: string;
  apellido?: string | null;
  email?: string | null;
};

export default function SeguimientoIncidente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<IncidenteData | null>(null);
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [producto, setProducto] = useState<ProductoData | null>(null);
  const [tecnico, setTecnico] = useState<UsuarioData | null>(null);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoData | null>(null);
  const [direccionEnvio, setDireccionEnvio] = useState<DireccionEnvioData | null>(null);
  const [guiasEnvio, setGuiasEnvio] = useState<GuiaData[]>([]);
  const [clienteHistorial, setClienteHistorial] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isEditingProductCode, setIsEditingProductCode] = useState(false);
  const [editedProductCode, setEditedProductCode] = useState("");
  const [guiaSeleccionada, setGuiaSeleccionada] = useState<GuiaData | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch incident
      const { result: incData } = await apiBackendAction("incidentes.get", { id: Number(id) });
      
      if (!incData) {
        setLoading(false);
        return;
      }

      const incidenteMapped: IncidenteData = {
        id: incData.id,
        codigo: incData.codigo,
        estado: incData.estado,
        tipologia: incData.tipologia,
        descripcion_problema: incData.descripcion_problema,
        observaciones: incData.observaciones,
        quiere_envio: incData.quiere_envio,
        aplica_garantia: incData.aplica_garantia,
        direccion_entrega_id: (incData as any).direccion_entrega_id || null,
        created_at: incData.created_at,
      };
      setIncidente(incidenteMapped);

      // Extract cliente from incidente response
      if (incData.cliente) {
        const c = incData.cliente as any;
        setCliente({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          telefono_principal: c.telefono_principal,
          correo: c.correo,
          direccion: c.direccion,
          celular: c.celular,
        });
      }

      // Extract producto from incidente response
      if (incData.producto) {
        setProducto({
          id: incData.producto.id,
          codigo: incData.producto.codigo,
          descripcion: incData.producto.descripcion,
        });
      }

      // Fetch parallel data: technician, diagnostico, client history, direccion, guias
      const [incTecRes, diagRes, guiasRes] = await Promise.all([
        apiBackendAction("incidente_tecnico.list", { incidente_id: Number(id), es_principal: true }),
        apiBackendAction("diagnosticos.search", { incidente_id: Number(id) }),
        apiBackendAction("guias.search", { incidente_codigo: incData.codigo }),
      ]);

      // Fetch client history count
      if (incData.cliente) {
        const { results: allIncidentes } = await apiBackendAction("incidentes.list", { limit: 1000 });
        const clienteIncidentes = (allIncidentes || []).filter((i: any) => i.cliente?.id === (incData.cliente as any).id);
        setClienteHistorial(clienteIncidentes.length);
      }

      // Fetch technician
      const incTecData = incTecRes.results?.[0] as any;
      if (incTecData?.tecnico_id) {
        const { result: tecData } = await apiBackendAction("usuarios.get", { id: incTecData.tecnico_id });
        if (tecData) {
          setTecnico({
            id: (tecData as any).id,
            nombre: (tecData as any).nombre,
            apellido: (tecData as any).apellido,
            email: (tecData as any).email,
          });
        }
      }

      // Set diagnostico
      const diagData = diagRes.results?.[0];
      if (diagData) {
        setDiagnostico({
          id: diagData.id,
          estado: diagData.estado,
          es_reparable: diagData.es_reparable,
          recomendaciones: diagData.recomendaciones,
        });
      }

      // Set guias
      setGuiasEnvio((guiasRes.results || []).map((g: any) => ({
        id: g.id,
        numero_guia: g.numero_guia,
        estado: g.estado,
        fecha_guia: g.fecha_guia,
      })));

      // Fetch direccion de envio si existe
      if (incidenteMapped.direccion_entrega_id) {
        const { result: dirData } = await apiBackendAction("direcciones_envio.get", { id: incidenteMapped.direccion_entrega_id });
        if (dirData) {
          setDireccionEnvio({
            id: (dirData as any).id,
            direccion_completa: (dirData as any).direccion_completa,
            nombre_contacto: (dirData as any).nombre_contacto,
            telefono_contacto: (dirData as any).telefono_contacto,
          });
        }
      }
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
      const { result: newProdData } = await apiBackendAction("productos.getByCodigo", { codigo: editedProductCode.toUpperCase() });

      if (!newProdData) {
        showError("Producto no encontrado");
        return;
      }

      // Actualizar el incidente
      await apiBackendAction("incidentes.update", {
        id: incidente.id,
        data: { producto_id: (newProdData as any).id }
      } as any);

      setProducto({
        id: (newProdData as any).id,
        codigo: (newProdData as any).codigo,
        descripcion: (newProdData as any).descripcion,
      });
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

  const formatFechaCorta = (date: Date): string => {
    return date.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
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
              <div className="text-sm text-muted-foreground">
                {incidente.observaciones || "Sin observaciones registradas"}
              </div>
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
              Hoja de ingreso para el incidente {incidente.codigo}
            </DialogDescription>
          </DialogHeader>
          <div ref={printRef} className="p-4 bg-white text-black">
            <h2 className="text-xl font-bold mb-4">Hoja de Ingreso - {incidente.codigo}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Cliente:</strong> {cliente?.nombre || "N/A"}</div>
              <div><strong>Código:</strong> {cliente?.codigo || "N/A"}</div>
              <div><strong>Producto:</strong> {producto?.descripcion || "N/A"}</div>
              <div><strong>Estado:</strong> {incidente.estado}</div>
            </div>
            <div className="mt-4">
              <strong>Problema:</strong>
              <p>{incidente.descripcion_problema || "Sin descripción"}</p>
            </div>
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
              <DialogTitle>Detalle de Guía - {guiaSeleccionada.numero_guia}</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <p><strong>Número:</strong> {guiaSeleccionada.numero_guia}</p>
              <p><strong>Estado:</strong> {guiaSeleccionada.estado}</p>
              <p><strong>Fecha:</strong> {guiaSeleccionada.fecha_guia ? formatFechaCorta(new Date(guiaSeleccionada.fecha_guia)) : "-"}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
