import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, GripVertical, ArrowUp, ArrowDown, Save, RotateCcw, Plus, Trash2, Edit2, Layers, FolderPlus, Check, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";

interface FamiliaAbuelo {
  id: number;
  Categoria: string;
}

interface GrupoColaFifo {
  id?: string;
  nombre: string;
  orden: number;
  activo: boolean;
  color?: string;
  familias: number[]; // Array of familia_abuelo_id
}

interface CentroServicio {
  id: string;
  nombre: string;
}

const COLORES_DISPONIBLES = [
  { value: "blue", label: "Azul", class: "bg-blue-500" },
  { value: "green", label: "Verde", class: "bg-green-500" },
  { value: "orange", label: "Naranja", class: "bg-orange-500" },
  { value: "purple", label: "Morado", class: "bg-purple-500" },
  { value: "red", label: "Rojo", class: "bg-red-500" },
  { value: "yellow", label: "Amarillo", class: "bg-yellow-500" },
  { value: "pink", label: "Rosa", class: "bg-pink-500" },
  { value: "teal", label: "Turquesa", class: "bg-teal-500" },
];

export default function ConfiguracionColas() {
  const { user } = useAuth();
  const [familias, setFamilias] = useState<FamiliaAbuelo[]>([]);
  const [grupos, setGrupos] = useState<GrupoColaFifo[]>([]);
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [selectedCentro, setSelectedCentro] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Dialog states
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [showEditGroupDialog, setShowEditGroupDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GrupoColaFifo | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("blue");
  const [selectedFamilias, setSelectedFamilias] = useState<number[]>([]);
  const [copyFromCentro, setCopyFromCentro] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [familiasRes, centrosRes] = await Promise.all([
        supabase
          .from("CDS_Familias")
          .select("id, Categoria")
          .is("Padre", null)
          .order("Categoria"),
        supabase
          .from("centros_servicio")
          .select("id, nombre")
          .eq("activo", true)
          .order("nombre"),
      ]);

      setFamilias(familiasRes.data || []);
      setCentros(centrosRes.data || []);

      if (centrosRes.data && centrosRes.data.length > 0) {
        setSelectedCentro(centrosRes.data[0].id);
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
      // Fetch groups for this service center
      const { data: gruposData } = await supabase
        .from("grupos_cola_fifo")
        .select("*")
        .eq("centro_servicio_id", selectedCentro)
        .order("orden");

      if (gruposData && gruposData.length > 0) {
        // Fetch families for each group
        const { data: familiasGrupos } = await supabase
          .from("grupos_cola_fifo_familias")
          .select("grupo_id, familia_abuelo_id")
          .in("grupo_id", gruposData.map((g) => g.id));

        const gruposConFamilias = gruposData.map((grupo) => ({
          id: grupo.id,
          nombre: grupo.nombre,
          orden: grupo.orden,
          activo: grupo.activo,
          color: grupo.color,
          familias: (familiasGrupos || [])
            .filter((fg) => fg.grupo_id === grupo.id)
            .map((fg) => fg.familia_abuelo_id),
        }));

        setGrupos(gruposConFamilias);
      } else {
        setGrupos([]);
      }
      setHasChanges(false);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Get families that are not assigned to any group
  const familiasDisponibles = familias.filter(
    (f) => !grupos.some((g) => g.familias.includes(f.id))
  );

  const moveGroup = (index: number, direction: "up" | "down") => {
    const newGrupos = [...grupos];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newGrupos.length) return;

    [newGrupos[index], newGrupos[newIndex]] = [newGrupos[newIndex], newGrupos[index]];
    newGrupos.forEach((item, idx) => {
      item.orden = idx + 1;
    });

    setGrupos(newGrupos);
    setHasChanges(true);
  };

  const toggleGrupoActivo = (index: number) => {
    const newGrupos = [...grupos];
    newGrupos[index].activo = !newGrupos[index].activo;
    setGrupos(newGrupos);
    setHasChanges(true);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast.error("El nombre del grupo es requerido");
      return;
    }

    if (selectedFamilias.length === 0) {
      toast.error("Selecciona al menos una familia");
      return;
    }

    const nuevoGrupo: GrupoColaFifo = {
      nombre: newGroupName.trim(),
      orden: grupos.length + 1,
      activo: true,
      color: newGroupColor,
      familias: selectedFamilias,
    };

    setGrupos([...grupos, nuevoGrupo]);
    setShowNewGroupDialog(false);
    setNewGroupName("");
    setNewGroupColor("blue");
    setSelectedFamilias([]);
    setHasChanges(true);
    toast.success("Grupo creado");
  };

  const handleEditGroup = () => {
    if (!editingGroup || !newGroupName.trim()) return;

    const newGrupos = grupos.map((g) =>
      g === editingGroup
        ? { ...g, nombre: newGroupName.trim(), color: newGroupColor, familias: selectedFamilias }
        : g
    );

    setGrupos(newGrupos);
    setShowEditGroupDialog(false);
    setEditingGroup(null);
    setNewGroupName("");
    setNewGroupColor("blue");
    setSelectedFamilias([]);
    setHasChanges(true);
    toast.success("Grupo actualizado");
  };

  const openEditDialog = (grupo: GrupoColaFifo) => {
    setEditingGroup(grupo);
    setNewGroupName(grupo.nombre);
    setNewGroupColor(grupo.color || "blue");
    setSelectedFamilias(grupo.familias);
    setShowEditGroupDialog(true);
  };

  const handleDeleteGroup = (index: number) => {
    const newGrupos = grupos.filter((_, i) => i !== index);
    newGrupos.forEach((item, idx) => {
      item.orden = idx + 1;
    });
    setGrupos(newGrupos);
    setHasChanges(true);
    toast.success("Grupo eliminado");
  };

  const handleCopyFromCentro = async () => {
    if (!copyFromCentro) return;

    try {
      const { data: gruposData } = await supabase
        .from("grupos_cola_fifo")
        .select("*")
        .eq("centro_servicio_id", copyFromCentro)
        .order("orden");

      if (!gruposData || gruposData.length === 0) {
        toast.error("El centro seleccionado no tiene configuración");
        return;
      }

      const { data: familiasGrupos } = await supabase
        .from("grupos_cola_fifo_familias")
        .select("grupo_id, familia_abuelo_id")
        .in("grupo_id", gruposData.map((g) => g.id));

      const gruposCopiados = gruposData.map((grupo) => ({
        nombre: grupo.nombre,
        orden: grupo.orden,
        activo: grupo.activo,
        color: grupo.color,
        familias: (familiasGrupos || [])
          .filter((fg) => fg.grupo_id === grupo.id)
          .map((fg) => fg.familia_abuelo_id),
      }));

      setGrupos(gruposCopiados);
      setShowCopyDialog(false);
      setCopyFromCentro("");
      setHasChanges(true);
      toast.success("Configuración copiada");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al copiar configuración");
    }
  };

  const handleSave = async () => {
    if (!selectedCentro || !user) return;

    setSaving(true);
    try {
      // Delete existing groups and their families (CASCADE will handle families)
      await supabase
        .from("grupos_cola_fifo")
        .delete()
        .eq("centro_servicio_id", selectedCentro);

      // Insert new groups
      for (const grupo of grupos) {
        const { data: grupoInserted, error: grupoError } = await supabase
          .from("grupos_cola_fifo")
          .insert({
            centro_servicio_id: selectedCentro,
            nombre: grupo.nombre,
            orden: grupo.orden,
            activo: grupo.activo,
            color: grupo.color,
            updated_by: user.id,
          })
          .select()
          .single();

        if (grupoError) throw grupoError;

        // Insert families for this group
        if (grupo.familias.length > 0) {
          const { error: familiasError } = await supabase
            .from("grupos_cola_fifo_familias")
            .insert(
              grupo.familias.map((familiaId) => ({
                grupo_id: grupoInserted.id,
                familia_abuelo_id: familiaId,
              }))
            );

          if (familiasError) throw familiasError;
        }
      }

      toast.success("Configuración guardada correctamente");
      setHasChanges(false);
      fetchConfiguracion(); // Refresh to get IDs
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

  const getColorClass = (color?: string) => {
    return COLORES_DISPONIBLES.find((c) => c.value === color)?.class || "bg-gray-500";
  };

  const toggleFamiliaSelection = (familiaId: number) => {
    setSelectedFamilias((prev) =>
      prev.includes(familiaId)
        ? prev.filter((id) => id !== familiaId)
        : [...prev, familiaId]
    );
  };

  // Get available families for dialog (not in other groups + currently selected)
  const getFamiliasForDialog = (isEdit: boolean) => {
    const familiasEnOtrosGrupos = grupos
      .filter((g) => !isEdit || g !== editingGroup)
      .flatMap((g) => g.familias);
    return familias.filter((f) => !familiasEnOtrosGrupos.includes(f.id));
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
            Crea grupos de familias para organizar las colas de reparación
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
      <div className="flex flex-wrap gap-2">
        {hasChanges && (
          <>
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
          </>
        )}
        <Button variant="outline" onClick={() => setShowCopyDialog(true)}>
          <Copy className="h-4 w-4 mr-2" />
          Copiar de otro centro
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">¿Cómo funciona?</h3>
              <p className="text-sm text-muted-foreground">
                Crea grupos para organizar las familias de productos. Puedes agrupar varias familias
                relacionadas (ej: "2 tiempos" y "4 tiempos" en un grupo "Motores"). Los incidentes
                de todas las familias del grupo aparecerán juntos en la cola de reparación. Las familias
                no asignadas a ningún grupo no aparecerán en la cola.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Familias disponibles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" />
              Familias Disponibles
            </CardTitle>
            <CardDescription>
              {familiasDisponibles.length} familias sin asignar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {familiasDisponibles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Todas las familias están asignadas a grupos
              </p>
            ) : (
              <div className="space-y-2">
                {familiasDisponibles.map((familia) => (
                  <div
                    key={familia.id}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                  >
                    <Badge variant="outline">{familia.Categoria}</Badge>
                  </div>
                ))}
                <Button
                  className="w-full mt-4"
                  onClick={() => {
                    setSelectedFamilias([]);
                    setNewGroupName("");
                    setNewGroupColor("blue");
                    setShowNewGroupDialog(true);
                  }}
                  disabled={familiasDisponibles.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear grupo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grupos de cola */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Grupos de Cola ({grupos.length})
            </CardTitle>
            <CardDescription>
              Ordena los grupos según la prioridad de atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            {grupos.length === 0 ? (
              <div className="text-center py-8">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No hay grupos configurados</p>
                <p className="text-sm text-muted-foreground">
                  Crea grupos para organizar las familias
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {grupos.map((grupo, index) => (
                  <div
                    key={grupo.id || `new-${index}`}
                    className={`p-4 rounded-lg border transition-colors ${
                      grupo.activo
                        ? "bg-card border-border"
                        : "bg-muted/50 border-muted opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Orden */}
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {grupo.orden}
                      </div>

                      {/* Color indicator */}
                      <div className={`w-3 h-8 rounded-full ${getColorClass(grupo.color)}`} />

                      {/* Grip icon */}
                      <GripVertical className="h-5 w-5 text-muted-foreground" />

                      {/* Group info */}
                      <div className="flex-1">
                        <p className="font-medium">{grupo.nombre}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {grupo.familias.map((familiaId) => (
                            <Badge key={familiaId} variant="secondary" className="text-xs">
                              {getFamiliaName(familiaId)}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={grupo.activo ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleGrupoActivo(index)}
                        >
                          {grupo.activo ? "Activo" : "Inactivo"}
                        </Badge>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(grupo)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteGroup(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className="flex gap-1 ml-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={index === 0}
                            onClick={() => moveGroup(index, "up")}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={index === grupos.length - 1}
                            onClick={() => moveGroup(index, "down")}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Crear grupo */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear nuevo grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre del grupo</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ej: Motores de Combustión"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLORES_DISPONIBLES.map((color) => (
                  <button
                    key={color.value}
                    className={`w-8 h-8 rounded-full ${color.class} flex items-center justify-center transition-transform ${
                      newGroupColor === color.value ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                    }`}
                    onClick={() => setNewGroupColor(color.value)}
                  >
                    {newGroupColor === color.value && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Selecciona las familias</label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 mt-2 space-y-1">
                {getFamiliasForDialog(false).map((familia) => (
                  <div
                    key={familia.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${
                      selectedFamilias.includes(familia.id) ? "bg-primary/10" : ""
                    }`}
                    onClick={() => toggleFamiliaSelection(familia.id)}
                  >
                    <Checkbox checked={selectedFamilias.includes(familia.id)} />
                    <span>{familia.Categoria}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroupDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGroup}>
              <Plus className="h-4 w-4 mr-2" />
              Crear grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar grupo */}
      <Dialog open={showEditGroupDialog} onOpenChange={setShowEditGroupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre del grupo</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ej: Motores de Combustión"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLORES_DISPONIBLES.map((color) => (
                  <button
                    key={color.value}
                    className={`w-8 h-8 rounded-full ${color.class} flex items-center justify-center transition-transform ${
                      newGroupColor === color.value ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                    }`}
                    onClick={() => setNewGroupColor(color.value)}
                  >
                    {newGroupColor === color.value && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Familias en este grupo</label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 mt-2 space-y-1">
                {getFamiliasForDialog(true).map((familia) => (
                  <div
                    key={familia.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${
                      selectedFamilias.includes(familia.id) ? "bg-primary/10" : ""
                    }`}
                    onClick={() => toggleFamiliaSelection(familia.id)}
                  >
                    <Checkbox checked={selectedFamilias.includes(familia.id)} />
                    <span>{familia.Categoria}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditGroupDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditGroup}>
              <Check className="h-4 w-4 mr-2" />
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Copiar de otro centro */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar configuración</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona un centro de servicio para copiar su configuración de colas.
              Esto reemplazará la configuración actual.
            </p>
            <Select value={copyFromCentro} onValueChange={setCopyFromCentro}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar centro" />
              </SelectTrigger>
              <SelectContent>
                {centros
                  .filter((c) => c.id !== selectedCentro)
                  .map((centro) => (
                    <SelectItem key={centro.id} value={centro.id}>
                      {centro.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCopyFromCentro} disabled={!copyFromCentro}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
