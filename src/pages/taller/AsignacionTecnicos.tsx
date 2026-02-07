import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, FolderTree, X, Save, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { mycsapi } from "@/mics-api";
import {
  AlertBanner,
  MetricCard,
  ProgressBarWithLabel,
  WorkloadChart,
} from "@/components/shared/dashboard";

interface FamiliaAbuelo {
  id: number;
  nombre: string;
}

interface Tecnico {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

interface AsignacionTecnico {
  id: number;
  user_id: number;
  familia_abuelo_id: number;
  centro_servicio_id: number;
  activo: boolean;
}

interface CentroServicio {
  id: number;
  nombre: string;
}

export default function AsignacionTecnicos() {
  const [familias, setFamilias] = useState<FamiliaAbuelo[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionTecnico[]>([]);
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [selectedCentro, setSelectedCentro] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const familiasResult = await mycsapi.get("/api/v1/familias-producto", {}) as any;
      const familiasData = (familiasResult.results || []).filter((f: any) => f.parent_id === null);

      const usuariosResult = await mycsapi.get("/api/v1/usuarios/") as any;
      const usuariosData = (usuariosResult.results || [])
        .filter((u: any) => u.rol === "tecnico" && u.activo);

      setTecnicos(usuariosData.map((u: any) => ({
        id: u.id,
        nombre: u.nombre || "",
        apellido: u.apellido || "",
        email: u.email || ""
      })));

      const centrosResult = await mycsapi.get("/api/v1/centros-de-servicio", {}) as any;
      const centrosData = ((centrosResult as any).results || (centrosResult as any).data || []).filter((c: any) => c.activo);

      setCentros(centrosData.map((c: any) => ({
        id: c.id,
        nombre: c.nombre
      })));
      
      if (centrosData.length > 0) {
        setSelectedCentro(String(centrosData[0].id));
      }

      setFamilias(familiasData.map((f: any) => ({
        id: f.id,
        nombre: f.nombre
      })));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCentro) {
      fetchAsignaciones();
    }
  }, [selectedCentro]);

  const fetchAsignaciones = async () => {
    try {
      const result = await mycsapi.fetch("/api/v1/configuracion-fifo-centro", { method: "GET", query: { 
        centro_servicio_id: Number(selectedCentro), 
        activo: true 
      } }) as any;

      const mapped: AsignacionTecnico[] = ((result as any).results || []).map((d: any) => ({
        id: d.id,
        user_id: d.updated_by || 0,
        familia_abuelo_id: d.familia_abuelo_id,
        centro_servicio_id: d.centro_servicio_id,
        activo: d.activo
      }));

      setAsignaciones(mapped);
    } catch (error) {
      console.error("Error fetching asignaciones:", error);
    }
  };

  const handleAsignar = async (userId: number, familiaId: number) => {
    try {
      const exists = asignaciones.find(
        a => a.user_id === userId && a.familia_abuelo_id === familiaId
      );

      if (exists) {
        toast.info("Este técnico ya está asignado a esta familia");
        return;
      }

      await mycsapi.fetch("/api/v1/configuracion-fifo-centro", { method: "POST", body: {
        updated_by: userId,
        familia_abuelo_id: familiaId,
        centro_servicio_id: Number(selectedCentro),
        activo: true,
        orden: asignaciones.length + 1
      } }) as any;

      toast.success("Técnico asignado correctamente");
      fetchAsignaciones();
    } catch (error: any) {
      console.error("Error asignando técnico:", error);
      toast.error(error.message || "Error al asignar técnico");
    }
  };

  const handleRemover = async (asignacionId: number) => {
    try {
      await mycsapi.fetch("/api/v1/configuracion-fifo-centro/{id}".replace("{id}", String(asignacionId)), { method: "PATCH", body: { activo: false } as any }) as any;

      toast.success("Asignación removida");
      fetchAsignaciones();
    } catch (error) {
      console.error("Error removiendo asignación:", error);
      toast.error("Error al remover asignación");
    }
  };

  const getTecnicosForFamilia = (familiaId: number) => {
    const asignacionesFamilia = asignaciones.filter(a => a.familia_abuelo_id === familiaId);
    return asignacionesFamilia.map(a => {
      const tecnico = tecnicos.find(t => t.id === a.user_id);
      return tecnico ? { ...tecnico, asignacionId: a.id } : null;
    }).filter(Boolean);
  };

  const getTecnicosNoAsignados = (familiaId: number) => {
    const asignadosIds = asignaciones
      .filter(a => a.familia_abuelo_id === familiaId)
      .map(a => a.user_id);
    return tecnicos.filter(t => !asignadosIds.includes(t.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate metrics
  const familiasConTecnicos = familias.filter(f => getTecnicosForFamilia(f.id).length > 0).length;
  const familiasSinCobertura = familias.filter(f => getTecnicosForFamilia(f.id).length === 0);
  const utilizacion = familias.length > 0 ? Math.round((familiasConTecnicos / familias.length) * 100) : 0;

  // Workload data per technician
  const tecnicoWorkload = tecnicos.map(t => {
    const asignacionesCount = asignaciones.filter(a => a.user_id === t.id).length;
    return {
      name: `${t.nombre.split(' ')[0]} ${t.apellido?.charAt(0) || ''}`.trim(),
      value: asignacionesCount,
      max: familias.length
    };
  }).filter(t => t.value > 0).sort((a, b) => b.value - a.value);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Asignación de Técnicos</h1>
          <p className="text-muted-foreground">
            Configura qué técnicos atienden cada familia de productos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCentro} onValueChange={setSelectedCentro}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Seleccionar centro" />
            </SelectTrigger>
            <SelectContent>
              {centros.map(centro => (
                <SelectItem key={centro.id} value={String(centro.id)}>
                  {centro.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchAsignaciones}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alert for uncovered families */}
      {familiasSinCobertura.length > 0 && (
        <AlertBanner
          variant="warning"
          title={`${familiasSinCobertura.length} familia${familiasSinCobertura.length > 1 ? 's' : ''} sin técnicos asignados`}
          description={familiasSinCobertura.slice(0, 3).map(f => f.nombre).join(", ") + (familiasSinCobertura.length > 3 ? "..." : "")}
        />
      )}

      {/* Capacity Dashboard */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Capacidad del Equipo</h3>
                <p className="text-muted-foreground text-sm">
                  {tecnicos.length} técnicos disponibles • {asignaciones.length} asignaciones • {familias.length} familias
                </p>
              </div>
            </div>
            <div className="w-full md:w-64">
              <ProgressBarWithLabel
                value={familiasConTecnicos}
                max={familias.length}
                label="Cobertura"
                showPercentage
                size="lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Técnicos Activos"
          value={tecnicos.length}
          icon={<Users className="h-5 w-5" />}
          iconColor="bg-primary/10 text-primary"
        />
        <MetricCard
          title="Familias de Producto"
          value={familias.length}
          icon={<FolderTree className="h-5 w-5" />}
          iconColor="bg-blue-500/10 text-blue-500"
        />
        <MetricCard
          title="Familias Cubiertas"
          value={familiasConTecnicos}
          subtitle={`${utilizacion}% cobertura`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconColor="bg-green-500/10 text-green-500"
        />
        <MetricCard
          title="Sin Cobertura"
          value={familiasSinCobertura.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          iconColor="bg-orange-500/10 text-orange-500"
          alert={familiasSinCobertura.length > 0}
        />
      </div>

      {/* Workload Chart */}
      {tecnicoWorkload.length > 0 && (
        <WorkloadChart
          title="Carga de Trabajo por Técnico (Familias Asignadas)"
          data={tecnicoWorkload}
          maxValue={familias.length}
          height={Math.max(150, tecnicoWorkload.length * 35)}
          horizontal
        />
      )}

      {/* Assignment Matrix Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Matriz de Asignaciones
          </CardTitle>
          <CardDescription>
            Haz clic para asignar o eliminar técnicos de cada familia
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Grid de familias con técnicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {familias.map((familia) => {
          const tecnicosAsignados = getTecnicosForFamilia(familia.id);
          const tecnicosDisponibles = getTecnicosNoAsignados(familia.id);
          const hasTecnicos = tecnicosAsignados.length > 0;

          return (
            <Card 
              key={familia.id}
              className={!hasTecnicos ? "border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/10" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderTree className="h-4 w-4 text-primary" />
                    {familia.nombre}
                  </CardTitle>
                  <Badge variant={hasTecnicos ? "secondary" : "outline"} className={!hasTecnicos ? "text-orange-600" : ""}>
                    {tecnicosAsignados.length} técnico{tecnicosAsignados.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <ProgressBarWithLabel
                  value={tecnicosAsignados.length}
                  max={Math.max(3, tecnicosAsignados.length)}
                  size="sm"
                  colorByProgress={false}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Técnicos asignados */}
                <div className="space-y-2">
                  {tecnicosAsignados.length > 0 ? (
                    tecnicosAsignados.map((tec: any) => (
                      <div
                        key={tec.id}
                        className="flex items-center justify-between p-2 bg-muted rounded-lg group hover:bg-muted/80"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {tec.nombre} {tec.apellido}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{tec.email}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemover(tec.asignacionId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <p className="text-sm text-orange-700 dark:text-orange-400">
                        Sin técnicos asignados
                      </p>
                    </div>
                  )}
                </div>

                {/* Agregar técnico */}
                {tecnicosDisponibles.length > 0 && (
                  <Select
                    onValueChange={(userId) => handleAsignar(Number(userId), familia.id)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="+ Agregar técnico" />
                    </SelectTrigger>
                    <SelectContent>
                      {tecnicosDisponibles.map((tec) => (
                        <SelectItem key={tec.id} value={String(tec.id)}>
                          {tec.nombre} {tec.apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {familias.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No hay familias de productos configuradas</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
