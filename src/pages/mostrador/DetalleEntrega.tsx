import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, PackageCheck, User, Calendar, FileSignature, FileCheck, Printer, Wrench, X, Phone, Mail, MapPin, FileText } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OutlinedInput } from "@/components/ui/outlined-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiBackendAction } from "@/lib/api-backend";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SignatureCanvasComponent, SignatureCanvasRef, StatusBadge } from "@/components/shared";
import { SidebarMediaCapture, SidebarPhoto } from "@/components/features/media";
import { getResolutionLabel, RESOLUTION_LABELS } from "@/constants/status";

type IncidenteData = {
  id: number;
  codigo: string;
  estado: string;
  cliente_id: number | null;
  producto_id: number | null;
  centro_de_servicio_id: number | null;
  quiere_envio: boolean | null;
  aplica_garantia: boolean | null;
  observaciones: string | null;
  tracking_token?: string;
  fecha_ingreso?: string | null;
  descripcion_problema?: string | null;
};

type ClienteData = {
  id: number;
  codigo: string;
  nombre: string;
  celular?: string | null;
  nit?: string | null;
  correo?: string | null;
  direccion?: string | null;
  telefono_principal?: string | null;
};

type DiagnosticoData = {
  id: number;
  incidente_id: number;
  tecnico_id: number | null;
  estado: string;
  tipo_resolucion: string | null;
  aplica_garantia: boolean | null;
  recomendaciones: string | null;
  descuento_porcentaje: number | null;
};

