import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, GripVertical, ArrowUp, ArrowDown, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface FamiliaAbuelo {
  id: number;
  Categoria: string;
}

interface ConfiguracionFifo {
  id?: string;
  familia_abuelo_id: number;
  orden: number;
  activo: boolean;
}

interface CentroServicio {
  id: string;
  nombre: string;
}

export default function ConfiguracionColas() {
  const { user } = useAuth();
  const [familias, setFamilias] = useState<FamiliaAbuelo[]>([]);
  const [configuracion, setConfiguracion] = useState<ConfiguracionFifo[]>([]);
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [selectedCentro, setSelectedCentro] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch familias abuelas
      const { data: familiasData } = await supabase
        .from("CDS_Familias")
        .select("id, Categoria")
        .is("Padre", null)
        .order("Categoria");

      // Fetch centros
      const { data: centrosData } = await supabase
        .from("centros_servicio")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");

      setFamilias(familiasData || []);
      setCentros(centrosData || []);

      if (centrosData && centrosData.length > 0) {
        setSelectedCentro(centrosData[0].id);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCentro) {
      fetchConfiguracion();
    }
  }, [selectedCentro]);

  const fetchConfiguracion = async () => {
    try {
      const { data } = await supabase
        .from("configuracion_fifo_centro")
        .select("*")
        .eq("centro_servicio_id", selectedCentro)
        .order("orden");

      if (data && data.length > 0) {
        setConfiguracion(data);
      } else {
        // Crear configuración inicial basada en familias
        const configInicial = familias.map((f, idx) => ({
          familia_abuelo_id: f.id,
          orden: idx + 1,
          activo: true,
        }));
        setConfiguracion(configInicial);
      }
      setHasChanges(false);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newConfig = [...configuracion];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newConfig.length) return;

    // Swap items
    [newConfig[index], newConfig[newIndex]] = [newConfig[newIndex], newConfig[index]];

    // Update orden
    newConfig.forEach((item, idx) => {
      item.orden = idx + 1;
    });

    setConfiguracion(newConfig);
    setHasChanges(true);
  };

  const toggleActivo = (index: number) => {
    const newConfig = [...configuracion];
    newConfig[index].activo = !newConfig[index].activo;
    setConfiguracion(newConfig);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedCentro || !user) return;

    setSaving(true);
    try {
      // Delete existing configuration
      await supabase
        .from("configuracion_fifo_centro")
        .delete()
        .eq("centro_servicio_id", selectedCentro);

      // Insert new configuration
      const { error } = await supabase
        .from("configuracion_fifo_centro")
        .insert(
          configuracion.map((config) => ({
            centro_servicio_id: selectedCentro,
            familia_abuelo_id: config.familia_abuelo_id,
            orden: config.orden,
            activo: config.activo,
            updated_by: user.id,
          }))
        );

      if (error) throw error;

      toast.success("Configuración guardada correctamente");
      setHasChanges(false);
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error(error.message || "Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchConfiguracion();
    toast.info("Cambios descartados");
  };

  const getFamiliaName = (familiaId: number) => {
    return familias.find((f) => f.id === familiaId)?.Categoria || "Desconocida";
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
          <h1 className="text-2xl font-bold text-foreground">Configuración de Colas FIFO</h1>
          <p className="text-muted-foreground">
            Ordena las familias según la prioridad de atención en el taller
          </p>
        </div>
        <Select value={selectedCentro} onValueChange={setSelectedCentro}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar centro" />
          </SelectTrigger>
          <SelectContent>
            {centros.map((centro) => (
              <SelectItem key={centro.id} value={centro.id}>
                {centro.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      {hasChanges && (
        <div className="flex gap-2 p-4 bg-muted rounded-lg">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar cambios
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Descartar
          </Button>
        </div>
      )}

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GripVertical className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">¿Cómo funciona?</h3>
              <p className="text-sm text-muted-foreground">
                Las familias en la posición más alta (orden menor) tendrán prioridad en la cola de atención.
                Las máquinas de estas familias se mostrarán primero en el Kanban de asignaciones.
                Puedes desactivar familias que no se atiendan en este centro.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista ordenable */}
      <Card>
        <CardHeader>
          <CardTitle>Orden de Familias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {configuracion.map((config, index) => (
              <div
                key={config.familia_abuelo_id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  config.activo
                    ? "bg-card border-border"
                    : "bg-muted/50 border-muted opacity-60"
                }`}
              >
                {/* Orden */}
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {config.orden}
                </div>

                {/* Grip icon */}
                <GripVertical className="h-5 w-5 text-muted-foreground" />

                {/* Familia name */}
                <div className="flex-1">
                  <p className="font-medium">{getFamiliaName(config.familia_abuelo_id)}</p>
                </div>

                {/* Status badge */}
                <Badge
                  variant={config.activo ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => toggleActivo(index)}
                >
                  {config.activo ? "Activa" : "Inactiva"}
                </Badge>

                {/* Move buttons */}
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={index === 0}
                    onClick={() => moveItem(index, "up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={index === configuracion.length - 1}
                    onClick={() => moveItem(index, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}