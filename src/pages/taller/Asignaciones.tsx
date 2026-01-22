import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wrench, Eye, Plus, Loader2, Clock, FileText } from "lucide-react";
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
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoColaFifo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

      const tecnicoId = Number(profile?.id);
      if (!tecnicoId) {
        toast.error("No se pudo identificar el técnico actual");
        return;
      }

      // 1) Asegurar vínculo incidente <-> técnico (tabla incidente_tecnico)
      const { results: existentes } = await apiBackendAction("incidente_tecnico.list", {
        incidente_id: primerIncidente.id,
        es_principal: true,
      } as any);

      const existente = (existentes || [])[0] as any;
      if (existente?.id) {
        // Si ya existe un principal, lo reasignamos a este técnico
        await apiBackendAction("incidente_tecnico.update", {
          id: existente.id,
          data: {
            tecnico_id: tecnicoId,
            es_principal: true,
          },
        } as any);
      } else {
        await apiBackendAction("incidente_tecnico.create", {
          incidente_id: primerIncidente.id,
          tecnico_id: tecnicoId,
          es_principal: true,
        } as any);
      }

      // 2) Actualizar estado del incidente (NO usar propietario_id: FK apunta a propietarios)
      await apiBackendAction("incidentes.update", {
        id: primerIncidente.id,
        data: {
          estado: "EN_DIAGNOSTICO",
          updated_at: new Date().toISOString(),
        },
      } as any);

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {grupos.map((grupo) => {
            const incidentesGrupo = getIncidentesPorGrupo(grupo);
            const count = incidentesGrupo.length;
            const hasItems = count > 0;

            return (
              <Card
                key={grupo.id}
                className={`relative overflow-hidden transition-all ${
                  hasItems
                    ? "bg-green-50 border-l-4 border-l-green-500 border-green-200 cursor-pointer hover:bg-green-100"
                    : "bg-white border border-gray-200"
                }`}
                onClick={() => hasItems && handleAsignarPrimero(grupo)}
              >
                <CardContent className="p-4">
                  {/* Header with name and eye icon */}
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold text-base ${hasItems ? "text-gray-800" : "text-gray-500"}`}>
                      {grupo.nombre}
                    </h3>
                    {hasItems && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGrupo(grupo);
                          setDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Toca para asignarme text */}
                  {hasItems && (
                    <p className="text-xs text-green-600 mb-3">Toca para asignarme</p>
                  )}

                  {/* Queue count badge and plus button */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        hasItems ? "bg-green-500 text-white font-medium" : "text-gray-400"
                      }`}
                    >
                      {count} en cola
                    </span>
                    {hasItems && (
                      <span className="h-6 w-6 bg-green-500 text-white rounded-full flex items-center justify-center">
                        <Plus className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para ver incidentes de un grupo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {selectedGrupo?.nombre} - Incidentes en cola
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {selectedGrupo && getIncidentesPorGrupo(selectedGrupo).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay incidentes pendientes en esta cola
              </p>
            ) : (
              selectedGrupo &&
              getIncidentesPorGrupo(selectedGrupo).map((inc, index) => {
                const dias = inc.created_at
                  ? Math.floor(
                      (Date.now() - new Date(inc.created_at).getTime()) / (1000 * 60 * 60 * 24)
                    )
                  : 0;
                const esPrimero = index === 0;

                return (
                  <div
                    key={inc.id}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      esPrimero
                        ? "bg-primary/10 border-primary/30"
                        : "bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate">{inc.codigo}</span>
                        {esPrimero && (
                          <Badge variant="default" className="text-xs shrink-0">
                            Siguiente
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {inc.descripcion_problema || "Sin descripción"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {dias}d
                      </div>
                      {esPrimero && canTakeMoreAssignments && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setDialogOpen(false);
                            handleAsignarPrimero(selectedGrupo);
                          }}
                        >
                          Asignarme
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
