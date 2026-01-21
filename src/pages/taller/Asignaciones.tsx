import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OutlinedInput } from "@/components/ui/outlined-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wrench, CheckCircle2, Eye, EyeOff, Settings2, AlertTriangle, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActiveIncidents, MAX_ASSIGNMENTS } from "@/contexts/ActiveIncidentsContext";
import { apiBackendAction } from "@/lib/api";
import type { IncidenteSchema } from "@/generated/actions.d";

interface IncidenteConProducto {
  id: number;
  codigo: string;
  estado: string;
  descripcion_problema: string | null;
  centro_de_servicio_id: number;
  created_at?: string | null;
  producto?: {
    familia_padre_id: number | null;
  } | null;
}

interface FamiliaDB {
  id: number;
  nombre: string;
  parent_id: number | null;
}

interface GrupoColaFifo {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
  color: string | null;
  familias: number[];
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
  const { currentAssignments, canTakeMoreAssignments, refreshIncidents } = useActiveIncidents();
  const [incidentes, setIncidentes] = useState<IncidenteConProducto[]>([]);
  const [familias, setFamilias] = useState<FamiliaDB[]>([]);
  const [grupos, setGrupos] = useState<GrupoColaFifo[]>([]);
  const [centroServicioId, setCentroServicioId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGrupos, setExpandedGrupos] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Cargar centro de servicio del usuario y configuración de grupos
  useEffect(() => {
    const loadUserConfig = async () => {
      try {
        setLoadingConfig(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Obtener centro de servicio del usuario
        const { data: userProfile } = await (supabase as any)
          .from('usuarios')
          .select('centro_de_servicio_id')
          .eq('auth_uid', user.id)
          .maybeSingle();

        if (!userProfile?.centro_de_servicio_id) {
          console.warn('Usuario sin centro de servicio asignado');
          setLoadingConfig(false);
          return;
        }
        setCentroServicioId(userProfile.centro_de_servicio_id);

        // Cargar grupos activos para este centro
        const { data: gruposData } = await supabase
          .from('grupos_cola_fifo')
          .select('*')
          .eq('centro_servicio_id', userProfile.centro_de_servicio_id)
          .eq('activo', true)
          .order('orden');

        if (!gruposData || gruposData.length === 0) {
          setGrupos([]);
          setLoadingConfig(false);
          return;
        }

        // Cargar familias de cada grupo
        const { data: familiasGrupos } = await supabase
          .from('grupos_cola_fifo_familias')
          .select('grupo_id, familia_abuelo_id')
          .in('grupo_id', gruposData.map(g => g.id));

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

  // Cargar incidentes cuando se tenga el centro de servicio
  useEffect(() => {
    if (centroServicioId) {
      fetchIncidentes();
    }
  }, [centroServicioId]);

  useEffect(() => {
    fetchFamilias();
  }, []);

  const fetchFamilias = async () => {
    const { data } = await supabase
      .from('familias_producto')
      .select('id, nombre, parent_id');
    if (data) {
      setFamilias(data.map(f => ({
        id: f.id,
        nombre: f.nombre,
        parent_id: f.parent_id
      })));
    }
  };

  // Obtener el ID del abuelo (categoría general) desde familia_padre_id
  const getAbueloId = (familiaPadreId: number | null): number | null => {
    if (!familiaPadreId) return null;
    const familia = familias.find(f => f.id === familiaPadreId);
    return familia?.parent_id || null;
  };

  const fetchIncidentes = async () => {
    if (!centroServicioId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      // Use apiBackendAction for incidents
      const response = await apiBackendAction("incidentes.list", { limit: 1000 });
      
      // Filter by status (REGISTRADO is used for pending assignment) and service center, then sort by created_at
      const filtered = response.results
        .filter(inc => 
          inc.estado === "REGISTRADO" && 
          inc.centro_de_servicio_id === centroServicioId
        )
        .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

      // Transform the data to match our interface
      const transformed: IncidenteConProducto[] = filtered.map(inc => ({
        id: inc.id,
        codigo: inc.codigo,
        estado: inc.estado,
        descripcion_problema: inc.descripcion_problema,
        centro_de_servicio_id: inc.centro_de_servicio_id,
        created_at: inc.created_at,
        producto: inc.producto ? { familia_padre_id: inc.producto.familia_padre_id || null } : null
      }));

      setIncidentes(transformed);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar incidentes');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignar = async (incidenteId: number, grupo: GrupoColaFifo) => {
    const incidentesGrupo = getIncidentesPorGrupo(grupo);
    const primerIncidente = incidentesGrupo[0];
    if (primerIncidente?.id !== incidenteId) {
      toast.error('Solo puedes asignar el primer incidente de la fila (FIFO)');
      return;
    }

    if (!canTakeMoreAssignments) {
      toast.error(`Ya tienes ${MAX_ASSIGNMENTS} máquinas asignadas. Completa un diagnóstico antes de tomar otra.`);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('No se pudo obtener el usuario actual');
        return;
      }

      // Get user profile
      const { data: profile } = await (supabase as any)
        .from('usuarios')
        .select('id, nombre, apellido, codigo_empleado')
        .eq('auth_uid', user.id)
        .maybeSingle();

      const codigoTecnico = profile?.codigo_empleado || `${profile?.nombre || ''} ${profile?.apellido || ''}`.trim() || user.id;

      // Update incident status
      const { error } = await supabase
        .from('incidentes')
        .update({
          estado: 'EN_DIAGNOSTICO' as const,
          propietario_id: profile?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', incidenteId);

      if (error) throw error;

      toast.success('Incidente asignado');
      refreshIncidents();
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
      const abueloId = getAbueloId(familiaPadreId ?? null);
      return abueloId !== null && grupo.familias.includes(abueloId);
    });
  };

  const getDiasDesdeIngreso = (createdAt: string | null | undefined) => {
    if (!createdAt) return 0;
    const dias = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  const toggleGrupo = (grupoId: number) => {
    setExpandedGrupos(prev => ({ ...prev, [grupoId]: !prev[grupoId] }));
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Settings2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sin configuración de colas</h2>
            <p className="text-muted-foreground mb-4">
              No hay grupos de cola FIFO configurados para tu centro de servicio.
            </p>
            <Button variant="outline" onClick={() => navigate('/taller/configuracion-colas')}>
              Configurar Colas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Asignaciones</h1>
          <p className="text-muted-foreground">
            Cola FIFO de incidentes pendientes de diagnóstico
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={currentAssignments >= MAX_ASSIGNMENTS ? "destructive" : "secondary"}>
            {currentAssignments}/{MAX_ASSIGNMENTS} asignaciones
          </Badge>
        </div>
      </div>

      {/* Alert if at max capacity */}
      {!canTakeMoreAssignments && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Has alcanzado el máximo de {MAX_ASSIGNMENTS} asignaciones. Completa un diagnóstico para poder tomar más.
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="w-full max-w-md">
        <OutlinedInput
          label="Buscar incidente"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Código o descripción..."
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        /* Grupos de Cola */
        <div className="space-y-4">
          {grupos.map((grupo) => {
            const incidentesGrupo = getIncidentesPorGrupo(grupo);
            const filteredIncidentes = searchTerm
              ? incidentesGrupo.filter(inc => 
                  inc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  inc.descripcion_problema?.toLowerCase().includes(searchTerm.toLowerCase())
                )
              : incidentesGrupo;
            const isExpanded = expandedGrupos[grupo.id] ?? true;
            const colorClass = COLORES_CLASES[grupo.color || 'blue'] || COLORES_CLASES.blue;
            const textClass = COLORES_TEXTO[grupo.color || 'blue'] || COLORES_TEXTO.blue;
            const badgeClass = COLORES_BADGE[grupo.color || 'blue'] || COLORES_BADGE.blue;

            return (
              <Card key={grupo.id} className={`border ${colorClass}`}>
                <CardHeader 
                  className="cursor-pointer pb-3"
                  onClick={() => toggleGrupo(grupo.id)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className={`text-lg flex items-center gap-2 ${textClass}`}>
                      <Wrench className="h-5 w-5" />
                      {grupo.nombre}
                      <Badge className={badgeClass}>{incidentesGrupo.length}</Badge>
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon">
                            {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isExpanded ? 'Contraer' : 'Expandir'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent>
                    {filteredIncidentes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No hay incidentes pendientes en esta cola
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredIncidentes.map((incidente, index) => {
                          const dias = getDiasDesdeIngreso(incidente.created_at);
                          const esPrimero = index === 0;

                          return (
                            <div
                              key={incidente.id}
                              className={`p-3 rounded-lg border flex items-center justify-between ${
                                esPrimero 
                                  ? 'bg-primary/5 border-primary/30' 
                                  : 'bg-muted/30'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-semibold">{incidente.codigo}</span>
                                  {esPrimero && (
                                    <Badge variant="default" className="text-xs">
                                      Siguiente
                                    </Badge>
                                  )}
                                  <Badge variant={dias > 5 ? "destructive" : dias > 2 ? "secondary" : "outline"}>
                                    {dias} días
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                  {incidente.descripcion_problema || 'Sin descripción'}
                                </p>
                              </div>
                              {esPrimero && canTakeMoreAssignments && (
                                <Button 
                                  size="sm"
                                  onClick={() => handleAsignar(incidente.id, grupo)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Tomar
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
