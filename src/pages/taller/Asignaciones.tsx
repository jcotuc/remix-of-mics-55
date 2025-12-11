import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { WhatsAppStyleMediaCapture, MediaFile } from "@/components/WhatsAppStyleMediaCapture";
import { uploadMediaToStorage } from "@/lib/uploadMedia";
import { Wrench, Clock, CheckCircle, Search, AlertCircle, Store, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];
type FamiliaDB = { id: number; Categoria: string | null; Padre: number | null };

const FAMILIAS = [
  { nombre: "Eléctrica", id: 4 },
  { nombre: "Bomba", id: 33 },
  { nombre: "Compresor", id: 1 },
  { nombre: "2 tiempos", id: 27 },
  { nombre: "Hidrolavadoras", id: 20 },
  { nombre: "4 tiempos", id: 23 },
  { nombre: "Stock Cemaco", id: null }
] as const;

export default function Asignaciones() {
  const navigate = useNavigate();
  const [incidentes, setIncidentes] = useState<IncidenteDB[]>([]);
  const [familias, setFamilias] = useState<FamiliaDB[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<IncidenteDB[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para modal de revisión Stock Cemaco
  const [modalRevision, setModalRevision] = useState<{open: boolean, incidente: IncidenteDB | null}>({open: false, incidente: null});
  const [decision, setDecision] = useState<"aprobado" | "rechazado">("aprobado");
  const [observaciones, setObservaciones] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Estados para modal de aprobación (Jefe de Taller)
  const [modalAprobacion, setModalAprobacion] = useState<{open: boolean, incidente: IncidenteDB | null, revision: any | null}>({open: false, incidente: null, revision: null});
  const [observacionesRechazo, setObservacionesRechazo] = useState("");

  useEffect(() => {
    fetchIncidentes();
    fetchFamilias();
  }, []);

  const fetchFamilias = async () => {
    const { data } = await supabase.from('CDS_Familias').select('id, Categoria, Padre');
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
      
      // Incidentes normales (no stock Cemaco)
      const { data: normales, error: error1 } = await supabase
        .from('incidentes')
        .select('*')
        .eq('status', 'Ingresado')
        .or('es_stock_cemaco.is.null,es_stock_cemaco.eq.false')
        .order('fecha_ingreso', { ascending: true });

      if (error1) throw error1;

      // Incidentes Stock Cemaco (Ingresado y Pendiente de aprobación NC)
      const { data: stockCemaco, error: error2 } = await supabase
        .from('incidentes')
        .select('*')
        .eq('es_stock_cemaco', true)
        .in('status', ['Ingresado', 'Pendiente de aprobación NC'] as any)
        .order('fecha_ingreso', { ascending: true });

      if (error2) {
        console.error('Error cargando incidentes Stock Cemaco:', error2);
        toast.error('Error al cargar incidentes de Stock Cemaco');
      }

      setIncidentes([...(normales || []), ...(stockCemaco || [])]);
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
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .or(`codigo.ilike.%${searchTerm}%,descripcion_problema.ilike.%${searchTerm}%,codigo_cliente.ilike.%${searchTerm}%`)
        .order('fecha_ingreso', { ascending: false })
        .limit(50);

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
      const { error } = await supabase
        .from('incidentes')
        .update({ status: 'En diagnostico' })
        .eq('id', incidenteId);

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
      const abueloId = getAbueloId(inc.familia_padre_id);
      return abueloId === familiaConfig.id && (inc.es_stock_cemaco !== true);
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
    setModalRevision({ open: true, incidente });
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
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("revisiones_stock_cemaco").insert({
        incidente_id: modalRevision.incidente.id,
        revisor_id: user?.id,
        observaciones,
        fotos_urls: uploadedMedia.map(m => m.url),
        decision,
        justificacion,
      });

      await supabase.from("incidentes")
        .update({ status: "Pendiente de aprobación NC" as any })
        .eq("id", modalRevision.incidente.id);

      toast.success("Revisión enviada para aprobación");
      setModalRevision({ open: false, incidente: null });
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
      const { data: revision } = await supabase
        .from("revisiones_stock_cemaco")
        .select("*")
        .eq("incidente_id", incidente.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      setModalAprobacion({ open: true, incidente, revision });
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
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from("revisiones_stock_cemaco")
        .update({
          aprobado_por: user?.id,
          fecha_aprobacion: new Date().toISOString(),
          observaciones: aprobar ? modalAprobacion.revision.observaciones : observacionesRechazo,
        })
        .eq("id", modalAprobacion.revision.id);

      const nuevoStatus = aprobar 
        ? (modalAprobacion.revision.decision === "aprobado" ? "Nota de credito" : "Rechazado")
        : "Rechazado";

      await supabase
        .from("incidentes")
        .update({ status: nuevoStatus as any })
        .eq("id", modalAprobacion.incidente.id);

      toast.success(aprobar ? "Revisión aprobada" : "Revisión rechazada");
      setModalAprobacion({ open: false, incidente: null, revision: null });
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
        
        const { data } = await supabase
          .from('diagnosticos')
          .select('id')
          .eq('estado', 'completado')
          .gte('updated_at', hace7Dias.toISOString());
        
        setProductividadGeneral(data?.length || 0);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchProductividad();
  }, []);

  const pendientesDiagnosticar = incidentes.length;
  const diaMaximo = incidentes.length > 0 
    ? Math.max(...incidentes.map(inc => getDiasDesdeIngreso(inc.fecha_ingreso))) 
    : 0;
  const familiasActivas = FAMILIAS.filter(f => getIncidentesPorFamilia(f).length > 0).length;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wrench className="h-8 w-8 text-primary" />
          Asignaciones de Taller - Sistema FIFO
        </h1>
        <p className="text-muted-foreground mt-2">
          Sistema Kanban por familias - Solo se puede asignar la primera máquina de cada fila
        </p>
      </div>

      {/* Dashboard de métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendientes por Diagnosticar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{pendientesDiagnosticar}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Productividad General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{productividadGeneral}</div>
            <p className="text-xs text-muted-foreground mt-1">últimos 7 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Día Más Alto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{diaMaximo}</div>
            <p className="text-xs text-muted-foreground mt-1">días esperando</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Familias Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{familiasActivas}</div>
            <p className="text-xs text-muted-foreground mt-1">de {FAMILIAS.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda Global de Incidentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por código, cliente o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{searchResults.length} resultados</p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchResults.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/mostrador/seguimiento/${inc.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{inc.codigo}</p>
                        <p className="text-sm text-muted-foreground truncate">{inc.descripcion_problema}</p>
                      </div>
                      <Badge variant="outline">{inc.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sistema Kanban por familias */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Cola de Asignación por Familias (FIFO)</h2>
        
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {FAMILIAS.map((familia) => {
                const incidentesFamilia = getIncidentesPorFamilia(familia);
                const diaMax = getDiaMaxPorFamilia(familia);
                const isStockCemaco = familia.nombre === "Stock Cemaco";

                return (
                  <div key={familia.nombre} className="flex-shrink-0 w-80">
                    <Card className={`h-full flex flex-col ${isStockCemaco ? 'border-orange-500/50 bg-orange-50/30 dark:bg-orange-950/20' : ''}`}>
                      <CardHeader className="pb-3 border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            {isStockCemaco && <Store className="h-4 w-4 text-orange-600" />}
                            {familia.nombre}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-bold">
                              {incidentesFamilia.length}
                            </Badge>
                            {diaMax > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {diaMax}d
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="flex-1 p-3 overflow-y-auto max-h-[600px]">
                        {incidentesFamilia.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Sin incidentes</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {incidentesFamilia.map((inc, index) => {
                              const esPrimero = index === 0;
                              const dias = getDiasDesdeIngreso(inc.fecha_ingreso);

                              return (
                                <div
                                  key={inc.id}
                                  className={`p-2.5 border rounded-lg transition-all duration-200 animate-fade-in ${
                                    esPrimero 
                                      ? 'border-primary bg-primary/10 shadow-md hover:shadow-lg hover:scale-[1.02]' 
                                      : 'border-muted bg-card hover:bg-muted/50'
                                  }`}
                                  style={{ animationDelay: `${index * 50}ms` }}
                                >
                                  <div className="space-y-2">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          {esPrimero && (
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                          )}
                                          <p className="font-semibold text-xs truncate">{inc.codigo}</p>
                                        </div>
                                        {!esPrimero && (
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            #{index + 1} en fila
                                          </p>
                                        )}
                                      </div>
                                      
                                      {esPrimero && (
                                        <Badge variant="default" className="text-xs px-1.5 py-0">
                                          SIGUIENTE
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Descripción */}
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">
                                      {inc.descripcion_problema}
                                    </p>

                                    {/* Badges */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${
                                          dias > 7 ? 'bg-red-50 text-red-700 border-red-200' :
                                          dias > 3 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                          'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}
                                      >
                                        <Clock className="h-3 w-3 mr-1" />
                                        {dias}d
                                      </Badge>
                                      {inc.cobertura_garantia && (
                                        <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                                          Garantía
                                        </Badge>
                                      )}
                                    </div>

                                     {/* Actions */}
                                     <div className="flex gap-1.5 pt-1">
                                       {isStockCemaco ? (
                                         inc.status === 'Ingresado' ? (
                                           <Button
                                             size="sm"
                                             className="flex-1 h-8 text-xs bg-orange-600 hover:bg-orange-700"
                                             onClick={() => handleRevisar(inc)}
                                           >
                                             Revisar
                                           </Button>
                                         ) : (inc.status as any) === 'Pendiente de aprobación NC' ? (
                                           <Button
                                             size="sm"
                                             className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                                             onClick={() => handleAprobar(inc)}
                                           >
                                             Aprobar
                                           </Button>
                                         ) : null
                                       ) : (
                                         <Button
                                           size="sm"
                                           variant={esPrimero ? "default" : "outline"}
                                           className={`flex-1 h-8 text-xs ${esPrimero ? 'hover-scale' : ''}`}
                                           onClick={() => handleAsignar(inc.id, familia)}
                                           disabled={!esPrimero}
                                         >
                                           {esPrimero ? '✓ Asignarme' : '🔒 Bloqueado'}
                                         </Button>
                                       )}
                                       <Button
                                         size="sm"
                                         variant="ghost"
                                         className="h-8 px-2"
                                         onClick={() => navigate(`/mostrador/seguimiento/${inc.id}`)}
                                       >
                                         👁️
                                       </Button>
                                     </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leyenda */}
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <span>Siguiente en asignar (FIFO)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
                <span>+7 días esperando</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-100 border border-orange-200" />
                <span>4-7 días esperando</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
                <span>0-3 días esperando</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Revisión Stock Cemaco */}
      <Dialog open={modalRevision.open} onOpenChange={(open) => !submitting && setModalRevision({ open, incidente: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisión Stock Cemaco - {modalRevision.incidente?.codigo}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Producto</Label>
              <p className="text-sm text-muted-foreground">{modalRevision.incidente?.codigo_producto}</p>
            </div>

            <div>
              <Label htmlFor="decision">Decisión *</Label>
              <RadioGroup value={decision} onValueChange={(v) => setDecision(v as "aprobado" | "rechazado")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="aprobado" id="aprobado" />
                  <Label htmlFor="aprobado" className="cursor-pointer">Nota de Crédito Autorizado</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rechazado" id="rechazado" />
                  <Label htmlFor="rechazado" className="cursor-pointer">Nota de Crédito Rechazado</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="justificacion">Justificación * (mínimo 20 caracteres)</Label>
              <Textarea
                id="justificacion"
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                placeholder="Explique detalladamente la razón de su decisión..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {justificacion.length}/20 caracteres mínimos
              </p>
            </div>

            <div>
              <Label htmlFor="observaciones">Observaciones adicionales</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones opcionales..."
                rows={3}
              />
            </div>

            <div>
              <Label>Evidencia Fotográfica * (1-10 fotos)</Label>
              <WhatsAppStyleMediaCapture
                media={mediaFiles}
                onMediaChange={setMediaFiles}
                maxFiles={10}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRevision({ open: false, incidente: null })} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={submitRevision} disabled={submitting}>
              {submitting ? "Guardando..." : "Enviar Revisión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Aprobación (Jefe de Taller) */}
      <Dialog open={modalAprobacion.open} onOpenChange={(open) => setModalAprobacion({ open, incidente: null, revision: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aprobación Final - {modalAprobacion.incidente?.codigo}</DialogTitle>
          </DialogHeader>
          
          {modalAprobacion.revision && (
            <div className="space-y-4">
              <div>
                <Label>Producto</Label>
                <p className="text-sm text-muted-foreground">{modalAprobacion.incidente?.codigo_producto}</p>
              </div>

              <div>
                <Label>Decisión Propuesta</Label>
                <Badge variant={modalAprobacion.revision.decision === "aprobado" ? "default" : "destructive"} className="text-sm">
                  {modalAprobacion.revision.decision === "aprobado" ? (
                    <><CheckCircle2 className="h-4 w-4 mr-1" /> Nota de Crédito Autorizado</>
                  ) : (
                    <><XCircle className="h-4 w-4 mr-1" /> Nota de Crédito Rechazado</>
                  )}
                </Badge>
              </div>

              <div>
                <Label>Justificación del Revisor</Label>
                <p className="text-sm bg-muted p-3 rounded-lg">{modalAprobacion.revision.justificacion}</p>
              </div>

              {modalAprobacion.revision.observaciones && (
                <div>
                  <Label>Observaciones</Label>
                  <p className="text-sm bg-muted p-3 rounded-lg">{modalAprobacion.revision.observaciones}</p>
                </div>
              )}

              <div>
                <Label>Evidencia Fotográfica</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {modalAprobacion.revision.fotos_urls?.map((url: string, idx: number) => (
                    <img key={idx} src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-24 object-cover rounded-lg border" />
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <Label htmlFor="observacionesRechazo">Observaciones de Rechazo (si aplica)</Label>
                <Textarea
                  id="observacionesRechazo"
                  value={observacionesRechazo}
                  onChange={(e) => setObservacionesRechazo(e.target.value)}
                  placeholder="Solo si va a rechazar la propuesta..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalAprobacion({ open: false, incidente: null, revision: null })}>
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

    </div>
  );
}