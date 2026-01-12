import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OutlinedInput, OutlinedTextarea } from "@/components/ui/outlined-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { WhatsAppStyleMediaCapture, MediaFile } from "@/components/WhatsAppStyleMediaCapture";
import { uploadMediaToStorage } from "@/lib/uploadMedia";
import { Wrench, Store, CheckCircle2, XCircle, Plus, Eye, EyeOff, Settings2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];
type IncidenteConProducto = IncidenteDB & {
  producto: {
    familia_padre_id: number | null;
  } | null;
};
type FamiliaDB = {
  id: number;
  Categoria: string | null;
  Padre: number | null;
};

// Tipo para grupos de cola FIFO
interface GrupoColaFifo {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
  color: string | null;
  familias: number[]; // IDs de familias abuelas incluidas
}

// Colores disponibles para los grupos
const COLORES_CLASES: Record<string, string> = {
  orange: 'bg-orange-500/20 hover:bg-orange-500/30 border-orange-400/50 shadow-orange-500/10',
  blue: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-400/50 shadow-blue-500/10',
  green: 'bg-green-500/20 hover:bg-green-500/30 border-green-400/50 shadow-green-500/10',
  purple: 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-400/50 shadow-purple-500/10',
  red: 'bg-red-500/20 hover:bg-red-500/30 border-red-400/50 shadow-red-500/10',
  yellow: 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-400/50 shadow-yellow-500/10',
  cyan: 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-400/50 shadow-cyan-500/10',
  pink: 'bg-pink-500/20 hover:bg-pink-500/30 border-pink-400/50 shadow-pink-500/10'
};
const COLORES_TEXTO: Record<string, string> = {
  orange: 'text-orange-600',
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  red: 'text-red-600',
  yellow: 'text-yellow-600',
  cyan: 'text-cyan-600',
  pink: 'text-pink-600'
};
const COLORES_BADGE: Record<string, string> = {
  orange: 'bg-orange-500/30 text-orange-700',
  blue: 'bg-blue-500/30 text-blue-700',
  green: 'bg-green-500/30 text-green-700',
  purple: 'bg-purple-500/30 text-purple-700',
  red: 'bg-red-500/30 text-red-700',
  yellow: 'bg-yellow-500/30 text-yellow-700',
  cyan: 'bg-cyan-500/30 text-cyan-700',
  pink: 'bg-pink-500/30 text-pink-700'
};
export default function Asignaciones() {
  const navigate = useNavigate();
  const [incidentes, setIncidentes] = useState<IncidenteConProducto[]>([]);
  const [familias, setFamilias] = useState<FamiliaDB[]>([]);
  const [grupos, setGrupos] = useState<GrupoColaFifo[]>([]);
  const [centroServicioId, setCentroServicioId] = useState<string | null>(null);
  const [centroServicioNombre, setCentroServicioNombre] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<IncidenteDB[]>([]);
  const [expandedGrupos, setExpandedGrupos] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Estados para modal de revisión Stock Cemaco
  const [modalRevision, setModalRevision] = useState<{
    open: boolean;
    incidente: IncidenteDB | null;
  }>({
    open: false,
    incidente: null
  });
  const [decision, setDecision] = useState<"aprobado" | "rechazado">("aprobado");
  const [observaciones, setObservaciones] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Estados para modal de aprobación (Jefe de Taller)
  const [modalAprobacion, setModalAprobacion] = useState<{
    open: boolean;
    incidente: IncidenteDB | null;
    revision: any | null;
  }>({
    open: false,
    incidente: null,
    revision: null
  });
  const [observacionesRechazo, setObservacionesRechazo] = useState("");

  // Cargar centro de servicio del usuario y configuración de grupos
  useEffect(() => {
    const loadUserConfig = async () => {
      try {
        setLoadingConfig(true);
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;

        // Obtener centro de servicio del usuario con el nombre
        const {
          data: profile
        } = await supabase.from('profiles').select('centro_servicio_id').eq('user_id', user.id).single();
        if (!profile?.centro_servicio_id) {
          console.warn('Usuario sin centro de servicio asignado');
          setLoadingConfig(false);
          return;
        }
        setCentroServicioId(profile.centro_servicio_id);

        // Obtener nombre del centro de servicio
        const {
          data: centro
        } = await supabase.from('centros_servicio').select('nombre').eq('id', profile.centro_servicio_id).single();
        if (centro) {
          setCentroServicioNombre(centro.nombre);
        }

        // Cargar grupos activos para este centro
        const {
          data: gruposData
        } = await supabase.from('grupos_cola_fifo').select('*').eq('centro_servicio_id', profile.centro_servicio_id).eq('activo', true).order('orden');
        if (!gruposData || gruposData.length === 0) {
          setGrupos([]);
          setLoadingConfig(false);
          return;
        }

        // Cargar familias de cada grupo
        const {
          data: familiasGrupos
        } = await supabase.from('grupos_cola_fifo_familias').select('grupo_id, familia_abuelo_id').in('grupo_id', gruposData.map(g => g.id));

        // Construir grupos con sus familias
        const gruposConFamilias: GrupoColaFifo[] = gruposData.map(grupo => ({
          id: grupo.id,
          nombre: grupo.nombre,
          orden: grupo.orden,
          activo: grupo.activo ?? true,
          color: grupo.color,
          familias: familiasGrupos?.filter(fg => fg.grupo_id === grupo.id).map(fg => fg.familia_abuelo_id) || []
        }));
        setGrupos(gruposConFamilias);
      } catch (error) {
        console.error('Error cargando configuración:', error);
      } finally {
        setLoadingConfig(false);
      }
    };
    loadUserConfig();
  }, []);

  // Cargar incidentes cuando se tenga el centro de servicio y su nombre
  useEffect(() => {
    if (centroServicioId && centroServicioNombre) {
      fetchIncidentes();
    }
  }, [centroServicioId, centroServicioNombre]);
  useEffect(() => {
    fetchFamilias();
  }, []);
  const fetchFamilias = async () => {
    const {
      data
    } = await supabase.from('CDS_Familias').select('id, Categoria, Padre');
    if (data) setFamilias(data);
  };

  // Obtener el ID del abuelo (categoría general) desde familia_padre_id
  const getAbueloId = (familiaPadreId: number | null): number | null => {
    if (!familiaPadreId) return null;
    const familia = familias.find(f => f.id === familiaPadreId);
    return familia?.Padre || null;
  };
  const fetchIncidentes = async () => {
    if (!centroServicioId || !centroServicioNombre) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      // El campo centro_servicio en incidentes guarda el NOMBRE del centro, no el UUID
      // Buscar incidentes que coincidan con el nombre del centro de servicio
      // Incidentes normales (no stock Cemaco) - con JOIN a productos - FILTRADO por centro de servicio (por nombre)
      const {
        data: normales,
        error: error1
      } = await supabase.from('incidentes').select(`
          *,
          producto:productos!codigo_producto(familia_padre_id)
        `).eq('status', 'Ingresado').ilike('centro_servicio', `%${centroServicioNombre.replace('Centro de servicio ', '').replace('Centro de Servicio ', '')}%`).or('es_stock_cemaco.is.null,es_stock_cemaco.eq.false').order('fecha_ingreso', {
        ascending: true
      });
      if (error1) throw error1;

      // Incidentes Stock Cemaco (Ingresado y Pendiente de aprobación NC) - FILTRADO por centro de servicio (por nombre)
      const {
        data: stockCemaco,
        error: error2
      } = await supabase.from('incidentes').select(`
          *,
          producto:productos!codigo_producto(familia_padre_id)
        `).eq('es_stock_cemaco', true).ilike('centro_servicio', `%${centroServicioNombre.replace('Centro de servicio ', '').replace('Centro de Servicio ', '')}%`).in('status', ['Ingresado', 'Pendiente de aprobación NC'] as any).order('fecha_ingreso', {
        ascending: true
      });
      if (error2) {
        console.error('Error cargando incidentes Stock Cemaco:', error2);
        toast.error('Error al cargar incidentes de Stock Cemaco');
      }
      setIncidentes([...(normales || []), ...(stockCemaco || [])] as IncidenteConProducto[]);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar incidentes');
    } finally {
      setLoading(false);
    }
  };
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const {
        data,
        error
      } = await supabase.from('incidentes').select('*').or(`codigo.ilike.%${searchTerm}%,descripcion_problema.ilike.%${searchTerm}%,codigo_cliente.ilike.%${searchTerm}%`).order('fecha_ingreso', {
        ascending: false
      }).limit(50);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error en la búsqueda');
    }
  };
  const handleAsignar = async (incidenteId: string, grupo: GrupoColaFifo) => {
    const incidentesGrupo = getIncidentesPorGrupo(grupo);
    const primerIncidente = incidentesGrupo[0];
    if (primerIncidente?.id !== incidenteId) {
      toast.error('Solo puedes asignar el primer incidente de la fila (FIFO)');
      return;
    }
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('No se pudo obtener el usuario actual');
        return;
      }
      const {
        data: profile
      } = await supabase.from('profiles').select('codigo_empleado, nombre, apellido').eq('user_id', user.id).maybeSingle();
      const codigoTecnico = profile?.codigo_empleado || `${profile?.nombre || ''} ${profile?.apellido || ''}`.trim() || user.id;
      const {
        error
      } = await supabase.from('incidentes').update({
        status: 'En diagnostico',
        tecnico_asignado_id: user.id,
        codigo_tecnico: codigoTecnico
      }).eq('id', incidenteId);
      if (error) throw error;
      toast.success('Incidente asignado');
      navigate(`/taller/diagnostico/${incidenteId}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al asignar');
    }
  };

  // Obtener incidentes para un grupo (puede tener múltiples familias)
  const getIncidentesPorGrupo = (grupo: GrupoColaFifo) => {
    return incidentes.filter(inc => {
      const familiaPadreId = inc.producto?.familia_padre_id;
      const abueloId = getAbueloId(familiaPadreId);
      // Verificar si el abuelo está en alguna de las familias del grupo
      return abueloId !== null && grupo.familias.includes(abueloId) && inc.es_stock_cemaco !== true;
    });
  };

  // Obtener incidentes Stock Cemaco
  const getIncidentesStockCemaco = () => {
    return incidentes.filter(inc => inc.es_stock_cemaco === true);
  };
  const getDiasDesdeIngreso = (fechaIngreso: string) => {
    const dias = Math.floor((Date.now() - new Date(fechaIngreso).getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  // Función para abrir modal de revisión Stock Cemaco
  const handleRevisar = (incidente: IncidenteDB) => {
    setModalRevision({
      open: true,
      incidente
    });
    setDecision("aprobado");
    setObservaciones("");
    setJustificacion("");
    setMediaFiles([]);
  };

  // Función para enviar revisión Stock Cemaco
  const submitRevision = async () => {
    if (!modalRevision.incidente) return;
    if (justificacion.length < 20) {
      toast.error("La justificación debe tener al menos 20 caracteres");
      return;
    }
    if (mediaFiles.length === 0) {
      toast.error("Debe agregar al menos 1 foto como evidencia");
      return;
    }
    setSubmitting(true);
    try {
      const uploadedMedia = await uploadMediaToStorage(mediaFiles, modalRevision.incidente.id);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      await supabase.from("revisiones_stock_cemaco").insert({
        incidente_id: modalRevision.incidente.id,
        revisor_id: user?.id,
        observaciones,
        fotos_urls: uploadedMedia.map(m => m.url),
        decision,
        justificacion
      });
      await supabase.from("incidentes").update({
        status: "Pendiente de aprobación NC" as any
      }).eq("id", modalRevision.incidente.id);
      toast.success("Revisión enviada para aprobación");
      setModalRevision({
        open: false,
        incidente: null
      });
      fetchIncidentes();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar la revisión");
    } finally {
      setSubmitting(false);
    }
  };

  // Función para abrir modal de aprobación (Jefe de Taller)
  const handleAprobar = async (incidente: IncidenteDB) => {
    try {
      const {
        data: revision
      } = await supabase.from("revisiones_stock_cemaco").select("*").eq("incidente_id", incidente.id).order("created_at", {
        ascending: false
      }).limit(1).single();
      setModalAprobacion({
        open: true,
        incidente,
        revision
      });
      setObservacionesRechazo("");
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar la revisión");
    }
  };

  // Función para aprobar/rechazar la propuesta
  const submitAprobacion = async (aprobar: boolean) => {
    if (!modalAprobacion.incidente || !modalAprobacion.revision) return;
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      await supabase.from("revisiones_stock_cemaco").update({
        aprobado_por: user?.id,
        fecha_aprobacion: new Date().toISOString(),
        observaciones: aprobar ? modalAprobacion.revision.observaciones : observacionesRechazo
      }).eq("id", modalAprobacion.revision.id);
      const nuevoStatus = aprobar ? modalAprobacion.revision.decision === "aprobado" ? "Nota de credito" : "Rechazado" : "Rechazado";
      await supabase.from("incidentes").update({
        status: nuevoStatus as any
      }).eq("id", modalAprobacion.incidente.id);
      toast.success(aprobar ? "Revisión aprobada" : "Revisión rechazada");
      setModalAprobacion({
        open: false,
        incidente: null,
        revision: null
      });
      fetchIncidentes();
    } catch (error) {
      console.error(error);
      toast.error("Error al procesar la aprobación");
    }
  };

  // Métricas
  const [productividadGeneral, setProductividadGeneral] = useState(0);
  useEffect(() => {
    const fetchProductividad = async () => {
      try {
        const hace7Dias = new Date();
        hace7Dias.setDate(hace7Dias.getDate() - 7);
        const {
          data
        } = await supabase.from('diagnosticos').select('id').eq('estado', 'completado').gte('updated_at', hace7Dias.toISOString());
        setProductividadGeneral(data?.length || 0);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchProductividad();
  }, []);
  const pendientesDiagnosticar = incidentes.filter(inc => !inc.es_stock_cemaco).length;
  const incidentesStockCemaco = getIncidentesStockCemaco();
  const diaMaximo = incidentes.length > 0 ? Math.max(...incidentes.map(inc => getDiasDesdeIngreso(inc.fecha_ingreso))) : 0;
  const gruposActivos = grupos.filter(g => getIncidentesPorGrupo(g).length > 0).length;

  // Obtener nombre de familia por ID
  const getNombreFamilia = (id: number): string => {
    const fam = familias.find(f => f.id === id);
    return fam?.Categoria || `Familia ${id}`;
  };

  // Si no hay configuración, mostrar mensaje
  const sinConfiguracion = !loadingConfig && grupos.length === 0;
  return <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Cola de reparación
            <Wrench className="h-8 w-8 text-primary" />
          </h1>
          {centroServicioNombre && <p className="text-muted-foreground mt-1">
              Centro de servicio: <span className="font-medium text-foreground">{centroServicioNombre}</span>
            </p>}
        </div>
        
      </div>

      {/* Dashboard de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendientesDiagnosticar}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Día máximo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{diaMaximo} días</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Grupos activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{gruposActivos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Productividad (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{productividadGeneral}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sistema de tarjetas por grupos */}
      <div className="space-y-4">
        {loading || loadingConfig ? <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando...</p>
          </div> : sinConfiguracion ? <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Settings2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin configuración de colas</h3>
              <p className="text-muted-foreground mb-4">
                No hay grupos de cola configurados para tu centro de servicio.
              </p>
              <Button onClick={() => navigate('/taller/configuracion-colas')}>
                <Settings2 className="h-4 w-4 mr-2" />
                Configurar colas FIFO
              </Button>
            </CardContent>
          </Card> : <TooltipProvider>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {grupos.map(grupo => {
            const incidentesGrupo = getIncidentesPorGrupo(grupo);
            const primerIncidente = incidentesGrupo[0];
            const showList = expandedGrupos[grupo.id] || false;
            const hasIncidentes = incidentesGrupo.length > 0;
            const color = grupo.color || 'orange';
            const toggleList = (e: React.MouseEvent) => {
              e.stopPropagation();
              setExpandedGrupos(prev => ({
                ...prev,
                [grupo.id]: !prev[grupo.id]
              }));
            };
            return <div key={grupo.id} className="flex flex-col">
                    {/* Tarjeta principal */}
                    <div className={`p-4 rounded-xl transition-all duration-200 min-h-[100px] flex flex-col justify-between border shadow-lg ${!hasIncidentes ? 'bg-muted/30 border-dashed border-border cursor-default opacity-60' : `${COLORES_CLASES[color] || COLORES_CLASES.orange} cursor-pointer hover:scale-[1.02] active:scale-[0.98]`}`} onClick={() => {
                if (!hasIncidentes) return;
                handleAsignar(primerIncidente.id, grupo);
              }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`font-bold text-base ${!hasIncidentes ? 'text-muted-foreground' : ''}`}>
                            {grupo.nombre}
                          </span>
                          {/* Mostrar familias incluidas */}
                          {grupo.familias.length > 1 && <p className="text-[10px] text-muted-foreground mt-0.5">
                              {grupo.familias.map(id => getNombreFamilia(id)).join(' + ')}
                            </p>}
                        </div>
                        {hasIncidentes && incidentesGrupo.length > 1 && <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className={`h-6 w-6 -mt-1 -mr-1 ${COLORES_TEXTO[color] || 'text-orange-600'} hover:bg-white/20`} onClick={toggleList}>
                                {showList ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {showList ? 'Ocultar lista' : 'Ver lista'}
                            </TooltipContent>
                          </Tooltip>}
                      </div>

                      {hasIncidentes && <p className={`text-xs ${COLORES_TEXTO[color] || 'text-orange-600'} opacity-70 text-center font-medium mt-2`}>
                          Toca para asignarme
                        </p>}

                      <div className={`flex items-center justify-between mt-3 pt-2 ${hasIncidentes ? 'border-t border-white/20' : 'border-t border-border/50'}`}>
                        <Badge variant={hasIncidentes ? "secondary" : "outline"} className={`text-xs border-0 ${hasIncidentes ? COLORES_BADGE[color] || COLORES_BADGE.orange : ''}`}>
                          {incidentesGrupo.length} en cola
                        </Badge>
                        {hasIncidentes && <Plus className={`h-5 w-5 ${COLORES_TEXTO[color] || 'text-orange-600'} opacity-80`} />}
                      </div>
                    </div>

                    {/* Lista expandible de incidentes en espera */}
                    {showList && incidentesGrupo.length > 1 && <div className="mt-2 p-2 rounded-lg bg-muted/30 border border-border/50 space-y-1.5 max-h-48 overflow-y-auto">
                        <p className="text-[10px] text-muted-foreground font-medium px-1 uppercase tracking-wide">
                          En espera ({incidentesGrupo.length - 1})
                        </p>
                        {incidentesGrupo.slice(1).map(inc => <div key={inc.id} className="p-2 rounded-md bg-background/80 border border-border/30">
                            <p className="text-xs font-medium truncate">{inc.codigo_producto}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {inc.descripcion_problema}
                            </p>
                          </div>)}
                      </div>}
                  </div>;
          })}
            </div>
          </TooltipProvider>}

        {/* Sección Stock Cemaco separada */}
        {incidentesStockCemaco.length > 0 && <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Store className="h-5 w-5" />
                Stock Cemaco ({incidentesStockCemaco.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {incidentesStockCemaco.map(inc => <div key={inc.id} className="p-3 rounded-lg border bg-amber-500/10 border-amber-400/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{inc.codigo}</p>
                        <p className="text-xs text-muted-foreground">{inc.codigo_producto}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {inc.status === 'Pendiente de aprobación NC' ? 'Pendiente' : 'Ingresado'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {inc.descripcion_problema}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {inc.status === 'Ingresado' ? <Button size="sm" variant="outline" onClick={() => handleRevisar(inc)}>
                          Revisar
                        </Button> : <Button size="sm" variant="outline" onClick={() => handleAprobar(inc)}>
                          Aprobar/Rechazar
                        </Button>}
                    </div>
                  </div>)}
              </div>
            </CardContent>
          </Card>}

        {/* Leyenda */}
        <Card className="bg-muted/30">
          
        </Card>
      </div>

      {/* Modal de Revisión Stock Cemaco */}
      <Dialog open={modalRevision.open} onOpenChange={open => !submitting && setModalRevision({
      open,
      incidente: null
    })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisión Stock Cemaco - {modalRevision.incidente?.codigo}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Producto</Label>
              <p className="text-sm text-muted-foreground">{modalRevision.incidente?.codigo_producto}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Decisión *</Label>
              <RadioGroup value={decision} onValueChange={v => setDecision(v as "aprobado" | "rechazado")} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="aprobado" id="aprobado" />
                  <Label htmlFor="aprobado" className="cursor-pointer font-normal">Nota de Crédito Autorizado</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rechazado" id="rechazado" />
                  <Label htmlFor="rechazado" className="cursor-pointer font-normal">Nota de Crédito Rechazado</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <OutlinedTextarea label="Justificación * (mínimo 20 caracteres)" value={justificacion} onChange={e => setJustificacion(e.target.value)} placeholder="Explique detalladamente la razón de su decisión..." rows={4} />
              <p className="text-xs text-muted-foreground mt-1">
                {justificacion.length}/20 caracteres mínimos
              </p>
            </div>

            <OutlinedTextarea label="Observaciones adicionales" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Observaciones opcionales..." rows={3} />

            <div>
              <Label className="text-sm font-medium">Evidencia Fotográfica * (1-10 fotos)</Label>
              <WhatsAppStyleMediaCapture media={mediaFiles} onMediaChange={setMediaFiles} maxFiles={10} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRevision({
            open: false,
            incidente: null
          })} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={submitRevision} disabled={submitting}>
              {submitting ? "Guardando..." : "Enviar Revisión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Aprobación (Jefe de Taller) */}
      <Dialog open={modalAprobacion.open} onOpenChange={open => setModalAprobacion({
      open,
      incidente: null,
      revision: null
    })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aprobación Final - {modalAprobacion.incidente?.codigo}</DialogTitle>
          </DialogHeader>

          {modalAprobacion.revision && <div className="space-y-4">
              <div>
                <Label>Producto</Label>
                <p className="text-sm text-muted-foreground">{modalAprobacion.incidente?.codigo_producto}</p>
              </div>

              <div>
                <Label>Decisión Propuesta</Label>
                <Badge variant={modalAprobacion.revision.decision === "aprobado" ? "default" : "destructive"} className="text-sm">
                  {modalAprobacion.revision.decision === "aprobado" ? <><CheckCircle2 className="h-4 w-4 mr-1" /> Nota de Crédito Autorizado</> : <><XCircle className="h-4 w-4 mr-1" /> Nota de Crédito Rechazado</>}
                </Badge>
              </div>

              <div>
                <Label>Justificación del Revisor</Label>
                <p className="text-sm bg-muted p-3 rounded-lg">{modalAprobacion.revision.justificacion}</p>
              </div>

              {modalAprobacion.revision.observaciones && <div>
                  <Label>Observaciones</Label>
                  <p className="text-sm bg-muted p-3 rounded-lg">{modalAprobacion.revision.observaciones}</p>
                </div>}

              <div>
                <Label>Evidencia Fotográfica</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {modalAprobacion.revision.fotos_urls?.map((url: string, idx: number) => <img key={idx} src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-24 object-cover rounded-lg border" />)}
                </div>
              </div>

              <Separator />

              <OutlinedTextarea label="Observaciones de Rechazo (si aplica)" value={observacionesRechazo} onChange={e => setObservacionesRechazo(e.target.value)} placeholder="Solo si va a rechazar la propuesta..." rows={3} />
            </div>}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalAprobacion({
            open: false,
            incidente: null,
            revision: null
          })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => submitAprobacion(false)}>
              <XCircle className="h-4 w-4 mr-2" />
              Rechazar Propuesta
            </Button>
            <Button onClick={() => submitAprobacion(true)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aprobar Propuesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}