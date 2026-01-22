import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Eye, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActiveIncidents, MAX_ASSIGNMENTS } from "@/contexts/ActiveIncidentsContext";
import { apiBackendAction } from "@/lib/api-backend";
import { DEV_BYPASS_AUTH, isDevBypassEnabled } from "@/config/devBypassAuth";

interface IncidenteConProducto {
  id: number;
  codigo: string;
  estado: string;
  descripcion_problema: string | null;
  centro_de_servicio_id: number;
  created_at?: string | null;
  producto?: {
    familia_padre_id: number | null;
    familia_abuelo_id?: number | null;
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

// Colores para grupos con incidentes pendientes
const COLORES_FONDO: Record<string, string> = {
  orange: "bg-orange-100 border-orange-300 hover:bg-orange-200",
  green: "bg-green-100 border-green-300 hover:bg-green-200",
  blue: "bg-blue-100 border-blue-300 hover:bg-blue-200",
  purple: "bg-purple-100 border-purple-300 hover:bg-purple-200",
  red: "bg-red-100 border-red-300 hover:bg-red-200",
  yellow: "bg-yellow-100 border-yellow-300 hover:bg-yellow-200",
  cyan: "bg-cyan-100 border-cyan-300 hover:bg-cyan-200",
  pink: "bg-pink-100 border-pink-300 hover:bg-pink-200",
};

const COLORES_TEXTO: Record<string, string> = {
  orange: "text-orange-600",
  green: "text-green-600",
  blue: "text-blue-600",
  purple: "text-purple-600",
  red: "text-red-600",
  yellow: "text-yellow-600",
  cyan: "text-cyan-600",
  pink: "text-pink-600",
};

const COLORES_BADGE: Record<string, string> = {
  orange: "bg-orange-500 text-white",
  green: "bg-green-500 text-white",
  blue: "bg-blue-500 text-white",
  purple: "bg-purple-500 text-white",
  red: "bg-red-500 text-white",
  yellow: "bg-yellow-500 text-white",
  cyan: "bg-cyan-500 text-white",
  pink: "bg-pink-500 text-white",
};

export default function Asignaciones() {
  const navigate = useNavigate();
  const { currentAssignments, canTakeMoreAssignments, refreshIncidents } = useActiveIncidents();
  const [incidentes, setIncidentes] = useState<IncidenteConProducto[]>([]);
  const [familias, setFamilias] = useState<FamiliaDB[]>([]);
  const [grupos, setGrupos] = useState<GrupoColaFifo[]>([]);
  const [centroServicioId, setCentroServicioId] = useState<number | null>(null);
  const [centroServicioNombre, setCentroServicioNombre] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Cargar centro de servicio del usuario y configuración de grupos
  useEffect(() => {
    const loadUserConfig = async () => {
      try {
        setLoadingConfig(true);
        // 1) Obtener usuario (si no hay sesión real, usar bypass por email para pruebas)
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user ?? null;
        const effectiveEmail = user?.email ?? (isDevBypassEnabled() ? DEV_BYPASS_AUTH.email : null);

        // 2) Obtener centro de servicio del usuario
        let userProfile: any = null;
        try {
          if (user?.id) {
            const r = await apiBackendAction("usuarios.getByAuthUid", { auth_uid: user.id } as any);
            userProfile = (r as any)?.result ?? null;
          }
        } catch {
          // ignore
        }

        if (!userProfile && effectiveEmail) {
          const { data: byEmail } = await (supabase as any)
            .from("usuarios")
            .select("id, centro_de_servicio_id, activo, email")
            .eq("email", effectiveEmail)
            .maybeSingle();
          userProfile = byEmail;
        }

        console.log("Perfil de usuario:", userProfile);

        const userCentroId = Number(userProfile?.centro_de_servicio_id);
        if (!userCentroId) {
          console.warn("Usuario sin centro de servicio asignado");
          return;
        }

        console.log("Centro de servicio del usuario:", userCentroId);
        setCentroServicioId(userCentroId);

        // Obtener nombre del centro de servicio
        const { data: centroData } = await (supabase as any)
          .from("centros_de_servicio")
          .select("nombre")
          .eq("id", userCentroId)
          .maybeSingle();
        setCentroServicioNombre(centroData?.nombre || `Centro ${userCentroId}`);

        // Cargar grupos activos del centro
        const { results: allGruposData } = await apiBackendAction("grupos_cola_fifo.list", {
          centro_servicio_id: userCentroId,
        } as any);
        console.log("Todos los grupos:", allGruposData);

        // Filtrar por centro de servicio del usuario
        const gruposDelCentro = (allGruposData || []).filter(
          (g: any) => Number(g.centro_servicio_id) === userCentroId
        );
        console.log("Grupos del centro:", gruposDelCentro);

        const gruposActivos = gruposDelCentro.filter((g: any) => g.activo);
        console.log("Grupos activos:", gruposActivos);

        if (gruposActivos.length === 0) {
          setGrupos([]);
          setLoadingConfig(false);
          return;
        }

        // Cargar familias de cada grupo
        const familiasPromises = gruposActivos.map((g: any) =>
          apiBackendAction("grupos_cola_fifo_familias.list", { grupo_id: g.id } as any)
        );
        const familiasResults = await Promise.all(familiasPromises);
        const allFamiliasGrupos = familiasResults.flatMap((r, i) =>
          (r.results || []).map((fg: any) => ({ ...fg, grupo_id: gruposActivos[i].id }))
        );
        console.log("Familias de grupos:", allFamiliasGrupos);

        // Construir grupos con sus familias
        const gruposConFamilias: GrupoColaFifo[] = gruposActivos.map((grupo: any) => ({
          id: grupo.id,
          nombre: grupo.nombre,
          orden: grupo.orden,
          activo: grupo.activo ?? true,
          color: grupo.color,
          familias:
            allFamiliasGrupos
              .filter((fg: any) => fg.grupo_id === grupo.id)
              .map((fg: any) => fg.familia_abuelo_id) || [],
        }));
        console.log("Grupos con familias:", gruposConFamilias);
        setGrupos(gruposConFamilias);
      } catch (error) {
        console.error("Error cargando configuración:", error);
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
    try {
      const result = await apiBackendAction("familias_producto.list", {});
      const data = result.results || [];
      setFamilias(
        data.map((f: any) => ({
          id: f.id,
          nombre: f.nombre,
          parent_id: f.parent_id,
        }))
      );
    } catch (error) {
      console.error("Error fetching familias:", error);
    }
  };

  // Obtener el ID del abuelo (categoría general) desde familia_padre_id
  const getAbueloId = (familiaPadreId: number | null): number | null => {
    if (!familiaPadreId) return null;
    const familia = familias.find((f) => f.id === familiaPadreId);
    return familia?.parent_id || null;
  };

  // Obtener nombres de familias para un grupo
  const getFamiliasNombres = (grupo: GrupoColaFifo): string => {
    const nombres = grupo.familias
      .map((fid) => familias.find((f) => f.id === fid)?.nombre)
      .filter(Boolean);
    if (nombres.length === 0) return "";
    if (nombres.length <= 2) return nombres.join(" + ");
    return `${nombres.slice(0, 2).join(" + ")} +${nombres.length - 2}`;
  };

  const fetchIncidentes = async () => {
    if (!centroServicioId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      const response = await apiBackendAction("incidentes.list", { limit: 1000 });

      // Filtrar por estado REGISTRADO y centro de servicio, ordenar por fecha
      const filtered = response.results
        .filter(
          (inc) => inc.estado === "REGISTRADO" && inc.centro_de_servicio_id === centroServicioId
        )
        .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

      const transformed: IncidenteConProducto[] = filtered.map((inc) => ({
        id: inc.id,
        codigo: inc.codigo,
        estado: inc.estado,
        descripcion_problema: inc.descripcion_problema,
        centro_de_servicio_id: inc.centro_de_servicio_id,
        created_at: inc.created_at,
        producto: inc.producto
          ? {
              familia_padre_id: inc.producto.familia_padre_id || null,
              familia_abuelo_id: inc.producto.familia_abuelo_id ?? null,
            }
          : null,
      }));

      setIncidentes(transformed);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar incidentes");
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarPrimero = async (grupo: GrupoColaFifo) => {
    const incidentesGrupo = getIncidentesPorGrupo(grupo);
    if (incidentesGrupo.length === 0) {
      toast.info("No hay incidentes pendientes en esta cola");
      return;
    }

    const primerIncidente = incidentesGrupo[0];

    if (!canTakeMoreAssignments) {
      toast.error(
        `Ya tienes ${MAX_ASSIGNMENTS} máquinas asignadas. Completa un diagnóstico antes de tomar otra.`
      );
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user ?? null;
      const effectiveEmail = user?.email ?? (isDevBypassEnabled() ? DEV_BYPASS_AUTH.email : null);
      if (!user && !effectiveEmail) {
        toast.error("No se pudo obtener el usuario actual");
        return;
      }

      // Get user profile
      let profile: any = null;
      if (user?.id) {
        const { data } = await (supabase as any)
          .from("usuarios")
          .select("id, nombre, apellido, codigo_empleado, email")
          .eq("auth_uid", user.id)
          .maybeSingle();
        profile = data;
      }
      if (!profile && effectiveEmail) {
        const { data } = await (supabase as any)
          .from("usuarios")
          .select("id, nombre, apellido, codigo_empleado, email")
          .eq("email", effectiveEmail)
          .maybeSingle();
        profile = data;
      }

      // Update incident status
      const { error } = await supabase
        .from("incidentes")
        .update({
          estado: "EN_DIAGNOSTICO" as const,
          propietario_id: profile?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", primerIncidente.id);

      if (error) throw error;

      toast.success("Incidente asignado");
      refreshIncidents();
      navigate(`/taller/diagnostico/${primerIncidente.id}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al asignar");
    }
  };

  // Obtener incidentes para un grupo
  const getIncidentesPorGrupo = (grupo: GrupoColaFifo) => {
    return incidentes.filter((inc) => {
      const abueloId =
        inc.producto?.familia_abuelo_id ?? getAbueloId(inc.producto?.familia_padre_id ?? null);
      return abueloId !== null && grupo.familias.includes(abueloId);
    });
  };

  // Calcular estadísticas
  const totalPendientes = incidentes.length;
  const gruposActivos = grupos.length;
  const diaMaximo = incidentes.reduce((max, inc) => {
    if (!inc.created_at) return max;
    const dias = Math.floor((Date.now() - new Date(inc.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return dias > max ? dias : max;
  }, 0);

  if (loadingConfig || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          Cola de reparación <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
        </h1>
        <p className="text-muted-foreground">
          Centro de servicio: <span className="font-medium text-foreground">{centroServicioNombre}</span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Mis Asignaciones</p>
            <p className="text-2xl font-bold">
              <span className="text-orange-500">{currentAssignments}</span>
              <span className="text-muted-foreground text-lg"> / {MAX_ASSIGNMENTS}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-bold">{totalPendientes}</p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Día máximo</p>
            <p className="text-2xl font-bold">{diaMaximo} días</p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Grupos activos</p>
            <p className="text-2xl font-bold">{gruposActivos}</p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Productividad (7d)</p>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>

      {/* Queue Groups Grid */}
      {grupos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sin configuración de colas</h2>
            <p className="text-muted-foreground mb-4">
              No hay grupos de cola FIFO configurados para tu centro de servicio.
            </p>
            <Button variant="outline" onClick={() => navigate("/taller/configuracion-colas")}>
              Configurar Colas
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {grupos.map((grupo) => {
            const incidentesGrupo = getIncidentesPorGrupo(grupo);
            const count = incidentesGrupo.length;
            const hasItems = count > 0;
            const color = grupo.color || "orange";
            const fondoClass = hasItems
              ? COLORES_FONDO[color] || COLORES_FONDO.orange
              : "bg-muted/50 border-border hover:bg-muted";
            const textoClass = hasItems
              ? COLORES_TEXTO[color] || COLORES_TEXTO.orange
              : "text-muted-foreground";
            const badgeClass = hasItems
              ? COLORES_BADGE[color] || COLORES_BADGE.orange
              : "bg-muted text-muted-foreground";
            const familiasStr = getFamiliasNombres(grupo);

            return (
              <Card
                key={grupo.id}
                className={`cursor-pointer transition-all border-2 ${fondoClass} ${
                  hasItems ? "shadow-md" : ""
                }`}
                onClick={() => hasItems && handleAsignarPrimero(grupo)}
              >
                <CardContent className="p-4 space-y-2 relative">
                  {/* Eye icon */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/taller/cola/${grupo.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {/* Group name */}
                  <h3 className="font-semibold text-foreground pr-6">{grupo.nombre}</h3>

                  {/* Familias subtitle */}
                  {familiasStr && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{familiasStr}</p>
                  )}

                  {/* Action link */}
                  {hasItems ? (
                    <p className={`text-sm font-medium ${textoClass}`}>Toca para asignarme</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">0 en cola</p>
                  )}

                  {/* Bottom row: badge + plus button */}
                  <div className="flex items-center justify-between pt-1">
                    {hasItems ? (
                      <Badge className={`text-xs ${badgeClass}`}>{count} en cola</Badge>
                    ) : (
                      <span />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-60 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/taller/cola/${grupo.id}`);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
