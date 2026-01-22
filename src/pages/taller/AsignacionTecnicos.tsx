import { useState, useEffect } from "react";
import { apiBackendAction } from "@/lib/api-backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, FolderTree, X, Save } from "lucide-react";
import { toast } from "sonner";

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
      // Fetch familias abuelas using apiBackendAction
      const familiasResult = await apiBackendAction("familias_producto.list", {});
      const familiasData = (familiasResult.results || []).filter((f: any) => f.parent_id === null);

      // Fetch users with taller role using apiBackendAction
      const usuariosResult = await apiBackendAction("usuarios.list", {});
      const usuariosData = (usuariosResult.results || [])
        .filter((u: any) => u.rol === "tecnico" && u.activo);

      setTecnicos(usuariosData.map((u: any) => ({
        id: u.id,
        nombre: u.nombre || "",
        apellido: u.apellido || "",
        email: u.email || ""
      })));

      // Fetch centros de servicio using apiBackendAction
      const centrosResult = await apiBackendAction("centros_de_servicio.list", {});
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
      const result = await apiBackendAction("configuracion_fifo_centro.list", { 
        centro_servicio_id: Number(selectedCentro), 
        activo: true 
      });

      // Map to our interface
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

      await apiBackendAction("configuracion_fifo_centro.create", {
        updated_by: userId,
        familia_abuelo_id: familiaId,
        centro_servicio_id: Number(selectedCentro),
        activo: true,
        orden: asignaciones.length + 1
      });

      toast.success("Técnico asignado correctamente");
      fetchAsignaciones();
    } catch (error: any) {
      console.error("Error asignando técnico:", error);
      toast.error(error.message || "Error al asignar técnico");
    }
  };

  const handleRemover = async (asignacionId: number) => {
    try {
      await apiBackendAction("configuracion_fifo_centro.update", {
        id: asignacionId,
        data: { activo: false }
      });

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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Asignación de Técnicos a Familias</h1>
          <p className="text-muted-foreground">
            Asigna técnicos a las diferentes familias de productos
          </p>
        </div>
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Técnicos Disponibles</p>
                <p className="text-2xl font-bold">{tecnicos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/10 rounded-full">
                <FolderTree className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Familias de Productos</p>
                <p className="text-2xl font-bold">{familias.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <Save className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Asignaciones Activas</p>
                <p className="text-2xl font-bold">{asignaciones.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de familias con técnicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {familias.map((familia) => {
          const tecnicosAsignados = getTecnicosForFamilia(familia.id);
          const tecnicosDisponibles = getTecnicosNoAsignados(familia.id);

          return (
            <Card key={familia.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-primary" />
                  {familia.nombre}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Técnicos asignados */}
                <div className="space-y-2">
                  {tecnicosAsignados.length > 0 ? (
                    tecnicosAsignados.map((tec: any) => (
                      <div
                        key={tec.id}
                        className="flex items-center justify-between p-2 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {tec.nombre} {tec.apellido}
                          </p>
                          <p className="text-xs text-muted-foreground">{tec.email}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemover(tec.asignacionId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Sin técnicos asignados
                    </p>
                  )}
                </div>

                {/* Agregar técnico */}
                {tecnicosDisponibles.length > 0 && (
                  <Select
                    onValueChange={(userId) => handleAsignar(Number(userId), familia.id)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Agregar técnico..." />
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
