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
  Wrench,
  UserCheck,
  MessageSquare,
  Truck,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { generarGuiaInterna, tieneGuiaEnvio } from "@/lib/guiaInternaService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DiagnosticoPrintSheet, type DiagnosticoPrintData } from "@/components/features/diagnostico";
import { IncidentePrintSheet } from "@/components/features/incidentes";
import { mycsapi } from "@/mics-api";
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
  tipo: "creacion" | "asignacion" | "diagnostico" | "reparacion" | "observacion" | "foto" | "guia" | "estado" | "repuesto" | "despacho";
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
  const [showDiagnosticoPrintPreview, setShowDiagnosticoPrintPreview] = useState(false);
  const [filtroEventos, setFiltroEventos] = useState("todos");
  const [ordenEventos, setOrdenEventos] = useState<"reciente" | "antiguo">("reciente");
  const [diagnosticoData, setDiagnosticoData] = useState<any>(null);
  const [accesoriosIncidente, setAccesoriosIncidente] = useState<string[]>([]);
  const [generandoGuia, setGenerandoGuia] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const diagnosticoPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const incData = await mycsapi.get("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: Number(id) } }) as any;

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

      // Extract centro de servicio directly from incData
      if ((incData as any).centro_de_servicio) {
        const cs = (incData as any).centro_de_servicio;
        setCentroServicio({ id: cs.id, nombre: cs.nombre, codigo: cs.codigo });
      }

      // Fetch guias (wrapped in try-catch to not break the rest of the flow)
      let guiasRes: any = { results: [] };
      try {
        guiasRes = await mycsapi.fetch("/api/v1/guias/search", { method: "GET", query: { incidente_id: incData.id } }) as any;
      } catch (e) {
        console.warn("Could not fetch guias:", e);
      }

      // Fetch additional data for timeline in parallel
      const { supabase } = await import("@/integrations/supabase/client");
      const incidenteIdNum = Number(id);
      
      const [
        comentariosRes,
        tecnicosRes,
        diagnosticosRes,
        fotosRes,
        clientHistoryRes,
      ] = await Promise.all([
        supabase
          .from("comentarios")
          .select("*, usuarios:autor_id(nombre)")
          .eq("incidente_id", incidenteIdNum)
          .order("created_at", { ascending: true }),
        supabase
          .from("incidente_tecnico")
          .select("*, usuarios:tecnico_id(nombre)")
          .eq("incidente_id", incidenteIdNum)
          .order("created_at", { ascending: true }),
        supabase
          .from("diagnosticos")
          .select("*, usuarios:tecnico_id(nombre)")
          .eq("incidente_id", incidenteIdNum)
          .order("created_at", { ascending: true }),
        supabase
          .from("incidente_fotos")
          .select("*, usuarios:created_by(nombre)")
          .eq("incidente_id", incidenteIdNum)
          .order("created_at", { ascending: true }),
        incData.cliente
          ? mycsapi.get("/api/v1/incidentes", { query: { limit: 1000 } })
          : Promise.resolve({ results: [] }),
      ]);

      // Set client history count
      if (incData.cliente) {
        const clienteIncidentes = (clientHistoryRes.results || []).filter(
          (i: any) => i.cliente?.id === (incData.cliente as any).id
        );
        setClienteHistorial(clienteIncidentes.length);
      }

      // Set guias
      const guiasData = (guiasRes.results || []).map((g: any) => ({
        id: g.id,
        numero_guia: g.numero_guia,
        estado: g.estado,
        fecha_guia: g.fecha_guia,
      }));
      setGuiasEnvio(guiasData);

      // Save diagnostico data if exists (for print sheet)
      const diagData = diagnosticosRes.data?.[0];
      if (diagData) {
        // Fetch fallas, causas and repuestos for the diagnostico
        const [fallasRes, causasRes, solicitudesRes] = await Promise.all([
          supabase
            .from("diagnostico_fallas")
            .select("fallas:falla_id(nombre)")
            .eq("diagnostico_id", diagData.id),
          supabase
            .from("diagnostico_causas")
            .select("causas:causa_id(nombre)")
            .eq("diagnostico_id", diagData.id),
          supabase
            .from("solicitudes_repuestos")
            .select("repuestos, estado")
            .eq("incidente_id", incidenteIdNum),
        ]);

        // Extract repuestos from JSONB field and fetch their prices
        const repuestosFromSolicitudes: any[] = [];
        for (const solicitud of (solicitudesRes.data || [])) {
          const repuestosJson = solicitud.repuestos as any[];
          if (repuestosJson && Array.isArray(repuestosJson)) {
            for (const r of repuestosJson) {
              repuestosFromSolicitudes.push({
                codigo: r.codigo,
                descripcion: r.descripcion || "Repuesto",
                cantidad: r.cantidad || 1,
                precioUnitario: 0, // Will be fetched below
              });
            }
          }
        }

        // Fetch prices for repuestos from inventario (costo_unitario)
        if (repuestosFromSolicitudes.length > 0) {
          const codigos = repuestosFromSolicitudes.map(r => r.codigo);
          const centroId = (incData as any).centro_de_servicio_id;
          
          // Get prices from inventario table
          const { data: inventarioData } = await supabase
            .from("inventario")
            .select("codigo_repuesto, costo_unitario")
            .in("codigo_repuesto", codigos)
            .eq("centro_servicio_id", centroId);
          
          const precioMap = new Map((inventarioData || []).map((r: any) => [r.codigo_repuesto, r.costo_unitario || 0]));
          repuestosFromSolicitudes.forEach(r => {
            r.precioUnitario = precioMap.get(r.codigo) || 0;
          });
        }

        setDiagnosticoData({
          ...diagData,
          fallas: (fallasRes.data || []).map((f: any) => f.fallas?.nombre).filter(Boolean),
          causas: (causasRes.data || []).map((c: any) => c.causas?.nombre).filter(Boolean),
          repuestos: repuestosFromSolicitudes,
          tecnicoNombre: diagData.usuarios?.nombre || "Técnico",
        });
      }

      // Fetch accesorios
      const accesoriosRes = await supabase
        .from("incidente_accesorios")
        .select("accesorios:accesorio_id(nombre)")
        .eq("incidente_id", incidenteIdNum);
      
      setAccesoriosIncidente(
        (accesoriosRes.data || []).map((a: any) => a.accesorios?.nombre).filter(Boolean)
      );

      // Fetch solicitudes_repuestos for timeline events
      const { data: solicitudesTimelineData } = await supabase
        .from("solicitudes_repuestos")
        .select("*, solicitante:tecnico_solicitante_id(nombre), despachador:entregado_por(nombre)")
        .eq("incidente_id", incidenteIdNum)
        .order("created_at", { ascending: true });
      const eventosBuilt: EventoHistorial[] = [];
      
      // Get propietario name if available
      const propietarioNombre = (incData as any).propietario?.nombre || "Sistema";

      // Evento de creación
      if (incData.created_at) {
        eventosBuilt.push({
          id: "creacion",
          tipo: "creacion",
          titulo: "Incidente Creado",
          descripcion: `Incidente ${incData.codigo} registrado en el sistema`,
          usuario: propietarioNombre,
          fecha: new Date(incData.created_at),
        });
      }

      // Eventos de asignación de técnicos
      (tecnicosRes.data || []).forEach((t: any, idx: number) => {
        eventosBuilt.push({
          id: `tecnico-${t.id || idx}`,
          tipo: "asignacion",
          titulo: "Técnico Asignado",
          descripcion: `${t.usuarios?.nombre || "Técnico"} asignado al incidente${t.es_principal ? " (Principal)" : ""}`,
          usuario: "Sistema",
          fecha: new Date(t.created_at),
        });
      });

      // Eventos de diagnósticos
      (diagnosticosRes.data || []).forEach((d: any, idx: number) => {
        const estadoLabel = d.estado === "COMPLETADO" ? "completado" : "en progreso";
        eventosBuilt.push({
          id: `diagnostico-${d.id || idx}`,
          tipo: "diagnostico",
          titulo: "Diagnóstico Realizado",
          descripcion: `Diagnóstico ${estadoLabel} por ${d.usuarios?.nombre || "Técnico"}`,
          usuario: d.usuarios?.nombre || "Técnico",
          fecha: new Date(d.created_at),
          observacion: d.recomendaciones,
        });
      });

      // Eventos de comentarios/observaciones
      (comentariosRes.data || []).forEach((c: any, idx: number) => {
        eventosBuilt.push({
          id: `comentario-${c.id || idx}`,
          tipo: "observacion",
          titulo: c.tipo === "INTERNO" ? "Nota Interna" : "Observación",
          descripcion: c.contenido,
          usuario: c.usuarios?.nombre || "Usuario",
          fecha: new Date(c.created_at),
        });
      });

      // Eventos de fotos
      const fotosTipoCount: Record<string, number> = {};
      (fotosRes.data || []).forEach((f: any) => {
        fotosTipoCount[f.tipo] = (fotosTipoCount[f.tipo] || 0) + 1;
      });
      
      // Agrupar fotos por tipo y fecha (solo mostrar un evento por tipo)
      const fotosAgrupadas = (fotosRes.data || []).reduce((acc: Record<string, any>, f: any) => {
        const key = f.tipo;
        if (!acc[key] || new Date(f.created_at) < new Date(acc[key].created_at)) {
          acc[key] = f;
        }
        return acc;
      }, {});

      Object.entries(fotosAgrupadas).forEach(([tipo, f]: [string, any]) => {
        const tipoLabels: Record<string, string> = {
          ingreso: "Ingreso",
          diagnostico: "Diagnóstico", 
          depuracion: "Depuración",
          salida: "Salida",
        };
        eventosBuilt.push({
          id: `foto-${tipo}`,
          tipo: "foto",
          titulo: `Fotos de ${tipoLabels[tipo] || tipo}`,
          descripcion: `${fotosTipoCount[tipo]} foto(s) agregada(s)`,
          usuario: f.usuarios?.nombre || "Usuario",
          fecha: new Date(f.created_at),
        });
      });

      // Eventos de guías
      guiasData.forEach((g: any, idx: number) => {
        eventosBuilt.push({
          id: `guia-${g.id || idx}`,
          tipo: "guia",
          titulo: "Guía de Envío",
          descripcion: `Guía ${g.numero_guia || "sin número"} - ${g.estado}`,
          usuario: "Logística",
          fecha: new Date(g.fecha_guia || new Date()),
        });
      });

      // Eventos de solicitudes de repuestos
      (solicitudesTimelineData || []).forEach((s: any, idx: number) => {
        // Evento de solicitud creada
        const repuestosCount = Array.isArray(s.repuestos) ? s.repuestos.length : 0;
        eventosBuilt.push({
          id: `solicitud-${s.id || idx}`,
          tipo: "repuesto",
          titulo: "Solicitud de Repuestos",
          descripcion: `${repuestosCount} repuesto(s) solicitado(s) - ${s.tipo_despacho === "autoservicio" ? "Autoservicio" : "Bodega"}`,
          usuario: s.solicitante?.nombre || "Técnico",
          fecha: new Date(s.created_at),
        });

        // Evento de despacho (si fue despachado)
        if (s.estado === "entregado" && s.fecha_entrega) {
          eventosBuilt.push({
            id: `despacho-${s.id || idx}`,
            tipo: "despacho",
            titulo: "Repuestos Despachados",
            descripcion: `${repuestosCount} repuesto(s) entregado(s) al técnico`,
            usuario: s.despachador?.nombre || "Bodega",
            fecha: new Date(s.fecha_entrega),
          });
        }
      });

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
      const newProdData = await mycsapi.get("/api/v1/productos/search", { query: {
        codigo: editedProductCode.toUpperCase(),
      } as any }) as any;

      if (!newProdData) {
        showError("Producto no encontrado");
        return;
      }

      await mycsapi.patch("/api/v1/incidentes/{incidente_id}", { path: { incidente_id: incidente.id }, body: { producto_id: (newProdData as any).id } as any }) as any;

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

  const handlePrintDiagnostico = () => {
    if (!diagnosticoData) {
      showError("No hay diagnóstico disponible para imprimir");
      return;
    }
    setShowDiagnosticoPrintPreview(true);
  };

  const handleGenerarGuia = async () => {
    if (!incidente) return;
    
    setGenerandoGuia(true);
    try {
      const result = await generarGuiaInterna(incidente.id);
      if (result.success) {
        showSuccess(`Guía ${result.numeroGuia || ""} generada exitosamente`);
        // Refrescar datos para mostrar la nueva guía
        fetchData();
      } else {
        showError(result.error || "No se pudo generar la guía");
      }
    } catch (error: any) {
      showError(error.message || "Error al generar la guía");
    } finally {
      setGenerandoGuia(false);
    }
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

  const handlePrintDiagnosticoFromPreview = () => {
    if (diagnosticoPrintRef.current) {
      const printContent = diagnosticoPrintRef.current.innerHTML;
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Hoja de Diagnóstico - ${incidente.codigo}</title>
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

  const getDiagnosticoPrintData = (): DiagnosticoPrintData | null => {
    if (!diagnosticoData || !incidente || !cliente || !producto) return null;
    
    const tipoResolucionMap: Record<string, string> = {
      REPARACION: "Reparar en Garantía",
      CAMBIO: "Cambio por Garantía",
      CANJE: "Canje",
      PRESUPUESTO: "Presupuesto",
      NOTA_CREDITO: "Nota de Crédito",
    };

    return {
      codigo: incidente.codigo,
      fechaIngreso: new Date(incidente.created_at || new Date()),
      fechaDiagnostico: new Date(diagnosticoData.created_at || new Date()),
      centroServicio: centroServicio?.nombre || "Centro de Servicio",
      codigoCliente: cliente.codigo,
      nombreCliente: cliente.nombre,
      telefonoCliente: cliente.telefono_principal || cliente.celular || "",
      direccionEnvio: cliente.direccion || undefined,
      codigoProducto: producto.codigo,
      descripcionProducto: producto.descripcion || "",
      skuMaquina: producto.clave || producto.codigo,
      accesorios: accesoriosIncidente,
      fallas: diagnosticoData.fallas || [],
      causas: diagnosticoData.causas || [],
      recomendaciones: diagnosticoData.recomendaciones || "",
      tecnicoNombre: diagnosticoData.tecnicoNombre || "Técnico",
      tipoResolucion: tipoResolucionMap[diagnosticoData.tipo_resolucion] || diagnosticoData.tipo_resolucion || "Reparación",
      aplicaGarantia: diagnosticoData.aplica_garantia || false,
      tipoTrabajo: diagnosticoData.tipo_trabajo || undefined,
      repuestos: diagnosticoData.repuestos || [],
      costoManoObra: 20, // Mano de obra fijo Q20
      costoConsumibles: 20, // Consumibles fijo Q20
      costoEnvio: incidente.quiere_envio ? 50 : 0,
      productoAlternativo: diagnosticoData.producto_alternativo_id ? {
        codigo: "",
        descripcion: "Producto alternativo",
      } : undefined,
      porcentajeDescuento: diagnosticoData.descuento_porcentaje || undefined,
    };
  };

  const getIngresoPrintData = () => {
    if (!incidente || !cliente || !producto) return null;
    
    // Parse observaciones to extract "Entrega:" person
    let personaDeja = "";
    if (incidente.observaciones) {
      const entregaMatch = incidente.observaciones.match(/Entrega:\s*([^|]+)/);
      if (entregaMatch) personaDeja = entregaMatch[1].trim();
    }

    const tipologiaMap: Record<string, string> = {
      GARANTIA: "Garantía",
      MANTENIMIENTO: "Mantenimiento",
      REPARACION: "Reparación",
    };

    return {
      codigo: incidente.codigo,
      codigoCliente: cliente.codigo,
      nombreCliente: cliente.nombre,
      telefonoCliente: cliente.telefono_principal || cliente.celular || undefined,
      direccionCliente: cliente.direccion || undefined,
      tipoCliente: "Mostrador",
      codigoProducto: producto.codigo,
      descripcionProducto: producto.descripcion || "",
      skuMaquina: producto.clave || producto.codigo,
      descripcionProblema: incidente.descripcion_problema || "Sin descripción",
      accesorios: accesoriosIncidente.join(", ") || "Ninguno",
      fechaIngreso: new Date(incidente.created_at || new Date()),
      centroServicio: centroServicio?.nombre || "Centro de Servicio",
      personaDejaMaquina: personaDeja || cliente.nombre,
      tipologia: tipologiaMap[incidente.tipologia || ""] || incidente.tipologia || "Servicio",
      esReingreso: !!incidente.incidente_origen_id,
      coberturaGarantia: incidente.aplica_garantia || false,
    };
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handlePrintIngreso}>
              <FileText className="h-4 w-4 mr-2" />
              Hoja de Ingreso
            </DropdownMenuItem>
            {diagnosticoData && (
              <DropdownMenuItem onClick={handlePrintDiagnostico}>
                <Wrench className="h-4 w-4 mr-2" />
                Hoja de Diagnóstico
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
                  <p className="text-muted-foreground mb-1">Estado</p>
                  <StatusBadge status={incidente.estado} />
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
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="creacion">Creación</SelectItem>
                      <SelectItem value="asignacion">Asignación</SelectItem>
                      <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                      <SelectItem value="observacion">Observación</SelectItem>
                      <SelectItem value="foto">Fotos</SelectItem>
                      <SelectItem value="guia">Guías</SelectItem>
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
                    eventosFiltrados.map((evento) => {
                      const getEventoIcon = () => {
                        switch (evento.tipo) {
                          case "creacion":
                            return { icon: Plus, bg: "bg-emerald-100", color: "text-emerald-600" };
                          case "asignacion":
                            return { icon: UserCheck, bg: "bg-blue-100", color: "text-blue-600" };
                          case "diagnostico":
                            return { icon: Wrench, bg: "bg-amber-100", color: "text-amber-600" };
                          case "observacion":
                            return { icon: MessageSquare, bg: "bg-purple-100", color: "text-purple-600" };
                          case "foto":
                            return { icon: Camera, bg: "bg-orange-100", color: "text-orange-600" };
                          case "guia":
                            return { icon: Truck, bg: "bg-indigo-100", color: "text-indigo-600" };
                          case "repuesto":
                            return { icon: Package, bg: "bg-cyan-100", color: "text-cyan-600" };
                          case "despacho":
                            return { icon: Package, bg: "bg-green-100", color: "text-green-600" };
                          default:
                            return { icon: Clock, bg: "bg-gray-100", color: "text-gray-600" };
                        }
                      };
                      const { icon: IconComponent, bg, color } = getEventoIcon();

                      return (
                        <div key={evento.id} className="grid grid-cols-2">
                          <div className="px-4 py-3">
                            <div className="flex items-start gap-3">
                              <div className={`w-6 h-6 rounded-full ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                <IconComponent className={`h-3 w-3 ${color}`} />
                              </div>
                              <div>
                                <p className="font-medium">{evento.titulo}</p>
                                <p className="text-sm text-muted-foreground">{evento.descripcion}</p>
                                <p className="text-xs text-primary mt-1">{evento.usuario}</p>
                              </div>
                            </div>
                          </div>
                          <div className="px-4 py-3 flex items-start justify-between">
                            <p className="text-muted-foreground text-sm">{evento.observacion || "—"}</p>
                            <p className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {formatFechaCorta(evento.fecha)} {formatHora(evento.fecha)}
                            </p>
                          </div>
                        </div>
                      );
                    })
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">Guías de Envío</span>
                </div>
                {incidente.quiere_envio && (
                  <Badge variant="secondary" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    Envío solicitado
                  </Badge>
                )}
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
              ) : incidente.quiere_envio ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No hay guías de envío generadas
                  </p>
                  {(incidente.estado === "REPARADO" || incidente.estado === "EN_ENTREGA") && (
                    <Button 
                      onClick={handleGenerarGuia} 
                      disabled={generandoGuia}
                      className="gap-2"
                    >
                      {generandoGuia ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Truck className="h-4 w-4" />
                          Generar Guía de Envío
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Cliente recogerá en tienda
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Preview Dialog - Hoja de Ingreso */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa - Hoja de Ingreso</DialogTitle>
            <DialogDescription>Hoja de ingreso para el incidente {incidente.codigo}</DialogDescription>
          </DialogHeader>
          <div ref={printRef}>
            {getIngresoPrintData() && (
              <IncidentePrintSheet data={getIngresoPrintData()!} />
            )}
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

      {/* Diagnostico Print Preview Dialog */}
      <Dialog open={showDiagnosticoPrintPreview} onOpenChange={setShowDiagnosticoPrintPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa - Hoja de Diagnóstico</DialogTitle>
            <DialogDescription>Diagnóstico técnico para el incidente {incidente.codigo}</DialogDescription>
          </DialogHeader>
          <div ref={diagnosticoPrintRef}>
            {getDiagnosticoPrintData() && (
              <DiagnosticoPrintSheet data={getDiagnosticoPrintData()!} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiagnosticoPrintPreview(false)}>
              Cerrar
            </Button>
            <Button onClick={handlePrintDiagnosticoFromPreview}>
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
