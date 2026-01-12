import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, GripVertical, Save, RotateCcw, Plus, Trash2, Edit2, Layers, FolderPlus, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  familias: number[];
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

// Sortable Group Component
interface SortableGrupoProps {
  grupo: GrupoColaFifo;
  index: number;
  onToggleActivo: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getColorClass: (color?: string) => string;
  getFamiliaName: (id: number) => string;
  getNombreMostrado: (grupo: GrupoColaFifo) => string;
}

function SortableGrupo({
  grupo,
  index,
  onToggleActivo,
  onEdit,
  onDelete,
  getColorClass,
  getFamiliaName,
  getNombreMostrado,
}: SortableGrupoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: grupo.id || `temp-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 rounded-lg border transition-all ${
        isDragging
          ? "opacity-50 scale-[1.02] shadow-lg z-50 bg-card"
          : grupo.activo
          ? "bg-card border-border"
          : "bg-muted/50 border-muted opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Orden */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
          {grupo.orden}
        </div>

        {/* Color indicator */}
        <div className={`w-3 h-8 rounded-full ${getColorClass(grupo.color)}`} />

        {/* Grip icon - drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Group info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{getNombreMostrado(grupo)}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {grupo.familias.map((familiaId) => (
              <Badge key={familiaId} variant="secondary" className="text-xs">
                {getFamiliaName(familiaId)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            variant={grupo.activo ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={onToggleActivo}
          >
            {grupo.activo ? "Activo" : "Inactivo"}
          </Badge>

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      const { data: gruposData } = await supabase
        .from("grupos_cola_fifo")
        .select("*")
        .eq("centro_servicio_id", selectedCentro)
        .order("orden");

      if (gruposData && gruposData.length > 0) {
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

  const getFamiliaName = (familiaId: number) => {
    return familias.find((f) => f.id === familiaId)?.Categoria || "Desconocida";
  };

  // Get display name for a group (uses family names if no custom name)
  const getNombreMostrado = (grupo: GrupoColaFifo): string => {
    if (grupo.nombre && grupo.nombre.trim()) {
      return grupo.nombre;
    }
    if (grupo.familias.length === 0) {
      return "Sin familias";
    }
    if (grupo.familias.length === 1) {
      return getFamiliaName(grupo.familias[0]);
    }
    return grupo.familias.map((id) => getFamiliaName(id)).join(" + ");
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = grupos.findIndex(
        (g) => (g.id || `temp-${grupos.indexOf(g)}`) === active.id
      );
      const newIndex = grupos.findIndex(
        (g) => (g.id || `temp-${grupos.indexOf(g)}`) === over.id
      );

      const newGrupos = arrayMove(grupos, oldIndex, newIndex);
      newGrupos.forEach((g, idx) => {
        g.orden = idx + 1;
      });

      setGrupos(newGrupos);
      setHasChanges(true);
    }
  };

  const toggleGrupoActivo = (index: number) => {
    const newGrupos = [...grupos];
    newGrupos[index].activo = !newGrupos[index].activo;
    setGrupos(newGrupos);
    setHasChanges(true);
  };

  // Get next available color
  const getNextColor = (): string => {
    const usedColors = grupos.map((g) => g.color);
    const available = COLORES_DISPONIBLES.find((c) => !usedColors.includes(c.value));
    return available?.value || COLORES_DISPONIBLES[grupos.length % COLORES_DISPONIBLES.length].value;
  };

  // Quick create a group with a single family
  const handleQuickCreateGroup = (familia: FamiliaAbuelo) => {
    const nuevoGrupo: GrupoColaFifo = {
      nombre: "", // Empty - will use family name
      orden: grupos.length + 1,
      activo: true,
      color: getNextColor(),
      familias: [familia.id],
    };

    setGrupos([...grupos, nuevoGrupo]);
    setHasChanges(true);
    toast.success(`Grupo "${familia.Categoria}" creado`);
  };

  const handleCreateGroup = () => {
    if (selectedFamilias.length === 0) {
      toast.error("Selecciona al menos una familia");
      return;
    }

    const nuevoGrupo: GrupoColaFifo = {
      nombre: newGroupName.trim(), // Can be empty
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
    if (!editingGroup) return;
    
    if (selectedFamilias.length === 0) {
      toast.error("Selecciona al menos una familia");
      return;
    }

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
      await supabase
        .from("grupos_cola_fifo")
        .delete()
        .eq("centro_servicio_id", selectedCentro);

      for (const grupo of grupos) {
        // Use getNombreMostrado for saving if nombre is empty
        const nombreGuardar = grupo.nombre.trim() || getNombreMostrado(grupo);
        
        const { data: grupoInserted, error: grupoError } = await supabase
          .from("grupos_cola_fifo")
          .insert({
            centro_servicio_id: selectedCentro,
            nombre: nombreGuardar,
            orden: grupo.orden,
            activo: grupo.activo,
            color: grupo.color,
            updated_by: user.id,
          })
          .select()
          .single();

        if (grupoError) throw grupoError;

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
      fetchConfiguracion();
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
                relacionadas o crear un grupo con una sola familia. Arrastra y suelta los grupos
                para cambiar su prioridad. El nombre es opcional - si no lo proporcionas, se usará
                el nombre de la familia automáticamente.
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
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <Badge variant="outline">{familia.Categoria}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleQuickCreateGroup(familia)}
                      title="Crear grupo con esta familia"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => {
                    setSelectedFamilias([]);
                    setNewGroupName("");
                    setNewGroupColor(getNextColor());
                    setShowNewGroupDialog(true);
                  }}
                  disabled={familiasDisponibles.length === 0}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Crear grupo con varias familias
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
              Arrastra los grupos para cambiar su prioridad
            </CardDescription>
          </CardHeader>
          <CardContent>
            {grupos.length === 0 ? (
              <div className="text-center py-8">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No hay grupos configurados</p>
                <p className="text-sm text-muted-foreground">
                  Haz clic en + junto a una familia para crear un grupo
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={grupos.map((g, i) => g.id || `temp-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {grupos.map((grupo, index) => (
                      <SortableGrupo
                        key={grupo.id || `temp-${index}`}
                        grupo={grupo}
                        index={index}
                        onToggleActivo={() => toggleGrupoActivo(index)}
                        onEdit={() => openEditDialog(grupo)}
                        onDelete={() => handleDeleteGroup(index)}
                        getColorClass={getColorClass}
                        getFamiliaName={getFamiliaName}
                        getNombreMostrado={getNombreMostrado}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
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
              <label className="text-sm font-medium">Nombre del grupo (opcional)</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Dejar vacío para usar nombre de familias"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si no proporcionas un nombre, se usará el nombre de las familias seleccionadas
              </p>
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
            <Button onClick={handleCreateGroup} disabled={selectedFamilias.length === 0}>
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
              <label className="text-sm font-medium">Nombre del grupo (opcional)</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Dejar vacío para usar nombre de familias"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si no proporcionas un nombre, se usará el nombre de las familias seleccionadas
              </p>
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
            <Button onClick={handleEditGroup} disabled={selectedFamilias.length === 0}>
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
