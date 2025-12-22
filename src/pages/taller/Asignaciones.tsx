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
import { Wrench, Store, CheckCircle2, XCircle, Plus, Eye, EyeOff } from "lucide-react";
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
const FAMILIAS = [{
  nombre: "Eléctrica",
  id: 4
}, {
  nombre: "Bomba",
  id: 33
}, {
  nombre: "Compresor",
  id: 1
}, {
  nombre: "2 tiempos",
  id: 27
}, {
  nombre: "Hidrolavadoras",
  id: 20
}, {
  nombre: "4 tiempos",
  id: 23
}, {
  nombre: "Stock Cemaco",
  id: null
}] as const;
export default function Asignaciones() {
  const navigate = useNavigate();
  const [incidentes, setIncidentes] = useState<IncidenteConProducto[]>([]);
  const [familias, setFamilias] = useState<FamiliaDB[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<IncidenteDB[]>([]);
  const [expandedFamilias, setExpandedFamilias] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

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
  useEffect(() => {
    fetchIncidentes();
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
    try {
      setLoading(true);

      // Incidentes normales (no stock Cemaco) - con JOIN a productos
      const {
        data: normales,
        error: error1
      } = await supabase.from('incidentes').select(`
          *,
          producto:productos!codigo_producto(familia_padre_id)
        `).eq('status', 'Ingresado').or('es_stock_cemaco.is.null,es_stock_cemaco.eq.false').order('fecha_ingreso', {
        ascending: true
      });
      if (error1) throw error1;

      // Incidentes Stock Cemaco (Ingresado y Pendiente de aprobación NC)
      const {
        data: stockCemaco,
        error: error2
      } = await supabase.from('incidentes').select(`
          *,
          producto:productos!codigo_producto(familia_padre_id)
        `).eq('es_stock_cemaco', true).in('status', ['Ingresado', 'Pendiente de aprobación NC'] as any).order('fecha_ingreso', {
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
  const handleAsignar = async (incidenteId: string, familiaConfig: typeof FAMILIAS[number]) => {
    const incidentesFamilia = getIncidentesPorFamilia(familiaConfig);
    const primerIncidente = incidentesFamilia[0];
    if (primerIncidente?.id !== incidenteId) {
      toast.error('Solo puedes asignar el primer incidente de la fila (FIFO)');
      return;
    }
    try {
      const {
        error
      } = await supabase.from('incidentes').update({
        status: 'En diagnostico'
      }).eq('id', incidenteId);
      if (error) throw error;
      toast.success('Incidente asignado');
      fetchIncidentes();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al asignar');
    }
  };
  const getIncidentesPorFamilia = (familiaConfig: typeof FAMILIAS[number]) => {
    if (familiaConfig.nombre === "Stock Cemaco") {
      return incidentes.filter(inc => inc.es_stock_cemaco === true);
    }
    return incidentes.filter(inc => {
      // Obtener familia_padre_id desde el PRODUCTO asociado
      const familiaPadreId = inc.producto?.familia_padre_id;
      // Obtener el abuelo (categoría general) desde CDS_Familias
      const abueloId = getAbueloId(familiaPadreId);
      return abueloId === familiaConfig.id && inc.es_stock_cemaco !== true;
    });
  };
  const getDiasDesdeIngreso = (fechaIngreso: string) => {
    const dias = Math.floor((Date.now() - new Date(fechaIngreso).getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };
  const getDiaMaxPorFamilia = (familiaConfig: typeof FAMILIAS[number]) => {
    const incidentesFamilia = getIncidentesPorFamilia(familiaConfig);
    if (incidentesFamilia.length === 0) return 0;
    return Math.max(...incidentesFamilia.map(inc => getDiasDesdeIngreso(inc.fecha_ingreso)));
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

  // Métricas adicionales
  const [productividadGeneral, setProductividadGeneral] = useState(0);
  useEffect(() => {
    const fetchProductividad = async () => {
      try {
        // Productividad general: diagnósticos completados en los últimos 7 días
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
  const pendientesDiagnosticar = incidentes.length;
  const diaMaximo = incidentes.length > 0 ? Math.max(...incidentes.map(inc => getDiasDesdeIngreso(inc.fecha_ingreso))) : 0;
  const familiasActivas = FAMILIAS.filter(f => getIncidentesPorFamilia(f).length > 0).length;
  return <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">Asignaciones de Taller

        <Wrench className="h-8 w-8 text-primary" />
          ​
        </h1>
        
      </div>

      {/* Dashboard de métricas */}
      

      {/* Búsqueda global */}
      <Card>
        
        
      </Card>

      {/* Sistema de tarjetas por familias */}
      <div className="space-y-4">
        
        
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        ) : (
          <TooltipProvider>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {FAMILIAS.filter(f => f.nombre !== "Stock Cemaco").map(familia => {
                const incidentesFamilia = getIncidentesPorFamilia(familia);
                const primerIncidente = incidentesFamilia[0];
                const showList = expandedFamilias[familia.nombre] || false;
                const hasIncidentes = incidentesFamilia.length > 0;
                const toggleList = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  setExpandedFamilias(prev => ({ ...prev, [familia.nombre]: !prev[familia.nombre] }));
                };
                
                return (
                  <div key={familia.nombre} className="flex flex-col">
                    {/* Tarjeta principal */}
                    <div 
                      className={`p-4 rounded-xl transition-all duration-200 min-h-[100px] flex flex-col justify-between ${
                        !hasIncidentes 
                          ? 'bg-muted/30 border border-dashed border-border cursor-default opacity-60'
                          : 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white border border-orange-400/50 shadow-lg shadow-orange-500/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                      onClick={() => {
                        if (!hasIncidentes) return;
                        handleAsignar(primerIncidente.id, familia);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <span className={`font-bold text-base ${!hasIncidentes ? 'text-muted-foreground' : ''}`}>
                          {familia.nombre}
                        </span>
                        {hasIncidentes && incidentesFamilia.length > 1 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 -mt-1 -mr-1 text-inherit hover:bg-white/20"
                                onClick={toggleList}
                              >
                                {showList ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {showList ? 'Ocultar lista' : 'Ver lista'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      
                      <div className={`flex items-center justify-between mt-3 pt-2 ${hasIncidentes ? 'border-t border-white/20' : 'border-t border-border/50'}`}>
                        <Badge 
                          variant={hasIncidentes ? "secondary" : "outline"} 
                          className={`text-xs ${hasIncidentes ? 'bg-white/20 text-inherit border-0' : ''}`}
                        >
                          {incidentesFamilia.length} en cola
                        </Badge>
                        {hasIncidentes && (
                          <Plus className="h-5 w-5 opacity-80" />
                        )}
                      </div>
                    </div>
                    
                    {/* Lista expandible de incidentes en espera */}
                    {showList && incidentesFamilia.length > 1 && (
                      <div className="mt-2 p-2 rounded-lg bg-muted/30 border border-border/50 space-y-1.5 max-h-48 overflow-y-auto">
                        <p className="text-[10px] text-muted-foreground font-medium px-1 uppercase tracking-wide">
                          En espera ({incidentesFamilia.length - 1})
                        </p>
                        {incidentesFamilia.slice(1).map((inc) => (
                          <div 
                            key={inc.id} 
                            className="p-2 rounded-md bg-background/80 border border-border/30"
                          >
                            <p className="text-xs font-medium truncate">{inc.codigo_producto}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{inc.descripcion_problema}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        )}

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