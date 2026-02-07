import { useState, useEffect } from "react";
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
import { mycsapi } from "@/mics-api";

interface FamiliaAbuelo {
  id: number;
  nombre: string;
}

interface GrupoColaFifo {
  id?: number;
  nombre: string;
  orden: number;
  activo: boolean;
  color?: string;
  familias: number[];
}

interface CentroServicio {
  id: number;
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
      // Use apiBackendAction for familias_producto and centros_de_servicio
      const [familiasResponse, centrosResponse] = await Promise.all([
        mycsapi.get("/api/v1/familias-producto", {}),
        mycsapi.get("/api/v1/centros-de-servicio", {}),
      ]);

      setFamilias(
        familiasResponse.results.map((f) => ({ id: f.id, nombre: f.nombre }))
      );
      
      const centrosData = (centrosResponse as any).items || [];
      setCentros(centrosData.map((c: any) => ({ id: c.id, nombre: c.nombre })));

      if (centrosData.length > 0) {
        setSelectedCentro(String(centrosData[0].id));
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
      // Use apiBackendAction for grupos_cola_fifo
      const gruposResponse = await mycsapi.get("/api/v1/grupos-cola-fifo", {}) as any;
      const allGrupos = gruposResponse.results;
      
      // Filter by selected centro
      const gruposDelCentro = allGrupos.filter(
        (g) => g.centro_servicio_id === Number(selectedCentro)
      );

      if (gruposDelCentro.length > 0) {
        // Use apiBackendAction for grupos_cola_fifo_familias
        const grupoIds = gruposDelCentro.map((g) => g.id);
        const familiasArrays = await Promise.all(
          grupoIds.map(gid => mycsapi.get("/api/v1/grupos-cola-fifo/{grupo_id}/familias", { path: { grupo_id: gid } }).catch(() => ({ results: [] })))
        );
        const familiasGrupos = familiasArrays.flatMap(r => (r as any).results || (r as any).data || []);

        const gruposConFamilias: GrupoColaFifo[] = gruposDelCentro
          .sort((a, b) => a.orden - b.orden)
          .map((grupo) => ({
            id: grupo.id,
            nombre: grupo.nombre,
            orden: grupo.orden,
            activo: grupo.activo ?? true,
            color: grupo.color || undefined,
            familias: familiasGrupos
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
    return familias.find((f) => f.id === familiaId)?.nombre || "Desconocida";
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

  const getColorClass = (color?: string): string => {
    const colorObj = COLORES_DISPONIBLES.find((c) => c.value === color);
    return colorObj?.class || "bg-gray-500";
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
    const available = COLORES_DISPONIBLES.find(
      (c) => !usedColors.includes(c.value)
    );
    return (
      available?.value ||
      COLORES_DISPONIBLES[grupos.length % COLORES_DISPONIBLES.length].value
    );
  };

  // Quick create a group with a single family
  const handleQuickCreateGroup = (familia: FamiliaAbuelo) => {
    const nuevoGrupo: GrupoColaFifo = {
      nombre: "",
      orden: grupos.length + 1,
      activo: true,
      color: getNextColor(),
      familias: [familia.id],
    };

    setGrupos([...grupos, nuevoGrupo]);
    setHasChanges(true);
    toast.success(`Grupo "${familia.nombre}" creado`);
  };

  const handleCreateGroup = () => {
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
    if (!editingGroup) return;

    if (selectedFamilias.length === 0) {
      toast.error("Selecciona al menos una familia");
      return;
    }

    const newGrupos = grupos.map((g) =>
      g === editingGroup
        ? {
            ...g,
            nombre: newGroupName.trim(),
            color: newGroupColor,
            familias: selectedFamilias,
          }
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
      // Use apiBackendAction for fetching grupos from source centro
      const gruposResponse = await mycsapi.get("/api/v1/grupos-cola-fifo", {}) as any;
      const gruposDelCentro = gruposResponse.results.filter(
        (g) => g.centro_servicio_id === Number(copyFromCentro)
      );

      if (gruposDelCentro.length === 0) {
        toast.error("El centro seleccionado no tiene configuración");
        return;
      }

      // Use apiBackendAction for fetching familias asociadas
      const grupoIds = gruposDelCentro.map((g) => g.id);
      const familiasArrays = await Promise.all(
        grupoIds.map(gid => mycsapi.get("/api/v1/grupos-cola-fifo/{grupo_id}/familias", { path: { grupo_id: gid } }).catch(() => ({ results: [] })))
      );
      const familiasGrupos = familiasArrays.flatMap(r => (r as any).results || (r as any).data || []);

      const gruposCopiados: GrupoColaFifo[] = gruposDelCentro
        .sort((a, b) => a.orden - b.orden)
        .map((grupo) => ({
          nombre: grupo.nombre,
          orden: grupo.orden,
          activo: grupo.activo ?? true,
          color: grupo.color || undefined,
          familias: familiasGrupos
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

  // Save configuration using apiBackendAction
  const handleSave = async () => {
    if (!selectedCentro) {
      toast.error("Selecciona un centro de servicio");
      return;
    }

    setSaving(true);
    try {
      // First, fetch existing grupos for this centro and delete them
      const existingGruposResponse = await mycsapi.get("/api/v1/grupos-cola-fifo", {}) as any;
      const gruposToDelete = existingGruposResponse.results.filter(
        (g) => g.centro_servicio_id === Number(selectedCentro)
      );

      // Delete existing grupos (cascade will handle familias)
      for (const grupo of gruposToDelete) {
        await mycsapi.delete("/api/v1/grupos-cola-fifo/{grupo_cola_fifo_id}", { path: { grupo_cola_fifo_id: grupo.id } }) as any;
      }

      // Insert new groups and their families
      for (const grupo of grupos) {
        const nombreGuardar = grupo.nombre.trim() || getNombreMostrado(grupo);

        const grupoInserted = await mycsapi.post("/api/v1/grupos-cola-fifo", { body: {
          centro_servicio_id: Number(selectedCentro),
          nombre: nombreGuardar,
          orden: grupo.orden,
          activo: grupo.activo,
          color: grupo.color || null,
        } }) as any;

        // Insert familia associations
        for (const familiaId of grupo.familias) {
          await mycsapi.post("/api/v1/grupos-cola-fifo/{grupo_id}/familias", { path: { grupo_id: grupoInserted.id }, body: {
            grupo_id: grupoInserted.id,
            familia_abuelo_id: familiaId,
          } as any }) as any;
        }
      }

      toast.success("Configuración guardada correctamente");
      setHasChanges(false);
      fetchConfiguracion();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar configuración");
    } finally {
      setSaving(false);
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Configuración de Colas FIFO
          </h1>
          <p className="text-muted-foreground">
            Configura el orden y agrupación de familias para cada centro de
            servicio
          </p>
        </div>
        <Select value={selectedCentro} onValueChange={setSelectedCentro}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar centro" />
          </SelectTrigger>
          <SelectContent>
            {centros.map((centro) => (
              <SelectItem key={centro.id} value={String(centro.id)}>
                {centro.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setShowNewGroupDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Grupo
        </Button>
        <Button variant="outline" onClick={() => setShowCopyDialog(true)}>
          <Copy className="h-4 w-4 mr-2" />
          Copiar de Otro Centro
        </Button>
        <Button
          variant="outline"
          onClick={fetchConfiguracion}
          disabled={!hasChanges}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Descartar Cambios
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar
        </Button>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups list */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Grupos de Cola ({grupos.length})
              </CardTitle>
              <CardDescription>
                Arrastra para reordenar. El orden determina la prioridad FIFO.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {grupos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay grupos configurados</p>
                  <p className="text-sm">
                    Agrega familias desde el panel derecho o crea un nuevo grupo
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
                    <div className="space-y-2">
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

        {/* Available families */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5" />
                Familias Disponibles
              </CardTitle>
              <CardDescription>
                Click para agregar como grupo individual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {familiasDisponibles.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Todas las familias están asignadas
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {familiasDisponibles.map((familia) => (
                    <Button
                      key={familia.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleQuickCreateGroup(familia)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {familia.nombre}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Group Dialog */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nombre (opcional)</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Se usará el nombre de las familias si está vacío"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <Select value={newGroupColor} onValueChange={setNewGroupColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLORES_DISPONIBLES.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${color.class}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Familias</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 mt-2">
                {familias.map((familia) => (
                  <div key={familia.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`familia-${familia.id}`}
                      checked={selectedFamilias.includes(familia.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFamilias([...selectedFamilias, familia.id]);
                        } else {
                          setSelectedFamilias(
                            selectedFamilias.filter((id) => id !== familia.id)
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor={`familia-${familia.id}`}
                      className="text-sm"
                    >
                      {familia.nombre}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewGroupDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateGroup}>
              <Check className="h-4 w-4 mr-2" />
              Crear Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEditGroupDialog} onOpenChange={setShowEditGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nombre (opcional)</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Se usará el nombre de las familias si está vacío"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <Select value={newGroupColor} onValueChange={setNewGroupColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLORES_DISPONIBLES.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${color.class}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Familias</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 mt-2">
                {familias.map((familia) => (
                  <div key={familia.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-familia-${familia.id}`}
                      checked={selectedFamilias.includes(familia.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFamilias([...selectedFamilias, familia.id]);
                        } else {
                          setSelectedFamilias(
                            selectedFamilias.filter((id) => id !== familia.id)
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor={`edit-familia-${familia.id}`}
                      className="text-sm"
                    >
                      {familia.nombre}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditGroupDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditGroup}>
              <Check className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy from Centro Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar Configuración</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Copiar desde</label>
            <Select value={copyFromCentro} onValueChange={setCopyFromCentro}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Seleccionar centro" />
              </SelectTrigger>
              <SelectContent>
                {centros
                  .filter((c) => String(c.id) !== selectedCentro)
                  .map((centro) => (
                    <SelectItem key={centro.id} value={String(centro.id)}>
                      {centro.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              Esto reemplazará la configuración actual
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCopyFromCentro} disabled={!copyFromCentro}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
