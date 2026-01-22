import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  MapPin,
  FileText,
  Printer,
  AlertTriangle,
  Phone,
  Mail,
  Clock,
  Edit,
  Save,
  Camera,
  Link2,
  Plus,
  ArrowUpDown,
  ImageOff,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  incidente_origen_id?: number | null;
  centro_de_servicio_id?: number | null;
};

type ClienteData = {
  id: number;
  codigo: string;
  nombre: string;
  nit?: string | null;
  telefono_principal?: string | null;
  correo?: string | null;
  direccion?: string | null;
  celular?: string | null;
  municipio?: string | null;
  departamento?: string | null;
};

type ProductoData = {
  id: number;
  codigo: string;
  descripcion: string | null;
  clave?: string | null;
  descontinuado?: boolean;
  url_foto?: string | null;
};

type CentroServicioData = {
  id: number;
  nombre: string;
  codigo: string;
};

type GuiaData = {
  id: number;
  numero_guia: string | null;
  estado: string;
  fecha_guia: string | null;
};

type EventoHistorial = {
  id: string;
  tipo: "creacion" | "asignacion" | "diagnostico" | "reparacion" | "observacion";
  titulo: string;
  descripcion: string;
  usuario: string;
  fecha: Date;
  observacion?: string;
};

export default function SeguimientoIncidente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<IncidenteData | null>(null);
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [producto, setProducto] = useState<ProductoData | null>(null);
  const [centroServicio, setCentroServicio] = useState<CentroServicioData | null>(null);
  const [guiasEnvio, setGuiasEnvio] = useState<GuiaData[]>([]);
  const [clienteHistorial, setClienteHistorial] = useState<number>(0);
  const [eventos, setEventos] = useState<EventoHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProductCode, setIsEditingProductCode] = useState(false);
  const [editedProductCode, setEditedProductCode] = useState("");
  const [guiaSeleccionada, setGuiaSeleccionada] = useState<GuiaData | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [filtroEventos, setFiltroEventos] = useState("todos");
  const [ordenEventos, setOrdenEventos] = useState<"reciente" | "antiguo">("reciente");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
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
        incidente_origen_id: (incData as any).incidente_origen_id || null,
        centro_de_servicio_id: (incData as any).centro_de_servicio_id || null,
      };
      setIncidente(incidenteMapped);

      // Extract cliente
      if (incData.cliente) {
        const c = incData.cliente as any;
        setCliente({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          nit: c.nit,
          telefono_principal: c.telefono_principal,
          correo: c.correo,
          direccion: c.direccion,
          celular: c.celular,
          municipio: c.municipio,
          departamento: c.departamento,
        });
      }

      // Extract producto
      if (incData.producto) {
        const p = incData.producto as any;
        setProducto({
          id: p.id,
          codigo: p.codigo,
          descripcion: p.descripcion,
          clave: p.clave,
          descontinuado: p.descontinuado || false,
          url_foto: p.url_foto,
        });
      }

      // Fetch parallel data
      const [guiasRes, centroRes] = await Promise.all([
        apiBackendAction("guias.search", { incidente_codigo: incData.codigo }),
        incidenteMapped.centro_de_servicio_id
          ? apiBackendAction("centros_de_servicio.get", { id: incidenteMapped.centro_de_servicio_id })
          : Promise.resolve({ result: null }),
      ]);

      // Set centro de servicio
      if (centroRes.result) {
        const cs = centroRes.result as any;
        setCentroServicio({ id: cs.id, nombre: cs.nombre, codigo: cs.codigo });
      }

      // Fetch client history count
      if (incData.cliente) {
        const { results: allIncidentes } = await apiBackendAction("incidentes.list", { limit: 1000 });
        const clienteIncidentes = (allIncidentes || []).filter(
          (i: any) => i.cliente?.id === (incData.cliente as any).id
        );
        setClienteHistorial(clienteIncidentes.length);
      }

      // Set guias
      setGuiasEnvio(
        (guiasRes.results || []).map((g: any) => ({
          id: g.id,
          numero_guia: g.numero_guia,
          estado: g.estado,
          fecha_guia: g.fecha_guia,
        }))
      );

      // Build eventos from observaciones and created_at
      const eventosBuilt: EventoHistorial[] = [];

      // Evento de creación
      if (incData.created_at) {
        eventosBuilt.push({
          id: "creacion",
          tipo: "creacion",
          titulo: "Creación de Incidente",
          descripcion: "Incidente creado",
          usuario: "Sistema",
          fecha: new Date(incData.created_at),
        });
      }

      setEventos(eventosBuilt);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-40" />
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
      const { result: newProdData } = await apiBackendAction("productos.getByCodigo", {
        codigo: editedProductCode.toUpperCase(),
      });

      if (!newProdData) {
        showError("Producto no encontrado");
        return;
      }

      await apiBackendAction("incidentes.update", {
        id: incidente.id,
        data: { producto_id: (newProdData as any).id },
      } as any);

      const p = newProdData as any;
      setProducto({
        id: p.id,
        codigo: p.codigo,
        descripcion: p.descripcion,
        clave: p.clave,
        descontinuado: p.descontinuado || false,
        url_foto: p.url_foto,
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

  const formatFechaLarga = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-GT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatFechaCorta = (date: Date): string => {
    return date.toLocaleDateString("es-GT", { day: "2-digit", month: "short" });
  };

  const formatHora = (date: Date): string => {
    return date.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
  };

  const getTipologiaLabel = (tipologia: string | null) => {
    if (!tipologia) return "—";
    const map: Record<string, string> = {
      GARANTIA: "Garantía",
      MANTENIMIENTO: "Mantenimiento",
      REPARACION: "Reparación",
    };
    return map[tipologia] || tipologia;
  };

  const eventosFiltrados = eventos
    .filter((e) => filtroEventos === "todos" || e.tipo === filtroEventos)
    .sort((a, b) =>
      ordenEventos === "reciente"
        ? b.fecha.getTime() - a.fecha.getTime()
        : a.fecha.getTime() - b.fecha.getTime()
    );

  const esReingreso = !!incidente.incidente_origen_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{incidente.codigo}</h1>
              <StatusBadge status={incidente.estado} />
            </div>
            <p className="text-muted-foreground">
              Ingresado: {incidente.created_at ? formatFechaLarga(incidente.created_at) : "—"}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handlePrintIngreso} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir Hoja de Ingreso
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Producto Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* Product Image */}
                <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {producto?.url_foto ? (
                    <img
                      src={producto.url_foto}
                      alt={producto.descripcion || "Producto"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 space-y-2">
                  <h2 className="text-xl font-semibold">
                    {producto?.descripcion || "Producto no asignado"}
                  </h2>
                  {producto?.clave && (
                    <p className="text-muted-foreground">Clave: {producto.clave}</p>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">SKU:</span>
                      {isEditingProductCode ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editedProductCode}
                            onChange={(e) => setEditedProductCode(e.target.value.toUpperCase())}
                            className="w-28 h-8"
                          />
                          <Button size="sm" variant="ghost" onClick={handleSaveProductCode}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Badge variant="secondary" className="font-mono">
                            {producto?.codigo || "—"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleEditProductCode}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <span className="text-muted-foreground">{producto?.codigo || ""}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {producto?.descontinuado && (
                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Producto Descontinuado
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Problema Reportado Card */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium mb-2">Problema Reportado</h3>
                  <p className="text-foreground bg-muted/50 rounded-lg p-3">
                    {incidente.descripcion_problema || "Sin descripción"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Centro de Servicio</p>
                  <p className="font-medium">{centroServicio?.nombre || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Tipología</p>
                  <p className="font-medium">{getTipologiaLabel(incidente.tipologia)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Garantía</p>
                  <Badge
                    variant="outline"
                    className={
                      incidente.aplica_garantia
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-muted"
                    }
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {incidente.aplica_garantia ? "En Garantía" : "Sin Garantía"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Reingreso</p>
                  <p className="font-medium">{esReingreso ? "Sí" : "No"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Envío</p>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{incidente.quiere_envio ? "Envío" : "Recoge"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={filtroEventos} onValueChange={setFiltroEventos}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="creacion">Creación</SelectItem>
                      <SelectItem value="asignacion">Asignación</SelectItem>
                      <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                      <SelectItem value="observacion">Observación</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setOrdenEventos(ordenEventos === "reciente" ? "antiguo" : "reciente")}
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    {ordenEventos === "reciente" ? "Reciente" : "Antiguo"}
                  </Button>
                </div>
              </div>

              {/* Timeline Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 bg-muted/50 text-sm font-medium text-muted-foreground">
                  <div className="px-4 py-2">Evento</div>
                  <div className="px-4 py-2">Observación</div>
                </div>
                <div className="divide-y">
                  {eventosFiltrados.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No hay eventos registrados
                    </div>
                  ) : (
                    eventosFiltrados.map((evento) => (
                      <div key={evento.id} className="grid grid-cols-2">
                        <div className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Plus className="h-3 w-3 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium">{evento.titulo}</p>
                              <p className="text-sm text-muted-foreground">{evento.descripcion}</p>
                              <p className="text-xs text-primary mt-1">{evento.usuario}</p>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-3 flex items-start justify-between">
                          <p className="text-muted-foreground">{evento.observacion || "—"}</p>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatFechaCorta(evento.fecha)} {formatHora(evento.fecha)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cliente Card */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-orange-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg">{cliente?.nombre || "Cliente desconocido"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {cliente?.codigo}
                    {cliente?.nit && ` • NIT: ${cliente.nit}`}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {(cliente?.telefono_principal || cliente?.celular) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{cliente.telefono_principal || cliente.celular}</span>
                  </div>
                )}
                {cliente?.correo && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{cliente.correo}</span>
                  </div>
                )}
                {(cliente?.municipio || cliente?.departamento || cliente?.direccion) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {cliente.municipio || cliente.departamento || cliente.direccion}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-primary">
                  <Clock className="h-4 w-4" />
                  <span>{clienteHistorial} incidentes en historial</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fotos Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="h-5 w-5 text-orange-500" />
              </div>
              <CompactPhotoGallery incidenteId={String(incidente.id)} />
            </CardContent>
          </Card>

          {/* Guías Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="h-5 w-5 text-orange-500" />
                <span className="text-muted-foreground">—</span>
              </div>
              {guiasEnvio.length > 0 ? (
                <div className="space-y-2">
                  {guiasEnvio.map((guia) => (
                    <div
                      key={guia.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setGuiaSeleccionada(guia)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{guia.numero_guia || "Sin número"}</span>
                        <Badge variant="outline">{guia.estado}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa de Impresión</DialogTitle>
            <DialogDescription>Hoja de ingreso para el incidente {incidente.codigo}</DialogDescription>
          </DialogHeader>
          <div ref={printRef} className="p-4 bg-white text-black">
            <h2 className="text-xl font-bold mb-4">Hoja de Ingreso - {incidente.codigo}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Cliente:</strong> {cliente?.nombre || "N/A"}
              </div>
              <div>
                <strong>Código:</strong> {cliente?.codigo || "N/A"}
              </div>
              <div>
                <strong>Producto:</strong> {producto?.descripcion || "N/A"}
              </div>
              <div>
                <strong>Estado:</strong> {incidente.estado}
              </div>
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
              <p>
                <strong>Número:</strong> {guiaSeleccionada.numero_guia}
              </p>
              <p>
                <strong>Estado:</strong> {guiaSeleccionada.estado}
              </p>
              <p>
                <strong>Fecha:</strong>{" "}
                {guiaSeleccionada.fecha_guia
                  ? formatFechaCorta(new Date(guiaSeleccionada.fecha_guia))
                  : "—"}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
