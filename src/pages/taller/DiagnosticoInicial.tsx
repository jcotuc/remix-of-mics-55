import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  Search,
  ShoppingCart,
  X,
  Clock,
  Loader2,
  AlertCircle,
  Wrench,
  Ban,
  XCircle,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// Fallas y Causas ahora se cargan desde la base de datos
import { Textarea } from "@/components/ui/textarea";
import { OutlinedInput, OutlinedTextarea } from "@/components/ui/outlined-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SidebarMediaCapture, SidebarPhoto } from "@/components/features/media";
export default function DiagnosticoInicial() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incidente, setIncidente] = useState<any>(null);
  const [productoInfo, setProductoInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Paso 1: Fallas, Causas, Garantía, Resolución
  const [fallas, setFallas] = useState<string[]>([]);
  const [causas, setCausas] = useState<string[]>([]);

  // Dialogs para agregar nuevas fallas/causas
  const [showAddFallaDialog, setShowAddFallaDialog] = useState(false);
  const [showAddCausaDialog, setShowAddCausaDialog] = useState(false);
  const [nuevaFalla, setNuevaFalla] = useState("");
  const [nuevaCausa, setNuevaCausa] = useState("");
  const [fallasPersonalizadas, setFallasPersonalizadas] = useState<string[]>([]);
  const [causasPersonalizadas, setCausasPersonalizadas] = useState<string[]>([]);
  const [aplicaGarantia, setAplicaGarantia] = useState<boolean | null>(null);
  const [tipoResolucion, setTipoResolucion] = useState<string>("");

  // Paso 2: Solicitud de Repuestos
  const [necesitaRepuestos, setNecesitaRepuestos] = useState(false);
  const [repuestosDisponibles, setRepuestosDisponibles] = useState<any[]>([]);
  const [repuestosSolicitados, setRepuestosSolicitados] = useState<
    Array<{
      codigo: string;
      codigoOriginal?: string;
      descripcion: string;
      cantidad: number;
      ubicacion?: string;
    }>
  >([]);
  const [searchRepuesto, setSearchRepuesto] = useState("");
  const [solicitudesAnteriores, setSolicitudesAnteriores] = useState<Array<any>>([]);
  const [solicitudRepuestosId, setSolicitudRepuestosId] = useState<string | null>(null);
  const [tabSolicitudActiva, setTabSolicitudActiva] = useState<number>(0);

  // Mapa de relaciones hijo→padre
  const [hijoPadreMap, setHijoPadreMap] = useState<Map<string, string>>(new Map());
  const [estadoSolicitud, setEstadoSolicitud] = useState<string | null>(null);

  // Fallas y Causas desde base de datos
  const [fallasDB, setFallasDB] = useState<
    Array<{
      id: number;
      nombre: string;
      familia_id: number | null;
    }>
  >([]);
  const [causasDB, setCausasDB] = useState<
    Array<{
      id: number;
      nombre: string;
      familia_id: number | null;
    }>
  >([]);
  const [familiasDB, setFamiliasDB] = useState<
    Array<{
      id: number;
      Categoria: string | null;
      Padre: number | null;
    }>
  >([]);

  // Paso 3: Fotos y Observaciones
  const [fotos, setFotos] = useState<File[]>([]);
  const [observaciones, setObservaciones] = useState("");

  // Gemba Docs - Fotos con comentarios (disponible en cualquier paso)
  const [gembaPhotos, setGembaPhotos] = useState<SidebarPhoto[]>([]);

  // Estado para flujo mejorado de garantía/reparable
  const [esReparable, setEsReparable] = useState<boolean | null>(null);

  // Paso de Canje (entre paso 1 y 2)
  const [productosAlternativos, setProductosAlternativos] = useState<any[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState<10 | 40 | null>(null);
  const [searchProducto, setSearchProducto] = useState("");

  // Control de pasos
  const [paso, setPaso] = useState(1);

  // Dialog para tipo de trabajo
  const [showTipoTrabajoDialog, setShowTipoTrabajoDialog] = useState(false);
  const [tipoTrabajo, setTipoTrabajo] = useState<"mantenimiento" | "reparacion" | null>(null);

  // Dialog para confirmar desasignación
  const [showDesasignarDialog, setShowDesasignarDialog] = useState(false);
  const [desasignando, setDesasignando] = useState(false);

  // Determinar si el diagnóstico NO ha empezado (sin selecciones)
  const diagnosticoNoIniciado = useMemo(() => {
    return (
      fallas.length === 0 &&
      causas.length === 0 &&
      esReparable === null &&
      aplicaGarantia === null &&
      tipoResolucion === ""
    );
  }, [fallas, causas, esReparable, aplicaGarantia, tipoResolucion]);

  // Obtener el ID del abuelo desde CDS_Familias.Padre usando familia_padre_id
  const familiaAbueloId = useMemo(() => {
    if (!productoInfo?.familia_padre_id) return null;
    const familiaPadreId = Number(productoInfo.familia_padre_id);
    const familia = familiasDB.find((f) => Number(f.id) === familiaPadreId);
    return familia?.Padre ? Number(familia.Padre) : null;
  }, [productoInfo?.familia_padre_id, familiasDB]);

  // Obtener fallas según jerarquía: del PADRE (subcategoría) + del ABUELO (categoría general)
  const fallasDisponibles = useMemo(() => {
    const fallasSet = new Set<string>();
    const familiaPadreId = productoInfo?.familia_padre_id ? Number(productoInfo.familia_padre_id) : null;

    // 1. Fallas del PADRE (subcategoría específica, ej: Rotomartillos)
    if (familiaPadreId) {
      fallasDB.filter((f) => Number(f.familia_id) === familiaPadreId).forEach((f) => fallasSet.add(f.nombre));
    }

    // 2. Fallas del ABUELO (categoría general, ej: Electrica) - obtenido de CDS_Familias.Padre
    if (familiaAbueloId) {
      fallasDB.filter((f) => Number(f.familia_id) === familiaAbueloId).forEach((f) => fallasSet.add(f.nombre));
    }

    // 3. Si no hay nada, mostrar fallas sin familia asignada
    if (fallasSet.size === 0) {
      fallasDB.filter((f) => !f.familia_id).forEach((f) => fallasSet.add(f.nombre));
    }
    return Array.from(fallasSet).sort();
  }, [productoInfo?.familia_padre_id, familiaAbueloId, fallasDB]);

  // Obtener causas del ABUELO con fallback a Eléctrica para Compresores y Soldadoras
  const causasDisponibles = useMemo(() => {
    const ID_ELECTRICA = 4;
    const ID_COMPRESOR = 1;
    const ID_SOLDADORAS = 60;

    // 1. Intentar con causas del ABUELO
    if (familiaAbueloId) {
      const causasAbuelo = causasDB.filter((c) => Number(c.familia_id) === familiaAbueloId).map((c) => c.nombre);
      if (causasAbuelo.length > 0) return causasAbuelo.sort();

      // 2. FALLBACK: Si es Compresor o Soldadora, usar causas de Eléctrica
      if (familiaAbueloId === ID_COMPRESOR || familiaAbueloId === ID_SOLDADORAS) {
        const causasElectrica = causasDB.filter((c) => Number(c.familia_id) === ID_ELECTRICA).map((c) => c.nombre);
        if (causasElectrica.length > 0) return causasElectrica.sort();
      }
    }

    // 3. Fallback final: causas sin familia asignada
    return causasDB
      .filter((c) => !c.familia_id)
      .map((c) => c.nombre)
      .sort();
  }, [familiaAbueloId, causasDB]);
  useEffect(() => {
    const initDiagnostico = async () => {
      await Promise.all([fetchIncidente(), fetchFallasYCausas(), verificarSolicitudRepuestos()]);
      await cargarBorradorDiagnostico();
    };
    initDiagnostico();
  }, [id]);

  // Cargar fallas y causas desde la base de datos
  const fetchFallasYCausas = async () => {
    try {
      const [fallasRes, causasRes, familiasRes] = await Promise.all([
        supabase.from("CDS_Fallas").select("id, nombre, familia_id").order("nombre"),
        supabase.from("CDS_Causas").select("id, nombre, familia_id").order("nombre"),
        supabase.from("CDS_Familias").select("id, Categoria, Padre"),
      ]);
      if (fallasRes.data) setFallasDB(fallasRes.data);
      if (causasRes.data) setCausasDB(causasRes.data);
      if (familiasRes.data) setFamiliasDB(familiasRes.data);
    } catch (error) {
      console.error("Error cargando fallas y causas:", error);
    }
  };
  useEffect(() => {
    if (incidente?.codigo_producto) {
      fetchRepuestos();
    }
  }, [incidente?.codigo_producto]);

  // Auto-guardado cada 30 segundos
  useEffect(() => {
    if (!incidente) return;
    const interval = setInterval(() => {
      guardarBorradorSilencioso();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [fallas, causas, aplicaGarantia, tipoResolucion, observaciones, paso, incidente]);

  // Cargar borrador existente
  const cargarBorradorDiagnostico = async () => {
    try {
      const { data, error } = await supabase
        .from("diagnosticos")
        .select("*")
        .eq("incidente_id", id)
        .eq("estado", "borrador")
        .maybeSingle();
      if (error) throw error;
      if (data) {
        // Restaurar estado del diagnóstico
        if (data.fallas && Array.isArray(data.fallas)) {
          setFallas(data.fallas);
        }
        if (data.causas && Array.isArray(data.causas)) {
          setCausas(data.causas);
        }
        if (data.recomendaciones) {
          setObservaciones(data.recomendaciones);
        }

        // Restaurar paso (guardado en el campo tiempo_estimado como hack temporal)
        if (data.tiempo_estimado) {
          const pasoGuardado = parseInt(data.tiempo_estimado);
          if (!isNaN(pasoGuardado)) {
            setPaso(pasoGuardado);
          }
        }

        // Restaurar datos adicionales del metadata (si existen)
        const metadata = data.resolucion ? JSON.parse(data.resolucion) : null;
        if (metadata) {
          if (metadata.aplicaGarantia !== undefined) {
            setAplicaGarantia(metadata.aplicaGarantia);
          }
          if (metadata.tipoResolucion) {
            setTipoResolucion(metadata.tipoResolucion);
          }
        }
        toast.success("Se recuperó el borrador del diagnóstico");
      }
    } catch (error) {
      console.error("Error cargando borrador:", error);
    }
  };
  const guardarBorradorSilencioso = async () => {
    if (!incidente) return;
    console.log("🔄 Auto-guardando diagnóstico...", {
      paso,
      fallas: fallas.length,
      causas: causas.length,
    });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("nombre, apellido")
        .eq("user_id", user.id)
        .maybeSingle();
      const tecnicoNombre = profile ? `${profile.nombre} ${profile.apellido}` : user.email || "Técnico";

      // Guardar metadata en el campo resolucion como JSON
      const metadata = {
        aplicaGarantia,
        tipoResolucion,
        productoAlternativo: productoSeleccionado
          ? {
              codigo: productoSeleccionado.codigo,
              descripcion: productoSeleccionado.descripcion,
            }
          : null,
        porcentajeDescuento,
      };
      const borradorData = {
        incidente_id: id,
        tecnico_codigo: incidente.codigo_tecnico || "TEMP",
        fallas,
        causas,
        recomendaciones: observaciones,
        estado: "borrador",
        tiempo_estimado: paso.toString(),
        // Guardar el paso actual
        resolucion: JSON.stringify(metadata),
      };

      // Verificar si ya existe un borrador
      const { data: existingDraft } = await supabase
        .from("diagnosticos")
        .select("id")
        .eq("incidente_id", id)
        .eq("estado", "borrador")
        .maybeSingle();
      if (existingDraft) {
        // Actualizar borrador existente
        await supabase.from("diagnosticos").update(borradorData).eq("id", existingDraft.id);
        console.log("✅ Borrador actualizado automáticamente");
      } else {
        // Crear nuevo borrador
        await supabase.from("diagnosticos").insert(borradorData);
        console.log("✅ Borrador creado automáticamente");
      }
    } catch (error) {
      console.error("❌ Error guardando borrador:", error);
    }
  };
  useEffect(() => {
    if (incidente?.codigo_producto) {
      fetchRepuestos();
    }
  }, [incidente?.codigo_producto]);

  // Verificar si ya existe una solicitud de repuestos para este incidente
  const verificarSolicitudRepuestos = async () => {
    try {
      console.log("🔍 Verificando solicitudes de repuestos para incidente:", id);
      const { data, error } = await supabase
        .from("solicitudes_repuestos")
        .select("*")
        .eq("incidente_id", id)
        .order("created_at", {
          ascending: false,
        });
      if (error) {
        console.error("Error verificando solicitud:", error);
        throw error;
      }
      if (data && data.length > 0) {
        console.log("✅ Solicitudes encontradas:", data.length);

        // Guardar todas las solicitudes anteriores
        setSolicitudesAnteriores(data);

        // La más reciente para referencia
        const solicitudMasReciente = data[0];
        setSolicitudRepuestosId(solicitudMasReciente.id);
        setEstadoSolicitud(solicitudMasReciente.estado);
        console.log("📦 Solicitud más reciente:", solicitudMasReciente);
      } else {
        console.log("ℹ️ No hay solicitudes de repuestos para este incidente");
        setSolicitudesAnteriores([]);
      }
    } catch (error) {
      console.error("❌ Error verificando solicitud:", error);
    }
  };
  const fetchRepuestos = async () => {
    if (!incidente?.codigo_producto) return;
    try {
      // 1. Cargar TODAS las relaciones padre-hijo con paginación (más de 14,000 registros)
      let allRelaciones: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: relacionesData, error: relError } = await supabase
          .from("repuestos_relaciones")
          .select("*")
          .range(from, from + pageSize - 1);
        if (relError) {
          console.error("Error cargando relaciones:", relError);
          break;
        }
        if (!relacionesData || relacionesData.length === 0) break;
        allRelaciones = [...allRelaciones, ...relacionesData];
        if (relacionesData.length < pageSize) break;
        from += pageSize;
      }
      console.log("Total relaciones cargadas:", allRelaciones.length);

      // Crear mapa id→código para resolver referencias de Padre (que es un ID, no código)
      const idToCodigoMap = new Map<number, string>();
      const idToDescripcionMap = new Map<number, string>();
      allRelaciones.forEach((r: any) => {
        if (r.id && r.Código) {
          idToCodigoMap.set(r.id, r.Código);
          if (r.Descripción) {
            idToDescripcionMap.set(r.id, r.Descripción);
          }
        }
      });

      // Crear mapa hijo→padre resolviendo el ID del padre a su código
      const newHijoPadreMap = new Map<string, string>();
      const padreDescripcionMap = new Map<string, string>();
      allRelaciones.forEach((r: any) => {
        const codigoHijo = r.Código;
        const padreId = r.Padre; // Este es un ID numérico, no el código

        if (codigoHijo && padreId) {
          // Resolver el ID del padre a su código real
          const codigoPadre = idToCodigoMap.get(padreId);
          if (codigoPadre) {
            newHijoPadreMap.set(codigoHijo, codigoPadre);
            // Guardar descripción del padre
            const descripcionPadre = idToDescripcionMap.get(padreId);
            if (descripcionPadre) {
              padreDescripcionMap.set(codigoPadre, descripcionPadre);
            }
          }
        }
      });
      setHijoPadreMap(newHijoPadreMap);
      console.log("Mapa hijo→padre:", newHijoPadreMap.size, "registros");

      // 2. Obtener producto_id y cargar repuestos
      const { data: producto } = await supabase
        .from("productos")
        .select("id,codigo")
        .eq("codigo", incidente.codigo_producto)
        .maybeSingle();

      if (!producto) {
        setRepuestosDisponibles([]);
        return;
      }

      const { data, error } = await supabase
        .from("repuestos")
        .select("*")
        .eq("codigo_producto", producto.codigo)
        .order("descripcion")
        .returns<any[]>();
      if (error) throw error;
      console.log("AQUI1", producto, data, error);

      // 2.5. Extraer códigos de repuestos para consultar inventario
      const codigosRepuestos = (data || []).map((r) => r.codigo);
      // También incluir códigos padre para buscar stock
      const codigosPadre = codigosRepuestos.map((codigo) => newHijoPadreMap.get(codigo)).filter(Boolean) as string[];
      const todosLosCodigos = [...new Set([...codigosRepuestos, ...codigosPadre])];

      // 2.6. Obtener centro_servicio_id del usuario y consultar inventario SOLO para los códigos necesarios
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let stockMap = new Map<string, { cantidad: number; ubicacion: string }>();

      if (user && todosLosCodigos.length > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("centro_servicio_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.centro_servicio_id) {
          const { data: inventarioData } = await supabase
            .from("inventario")
            .select("codigo_repuesto, cantidad, ubicacion_legacy")
            .eq("centro_servicio_id", profile.centro_servicio_id)
            .in("codigo_repuesto", todosLosCodigos);

          // Crear mapa de stock (sumando si hay múltiples ubicaciones)
          inventarioData?.forEach((item) => {
            const existing = stockMap.get(item.codigo_repuesto);
            if (existing) {
              stockMap.set(item.codigo_repuesto, {
                cantidad: existing.cantidad + item.cantidad,
                ubicacion: existing.ubicacion + ", " + item.ubicacion_legacy,
              });
            } else {
              stockMap.set(item.codigo_repuesto, {
                cantidad: item.cantidad,
                ubicacion: item.ubicacion_legacy || "",
              });
            }
          });
          console.log(
            "Stock cargado para",
            inventarioData?.length || 0,
            "repuestos de",
            todosLosCodigos.length,
            "códigos buscados",
          );
        }
      }

      // 3. Transformar: reemplazar códigos hijo por padre
      const repuestosTransformados: any[] = [];
      const codigosVistos = new Set<string>();
      (data || []).forEach((repuesto) => {
        const codigoPadre = newHijoPadreMap.get(repuesto.codigo);
        const codigoFinal = codigoPadre || repuesto.codigo;

        // Si ya vimos este código padre, no agregarlo de nuevo
        if (!codigosVistos.has(codigoFinal)) {
          codigosVistos.add(codigoFinal);

          // Obtener descripción del padre si existe
          const descripcionPadre = padreDescripcionMap.get(codigoFinal);

          // Obtener stock del inventario - buscar por código final O código original
          let stockInfo = stockMap.get(codigoFinal);
          if (!stockInfo && repuesto.codigo !== codigoFinal) {
            stockInfo = stockMap.get(repuesto.codigo);
          }

          repuestosTransformados.push({
            ...repuesto,
            codigo: codigoFinal,
            codigoOriginal: codigoPadre ? repuesto.codigo : undefined,
            descripcion: descripcionPadre || repuesto.descripcion,
            esCodigoPadre: !!codigoPadre,
            stock_actual: stockInfo?.cantidad || 0,
            ubicacion_inventario: stockInfo?.ubicacion || null,
          });
          if (codigoPadre) {
            console.log(`Transformado: ${repuesto.codigo} → ${codigoFinal}`);
          }
        }
      });
      setRepuestosDisponibles(repuestosTransformados);
    } catch (error) {
      console.error("Error fetching repuestos:", error);
      toast.error("Error al cargar los repuestos");
    }
  };
  const fetchIncidente = async () => {
    try {
      const { data, error } = await supabase.from("incidentes").select("*").eq("id", id).single();
      if (error) throw error;
      setIncidente(data);

      // Registrar timestamp de inicio de diagnóstico si no existe
      if (data && !data.fecha_inicio_diagnostico && data.status === "En diagnostico") {
        await supabase.from("incidentes").update({ fecha_inicio_diagnostico: new Date().toISOString() }).eq("id", id);
        console.log("✅ Timestamp de inicio de diagnóstico registrado");
      }

      // Obtener información del producto
      if (data?.codigo_producto) {
        const { data: producto } = await supabase
          .from("productos")
          .select("*")
          .eq("codigo", data.codigo_producto)
          .maybeSingle();
        if (producto) setProductoInfo(producto);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar el incidente");
    } finally {
      setLoading(false);
    }
  };
  const resolucionesConGarantia = ["Reparar en Garantía", "Cambio por Garantía", "Nota de Crédito"];
  const resolucionesSinGarantia = ["Canje", "Presupuesto"];
  const opcionesResolucion = aplicaGarantia ? resolucionesConGarantia : resolucionesSinGarantia;

  // Determinar si necesita repuestos según el tipo de resolución
  useEffect(() => {
    if (tipoResolucion === "Reparar en Garantía" || tipoResolucion === "Presupuesto") {
      setNecesitaRepuestos(true);
    } else {
      setNecesitaRepuestos(false);
    }
  }, [tipoResolucion]);

  // Auto-seleccionar resolución según matriz Reparable/Garantía
  useEffect(() => {
    if (esReparable === null || aplicaGarantia === null) return;

    // Matriz de resoluciones:
    // Reparable=0, Garantía=0 → Canje
    // Reparable=0, Garantía=1 → Cambio por Garantía
    // Reparable=1, Garantía=0 → Presupuesto
    // Reparable=1, Garantía=1 → Reparar en Garantía

    if (!esReparable && !aplicaGarantia) {
      setTipoResolucion("Canje");
    } else if (!esReparable && aplicaGarantia) {
      // No pre-seleccionar para que el usuario elija entre CxG o NC
      setTipoResolucion("");
    } else if (esReparable && !aplicaGarantia) {
      setTipoResolucion("Presupuesto");
    } else if (esReparable && aplicaGarantia) {
      setTipoResolucion("Reparar en Garantía");
    }
  }, [esReparable, aplicaGarantia]);

  // Buscar productos alternativos cuando se selecciona Canje (esperar a que incidente esté cargado)
  useEffect(() => {
    if (tipoResolucion === "Canje" && incidente) {
      fetchProductosAlternativos();
    }
  }, [tipoResolucion, incidente?.familia_padre_id, productoInfo?.familia_padre_id]);

  // Familia a excluir: Herramienta Manual
  const FAMILIA_HERRAMIENTA_MANUAL = 130;

  const fetchProductosAlternativos = async () => {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("*, familia_padre:CDS_Familias!productos_familia_padre_id_fkey(id, Categoria, Padre)")
        .eq("descontinuado", false)
        .neq("familia_padre_id", FAMILIA_HERRAMIENTA_MANUAL) // Excluir Herramienta Manual
        .order("descripcion");
      if (error) throw error;

      // Obtener la familia del producto original para ordenar sugerencias
      const familiaOriginal = incidente?.familia_padre_id || productoInfo?.familia_padre_id;

      console.log("Familia original del producto:", familiaOriginal, "Incidente:", incidente?.codigo);

      // Ordenar productos: primero los de la MISMA familia (familia_padre_id)
      const productosOrdenados = (data || [])
        .map((p) => {
          // Comparar directamente familia_padre_id
          const esSugerido = familiaOriginal && p.familia_padre_id === familiaOriginal;

          return {
            ...p,
            esSugerido: esSugerido || false,
          };
        })
        .sort((a, b) => {
          // Primero los sugeridos
          if (a.esSugerido && !b.esSugerido) return -1;
          if (!a.esSugerido && b.esSugerido) return 1;
          // Luego ordenar por descripción
          return a.descripcion.localeCompare(b.descripcion);
        });

      setProductosAlternativos(productosOrdenados);

      // Si el producto actual es vigente, pre-seleccionarlo como alternativo
      if (productoInfo && !productoInfo.descontinuado && incidente?.codigo_producto) {
        const productoActual = productosOrdenados.find((p) => p.codigo === incidente.codigo_producto);
        if (productoActual) {
          setProductoSeleccionado(productoActual);
          toast.info("Producto vigente pre-seleccionado como alternativa");
        }
      }
    } catch (error) {
      console.error("Error fetching productos:", error);
      toast.error("Error al cargar productos alternativos");
    }
  };
  const handleContinuarAPaso2 = async () => {
    if (fallas.length === 0) {
      toast.error("Debes seleccionar al menos una falla");
      return;
    }
    if (causas.length === 0) {
      toast.error("Debes seleccionar al menos una causa");
      return;
    }
    if (aplicaGarantia === null) {
      toast.error("Debes indicar si aplica garantía");
      return;
    }
    if (!tipoResolucion) {
      toast.error("Debes seleccionar un tipo de resolución");
      return;
    }

    // Guardar borrador antes de continuar
    await guardarBorradorSilencioso();

    // Si es Cambio por Garantía, redirigir a la página dedicada
    if (tipoResolucion === "Cambio por Garantía") {
      navigate(`/taller/cambio-garantia/${id}`);
      return;
    }

    // Si es Canje, ir al paso 1.5 (cotización de canje)
    if (tipoResolucion === "Canje") {
      setPaso(1.5);
    }
    // Si necesita repuestos, ir al paso 2, si no, ir directo al paso 3
    else if (necesitaRepuestos) {
      setPaso(2);
    } else {
      setPaso(3);
    }
  };
  const handleContinuarDesdeCanje = async () => {
    if (!productoSeleccionado) {
      toast.error("Debes seleccionar un producto alternativo");
      return;
    }
    if (!porcentajeDescuento) {
      toast.error("Debes seleccionar un porcentaje de descuento");
      return;
    }

    // Guardar la información del canje
    await guardarBorradorSilencioso();

    // Pasar al siguiente paso (fotos y observaciones)
    setPaso(3);
  };
  const filteredRepuestos = repuestosDisponibles.filter(
    (repuesto) =>
      repuesto.descripcion.toLowerCase().includes(searchRepuesto.toLowerCase()) ||
      repuesto.codigo.toLowerCase().includes(searchRepuesto.toLowerCase()) ||
      repuesto.clave.toLowerCase().includes(searchRepuesto.toLowerCase()),
  );
  const agregarRepuesto = (repuesto: any) => {
    // Siempre usar el código padre si existe
    const codigoPadre = hijoPadreMap.get(repuesto.codigo);
    const codigoFinal = codigoPadre || repuesto.codigo;
    const yaExiste = repuestosSolicitados.find((r) => r.codigo === codigoFinal);
    if (yaExiste) {
      setRepuestosSolicitados(
        repuestosSolicitados.map((r) =>
          r.codigo === codigoFinal
            ? {
                ...r,
                cantidad: r.cantidad + 1,
              }
            : r,
        ),
      );
    } else {
      setRepuestosSolicitados([
        ...repuestosSolicitados,
        {
          codigo: codigoFinal,
          codigoOriginal: codigoPadre ? repuesto.codigo : undefined,
          descripcion: repuesto.descripcion,
          cantidad: 1,
          ubicacion: repuesto.ubicacion_inventario || "",
        },
      ]);

      // Notificar si hubo sustitución
      if (codigoPadre) {
        toast.success(`${repuesto.codigo} → ${codigoFinal} (código padre)`);
      } else {
        toast.success("Repuesto agregado");
      }
    }
  };

  // Ubicaciones de autoservicio
  const UBICACIONES_AUTOSERVICIO = ["T09.001.01", "T07.001.01"];

  // Verificar si algún repuesto solicitado está en ubicación de autoservicio
  const tieneRepuestosAutoservicio = repuestosSolicitados.some((r) => {
    const ubicaciones = (r.ubicacion || "").split(",").map((u: string) => u.trim());
    return ubicaciones.some((u: string) => UBICACIONES_AUTOSERVICIO.includes(u));
  });
  const actualizarCantidad = (codigo: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      setRepuestosSolicitados(repuestosSolicitados.filter((r) => r.codigo !== codigo));
    } else {
      setRepuestosSolicitados(
        repuestosSolicitados.map((r) =>
          r.codigo === codigo
            ? {
                ...r,
                cantidad: nuevaCantidad,
              }
            : r,
        ),
      );
    }
  };
  const eliminarRepuesto = (codigo: string) => {
    setRepuestosSolicitados(repuestosSolicitados.filter((r) => r.codigo !== codigo));
  };
  const handleEnviarSolicitudRepuestos = async (tipoDespacho: "bodega" | "autoservicio") => {
    if (repuestosSolicitados.length === 0) {
      toast.error("Debes agregar al menos un repuesto");
      return;
    }

    // Verificar stock de cada repuesto solicitado
    const repuestosConStock: typeof repuestosSolicitados = [];
    const repuestosSinStock: Array<{
      codigo: string;
      descripcion: string;
      cantidad: number;
      stockActual: number;
    }> = [];

    repuestosSolicitados.forEach((rep) => {
      // Buscar el repuesto en repuestosDisponibles para obtener su stock actual
      const repuestoInfo = repuestosDisponibles.find((r) => r.codigo === rep.codigo);
      const stockActual = repuestoInfo?.stock_actual || 0;

      if (stockActual >= rep.cantidad) {
        repuestosConStock.push(rep);
      } else {
        repuestosSinStock.push({
          codigo: rep.codigo,
          descripcion: rep.descripcion,
          cantidad: rep.cantidad,
          stockActual,
        });
      }
    });

    // Si hay repuestos sin stock
    if (repuestosSinStock.length > 0) {
      // CASO ESPECIAL: Si es Presupuesto, crear solicitud de todas formas (bloqueada)
      if (tipoResolucion === "Presupuesto") {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("No user found");

          const { data: profile } = await supabase
            .from("profiles")
            .select("nombre, apellido")
            .eq("user_id", user.id)
            .maybeSingle();

          const tecnicoNombre = profile ? `${profile.nombre} ${profile.apellido}` : user.email || "Técnico";

          // Crear solicitud con TODOS los repuestos (con y sin stock)
          // Marcarla como presupuesto pendiente de aprobación
          const notaSinStock = repuestosSinStock.map((r) => `${r.codigo} (stock: ${r.stockActual})`).join(", ");

          const { data, error } = await supabase
            .from("solicitudes_repuestos")
            .insert({
              incidente_id: id,
              tecnico_solicitante: tecnicoNombre,
              repuestos: repuestosSolicitados, // Todos los repuestos
              estado: "pendiente",
              tipo_despacho: tipoDespacho,
              tipo_resolucion: "Presupuesto",
              presupuesto_aprobado: false,
              notas: `⚠️ Repuestos sin stock suficiente: ${notaSinStock}`,
            })
            .select()
            .single();

          if (error) throw error;

          // Limpiar la lista de repuestos seleccionados
          setRepuestosSolicitados([]);

          // Recargar solicitudes
          await verificarSolicitudRepuestos();

          // Guardar borrador
          await guardarBorradorSilencioso();

          toast.info(
            "Solicitud registrada como Presupuesto. Cuando el cliente apruebe, se gestionará el pedido de repuestos faltantes.",
            { duration: 6000 },
          );

          // Continuar al paso 3 normalmente (mantener tipoResolucion = "Presupuesto")
          setPaso(3);
        } catch (error) {
          console.error("Error:", error);
          toast.error("Error al procesar la solicitud");
        }
        return;
      }

      // Para otros tipos de resolución (Garantía, etc.), flujo original
      toast.error(
        `${repuestosSinStock.length} repuesto(s) sin stock suficiente. El incidente pasará a "Pendiente por repuestos".`,
        { duration: 5000 },
      );

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

        const { data: profile } = await supabase
          .from("profiles")
          .select("nombre, apellido")
          .eq("user_id", user.id)
          .maybeSingle();

        const tecnicoNombre = profile ? `${profile.nombre} ${profile.apellido}` : user.email || "Técnico";

        // Guardar repuestos pendientes en el diagnóstico (no crear solicitud a bodega)
        const { data: existingDiag } = await supabase
          .from("diagnosticos")
          .select("id, repuestos_utilizados")
          .eq("incidente_id", id)
          .maybeSingle();

        const repuestosPendientesData = {
          repuestos_sin_stock: repuestosSinStock.map((r) => ({
            codigo: r.codigo,
            descripcion: r.descripcion,
            cantidad_solicitada: r.cantidad,
            stock_disponible: (r as any).stockActual || 0,
          })),
          fecha_solicitud: new Date().toISOString(),
          solicitado_por: tecnicoNombre,
        };

        if (existingDiag) {
          await supabase
            .from("diagnosticos")
            .update({
              repuestos_utilizados: repuestosPendientesData,
            })
            .eq("id", existingDiag.id);
        }

        // Cambiar estado del incidente a "Pendiente por repuestos"
        await supabase
          .from("incidentes")
          .update({
            status: "Pendiente por repuestos",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        // Limpiar repuestos solicitados
        setRepuestosSolicitados([]);

        toast.success("Incidente marcado como 'Pendiente por repuestos'. Jefe de taller dará seguimiento.", {
          duration: 5000,
        });

        // Avanzar al paso 3 con resolución forzada
        setTipoResolucion("Pendiente por Repuestos");
        setPaso(3);
      } catch (error) {
        console.error("Error:", error);
        toast.error("Error al procesar la solicitud");
      }
      return;
    }

    // Si todos tienen stock, continuar con el flujo normal
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      const { data: profile } = await supabase
        .from("profiles")
        .select("nombre, apellido")
        .eq("user_id", user.id)
        .maybeSingle();
      const tecnicoNombre = profile ? `${profile.nombre} ${profile.apellido}` : user.email || "Técnico";

      // Determinar si es presupuesto para bloquear el despacho hasta aprobación
      const esPresupuesto = tipoResolucion === "Presupuesto";

      const { data, error } = await supabase
        .from("solicitudes_repuestos")
        .insert({
          incidente_id: id,
          tecnico_solicitante: tecnicoNombre,
          repuestos: repuestosConStock,
          estado: "pendiente",
          tipo_despacho: tipoDespacho,
          tipo_resolucion: tipoResolucion || null,
          presupuesto_aprobado: esPresupuesto ? false : null,
        })
        .select()
        .single();
      if (error) throw error;

      // Limpiar la lista de repuestos seleccionados para nueva solicitud
      setRepuestosSolicitados([]);

      // Recargar solicitudes
      await verificarSolicitudRepuestos();

      // Guardar borrador después de enviar solicitud
      await guardarBorradorSilencioso();
      toast.success(
        tipoDespacho === "autoservicio"
          ? "Solicitud creada - Retira en estación de autoservicio"
          : "Solicitud de repuestos enviada a bodega",
      );
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al enviar la solicitud");
    }
  };
  const verificarEstadoSolicitud = async () => {
    if (!solicitudRepuestosId) return;
    try {
      console.log("🔄 Actualizando estado de solicitud:", solicitudRepuestosId);
      const { data, error } = await supabase
        .from("solicitudes_repuestos")
        .select("estado, repuestos")
        .eq("id", solicitudRepuestosId)
        .single();
      if (error) throw error;
      console.log("✅ Estado actualizado:", data.estado);
      setEstadoSolicitud(data.estado);

      // Actualizar repuestos también por si cambiaron
      if (Array.isArray(data.repuestos)) {
        setRepuestosSolicitados(
          data.repuestos as Array<{
            codigo: string;
            descripcion: string;
            cantidad: number;
          }>,
        );
      }
      toast.success("Estado actualizado");
    } catch (error) {
      console.error("❌ Error verificando estado:", error);
      toast.error("Error al verificar estado");
    }
  };
  const handleFinalizarDiagnostico = async () => {
    // Solo validar tipo de trabajo si es una reparación real
    if (tipoResolucion === "Reparar en Garantía" && !tipoTrabajo) {
      toast.error("Debes seleccionar el tipo de trabajo");
      return;
    }
    setSaving(true);
    try {
      // Subir fotos si hay
      let fotosUrls: string[] = [];
      if (fotos.length > 0) {
        fotosUrls = await Promise.all(
          fotos.map(async (foto) => {
            const fileName = `${id}/diagnostico/${Date.now()}-${foto.name}`;
            const { data, error } = await supabase.storage.from("incident-photos").upload(fileName, foto);
            if (error) throw error;
            const {
              data: { publicUrl },
            } = supabase.storage.from("incident-photos").getPublicUrl(fileName);
            return publicUrl;
          }),
        );
      }
      const diagnosticoData = {
        incidente_id: id,
        tecnico_codigo: incidente.codigo_tecnico || "TEMP",
        fallas,
        causas,
        recomendaciones: observaciones,
        fotos_urls: fotosUrls,
        resolucion: JSON.stringify({
          aplicaGarantia,
          tipoResolucion,
          tipoTrabajo,
          productoAlternativo: productoSeleccionado
            ? {
                codigo: productoSeleccionado.codigo,
                descripcion: productoSeleccionado.descripcion,
              }
            : null,
          porcentajeDescuento,
        }),
        estado: "finalizado",
        fecha_fin_diagnostico: new Date().toISOString(),
      };

      // Actualizar o crear diagnóstico final
      const { data: existingDraft } = await supabase
        .from("diagnosticos")
        .select("id")
        .eq("incidente_id", id)
        .maybeSingle();
      if (existingDraft) {
        await supabase.from("diagnosticos").update(diagnosticoData).eq("id", existingDraft.id);
      } else {
        await supabase.from("diagnosticos").insert(diagnosticoData);
      }

      // Actualizar el incidente - cambiar status según el tipo de resolución
      type StatusIncidente =
        | "Ingresado"
        | "En ruta"
        | "Pendiente de diagnostico"
        | "En diagnostico"
        | "Pendiente por repuestos"
        | "Presupuesto"
        | "Porcentaje"
        | "Reparado"
        | "Cambio por garantia"
        | "Nota de credito"
        | "Bodega pedido"
        | "Rechazado"
        | "Pendiente entrega"
        | "Logistica envio"
        | "NC Autorizada"
        | "NC Emitida";
      let nuevoStatus: StatusIncidente = "Reparado";

      // Determinar el siguiente status basado en el tipo de resolución
      if (tipoResolucion === "Presupuesto") {
        nuevoStatus = "Presupuesto";
      } else if (tipoResolucion === "Cambio por Garantía") {
        nuevoStatus = "Cambio por garantia";
      } else if (tipoResolucion === "Nota de Crédito") {
        nuevoStatus = "Nota de credito";
      } else if (tipoResolucion === "Reparar en Garantía") {
        nuevoStatus = "Reparado";
      } else if (tipoResolucion === "Canje") {
        nuevoStatus = "Porcentaje";
      }
      const fechaActual = new Date().toISOString();
      const updateData: any = {
        status: nuevoStatus,
        cobertura_garantia: aplicaGarantia,
      };

      // Agregar timestamps según el tipo de resolución
      if (nuevoStatus === "Reparado") {
        updateData.fecha_reparacion = fechaActual;
      } else if (["Presupuesto", "Porcentaje", "Pendiente por repuestos"].includes(nuevoStatus)) {
        updateData.fecha_inicio_reparacion = fechaActual;
      }

      // Si es canje, guardar el producto alternativo
      if (tipoResolucion === "Canje" && productoSeleccionado) {
        updateData.producto_sugerido_alternativo = productoSeleccionado.codigo;
      }
      const { error: incidenteError } = await supabase.from("incidentes").update(updateData).eq("id", id);
      if (incidenteError) throw incidenteError;

      // Si es Nota de Crédito, crear solicitud de cambio para aprobación
      if (tipoResolucion === "Nota de Crédito") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("nombre, apellido, centro_servicio_id")
            .eq("user_id", user.id)
            .maybeSingle();

          const tecnicoNombre = profile ? `${profile.nombre} ${profile.apellido}` : user.email || "Técnico";

          // Crear solicitud de cambio
          const { data: solicitud } = await supabase
            .from("solicitudes_cambio")
            .insert({
              incidente_id: id,
              tipo_cambio: "nota_credito",
              justificacion: `Solicitud de Nota de Crédito. Fallas: ${fallas.join(", ")}. Causas: ${causas.join(", ")}.`,
              tecnico_solicitante: tecnicoNombre,
              estado: "pendiente",
              fotos_urls: [],
            })
            .select()
            .single();

          // Obtener supervisores y crear notificaciones
          const centroId = incidente?.centro_servicio || profile?.centro_servicio_id;
          if (centroId && solicitud) {
            const { data: supervisores } = await supabase
              .from("centros_supervisor")
              .select("supervisor_id")
              .eq("centro_servicio_id", centroId);

            if (supervisores && supervisores.length > 0) {
              const notificaciones = supervisores.map((s) => ({
                user_id: s.supervisor_id,
                tipo: "aprobacion_nc",
                mensaje: `Nueva solicitud de Nota de Crédito - Incidente ${incidente?.codigo}`,
                incidente_id: id,
                metadata: {
                  solicitud_id: solicitud.id,
                  tipo_cambio: "nota_credito",
                },
              }));

              await supabase.from("notificaciones").insert(notificaciones);
            }
          }
        }
      }

      toast.success("Diagnóstico finalizado exitosamente");
      setShowTipoTrabajoDialog(false);
      navigate("/taller/mis-asignaciones");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al finalizar el diagnóstico");
    } finally {
      setSaving(false);
    }
  };
  const handleClickFinalizarDiagnostico = () => {
    // Solo mostrar diálogo si es "Reparar en Garantía"
    if (tipoResolucion === "Reparar en Garantía") {
      setShowTipoTrabajoDialog(true);
    } else {
      // Para otros tipos, finalizar directamente sin preguntar
      handleFinalizarDiagnostico();
    }
  };

  // Función para desasignar el incidente y devolverlo a la cola
  const handleDesasignar = async () => {
    if (!incidente) return;
    setDesasignando(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No se pudo obtener el usuario");

      const { data: profile } = await supabase
        .from("profiles")
        .select("nombre, apellido, email")
        .eq("user_id", user.id)
        .maybeSingle();

      const tecnicoNombre = profile ? `${profile.nombre} ${profile.apellido}` : user.email || "Técnico";
      const userEmail = profile?.email || user.email || "";

      // Actualizar incidente: cambiar status a Ingresado, limpiar técnico asignado
      const { error: updateError } = await supabase
        .from("incidentes")
        .update({
          status: "Ingresado",
          tecnico_asignado_id: null,
          codigo_tecnico: null,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Insertar registro en audit_logs para el historial
      await supabase.from("audit_logs").insert({
        tabla_afectada: "incidentes",
        registro_id: id,
        accion: "UPDATE",
        usuario_id: user.id,
        usuario_email: userEmail,
        valores_anteriores: {
          status: incidente.status,
          tecnico_asignado_id: incidente.tecnico_asignado_id,
        },
        valores_nuevos: {
          status: "Ingresado",
          tecnico_asignado_id: null,
        },
        campos_modificados: ["status", "tecnico_asignado_id"],
        motivo: `Desasignado por ${tecnicoNombre}`,
      });

      // Eliminar borrador del diagnóstico si existe
      await supabase.from("diagnosticos").delete().eq("incidente_id", id).eq("estado", "borrador");

      toast.success("Incidente desasignado correctamente");
      setShowDesasignarDialog(false);
      navigate("/taller/asignaciones");
    } catch (error) {
      console.error("Error al desasignar:", error);
      toast.error("Error al desasignar el incidente");
    } finally {
      setDesasignando(false);
    }
  };
  if (loading) {
    return <div className="container mx-auto p-6">Cargando...</div>;
  }
  if (!incidente) {
    return (
      <div className="container mx-auto p-6">
        <p>Incidente no encontrado</p>
      </div>
    );
  }
  return (
    <div className="min-h-screen">
      {/* Main content */}
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" onClick={() => navigate("/taller/mis-asignaciones")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>

          {/* Botón Desasignar - solo visible si el diagnóstico no ha empezado */}
          {diagnosticoNoIniciado && (
            <Button
              variant="outline"
              onClick={() => setShowDesasignarDialog(true)}
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              disabled={desasignando}
            >
              <Undo2 className="w-4 h-4 mr-2" />
              Desasignar
            </Button>
          )}
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">Diagnóstico Técnico</h1>
          <p className="text-muted-foreground">Incidente: {incidente.codigo}</p>
        </div>

        {/* Información del Incidente */}
        <Card className="mb-6 border-l-4 border-l-primary">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Información del Incidente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
              {/* Foto de la máquina */}
              {productoInfo?.url_foto && (
                <div className="flex justify-center lg:justify-start">
                  <div className="w-48 h-48 rounded-lg overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                    <img
                      src={productoInfo.url_foto}
                      alt={productoInfo.descripcion}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Información del incidente */}
              <div className="space-y-4">
                {productoInfo && (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Label className="text-sm text-muted-foreground">Descripción de la Máquina</Label>
                      <p className="text-lg font-semibold mt-1">{productoInfo.descripcion}</p>
                    </div>
                    {productoInfo.descontinuado ? (
                      <Badge variant="destructive" className="text-sm">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Descontinuado
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500 text-white text-sm">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Vigente
                      </Badge>
                    )}
                  </div>
                )}

                {/* Alerta de producto descontinuado */}
                {productoInfo?.descontinuado && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-300">Producto Descontinuado</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                          Este producto está descontinuado. Puedes intentar repararlo, pero si no hay repuestos
                          disponibles, deberás optar por un Canje o Porcentaje.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alerta de Stock Cemaco */}
                {incidente?.es_stock_cemaco && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-purple-800 dark:text-purple-300">Stock Cemaco</p>
                        <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                          Este incidente es de Stock Cemaco. Después del diagnóstico podrás indicar si aplica Nota de
                          Crédito o no.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alerta de Reincidencia */}
                {incidente?.es_reingreso && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Undo2 className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-300">Reincidencia</p>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                          Este incidente está marcado como reincidencia.
                          {incidente?.incidente_reingreso_de && (
                            <span className="ml-1">
                              Incidente anterior: <strong>{incidente.incidente_reingreso_de}</strong>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Cliente</Label>
                    <p className="text-base font-medium">{incidente.codigo_cliente}</p>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">Código Producto</Label>
                    <p className="text-base font-medium">{incidente.codigo_producto}</p>
                  </div>

                  {incidente.familia_padre_id && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Familia ID</Label>
                      <p className="text-base font-medium">{incidente.familia_padre_id}</p>
                    </div>
                  )}

                  {productoInfo?.clave && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Clave</Label>
                      <p className="text-base font-medium">{productoInfo.clave}</p>
                    </div>
                  )}
                </div>

                {incidente.accesorios && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Accesorios Incluidos</Label>
                    <p className="text-base">{incidente.accesorios}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm text-muted-foreground">Descripción del Problema (Cliente)</Label>
                  <p className="text-base bg-muted p-3 rounded-md mt-1">{incidente.descripcion_problema}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {paso === 1 && "Paso 1: Diagnóstico"}
              {paso === 1.5 && "Paso 1.5: Cotización de Canje"}
              {paso === 2 && "Paso 2: Solicitud de Repuestos"}
              {paso === 3 && "Paso 3: Observaciones Finales"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {paso === 1 && (
              <>
                {/* Fallas y Causas en paralelo */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Fallas - Navy Blue */}
                  <div className="space-y-4 bg-blue-900/10 p-4 rounded-lg border border-blue-900/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold text-blue-900 dark:text-blue-300">Fallas</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddFallaDialog(true)}
                        className="h-8 w-8 p-0 border-blue-900/30 hover:bg-blue-900/10"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {[...fallasDisponibles, ...fallasPersonalizadas].map((falla) => (
                        <label
                          key={falla}
                          className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all bg-white dark:bg-background ${fallas.includes(falla) ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" : "border-blue-200 dark:border-blue-900/30 hover:border-blue-400"}`}
                        >
                          <Checkbox
                            checked={fallas.includes(falla)}
                            onCheckedChange={() => {
                              setFallas((prev) =>
                                prev.includes(falla) ? prev.filter((f) => f !== falla) : [...prev, falla],
                              );
                            }}
                          />
                          <span className="text-sm">{falla}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Causas - Orange */}
                  <div className="space-y-4 bg-orange-500/10 p-4 rounded-lg border border-orange-500/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold text-orange-700 dark:text-orange-300">Causas</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddCausaDialog(true)}
                        className="h-8 w-8 p-0 border-orange-500/30 hover:bg-orange-500/10"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {[...causasDisponibles, ...causasPersonalizadas].map((causa) => (
                        <label
                          key={causa}
                          className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all bg-white dark:bg-background ${causas.includes(causa) ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20" : "border-orange-200 dark:border-orange-900/30 hover:border-orange-400"}`}
                        >
                          <Checkbox
                            checked={causas.includes(causa)}
                            onCheckedChange={() => {
                              setCausas((prev) =>
                                prev.includes(causa) ? prev.filter((c) => c !== causa) : [...prev, causa],
                              );
                            }}
                          />
                          <span className="text-sm">{causa}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Flujo mejorado: Botones en grid alineado */}
                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-3 items-center">
                  {/* Fila 1: ¿Es Reparable? */}
                  <Label className="text-lg font-semibold whitespace-nowrap">¿Es Reparable?</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEsReparable(true);
                      setAplicaGarantia(null);
                    }}
                    className={`w-full min-w-[120px] border-2 transition-none hover:bg-transparent ${esReparable === true ? "border-green-500 bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/20" : "bg-background border-border hover:border-border"}`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Sí
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEsReparable(false);
                      setAplicaGarantia(null);
                    }}
                    className={`w-full min-w-[120px] border-2 transition-none hover:bg-transparent ${esReparable === false ? "border-red-500 bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/20" : "bg-background border-border hover:border-border"}`}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    No
                  </Button>

                  {/* Fila 2: ¿Aplica Garantía? */}
                  {esReparable !== null && (
                    <>
                      <Label className="text-lg font-semibold whitespace-nowrap">¿Aplica Garantía?</Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAplicaGarantia(true)}
                        className={`w-full min-w-[120px] border-2 transition-none hover:bg-transparent ${aplicaGarantia === true ? "border-green-500 bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/20" : "bg-background border-border hover:border-border"}`}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Sí
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAplicaGarantia(false)}
                        className={`w-full min-w-[120px] border-2 transition-none hover:bg-transparent ${aplicaGarantia === false ? "border-red-500 bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/20" : "bg-background border-border hover:border-border"}`}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        No
                      </Button>
                    </>
                  )}
                </div>

                {/* Mostrar resolución automática basada en la matriz */}
                {esReparable !== null && aplicaGarantia !== null && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div>
                        <Label className="text-lg font-semibold">Resolución</Label>
                        {/* Solo mostrar opciones si es No Reparable + Garantía (puede elegir entre CxG o NC) */}
                        {!esReparable && aplicaGarantia && (
                          <p className="text-sm text-muted-foreground">
                            Selecciona entre Cambio por Garantía o Nota de Crédito
                          </p>
                        )}
                      </div>

                      {/* Solo mostrar múltiples opciones cuando es No Reparable + Garantía */}
                      {!esReparable && aplicaGarantia ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Button
                            type="button"
                            variant={tipoResolucion === "Cambio por Garantía" ? "default" : "outline"}
                            onClick={() => setTipoResolucion("Cambio por Garantía")}
                            className="justify-start h-auto py-3"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Cambio por Garantía
                          </Button>
                          <Button
                            type="button"
                            variant={tipoResolucion === "Nota de Crédito" ? "default" : "outline"}
                            onClick={() => setTipoResolucion("Nota de Crédito")}
                            className="justify-start h-auto py-3"
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Nota de Crédito
                          </Button>
                        </div>
                      ) : (
                        // Mostrar solo la resolución predeterminada (sin opciones)
                        <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            {tipoResolucion === "Reparar en Garantía" && <Wrench className="h-5 w-5 text-primary" />}
                            {tipoResolucion === "Presupuesto" && <ShoppingCart className="h-5 w-5 text-primary" />}
                            {tipoResolucion === "Canje" && <Package className="h-5 w-5 text-primary" />}
                            <span className="font-medium text-lg">{tipoResolucion}</span>
                            <Badge variant="outline" className="ml-auto text-green-600 border-green-600">
                              Seleccionado
                            </Badge>
                          </div>
                        </div>
                      )}
                      {tipoResolucion === "Presupuesto" && (
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-sm">
                          <p className="text-amber-800">
                            <strong>Nota:</strong> Los repuestos se despacharán una vez que el cliente realice el pago
                            del presupuesto.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {paso === 1.5 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-lg font-semibold">Cotización de Canje</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecciona el producto alternativo y el descuento aplicable
                  </p>
                </div>

                {/* Selección de Porcentaje de Descuento */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Porcentaje de Descuento</Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={porcentajeDescuento === 10 ? "default" : "outline"}
                      onClick={() => setPorcentajeDescuento(10)}
                      className="flex-1"
                    >
                      10% de Descuento
                    </Button>
                    <Button
                      type="button"
                      variant={porcentajeDescuento === 40 ? "default" : "outline"}
                      onClick={() => setPorcentajeDescuento(40)}
                      className="flex-1"
                    >
                      40% de Descuento
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Buscador de Productos */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Buscar Producto Alternativo</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Buscar por código, clave o descripción..."
                      value={searchProducto}
                      onChange={(e) => setSearchProducto(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Lista de Productos */}
                <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                  {productosAlternativos
                    .filter(
                      (p) =>
                        p.descripcion.toLowerCase().includes(searchProducto.toLowerCase()) ||
                        p.codigo.toLowerCase().includes(searchProducto.toLowerCase()) ||
                        p.clave.toLowerCase().includes(searchProducto.toLowerCase()),
                    )
                    .map((producto, index) => {
                      // Mostrar separador cuando terminan los sugeridos
                      const esUltimoSugerido =
                        producto.esSugerido &&
                        productosAlternativos.filter(
                          (p) =>
                            p.descripcion.toLowerCase().includes(searchProducto.toLowerCase()) ||
                            p.codigo.toLowerCase().includes(searchProducto.toLowerCase()) ||
                            p.clave.toLowerCase().includes(searchProducto.toLowerCase()),
                        )[index + 1]?.esSugerido === false;

                      return (
                        <div key={producto.id}>
                          <div
                            className={`p-4 border-b last:border-b-0 cursor-pointer transition-colors ${productoSeleccionado?.id === producto.id ? "bg-primary/10 border-l-4 border-l-primary" : producto.esSugerido ? "bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30" : "hover:bg-muted/50"}`}
                            onClick={() => setProductoSeleccionado(producto)}
                          >
                            <div className="flex items-start gap-4">
                              {producto.url_foto && (
                                <div className="w-16 h-16 rounded border bg-muted flex-shrink-0">
                                  <img
                                    src={producto.url_foto}
                                    alt={producto.descripcion}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.src = "/placeholder.svg";
                                    }}
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="font-semibold">{producto.descripcion}</p>
                                  <div className="flex gap-1 shrink-0">
                                    {producto.esSugerido && producto.codigo !== incidente?.codigo_producto && (
                                      <Badge className="bg-amber-500 text-white text-xs">⭐ Sugerido</Badge>
                                    )}
                                    {producto.codigo === incidente?.codigo_producto && (
                                      <Badge className="bg-blue-500 text-white text-xs">Modelo Actual</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                                  <span>Código: {producto.codigo}</span>
                                  <span>Clave: {producto.clave}</span>
                                </div>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  <Badge className="bg-green-500 text-white text-xs">
                                    <Package className="w-3 h-3 mr-1" />
                                    Disponible para despacho
                                  </Badge>
                                </div>
                              </div>
                              {productoSeleccionado?.id === producto.id && (
                                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                              )}
                            </div>
                          </div>
                          {esUltimoSugerido && (
                            <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground text-center border-b">
                              — Otros productos disponibles —
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Resumen de la Cotización */}
                {productoSeleccionado && porcentajeDescuento && (
                  <Card className="bg-primary/5 border-primary">
                    <CardHeader>
                      <CardTitle className="text-base">Resumen de Cotización</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Producto Seleccionado:</p>
                          <p className="font-semibold">{productoSeleccionado.descripcion}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">SKU:</p>
                          <p className="font-semibold">{productoSeleccionado.codigo}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Descuento Aplicado:</p>
                          <p className="font-semibold text-primary">{porcentajeDescuento}%</p>
                        </div>
                      </div>
                      <div className="pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          El cliente recibirá un descuento del {porcentajeDescuento}% sobre el precio regular del
                          producto seleccionado.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {paso === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Columna Izquierda: Repuestos Disponibles */}
                  <div className="relative pt-2">
                    <div className="absolute -top-1 left-4 bg-background px-2 z-10">
                      <span className="text-xs font-medium text-primary">Repuestos Disponibles</span>
                    </div>
                    <div className="border-2 border-primary/40 rounded-lg p-4 h-full">
                      {/* Search Field with OutlinedInput */}
                      <div className="mb-4">
                        <OutlinedInput
                          label="Buscar"
                          placeholder="Código, clave o descripción..."
                          value={searchRepuesto}
                          onChange={(e) => setSearchRepuesto(e.target.value)}
                          icon={<Search className="h-4 w-4" />}
                          className="h-12"
                        />
                      </div>
                      <div className="max-h-[400px] overflow-y-auto space-y-2">
                        {filteredRepuestos.length > 0 ? (
                          filteredRepuestos.map((repuesto) => (
                            <div
                              key={repuesto.id}
                              className="flex items-center gap-3 p-2.5 border rounded-lg hover:bg-primary/5 hover:border-primary/40 cursor-pointer transition-all group"
                              onClick={() => agregarRepuesto(repuesto)}
                            >
                              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{repuesto.descripcion}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-mono">{repuesto.codigo}</span>
                                  {repuesto.stock_actual !== undefined && repuesto.stock_actual !== null && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px] h-4 px-1.5",
                                        repuesto.stock_actual > 0
                                          ? "bg-green-500/10 text-green-700 border-green-500/30"
                                          : "bg-red-500/10 text-red-700 border-red-500/30",
                                      )}
                                    >
                                      {repuesto.stock_actual}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Package className="w-8 h-8 mb-2 opacity-30" />
                            <p className="text-sm">No se encontraron repuestos</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Solicitud de Repuestos */}
                  <div className="relative pt-2">
                    <div className="absolute -top-1 left-4 bg-background px-2 z-10">
                      <span className="text-xs font-medium text-muted-foreground">Solicitud de Repuestos</span>
                    </div>
                    <div className="border-2 border-muted rounded-lg p-4 h-full">
                      <div className="space-y-4 max-h-[480px] overflow-y-auto">
                        {/* Pestañas de solicitudes anteriores con semáforo */}
                        {solicitudesAnteriores.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              <Package className="h-3.5 w-3.5" />
                              <span>Historial de Solicitudes</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {solicitudesAnteriores.map((solicitud, index) => {
                                const isEntregado = solicitud.estado === "entregado";
                                const isError = solicitud.estado === "rechazado" || solicitud.estado === "error";
                                const isPendiente =
                                  solicitud.estado === "pendiente" || solicitud.estado === "en_proceso";

                                const bgColor = isEntregado
                                  ? "bg-green-500 hover:bg-green-600"
                                  : isError
                                    ? "bg-red-500 hover:bg-red-600"
                                    : "bg-yellow-500 hover:bg-yellow-600";

                                const isActive = tabSolicitudActiva === index + 1;

                                return (
                                  <button
                                    key={solicitud.id}
                                    onClick={() => setTabSolicitudActiva(isActive ? 0 : index + 1)}
                                    className={`w-8 h-8 rounded-md text-white font-bold text-sm transition-all ${bgColor} ${isActive ? "ring-2 ring-offset-2 ring-primary scale-110" : ""}`}
                                    title={`Solicitud #${index + 1} - ${solicitud.estado} (${solicitud.tipo_despacho || "bodega"})`}
                                  >
                                    {index + 1}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Contenido de la pestaña activa */}
                            {tabSolicitudActiva > 0 && solicitudesAnteriores[tabSolicitudActiva - 1] && (
                              <div className="p-3 bg-muted/30 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium">Solicitud #{tabSolicitudActiva}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px]">
                                      {solicitudesAnteriores[tabSolicitudActiva - 1].tipo_despacho === "autoservicio"
                                        ? "🛒 Autoservicio"
                                        : "📦 Bodega"}
                                    </Badge>
                                    <Badge
                                      className={`text-[10px] ${
                                        solicitudesAnteriores[tabSolicitudActiva - 1].estado === "entregado"
                                          ? "bg-green-500"
                                          : solicitudesAnteriores[tabSolicitudActiva - 1].estado === "rechazado" ||
                                              solicitudesAnteriores[tabSolicitudActiva - 1].estado === "error"
                                            ? "bg-red-500"
                                            : "bg-yellow-500"
                                      }`}
                                    >
                                      {solicitudesAnteriores[tabSolicitudActiva - 1].estado}
                                    </Badge>
                                  </div>
                                </div>
                                {solicitudesAnteriores[tabSolicitudActiva - 1].repuestos?.map(
                                  (item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-sm py-0.5">
                                      <span className="truncate flex-1 text-xs">{item.descripcion}</span>
                                      <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1.5">
                                        x{item.cantidad}
                                      </Badge>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Nueva Solicitud (Por enviar) */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wide">
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>Por Solicitar ({repuestosSolicitados.length})</span>
                          </div>
                          {repuestosSolicitados.length > 0 ? (
                            <div className="space-y-1.5">
                              {repuestosSolicitados.map((item) => {
                                // Verificar stock del repuesto
                                const repuestoInfo = repuestosDisponibles.find((r) => r.codigo === item.codigo);
                                const stockActual = repuestoInfo?.stock_actual || 0;
                                const sinStock = stockActual < item.cantidad;

                                return (
                                  <div
                                    key={item.codigo}
                                    className={cn(
                                      "flex items-center gap-2 p-2 rounded-lg border",
                                      sinStock
                                        ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800"
                                        : "bg-primary/5 border-primary/30",
                                    )}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{item.descripcion}</p>
                                      <div className="flex items-center gap-2">
                                        <p className="text-[10px] text-muted-foreground font-mono">{item.codigo}</p>
                                        {sinStock && (
                                          <Badge className="bg-red-500 text-white text-[9px] h-4 px-1">
                                            Sin stock ({stockActual})
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <Badge
                                      className={cn(
                                        "border-0 text-[10px] h-5 px-2",
                                        sinStock ? "bg-red-200 text-red-700" : "bg-primary/20 text-primary",
                                      )}
                                    >
                                      x{item.cantidad}
                                    </Badge>
                                    <button
                                      onClick={() => eliminarRepuesto(item.codigo)}
                                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}

                              {/* Verificar si hay repuestos sin stock */}
                              {(() => {
                                const repuestosSinStockList = repuestosSolicitados.filter((item) => {
                                  const repuestoInfo = repuestosDisponibles.find((r) => r.codigo === item.codigo);
                                  return (repuestoInfo?.stock_actual || 0) < item.cantidad;
                                });
                                const haySinStock = repuestosSinStockList.length > 0;
                                const todosSinStock = repuestosSinStockList.length === repuestosSolicitados.length;

                                // Determinar si es presupuesto
                                const esPresupuesto = tipoResolucion === "Presupuesto";

                                return (
                                  <div className="mt-3 space-y-2">
                                    {/* Alerta de repuestos sin stock */}
                                    {haySinStock && esPresupuesto ? (
                                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                                        <p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3" />
                                          Algunos repuestos sin stock. Se registrará la solicitud y se gestionará cuando
                                          el cliente apruebe el presupuesto.
                                        </p>
                                      </div>
                                    ) : haySinStock ? (
                                      <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                                        <p className="text-[10px] text-red-700 dark:text-red-400 flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3" />
                                          {todosSinStock
                                            ? "Ningún repuesto tiene stock. El incidente pasará a 'Pendiente por repuestos'."
                                            : `${repuestosSinStockList.length} repuesto(s) sin stock suficiente.`}
                                        </p>
                                      </div>
                                    ) : null}

                                    {/* Botones de despacho */}
                                    {tieneRepuestosAutoservicio && !haySinStock ? (
                                      <>
                                        <p className="text-[10px] text-muted-foreground text-center">
                                          Repuestos disponibles en estación de autoservicio
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                          <Button
                                            onClick={() => handleEnviarSolicitudRepuestos("bodega")}
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                          >
                                            <Package className="w-4 h-4 mr-1" />
                                            Bodega
                                          </Button>
                                          <Button
                                            onClick={() => handleEnviarSolicitudRepuestos("autoservicio")}
                                            variant="default"
                                            size="sm"
                                            className="w-full bg-green-600 hover:bg-green-700"
                                          >
                                            <ShoppingCart className="w-4 h-4 mr-1" />
                                            Autoservicio
                                          </Button>
                                        </div>
                                      </>
                                    ) : haySinStock && esPresupuesto ? (
                                      <Button
                                        onClick={() => handleEnviarSolicitudRepuestos("bodega")}
                                        variant="default"
                                        size="sm"
                                        className="w-full bg-amber-600 hover:bg-amber-700"
                                      >
                                        <ShoppingCart className="w-4 h-4 mr-1" />
                                        Registrar Presupuesto
                                      </Button>
                                    ) : haySinStock ? (
                                      <Button
                                        onClick={() => handleEnviarSolicitudRepuestos("bodega")}
                                        variant="destructive"
                                        size="sm"
                                        className="w-full"
                                      >
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        Continuar - Pendiente por Repuestos
                                      </Button>
                                    ) : (
                                      <Button
                                        onClick={() => handleEnviarSolicitudRepuestos("bodega")}
                                        variant="default"
                                        size="sm"
                                        className="w-full"
                                      >
                                        <Package className="w-4 h-4 mr-1" />
                                        Enviar a Bodega
                                      </Button>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                              <ShoppingCart className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                              <p className="text-xs">Haz clic en un repuesto para agregarlo</p>
                            </div>
                          )}
                        </div>

                        {/* Estado vacío cuando no hay nada */}
                        {solicitudesAnteriores.length === 0 && repuestosSolicitados.length === 0 && (
                          <div className="text-center py-10 text-muted-foreground">
                            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No hay solicitudes de repuestos</p>
                            <p className="text-xs mt-1">Selecciona repuestos de la izquierda</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paso === 3 && (
              <>
                {/* Resolución del diagnóstico */}
                <div className="space-y-3">
                  <Label className="text-lg font-semibold">Resolución del Diagnóstico</Label>
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      {tipoResolucion === "Reparar en Garantía" && <Wrench className="h-5 w-5 text-primary" />}
                      {tipoResolucion === "Presupuesto" && <ShoppingCart className="h-5 w-5 text-primary" />}
                      {tipoResolucion === "Canje" && <Package className="h-5 w-5 text-primary" />}
                      {tipoResolucion === "Cambio por Garantía" && <Package className="h-5 w-5 text-primary" />}
                      {tipoResolucion === "Nota de Crédito" && <Package className="h-5 w-5 text-primary" />}
                      <span className="font-medium text-lg">{tipoResolucion || "Sin definir"}</span>
                      <Badge variant="outline" className="ml-auto text-green-600 border-green-600">
                        Seleccionado
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Observaciones del técnico con outlined input */}
                <div className="space-y-4">
                  <OutlinedTextarea
                    label="Observaciones del Técnico"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                  />
                </div>

                <Separator />

                {/* Resumen del diagnóstico - No editable */}
                <div className="space-y-3">
                  <Label className="text-lg font-semibold">Resumen del Diagnóstico</Label>
                  <div className="p-4 bg-muted/50 border rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">Fallas</Label>
                        <p className="text-sm font-medium mt-1">
                          {fallas.length > 0 ? fallas.join(", ") : "Sin fallas registradas"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">Causas</Label>
                        <p className="text-sm font-medium mt-1">
                          {causas.length > 0 ? causas.join(", ") : "Sin causas registradas"}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">Accesorios</Label>
                        <p className="text-sm font-medium mt-1">{incidente?.accesorios || "Sin accesorios"}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">Resolución</Label>
                        <p className="text-sm font-medium mt-1">{tipoResolucion || "Sin definir"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (paso === 1) {
                  navigate("/taller/mis-asignaciones");
                } else if (paso === 1.5) {
                  setPaso(1);
                } else if (paso === 2) {
                  setPaso(1);
                } else if (paso === 3) {
                  // Si viene de canje, regresar al paso de canje
                  if (tipoResolucion === "Canje") {
                    setPaso(1.5);
                  } else if (necesitaRepuestos) {
                    setPaso(2);
                  } else {
                    setPaso(1);
                  }
                }
              }}
            >
              {paso === 1 ? "Cancelar" : "Anterior"}
            </Button>
            <Button
              onClick={() => {
                if (paso === 1) {
                  handleContinuarAPaso2();
                } else if (paso === 1.5) {
                  handleContinuarDesdeCanje();
                } else if (paso === 2) {
                  // En garantía, los repuestos son opcionales
                  if (!aplicaGarantia && necesitaRepuestos) {
                    const hayRepuestosDespachados = solicitudesAnteriores.some((s) => s.estado === "entregado");
                    if (!hayRepuestosDespachados) {
                      toast.error("Debes esperar a que se despachen los repuestos solicitados");
                      return;
                    }
                  }
                  setPaso(3);
                } else {
                  handleClickFinalizarDiagnostico();
                }
              }}
              disabled={saving}
            >
              {paso === 3 ? "Finalizar Diagnóstico" : "Continuar"}
            </Button>
          </CardFooter>
        </Card>

        {/* Dialog para seleccionar tipo de trabajo */}
        <Dialog open={showTipoTrabajoDialog} onOpenChange={setShowTipoTrabajoDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tipo de Trabajo Realizado</DialogTitle>
              <DialogDescription>Selecciona si el trabajo realizado fue mantenimiento o reparación</DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <RadioGroup
                value={tipoTrabajo || ""}
                onValueChange={(value) => setTipoTrabajo(value as "mantenimiento" | "reparacion")}
              >
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="mantenimiento" id="mantenimiento" />
                  <Label htmlFor="mantenimiento" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Mantenimiento</div>
                    <div className="text-sm text-muted-foreground">Trabajo preventivo o de limpieza</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="reparacion" id="reparacion" />
                  <Label htmlFor="reparacion" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Reparación</div>
                    <div className="text-sm text-muted-foreground">Trabajo correctivo por falla o daño</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTipoTrabajoDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleFinalizarDiagnostico} disabled={!tipoTrabajo || saving}>
                {saving ? "Guardando..." : "Confirmar y Finalizar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para agregar nueva falla */}
        <Dialog open={showAddFallaDialog} onOpenChange={setShowAddFallaDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nueva Falla</DialogTitle>
              <DialogDescription>Ingresa una nueva falla que no esté en la lista</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={nuevaFalla}
                onChange={(e) => setNuevaFalla(e.target.value)}
                placeholder="Describe la falla..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddFallaDialog(false);
                  setNuevaFalla("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (nuevaFalla.trim()) {
                    setFallasPersonalizadas((prev) => [...prev, nuevaFalla.trim()]);
                    setFallas((prev) => [...prev, nuevaFalla.trim()]);
                    setNuevaFalla("");
                    setShowAddFallaDialog(false);
                  }
                }}
                disabled={!nuevaFalla.trim()}
              >
                Agregar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para agregar nueva causa */}
        <Dialog open={showAddCausaDialog} onOpenChange={setShowAddCausaDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nueva Causa</DialogTitle>
              <DialogDescription>Ingresa una nueva causa que no esté en la lista</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={nuevaCausa}
                onChange={(e) => setNuevaCausa(e.target.value)}
                placeholder="Describe la causa..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddCausaDialog(false);
                  setNuevaCausa("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (nuevaCausa.trim()) {
                    setCausasPersonalizadas((prev) => [...prev, nuevaCausa.trim()]);
                    setCausas((prev) => [...prev, nuevaCausa.trim()]);
                    setNuevaCausa("");
                    setShowAddCausaDialog(false);
                  }
                }}
                disabled={!nuevaCausa.trim()}
              >
                Agregar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para confirmar desasignación */}
        <Dialog open={showDesasignarDialog} onOpenChange={setShowDesasignarDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Undo2 className="h-5 w-5 text-destructive" />
                Confirmar Desasignación
              </DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas desasignar este incidente? El incidente volverá a la cola de reparación y
                podrá ser tomado por otro técnico.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowDesasignarDialog(false)} disabled={desasignando}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDesasignar} disabled={desasignando}>
                {desasignando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Desasignando...
                  </>
                ) : (
                  <>
                    <Undo2 className="h-4 w-4 mr-2" />
                    Desasignar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sidebar de cámara - igual que NuevoIncidente y DetalleEntrega */}
      <SidebarMediaCapture photos={gembaPhotos} onPhotosChange={setGembaPhotos} tipo="gemba" maxPhotos={20} />
    </div>
  );
}