export default function DetalleEntrega() {
  const { incidenteId } = useParams<{ incidenteId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState(false);
  const [incidente, setIncidente] = useState<IncidenteData | null>(null);
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoData | null>(null);
  const [tecnicoNombre, setTecnicoNombre] = useState<string | null>(null);
  const [nombreRecibe, setNombreRecibe] = useState("");
  const [dpiRecibe, setDpiRecibe] = useState("");
  const [fotosSalida, setFotosSalida] = useState<SidebarPhoto[]>([]);
  const [productoInfo, setProductoInfo] = useState<{ sku: string; descripcion: string; descontinuado: boolean } | null>(null);
  const [accesoriosIngreso, setAccesoriosIngreso] = useState<string[]>([]);
  const [centroServicio, setCentroServicio] = useState<string>("HPC Centro de Servicio");
  const [repuestosConPrecios, setRepuestosConPrecios] = useState<Array<{codigo: string; descripcion: string; cantidad: number; precioUnitario: number}>>([]);
  const [showDiagnosticoPreview, setShowDiagnosticoPreview] = useState(false);
  const [fallasNombres, setFallasNombres] = useState<string[]>([]);
  const [causasNombres, setCausasNombres] = useState<string[]>([]);
  const signatureRef = useRef<SignatureCanvasRef>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (incidenteId) {
      fetchData();
    }
  }, [incidenteId]);

  useEffect(() => {
    // Cargar nombre del técnico cuando tengamos el diagnóstico
    const loadTecnicoNombre = async () => {
      if (diagnostico?.tecnico_id) {
        try {
          const { result } = await apiBackendAction("usuarios.get", { id: diagnostico.tecnico_id });
          if (result) {
            setTecnicoNombre((result as any).nombre);
          }
        } catch (error) {
          console.error("Error loading tecnico:", error);
        }
      }
    };
    loadTecnicoNombre();
  }, [diagnostico]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar incidente
      const { result: incidenteData } = await apiBackendAction("incidentes.get", { id: Number(incidenteId) });
      
      if (!incidenteData) {
        toast.error("Incidente no encontrado");
        navigate('/mostrador/entrega-maquinas');
        return;
      }
      
      // Validar que el incidente esté en un estado válido para entrega
      const estadosValidosEntrega = ['REPARADO', 'PENDIENTE_ENTREGA'];
      if (!estadosValidosEntrega.includes(incidenteData.estado)) {
        toast.error("Este incidente no está listo para entrega");
        navigate('/mostrador/entrega-maquinas');
        return;
      }
      
      const incidenteMapped: IncidenteData = {
        id: incidenteData.id,
        codigo: incidenteData.codigo,
        estado: incidenteData.estado,
        cliente_id: (incidenteData as any).cliente?.id || null,
        producto_id: incidenteData.producto?.id || null,
        centro_de_servicio_id: incidenteData.centro_de_servicio_id,
        quiere_envio: incidenteData.quiere_envio,
        aplica_garantia: incidenteData.aplica_garantia,
        observaciones: incidenteData.observaciones,
        tracking_token: incidenteData.tracking_token,
        fecha_ingreso: (incidenteData as any).fecha_ingreso || incidenteData.created_at,
        descripcion_problema: incidenteData.descripcion_problema,
      };
      setIncidente(incidenteMapped);

      // Extract cliente from incidente response
      if (incidenteData.cliente) {
        const c = incidenteData.cliente as any;
        setCliente({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          celular: c.celular,
          nit: c.nit,
          correo: c.correo,
          direccion: c.direccion,
          telefono_principal: c.telefono_principal,
        });
      }

      if (incidenteData.producto) {
        setProductoInfo({
          sku: incidenteData.producto.sku || incidenteData.producto.codigo || "",
          descripcion: incidenteData.producto.descripcion || "",
          descontinuado: incidenteData.producto.descontinuado ?? false,
        });
      }

      // Cargar accesorios del incidente
      try {
        const { data: accesoriosData } = await supabase
          .from('incidente_accesorios')
          .select('accesorio:accesorios(nombre)')
          .eq('incidente_id', Number(incidenteId));
        
        const nombres = (accesoriosData || []).map((a: any) => a.accesorio?.nombre).filter(Boolean);
        setAccesoriosIngreso(nombres);
      } catch (err) {
        console.error("Error loading accesorios:", err);
      }

      // Cargar diagnóstico, centro de servicio y solicitudes de repuestos en paralelo
      const [diagRes, centroRes, solicitudesRes] = await Promise.all([
        apiBackendAction("diagnosticos.search", { incidente_id: Number(incidenteId) }),
        incidenteData.centro_de_servicio_id 
          ? apiBackendAction("centros_de_servicio.get", { id: incidenteData.centro_de_servicio_id })
          : Promise.resolve({ result: null }),
        apiBackendAction("solicitudes_repuestos.search", { incidente_id: Number(incidenteId), limit: 20 }),
      ]);

      // diagRes.results es un array, tomamos el primer elemento completado
      const diagList = diagRes.results || [];
      const diagData = diagList.find((d: any) => d.estado === 'COMPLETADO') || diagList[0] || null;
      if (diagData) {
        setDiagnostico({
          id: diagData.id,
          incidente_id: diagData.incidente_id,
          tecnico_id: diagData.tecnico?.id || (diagData as any).tecnico_id || null,
          estado: diagData.estado,
          tipo_resolucion: diagData.tipo_resolucion,
          aplica_garantia: diagData.aplica_garantia,
          recomendaciones: diagData.recomendaciones,
          descuento_porcentaje: diagData.descuento_porcentaje,
        });

        // Cargar fallas y causas del diagnóstico
        try {
          const [fallasRes, causasRes] = await Promise.all([
            apiBackendAction("diagnostico_fallas.list", { diagnostico_id: diagData.id }),
            apiBackendAction("diagnostico_causas.list", { diagnostico_id: diagData.id }),
          ]);
          
          const fallasData = (fallasRes as any).results || [];
          const causasData = (causasRes as any).results || [];
          
          setFallasNombres(fallasData.map((f: any) => f.falla?.nombre || f.nombre || 'Falla').filter(Boolean));
          setCausasNombres(causasData.map((c: any) => c.causa?.nombre || c.nombre || 'Causa').filter(Boolean));
        } catch (err) {
          console.error("Error loading fallas/causas:", err);
        }
      }

      if (centroRes.result) {
        setCentroServicio((centroRes.result as any).nombre);
      }

      // Cargar repuestos utilizados
      let repuestosUtilizados: any[] = [];
      const solicitudesData = solicitudesRes.results || [];

      if (solicitudesData.length > 0) {
        const entregadas = solicitudesData.filter((s: any) => (s.estado || '').toLowerCase().includes('entreg'));
        const fuente = entregadas.length > 0 ? entregadas : solicitudesData;
        repuestosUtilizados = fuente.flatMap((s: any) => (Array.isArray(s.repuestos) ? s.repuestos : []));
      }

      if (repuestosUtilizados.length > 0) {
        // Normalizar + agrupar por código
        const grouped = new Map<string, { codigo: string; descripcion: string; cantidad: number }>();
        for (const r of repuestosUtilizados) {
          const codigo = r?.codigo || r?.codigo_repuesto;
          if (!codigo) continue;
          const cantidad = Number(r?.cantidad ?? r?.cantidad_solicitada ?? 1) || 1;
          const descripcion = r?.descripcion || r?.descripcion_repuesto || '';

          const prev = grouped.get(codigo);
          grouped.set(codigo, {
            codigo,
            descripcion: prev?.descripcion || descripcion,
            cantidad: (prev?.cantidad || 0) + cantidad,
          });
        }

        const repuestosAgrupados = Array.from(grouped.values());
        const codigosRepuestos = repuestosAgrupados.map(r => r.codigo);

        const { results: inventarioData } = await apiBackendAction("inventarios.search", { codigos_repuesto: codigosRepuestos });

        const invMap = new Map<string, { costo: number; descripcion: string }>();
        for (const inv of (inventarioData || [])) {
          const codigo = (inv as any).codigo_repuesto;
          const costo = Number((inv as any).costo_unitario || 0);
          const desc = (inv as any).descripcion || '';
          const prev = invMap.get(codigo);
          // Elegir el costo más alto como referencia (evita tomar 0 si hay múltiples filas)
          if (!prev || costo > prev.costo) {
            invMap.set(codigo, { costo, descripcion: desc });
          }
        }

        const repuestosConPrecio = repuestosAgrupados.map((r) => {
          const inv = invMap.get(r.codigo);
          return {
            codigo: r.codigo,
            descripcion: r.descripcion || inv?.descripcion || 'Sin descripción',
            cantidad: r.cantidad,
            precioUnitario: inv?.costo ?? 0,
          };
        });

        setRepuestosConPrecios(repuestosConPrecio);
      } else {
        setRepuestosConPrecios([]);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error("Error al cargar la información del incidente");
      navigate('/mostrador/entrega-maquinas');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!incidente) {
      toast.error("No hay incidente seleccionado");
      return;
    }
    if (!nombreRecibe.trim()) {
      toast.error("Ingrese el nombre de quien recibe");
      return;
    }
    if (!dpiRecibe.trim()) {
      toast.error("Ingrese el DPI/Identificación de quien recibe");
      return;
    }
    if (signatureRef.current?.isEmpty()) {
      toast.error("Se requiere la firma del cliente");
      return;
    }
    setDelivering(true);
    try {
      const firmaBase64 = signatureRef.current?.toDataURL();
      const fechaEntregaActual = new Date().toISOString();
      
      // Store delivery confirmation data in observaciones since confirmacion_cliente doesn't exist
      const observacionesActuales = incidente.observaciones || '';
      const nuevasObservaciones = `${observacionesActuales}\n[${fechaEntregaActual}] ENTREGA CONFIRMADA - Recibe: ${nombreRecibe}, DPI: ${dpiRecibe}`;
      
      await apiBackendAction("incidentes.update", {
        id: incidente.id,
        data: {
          estado: 'ENTREGADO',
          fecha_entrega: fechaEntregaActual,
          observaciones: nuevasObservaciones
        }
      } as any);

      toast.success("Entrega registrada exitosamente");
      navigate('/mostrador/entrega-maquinas');
    } catch (error) {
      console.error('Error al registrar entrega:', error);
      toast.error("Error al registrar la entrega");
    } finally {
      setDelivering(false);
    }
  };

  const handlePrintDiagnostico = () => {
    if (!diagnostico || !incidente || !cliente) return;
    setShowDiagnosticoPreview(true);
  };

  const handlePrintFromPreview = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '', 'width=900,height=700');
      if (!printWindow) return;

      printWindow.document.write(`<!DOCTYPE html><html><head><title>Diagnóstico - ${incidente?.codigo}</title>
        <script src="https://cdn.tailwindcss.com"><\/script>
        <style>@media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; } } body { font-size: 11px; }</style>
      </head><body class="p-4 bg-white text-black font-sans">
        ${printContent}
      </body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  // Calcular datos para el preview del diagnóstico
  const getDiagnosticoPreviewData = () => {
    if (!diagnostico || !incidente || !cliente) return null;
    
    const tecnicoDisplay = tecnicoNombre || `Técnico ${diagnostico.tecnico_id}`;
    const tipoResolucion = diagnostico.tipo_resolucion || 'Reparar en Garantía';
    const aplicaGarantia = diagnostico.aplica_garantia ?? incidente.aplica_garantia ?? false;
    const accesorios = 'Ninguno';
    
    const subtotalRepuestos = repuestosConPrecios.reduce((sum, r) => sum + (r.cantidad * r.precioUnitario), 0);
    const costoManoObra = 150;
    const costoConsumibles = 20;
    const costoEnvio = incidente.quiere_envio ? 75 : 0;
    const subtotalGeneral = subtotalRepuestos + costoManoObra + costoConsumibles + costoEnvio;
    
    let descuento = 0;
    let porcentajeDesc = diagnostico.descuento_porcentaje || 0;
    if (tipoResolucion === 'REPARAR_EN_GARANTIA' && aplicaGarantia) {
      descuento = subtotalGeneral;
      porcentajeDesc = 100;
    } else if (porcentajeDesc > 0) {
      descuento = subtotalGeneral * (porcentajeDesc / 100);
    }
    const totalFinal = subtotalGeneral - descuento;

    return {
      tecnicoDisplay,
      tipoResolucion,
      aplicaGarantia,
      accesorios,
      subtotalRepuestos,
      costoManoObra,
      costoConsumibles,
      costoEnvio,
      subtotalGeneral,
      descuento,
      porcentajeDesc,
      totalFinal
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando información...</p>
      </div>
    );
  }

  if (!incidente || !cliente) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/mostrador/entrega-maquinas')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Entrega de Máquina</h1>
          <p className="text-muted-foreground">Incidente {incidente.codigo}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incidente Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <PackageCheck className="h-5 w-5" />
                Información del Incidente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Código Incidente</Label>
                  <p className="font-semibold text-lg">{incidente.codigo}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <div className="mt-1">
                    <StatusBadge status={incidente.estado} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Código Producto</Label>
                  <p className="font-medium">{productoInfo?.sku || productoInfo?.descripcion || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Fecha Ingreso
                  </Label>
                  <p className="font-medium">
                    {incidente.fecha_ingreso
                      ? new Date(incidente.fecha_ingreso).toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : "N/A"}
                  </p>
                </div>
              </div>
              {incidente.descripcion_problema && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descripción del Problema</Label>
                  <p className="text-sm mt-1 bg-muted/30 p-2 rounded">{incidente.descripcion_problema}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cliente Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nombre</Label>
                  <p className="font-semibold">{cliente.nombre}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">NIT</Label>
                  <p className="font-medium">{cliente.nit || "C/F"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Teléfono
                  </Label>
                  <p className="font-medium">{cliente.celular || cliente.telefono_principal || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Correo
                  </Label>
                  <p className="font-medium">{cliente.correo || "N/A"}</p>
                </div>
              </div>
              {cliente.direccion && (
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Dirección
                  </Label>
                  <p className="font-medium">{cliente.direccion}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diagnóstico Técnico Card */}
          {diagnostico && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <FileText className="h-5 w-5" />
                  Diagnóstico Técnico
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handlePrintDiagnostico}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fallas y Causas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Fallas Detectadas</Label>
                    <div className="mt-1">
                      {fallasNombres.length > 0 ? (
                        <ul className="text-sm list-disc list-inside space-y-1">
                          {fallasNombres.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Sin fallas registradas</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Causas Identificadas</Label>
                    <div className="mt-1">
                      {causasNombres.length > 0 ? (
                        <ul className="text-sm list-disc list-inside space-y-1">
                          {causasNombres.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Sin causas registradas</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resolución con badge de garantía */}
                <div>
                  <Label className="text-xs text-muted-foreground">Resolución</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-medium">{getResolutionLabel(diagnostico.tipo_resolucion || "")}</p>
                    {diagnostico.aplica_garantia && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300">
                        Sí
                      </span>
                    )}
                  </div>
                </div>

                {/* Recomendaciones */}
                {diagnostico.recomendaciones && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Recomendaciones</Label>
                    <p className="text-sm mt-1 bg-muted/30 p-2 rounded">{diagnostico.recomendaciones}</p>
                  </div>
                )}

                {/* Técnico */}
                {tecnicoNombre && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Técnico Responsable</Label>
                    <p className="font-medium">{tecnicoNombre}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Delivery Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Confirmación de Entrega
              </CardTitle>
              <CardDescription>
                Complete los datos de quien recibe la máquina
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OutlinedInput
                id="nombreRecibe"
                label="Nombre de quien recibe *"
                value={nombreRecibe}
                onChange={(e) => setNombreRecibe(e.target.value)}
                placeholder="Nombre completo"
              />
              <OutlinedInput
                id="dpiRecibe"
                label="DPI / Identificación *"
                value={dpiRecibe}
                onChange={(e) => setDpiRecibe(e.target.value)}
                placeholder="Número de identificación"
              />
              <div className="space-y-2">
                <Label>Firma del Cliente *</Label>
                <div className="border rounded-lg p-2 bg-white">
                  <SignatureCanvasComponent ref={signatureRef} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fotos de Salida (opcional)</Label>
                <SidebarMediaCapture
                  photos={fotosSalida}
                  onPhotosChange={setFotosSalida}
                  maxPhotos={3}
                  tipo="salida"
                />
              </div>
              <Separator />
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleDeliver}
                disabled={delivering}
              >
                <FileCheck className="h-5 w-5 mr-2" />
                {delivering ? 'Procesando...' : 'Confirmar Entrega'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog para vista previa del diagnóstico */}
      <Dialog open={showDiagnosticoPreview} onOpenChange={setShowDiagnosticoPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Vista Previa - Diagnóstico {incidente?.codigo}</span>
            </DialogTitle>
          </DialogHeader>
          
          {(() => {
            const previewData = getDiagnosticoPreviewData();
            if (!previewData || !diagnostico || !incidente || !cliente) return null;
            
            return (
              <>
                <div ref={printRef} className="bg-white p-4 text-black">
                  <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">HPC</div>
                        <div>
                          <h1 className="font-bold text-lg">HPC Centro de Servicio</h1>
                          <p className="text-xs text-gray-600">{centroServicio}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <h2 className="font-bold text-base text-orange-600">{previewData.tipoResolucion}</h2>
                        <p className="font-mono text-base font-bold">{incidente.codigo}</p>
                      </div>
                    </div>

                    {/* Cliente y Equipo */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="border rounded p-2">
                        <h3 className="font-bold text-xs mb-1 border-b pb-1">Cliente</h3>
                        <p className="text-xs"><span className="text-gray-500">Código:</span> {cliente.codigo}</p>
                        <p className="text-xs"><span className="text-gray-500">Nombre:</span> {cliente.nombre}</p>
                        <p className="text-xs"><span className="text-gray-500">Teléfono:</span> {cliente.celular}</p>
                      </div>
                      <div className="border rounded p-2">
                        <h3 className="font-bold text-xs mb-1 border-b pb-1">Equipo</h3>
                        <p className="text-xs"><span className="text-gray-500">SKU:</span> {productoInfo?.sku || 'N/A'}</p>
                        <p className="text-xs"><span className="text-gray-500">Descripción:</span> {productoInfo?.descripcion || 'N/A'}</p>
                        <p className="text-xs">
                          <span className="text-gray-500">Estado:</span>{' '}
                          <span className={productoInfo?.descontinuado ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                            {productoInfo?.descontinuado ? 'Descontinuado' : 'Vigente'}
                          </span>
                        </p>
                        <p className="text-xs">
                          <span className="text-gray-500">Accesorios de ingreso:</span>{' '}
                          {accesoriosIngreso.length > 0 ? accesoriosIngreso.join(', ') : 'Ninguno'}
                        </p>
                      </div>
                    </div>

                    {/* Diagnóstico Técnico */}
                    <div className="mb-2 border-2 border-orange-200 rounded overflow-hidden">
                      <div className="bg-orange-100 px-2 py-1">
                        <h3 className="font-bold text-orange-800 text-xs">DIAGNÓSTICO TÉCNICO</h3>
                      </div>
                      <div className="p-2">
                        <div>
                          <p className="font-semibold text-gray-600 text-xs">Resolución:</p>
                          <p className={`text-xs font-medium ${RESOLUTION_LABELS[previewData.tipoResolucion]?.color || 'text-gray-800'}`}>
                            {RESOLUTION_LABELS[previewData.tipoResolucion]?.icon} {getResolutionLabel(previewData.tipoResolucion)}
                          </p>
                        </div>
                        
                        {/* Fallas y Causas */}
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200">
                          <div>
                            <p className="font-semibold text-gray-600 text-xs">Fallas Detectadas:</p>
                            {fallasNombres.length > 0 ? (
                              <ul className="text-xs list-disc list-inside">
                                {fallasNombres.map((f, i) => <li key={i}>{f}</li>)}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-400">Sin fallas registradas</p>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-600 text-xs">Causas Identificadas:</p>
                            {causasNombres.length > 0 ? (
                              <ul className="text-xs list-disc list-inside">
                                {causasNombres.map((c, i) => <li key={i}>{c}</li>)}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-400">Sin causas registradas</p>
                            )}
                          </div>
                        </div>

                        {/* Observación del Técnico */}
                        {diagnostico.recomendaciones && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="font-semibold text-gray-600 text-xs">Observación del Técnico:</p>
                            <p className="bg-gray-50 p-1 rounded text-xs">{diagnostico.recomendaciones}</p>
                          </div>
                        )}
                        
                        <p className="text-xs mt-2 pt-1 border-t">Centro de Servicio: <strong>{centroServicio}</strong></p>
                      </div>
                    </div>

                    {/* Detalle de Costos */}
                    {(repuestosConPrecios.length > 0 || previewData.costoManoObra > 0) && (
                      <div className="mb-2">
                        <h3 className="font-bold mb-1 text-xs">DETALLE DE COSTOS</h3>
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border px-2 py-1 text-left">Concepto</th>
                              <th className="border px-1 py-1 text-center w-12">Cant.</th>
                              <th className="border px-2 py-1 text-right w-20">Precio</th>
                              <th className="border px-2 py-1 text-right w-20">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {repuestosConPrecios.map((r, idx) => (
                              <tr key={idx}>
                                <td className="border px-3 py-1">{r.codigo} - {r.descripcion}</td>
                                <td className="border px-2 py-1 text-center">{r.cantidad}</td>
                                <td className="border px-3 py-1 text-right">Q {r.precioUnitario.toFixed(2)}</td>
                                <td className="border px-3 py-1 text-right">Q {(r.cantidad * r.precioUnitario).toFixed(2)}</td>
                              </tr>
                            ))}
                            {/* Consumibles */}
                            <tr>
                              <td className="border px-2 py-1">Consumibles</td>
                              <td className="border px-1 py-1 text-center">1</td>
                              <td className="border px-2 py-1 text-right">Q {previewData.costoConsumibles.toFixed(2)}</td>
                              <td className="border px-2 py-1 text-right">Q {previewData.costoConsumibles.toFixed(2)}</td>
                            </tr>
                            {/* Mano de Obra */}
                            <tr>
                              <td className="border px-2 py-1">Mano de Obra</td>
                              <td className="border px-1 py-1 text-center">1</td>
                              <td className="border px-2 py-1 text-right">Q {previewData.costoManoObra.toFixed(2)}</td>
                              <td className="border px-2 py-1 text-right">Q {previewData.costoManoObra.toFixed(2)}</td>
                            </tr>
                            {previewData.costoEnvio > 0 && (
                              <tr>
                                <td className="border px-2 py-1">Envío</td>
                                <td className="border px-1 py-1 text-center">1</td>
                                <td className="border px-2 py-1 text-right">Q {previewData.costoEnvio.toFixed(2)}</td>
                                <td className="border px-2 py-1 text-right">Q {previewData.costoEnvio.toFixed(2)}</td>
                              </tr>
                            )}
                            <tr className="bg-gray-50">
                              <td colSpan={3} className="border px-2 py-1 text-right font-semibold">SUBTOTAL</td>
                              <td className="border px-2 py-1 text-right font-semibold">Q {previewData.subtotalGeneral.toFixed(2)}</td>
                            </tr>
                            {previewData.descuento > 0 && (
                              <tr className="bg-green-50">
                                <td colSpan={3} className="border px-2 py-1 text-right font-semibold text-green-700">DESCUENTO ({previewData.porcentajeDesc}%)</td>
                                <td className="border px-2 py-1 text-right font-semibold text-green-700">-Q {previewData.descuento.toFixed(2)}</td>
                              </tr>
                            )}
                            <tr className="bg-orange-100">
                              <td colSpan={3} className="border px-2 py-1 text-right font-bold">TOTAL</td>
                              <td className="border px-2 py-1 text-right font-bold text-orange-700">Q {previewData.totalFinal.toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                        {previewData.aplicaGarantia && previewData.tipoResolucion === 'REPARAR_EN_GARANTIA' && (
                          <div className="mt-1 p-1 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                            <strong>✓ Reparación cubierta por garantía.</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Códigos QR */}
                    <div className="mt-4 pt-3 border-t-2 border-dashed border-gray-300">
                      <div className="flex justify-around items-start">
                        <div className="flex flex-col items-center">
                          <QRCodeSVG 
                            value={`${window.location.origin}/incidente/${incidente.id}/fotos`}
                            size={80}
                            level="M"
                          />
                          <p className="text-xs mt-1 font-medium text-gray-700 text-center">Fotos del Diagnóstico</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <QRCodeSVG 
                            value={`${window.location.origin}/encuesta/${incidente.tracking_token}`}
                            size={80}
                            level="M"
                          />
                          <p className="text-xs mt-1 font-medium text-gray-700 text-center">Encuesta de Satisfacción</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowDiagnosticoPreview(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cerrar
                  </Button>
                  <Button onClick={handlePrintFromPreview} className="bg-orange-500 hover:bg-orange-600">
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
