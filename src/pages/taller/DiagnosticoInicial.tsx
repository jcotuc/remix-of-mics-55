import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CheckCircle2, Package, Plus, Minus, Search, ShoppingCart, X, Clock, Loader2, AlertCircle, Wrench, Ban } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GembaDocsCamera, GembaPhoto } from "@/components/GembaDocsCamera";

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
  const [otraFalla, setOtraFalla] = useState("");
  const [otraCausa, setOtraCausa] = useState("");
  const [aplicaGarantia, setAplicaGarantia] = useState<boolean | null>(null);
  const [tipoResolucion, setTipoResolucion] = useState<string>("");
  
  // Paso 2: Solicitud de Repuestos
  const [necesitaRepuestos, setNecesitaRepuestos] = useState(false);
  const [repuestosDisponibles, setRepuestosDisponibles] = useState<any[]>([]);
  const [repuestosSolicitados, setRepuestosSolicitados] = useState<Array<{codigo: string, codigoOriginal?: string, descripcion: string, cantidad: number}>>([]);
  const [searchRepuesto, setSearchRepuesto] = useState("");
  const [solicitudesAnteriores, setSolicitudesAnteriores] = useState<Array<any>>([]);
  const [solicitudRepuestosId, setSolicitudRepuestosId] = useState<string | null>(null);
  
  // Mapa de relaciones hijo→padre
  const [hijoPadreMap, setHijoPadreMap] = useState<Map<string, string>>(new Map());
  const [estadoSolicitud, setEstadoSolicitud] = useState<string | null>(null);
  
  // Fallas y Causas desde base de datos
  const [fallasDB, setFallasDB] = useState<Array<{id: number, nombre: string, familia_id: number | null}>>([]);
  const [causasDB, setCausasDB] = useState<Array<{id: number, nombre: string, familia_id: number | null}>>([]);
  const [familiasDB, setFamiliasDB] = useState<Array<{id: number, Categoria: string | null, Padre: number | null}>>([]);
  
  // Paso 3: Fotos y Observaciones
  const [fotos, setFotos] = useState<File[]>([]);
  const [observaciones, setObservaciones] = useState("");
  
  // Gemba Docs - Fotos con comentarios (disponible en cualquier paso)
  const [gembaPhotos, setGembaPhotos] = useState<GembaPhoto[]>([]);
  
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

  // Obtener el ID del abuelo desde CDS_Familias.Padre usando familia_padre_id
  const familiaAbueloId = useMemo(() => {
    if (!productoInfo?.familia_padre_id) return null;
    const familiaPadreId = Number(productoInfo.familia_padre_id);
    const familia = familiasDB.find(f => Number(f.id) === familiaPadreId);
    return familia?.Padre ? Number(familia.Padre) : null;
  }, [productoInfo?.familia_padre_id, familiasDB]);

  // Obtener fallas según jerarquía: del PADRE (subcategoría) + del ABUELO (categoría general)
  const fallasDisponibles = useMemo(() => {
    const fallasSet = new Set<string>();
    const familiaPadreId = productoInfo?.familia_padre_id ? Number(productoInfo.familia_padre_id) : null;
    
    // 1. Fallas del PADRE (subcategoría específica, ej: Rotomartillos)
    if (familiaPadreId) {
      fallasDB.filter(f => Number(f.familia_id) === familiaPadreId)
        .forEach(f => fallasSet.add(f.nombre));
    }
    
    // 2. Fallas del ABUELO (categoría general, ej: Electrica) - obtenido de CDS_Familias.Padre
    if (familiaAbueloId) {
      fallasDB.filter(f => Number(f.familia_id) === familiaAbueloId)
        .forEach(f => fallasSet.add(f.nombre));
    }
    
    // 3. Si no hay nada, mostrar fallas sin familia asignada
    if (fallasSet.size === 0) {
      fallasDB.filter(f => !f.familia_id).forEach(f => fallasSet.add(f.nombre));
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
      const causasAbuelo = causasDB
        .filter(c => Number(c.familia_id) === familiaAbueloId)
        .map(c => c.nombre);
      
      if (causasAbuelo.length > 0) return causasAbuelo.sort();
      
      // 2. FALLBACK: Si es Compresor o Soldadora, usar causas de Eléctrica
      if (familiaAbueloId === ID_COMPRESOR || familiaAbueloId === ID_SOLDADORAS) {
        const causasElectrica = causasDB
          .filter(c => Number(c.familia_id) === ID_ELECTRICA)
          .map(c => c.nombre);
        
        if (causasElectrica.length > 0) return causasElectrica.sort();
      }
    }
    
    // 3. Fallback final: causas sin familia asignada
    return causasDB.filter(c => !c.familia_id).map(c => c.nombre).sort();
  }, [familiaAbueloId, causasDB]);

  useEffect(() => {
    const initDiagnostico = async () => {
      await Promise.all([
        fetchIncidente(),
        fetchFallasYCausas(),
        verificarSolicitudRepuestos(),
      ]);
      await cargarBorradorDiagnostico();
    };
    initDiagnostico();
  }, [id]);

  // Cargar fallas y causas desde la base de datos
  const fetchFallasYCausas = async () => {
    try {
      const [fallasRes, causasRes, familiasRes] = await Promise.all([
        supabase.from('CDS_Fallas').select('id, nombre, familia_id').order('nombre'),
        supabase.from('CDS_Causas').select('id, nombre, familia_id').order('nombre'),
        supabase.from('CDS_Familias').select('id, Categoria, Padre')
      ]);
      
      if (fallasRes.data) setFallasDB(fallasRes.data);
      if (causasRes.data) setCausasDB(causasRes.data);
      if (familiasRes.data) setFamiliasDB(familiasRes.data);
    } catch (error) {
      console.error('Error cargando fallas y causas:', error);
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
        .from('diagnosticos')
        .select('*')
        .eq('incidente_id', id)
        .eq('estado', 'borrador')
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
      console.error('Error cargando borrador:', error);
    }
  };

  const guardarBorradorSilencioso = async () => {
    if (!incidente) return;

    console.log('🔄 Auto-guardando diagnóstico...', { paso, fallas: fallas.length, causas: causas.length });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellido')
        .eq('user_id', user.id)
        .maybeSingle();

      const tecnicoNombre = profile ? `${profile.nombre} ${profile.apellido}` : user.email || 'Técnico';

      // Guardar metadata en el campo resolucion como JSON
      const metadata = {
        aplicaGarantia,
        tipoResolucion,
        productoAlternativo: productoSeleccionado ? {
          codigo: productoSeleccionado.codigo,
          descripcion: productoSeleccionado.descripcion,
        } : null,
        porcentajeDescuento,
      };

      const borradorData = {
        incidente_id: id,
        tecnico_codigo: incidente.codigo_tecnico || 'TEMP',
        fallas,
        causas,
        recomendaciones: observaciones,
        estado: 'borrador',
        tiempo_estimado: paso.toString(), // Guardar el paso actual
        resolucion: JSON.stringify(metadata),
      };

      // Verificar si ya existe un borrador
      const { data: existingDraft } = await supabase
        .from('diagnosticos')
        .select('id')
        .eq('incidente_id', id)
        .eq('estado', 'borrador')
        .maybeSingle();

      if (existingDraft) {
        // Actualizar borrador existente
        await supabase
          .from('diagnosticos')
          .update(borradorData)
          .eq('id', existingDraft.id);
        console.log('✅ Borrador actualizado automáticamente');
      } else {
        // Crear nuevo borrador
        await supabase
          .from('diagnosticos')
          .insert(borradorData);
        console.log('✅ Borrador creado automáticamente');
      }
    } catch (error) {
      console.error('❌ Error guardando borrador:', error);
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
      console.log('🔍 Verificando solicitudes de repuestos para incidente:', id);
      
      const { data, error } = await supabase
        .from('solicitudes_repuestos')
        .select('*')
        .eq('incidente_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error verificando solicitud:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log('✅ Solicitudes encontradas:', data.length);
        
        // Guardar todas las solicitudes anteriores
        setSolicitudesAnteriores(data);
        
        // La más reciente para referencia
        const solicitudMasReciente = data[0];
        setSolicitudRepuestosId(solicitudMasReciente.id);
        setEstadoSolicitud(solicitudMasReciente.estado);
        
        console.log('📦 Solicitud más reciente:', solicitudMasReciente);
      } else {
        console.log('ℹ️ No hay solicitudes de repuestos para este incidente');
        setSolicitudesAnteriores([]);
      }
    } catch (error) {
      console.error('❌ Error verificando solicitud:', error);
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
          .from('repuestos_relaciones')
          .select('*')
          .range(from, from + pageSize - 1);
        
        if (relError) {
          console.error('Error cargando relaciones:', relError);
          break;
        }
        
        if (!relacionesData || relacionesData.length === 0) break;
        
        allRelaciones = [...allRelaciones, ...relacionesData];
        
        if (relacionesData.length < pageSize) break;
        from += pageSize;
      }
      
      console.log('Total relaciones cargadas:', allRelaciones.length);
      
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
      console.log('Mapa hijo→padre:', newHijoPadreMap.size, 'registros');

      // 2. Cargar repuestos del producto
      const { data, error } = await supabase
        .from('repuestos')
        .select('*')
        .eq('codigo_producto', incidente.codigo_producto)
        .order('descripcion');

      if (error) throw error;
      
      // 3. Transformar: reemplazar códigos hijo por padre
      const repuestosTransformados: any[] = [];
      const codigosVistos = new Set<string>();
      
      (data || []).forEach(repuesto => {
        const codigoPadre = newHijoPadreMap.get(repuesto.codigo);
        const codigoFinal = codigoPadre || repuesto.codigo;
        
        // Si ya vimos este código padre, no agregarlo de nuevo
        if (!codigosVistos.has(codigoFinal)) {
          codigosVistos.add(codigoFinal);
          
          // Obtener descripción del padre si existe
          const descripcionPadre = padreDescripcionMap.get(codigoFinal);
          
          repuestosTransformados.push({
            ...repuesto,
            codigo: codigoFinal,
            codigoOriginal: codigoPadre ? repuesto.codigo : undefined,
            descripcion: descripcionPadre || repuesto.descripcion,
            esCodigoPadre: !!codigoPadre
          });
          
          if (codigoPadre) {
            console.log(`Transformado: ${repuesto.codigo} → ${codigoFinal}`);
          }
        }
      });
      
      setRepuestosDisponibles(repuestosTransformados);
    } catch (error) {
      console.error('Error fetching repuestos:', error);
      toast.error("Error al cargar los repuestos");
    }
  };

  const fetchIncidente = async () => {
    try {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setIncidente(data);
      
      // Obtener información del producto
      if (data?.codigo_producto) {
        const { data: producto } = await supabase
          .from('productos')
          .select('*')
          .eq('codigo', data.codigo_producto)
          .maybeSingle();
        
        if (producto) setProductoInfo(producto);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al cargar el incidente");
    } finally {
      setLoading(false);
    }
  };

  const resolucionesConGarantia = [
    "Reparar en Garantía",
    "Cambio por Garantía",
    "Nota de Crédito"
  ];
  
  const resolucionesSinGarantia = [
    "Canje",
    "Presupuesto"
  ];

  const opcionesResolucion = aplicaGarantia 
    ? resolucionesConGarantia 
    : resolucionesSinGarantia;

  // Determinar si necesita repuestos según el tipo de resolución
  useEffect(() => {
    if (tipoResolucion === "Reparar en Garantía" || tipoResolucion === "Presupuesto") {
      setNecesitaRepuestos(true);
    } else {
      setNecesitaRepuestos(false);
    }
  }, [tipoResolucion]);

  // Buscar productos alternativos cuando se selecciona Canje
  useEffect(() => {
    if (tipoResolucion === "Canje") {
      fetchProductosAlternativos();
    }
  }, [tipoResolucion]);

  const fetchProductosAlternativos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('descontinuado', false)
        .order('descripcion');

      if (error) throw error;
      setProductosAlternativos(data || []);
      
      // Si el producto actual es vigente, pre-seleccionarlo como alternativo
      if (productoInfo && !productoInfo.descontinuado && incidente?.codigo_producto) {
        const productoActual = data?.find(p => p.codigo === incidente.codigo_producto);
        if (productoActual) {
          setProductoSeleccionado(productoActual);
          toast.info("Producto vigente pre-seleccionado como alternativa");
        }
      }
    } catch (error) {
      console.error('Error fetching productos:', error);
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

  const filteredRepuestos = repuestosDisponibles.filter(repuesto =>
    repuesto.descripcion.toLowerCase().includes(searchRepuesto.toLowerCase()) ||
    repuesto.codigo.toLowerCase().includes(searchRepuesto.toLowerCase()) ||
    repuesto.clave.toLowerCase().includes(searchRepuesto.toLowerCase())
  );

  const agregarRepuesto = (repuesto: any) => {
    // Siempre usar el código padre si existe
    const codigoPadre = hijoPadreMap.get(repuesto.codigo);
    const codigoFinal = codigoPadre || repuesto.codigo;
    
    const yaExiste = repuestosSolicitados.find(r => r.codigo === codigoFinal);
    if (yaExiste) {
      setRepuestosSolicitados(repuestosSolicitados.map(r =>
        r.codigo === codigoFinal ? { ...r, cantidad: r.cantidad + 1 } : r
      ));
    } else {
      setRepuestosSolicitados([...repuestosSolicitados, {
        codigo: codigoFinal,
        codigoOriginal: codigoPadre ? repuesto.codigo : undefined,
        descripcion: repuesto.descripcion,
        cantidad: 1
      }]);
      
      // Notificar si hubo sustitución
      if (codigoPadre) {
        toast.success(`${repuesto.codigo} → ${codigoFinal} (código padre)`);
      } else {
        toast.success("Repuesto agregado");
      }
    }
  };

  const actualizarCantidad = (codigo: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      setRepuestosSolicitados(repuestosSolicitados.filter(r => r.codigo !== codigo));
    } else {
      setRepuestosSolicitados(repuestosSolicitados.map(r =>
        r.codigo === codigo ? { ...r, cantidad: nuevaCantidad } : r
      ));
    }
  };

  const eliminarRepuesto = (codigo: string) => {
    setRepuestosSolicitados(repuestosSolicitados.filter(r => r.codigo !== codigo));
  };

  const handleEnviarSolicitudRepuestos = async () => {
    if (repuestosSolicitados.length === 0) {
      toast.error("Debes agregar al menos un repuesto");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellido')
        .eq('user_id', user.id)
        .maybeSingle();

      const tecnicoNombre = profile ? `${profile.nombre} ${profile.apellido}` : user.email || 'Técnico';

      const { data, error } = await supabase
        .from('solicitudes_repuestos')
        .insert({
          incidente_id: id,
          tecnico_solicitante: tecnicoNombre,
          repuestos: repuestosSolicitados,
          estado: 'pendiente'
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
      
      toast.success("Solicitud de repuestos enviada a bodega");
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al enviar la solicitud");
    }
  };

  const verificarEstadoSolicitud = async () => {
    if (!solicitudRepuestosId) return;
    
    try {
      console.log('🔄 Actualizando estado de solicitud:', solicitudRepuestosId);
      
      const { data, error } = await supabase
        .from('solicitudes_repuestos')
        .select('estado, repuestos')
        .eq('id', solicitudRepuestosId)
        .single();

      if (error) throw error;
      
      console.log('✅ Estado actualizado:', data.estado);
      setEstadoSolicitud(data.estado);
      
      // Actualizar repuestos también por si cambiaron
      if (Array.isArray(data.repuestos)) {
        setRepuestosSolicitados(data.repuestos as Array<{codigo: string, descripcion: string, cantidad: number}>);
      }
      
      toast.success('Estado actualizado');
    } catch (error) {
      console.error('❌ Error verificando estado:', error);
      toast.error('Error al verificar estado');
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
            const { data, error } = await supabase.storage
              .from("incident-photos")
              .upload(fileName, foto);
            
            if (error) throw error;
            
            const { data: { publicUrl } } = supabase.storage
              .from("incident-photos")
              .getPublicUrl(fileName);
            
            return publicUrl;
          })
        );
      }

      const diagnosticoData = {
        incidente_id: id,
        tecnico_codigo: incidente.codigo_tecnico || 'TEMP',
        fallas,
        causas,
        recomendaciones: observaciones,
        fotos_urls: fotosUrls,
        resolucion: JSON.stringify({
          aplicaGarantia,
          tipoResolucion,
          tipoTrabajo,
          productoAlternativo: productoSeleccionado ? {
            codigo: productoSeleccionado.codigo,
            descripcion: productoSeleccionado.descripcion,
          } : null,
          porcentajeDescuento,
        }),
        estado: 'finalizado',
      };

      // Actualizar o crear diagnóstico final
      const { data: existingDraft } = await supabase
        .from('diagnosticos')
        .select('id')
        .eq('incidente_id', id)
        .maybeSingle();

      if (existingDraft) {
        await supabase
          .from('diagnosticos')
          .update(diagnosticoData)
          .eq('id', existingDraft.id);
      } else {
        await supabase
          .from('diagnosticos')
          .insert(diagnosticoData);
      }

      // Actualizar el incidente - cambiar status según el tipo de resolución
      type StatusIncidente = "Ingresado" | "En ruta" | "Pendiente de diagnostico" | "En diagnostico" | "Pendiente por repuestos" | "Presupuesto" | "Porcentaje" | "Reparado" | "Cambio por garantia" | "Nota de credito" | "Bodega pedido" | "Rechazado" | "Pendiente entrega" | "Logistica envio";
      
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

      const updateData: any = {
        status: nuevoStatus,
        cobertura_garantia: aplicaGarantia,
      };

      // Si es canje, guardar el producto alternativo
      if (tipoResolucion === "Canje" && productoSeleccionado) {
        updateData.producto_sugerido_alternativo = productoSeleccionado.codigo;
      }

      const { error: incidenteError } = await supabase
        .from("incidentes")
        .update(updateData)
        .eq("id", id);

      if (incidenteError) throw incidenteError;

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
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/taller/mis-asignaciones")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver
      </Button>

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
                      e.currentTarget.src = '/placeholder.svg';
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
            {paso === 1 && "Paso 1: Diagnóstico - Fallas y Causas"}
            {paso === 1.5 && "Paso 1.5: Cotización de Canje"}
            {paso === 2 && "Paso 2: Solicitud de Repuestos"}
            {paso === 3 && "Paso 3: Fotos y Observaciones"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {paso === 1 && (
            <>
              {/* Fallas y Causas en paralelo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fallas */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-lg font-semibold">Fallas Encontradas</Label>
                    <p className="text-sm text-muted-foreground">
                      Selecciona todas las fallas que apliquen
                    </p>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {fallasDisponibles.map((falla) => (
                      <label
                        key={falla}
                        className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          fallas.includes(falla)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Checkbox
                          checked={fallas.includes(falla)}
                          onCheckedChange={() => {
                            setFallas((prev) =>
                              prev.includes(falla)
                                ? prev.filter((f) => f !== falla)
                                : [...prev, falla]
                            );
                          }}
                        />
                        <span className="text-sm">{falla}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <Label>Otra falla no listada</Label>
                    <Textarea
                      value={otraFalla}
                      onChange={(e) => setOtraFalla(e.target.value)}
                      placeholder="Describe la falla..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Causas */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-lg font-semibold">Causas Identificadas</Label>
                    <p className="text-sm text-muted-foreground">
                      Selecciona todas las causas que apliquen
                    </p>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {causasDisponibles.map((causa) => (
                      <label
                        key={causa}
                        className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          causas.includes(causa)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Checkbox
                          checked={causas.includes(causa)}
                          onCheckedChange={() => {
                            setCausas((prev) =>
                              prev.includes(causa)
                                ? prev.filter((c) => c !== causa)
                                : [...prev, causa]
                            );
                          }}
                        />
                        <span className="text-sm">{causa}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <Label>Otra causa no listada</Label>
                    <Textarea
                      value={otraCausa}
                      onChange={(e) => setOtraCausa(e.target.value)}
                      placeholder="Describe la causa..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Flujo mejorado: ¿Es Reparable? */}
              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    ¿Es Reparable?
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Indica si la máquina puede ser reparada
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={esReparable === true ? "default" : "outline"}
                    onClick={() => {
                      setEsReparable(true);
                      setTipoResolucion("");
                    }}
                    className="h-16 flex-col gap-1"
                  >
                    <Wrench className="h-5 w-5" />
                    <span>Sí, es reparable</span>
                  </Button>
                  <Button
                    type="button"
                    variant={esReparable === false ? "destructive" : "outline"}
                    onClick={() => {
                      setEsReparable(false);
                      setAplicaGarantia(null);
                      setTipoResolucion("");
                    }}
                    className="h-16 flex-col gap-1"
                  >
                    <Ban className="h-5 w-5" />
                    <span>No es reparable</span>
                  </Button>
                </div>
              </div>

              {/* Si ES reparable: preguntar garantía */}
              {esReparable === true && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <Label className="text-lg font-semibold">¿Aplica Garantía?</Label>
                      <p className="text-sm text-muted-foreground">
                        Indica si la reparación está cubierta por garantía
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant={aplicaGarantia === true ? "default" : "outline"}
                        onClick={() => {
                          setAplicaGarantia(true);
                          setTipoResolucion("");
                        }}
                        className="h-14"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Sí, aplica garantía
                      </Button>
                      <Button
                        type="button"
                        variant={aplicaGarantia === false ? "outline" : "outline"}
                        className={aplicaGarantia === false ? "border-primary bg-primary/5" : ""}
                        onClick={() => {
                          setAplicaGarantia(false);
                          setTipoResolucion("");
                        }}
                      >
                        No aplica garantía
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Si NO es reparable: opciones directas */}
              {esReparable === false && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <Label className="text-lg font-semibold">Tipo de Resolución</Label>
                      <p className="text-sm text-muted-foreground">
                        Como no es reparable, selecciona la resolución
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={tipoResolucion === "Cambio por Garantía" ? "default" : "outline"}
                        onClick={() => {
                          setTipoResolucion("Cambio por Garantía");
                          setAplicaGarantia(true);
                        }}
                        className="justify-start h-auto py-3"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Cambio por Garantía
                      </Button>
                      <Button
                        type="button"
                        variant={tipoResolucion === "Nota de Crédito" ? "default" : "outline"}
                        onClick={() => {
                          setTipoResolucion("Nota de Crédito");
                          setAplicaGarantia(true);
                        }}
                        className="justify-start h-auto py-3"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Nota de Crédito
                      </Button>
                      <Button
                        type="button"
                        variant={tipoResolucion === "Canje" ? "default" : "outline"}
                        onClick={() => {
                          setTipoResolucion("Canje");
                          setAplicaGarantia(false);
                        }}
                        className="justify-start h-auto py-3"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Canje (sin garantía)
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Si ES reparable y ya seleccionó garantía: mostrar opciones */}
              {esReparable === true && aplicaGarantia !== null && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <Label className="text-lg font-semibold">Tipo de Resolución</Label>
                      <p className="text-sm text-muted-foreground">
                        Selecciona cómo se resolverá este incidente
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aplicaGarantia ? (
                        <>
                          <Button
                            type="button"
                            variant={tipoResolucion === "Reparar en Garantía" ? "default" : "outline"}
                            onClick={() => setTipoResolucion("Reparar en Garantía")}
                            className="justify-start h-auto py-3"
                          >
                            <Wrench className="h-4 w-4 mr-2" />
                            Reparar en Garantía
                          </Button>
                          <Button
                            type="button"
                            variant={tipoResolucion === "Cambio por Garantía" ? "default" : "outline"}
                            onClick={() => setTipoResolucion("Cambio por Garantía")}
                            className="justify-start h-auto py-3"
                          >
                            <Package className="h-4 w-4 mr-2" />
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
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant={tipoResolucion === "Presupuesto" ? "default" : "outline"}
                            onClick={() => setTipoResolucion("Presupuesto")}
                            className="justify-start h-auto py-3"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Presupuesto (cobrar reparación)
                          </Button>
                          <Button
                            type="button"
                            variant={tipoResolucion === "Canje" ? "default" : "outline"}
                            onClick={() => setTipoResolucion("Canje")}
                            className="justify-start h-auto py-3"
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Canje
                          </Button>
                        </>
                      )}
                    </div>
                    {tipoResolucion === "Presupuesto" && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-sm">
                        <p className="text-amber-800">
                          <strong>Nota:</strong> Los repuestos se despacharán una vez que el cliente realice el pago del presupuesto.
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
                  .filter(p =>
                    p.descripcion.toLowerCase().includes(searchProducto.toLowerCase()) ||
                    p.codigo.toLowerCase().includes(searchProducto.toLowerCase()) ||
                    p.clave.toLowerCase().includes(searchProducto.toLowerCase())
                  )
                  .map((producto) => (
                    <div
                      key={producto.id}
                      className={`p-4 border-b last:border-b-0 cursor-pointer transition-colors ${
                        productoSeleccionado?.id === producto.id
                          ? "bg-primary/10 border-l-4 border-l-primary"
                          : "hover:bg-muted/50"
                      }`}
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
                                e.currentTarget.src = '/placeholder.svg';
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-semibold">{producto.descripcion}</p>
                            {producto.codigo === incidente?.codigo_producto && (
                              <Badge className="bg-blue-500 text-white text-xs shrink-0">
                                Modelo Actual
                              </Badge>
                            )}
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
                  ))}
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
                        El cliente recibirá un descuento del {porcentajeDescuento}% sobre el precio regular del producto seleccionado.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {paso === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-semibold">Gestión de Repuestos</Label>
                <p className="text-sm text-muted-foreground">
                  Administra las solicitudes de repuestos para esta reparación
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Columna 1: Solicitudes Despachadas */}
                <Card className="border-green-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Despachados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {solicitudesAnteriores.filter(s => s.estado === 'entregado').length > 0 ? (
                        solicitudesAnteriores
                          .filter(s => s.estado === 'entregado')
                          .map((solicitud) => (
                            <div key={solicitud.id} className="p-2 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-xs text-muted-foreground mb-1">
                                {new Date(solicitud.created_at).toLocaleDateString('es-GT')}
                              </p>
                              {solicitud.repuestos?.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-xs py-1">
                                  <span className="font-medium truncate flex-1">{item.descripcion}</span>
                                  <Badge variant="outline" className="ml-2 text-xs h-5">
                                    {item.cantidad}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs">Sin repuestos despachados</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Columna 2: Solicitudes Pendientes/En Proceso */}
                <Card className="border-yellow-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      En Proceso
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {solicitudesAnteriores.filter(s => s.estado === 'pendiente' || s.estado === 'en_proceso').length > 0 ? (
                        solicitudesAnteriores
                          .filter(s => s.estado === 'pendiente' || s.estado === 'en_proceso')
                          .map((solicitud) => (
                            <div 
                              key={solicitud.id} 
                              className={`p-2 rounded-lg border ${
                                solicitud.estado === 'pendiente' 
                                  ? 'bg-yellow-50 border-yellow-200' 
                                  : 'bg-blue-50 border-blue-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(solicitud.created_at).toLocaleDateString('es-GT')}
                                </p>
                                {solicitud.estado === 'en_proceso' && (
                                  <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                                )}
                              </div>
                              {solicitud.repuestos?.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-xs py-1">
                                  <span className="font-medium truncate flex-1">{item.descripcion}</span>
                                  <Badge variant="outline" className="ml-2 text-xs h-5">
                                    {item.cantidad}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs">Sin solicitudes pendientes</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Columna 3: Nueva Solicitud */}
                <Card className="border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                      Nueva Solicitud ({repuestosSolicitados.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {repuestosSolicitados.length > 0 ? (
                        repuestosSolicitados.map((item) => (
                          <div key={item.codigo} className="p-2 bg-primary/5 rounded-lg border">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs truncate">{item.descripcion}</p>
                                <p className="text-xs text-muted-foreground">{item.codigo}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 w-6 p-0"
                                  onClick={() => actualizarCantidad(item.codigo, item.cantidad - 1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="text-xs font-medium w-6 text-center">{item.cantidad}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 w-6 p-0"
                                  onClick={() => actualizarCantidad(item.codigo, item.cantidad + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 ml-1"
                                  onClick={() => eliminarRepuesto(item.codigo)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs">Selecciona repuestos</p>
                        </div>
                      )}
                    </div>
                    {repuestosSolicitados.length > 0 && (
                      <Button 
                        onClick={handleEnviarSolicitudRepuestos}
                        className="w-full mt-3"
                        size="sm"
                      >
                        Enviar a Bodega
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Selector de Repuestos Disponibles */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Repuestos Disponibles</CardTitle>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por código, clave o descripción..."
                      value={searchRepuesto}
                      onChange={(e) => setSearchRepuesto(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                    {filteredRepuestos.length > 0 ? (
                      filteredRepuestos.map((repuesto) => (
                        <div 
                          key={repuesto.id} 
                          className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => agregarRepuesto(repuesto)}
                        >
                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{repuesto.descripcion}</p>
                            <p className="text-xs text-muted-foreground">
                              {repuesto.codigo} | {repuesto.clave}
                              {repuesto.stock_actual !== null && ` | Stock: ${repuesto.stock_actual}`}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" className="flex-shrink-0">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Search className="w-12 h-12 mb-2 opacity-50" />
                        <p>No se encontraron repuestos</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {paso === 3 && (
            <>
              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold">Fotos del Diagnóstico</Label>
                  <p className="text-sm text-muted-foreground">
                    Evidencia fotográfica del diagnóstico realizado
                  </p>
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setFotos(prev => [...prev, ...files]);
                  }}
                />
                {fotos.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {fotos.length} foto(s) seleccionada(s)
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-lg font-semibold">Observaciones del Técnico</Label>
                  <p className="text-sm text-muted-foreground">
                    Comentarios adicionales sobre el diagnóstico
                  </p>
                </div>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Escribe aquí cualquier observación relevante..."
                  rows={6}
                />
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
                  const hayRepuestosDespachados = solicitudesAnteriores.some(s => s.estado === 'entregado');
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
            {paso === 3 
              ? "Finalizar Diagnóstico"
              : "Continuar"}
          </Button>
        </CardFooter>
      </Card>

      {/* Dialog para seleccionar tipo de trabajo */}
      <Dialog open={showTipoTrabajoDialog} onOpenChange={setShowTipoTrabajoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tipo de Trabajo Realizado</DialogTitle>
            <DialogDescription>
              Selecciona si el trabajo realizado fue mantenimiento o reparación
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <RadioGroup value={tipoTrabajo || ""} onValueChange={(value) => setTipoTrabajo(value as "mantenimiento" | "reparacion")}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="mantenimiento" id="mantenimiento" />
                <Label htmlFor="mantenimiento" className="flex-1 cursor-pointer">
                  <div className="font-semibold">Mantenimiento</div>
                  <div className="text-sm text-muted-foreground">
                    Trabajo preventivo o de limpieza
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="reparacion" id="reparacion" />
                <Label htmlFor="reparacion" className="flex-1 cursor-pointer">
                  <div className="font-semibold">Reparación</div>
                  <div className="text-sm text-muted-foreground">
                    Trabajo correctivo por falla o daño
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTipoTrabajoDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleFinalizarDiagnostico}
              disabled={!tipoTrabajo || saving}
            >
              {saving ? "Guardando..." : "Confirmar y Finalizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Widget flotante Gemba Docs - disponible en cualquier paso */}
      <GembaDocsCamera 
        photos={gembaPhotos} 
        onPhotosChange={setGembaPhotos}
        maxPhotos={20}
      />
    </div>
  );
}
