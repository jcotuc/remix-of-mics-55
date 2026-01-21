import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen,
  FolderPlus 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FamiliaProducto {
  id: number;
  nombre: string;
  parent_id: number | null;
  created_at: string;
}

interface TreeNode extends FamiliaProducto {
  children: TreeNode[];
  level: number;
}

export default function FamiliasProductos() {
  const queryClient = useQueryClient();
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FamiliaProducto | null>(null);
  const [itemToDelete, setItemToDelete] = useState<FamiliaProducto | null>(null);
  const [parentForNew, setParentForNew] = useState<number | null>(null);
  
  // Form state
  const [formNombre, setFormNombre] = useState("");
  const [formParentId, setFormParentId] = useState<string>("");

  // Query
  const { data: familias = [], isLoading } = useQuery({
    queryKey: ["familias-producto-all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("familias_producto")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return data as FamiliaProducto[];
    },
  });

  // Build tree structure
  const tree = useMemo(() => {
    const buildTree = (parentId: number | null, level: number): TreeNode[] => {
      return familias
        .filter((f) => f.parent_id === parentId)
        .map((f) => ({
          ...f,
          level,
          children: buildTree(f.id, level + 1),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    };
    return buildTree(null, 0);
  }, [familias]);

  // Get potential parents (exclude self and descendants)
  const getValidParents = (excludeId?: number): FamiliaProducto[] => {
    if (!excludeId) return familias;
    
    const getDescendantIds = (id: number): number[] => {
      const children = familias.filter((f) => f.parent_id === id);
      return [id, ...children.flatMap((c) => getDescendantIds(c.id))];
    };
    
    const excludeIds = new Set(getDescendantIds(excludeId));
    return familias.filter((f) => !excludeIds.has(f.id));
  };

  // Mutations
  const createFamilia = useMutation({
    mutationFn: async (data: { nombre: string; parent_id: number | null }) => {
      const { error } = await (supabase as any).from("familias_producto").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familias-producto-all"] });
      queryClient.invalidateQueries({ queryKey: ["familias-producto"] });
      toast.success("Familia creada exitosamente");
      closeDialog();
    },
    onError: () => toast.error("Error al crear familia"),
  });

  const updateFamilia = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { nombre: string; parent_id: number | null } }) => {
      const { error } = await (supabase as any).from("familias_producto").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familias-producto-all"] });
      queryClient.invalidateQueries({ queryKey: ["familias-producto"] });
      toast.success("Familia actualizada exitosamente");
      closeDialog();
    },
    onError: () => toast.error("Error al actualizar familia"),
  });

  const deleteFamilia = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await (supabase as any).from("familias_producto").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familias-producto-all"] });
      queryClient.invalidateQueries({ queryKey: ["familias-producto"] });
      toast.success("Familia eliminada exitosamente");
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      if (error.message?.includes("violates foreign key")) {
        toast.error("No se puede eliminar: hay registros que dependen de esta familia");
      } else {
        toast.error("Error al eliminar familia");
      }
    },
  });

  // Handlers
  const toggleNode = (id: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedNodes(new Set(familias.map((f) => f.id)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const openCreateDialog = (parentId: number | null = null) => {
    setEditingItem(null);
    setParentForNew(parentId);
    setFormNombre("");
    setFormParentId(parentId?.toString() || "");
    setDialogOpen(true);
  };

  const openEditDialog = (item: FamiliaProducto) => {
    setEditingItem(item);
    setParentForNew(null);
    setFormNombre(item.nombre);
    setFormParentId(item.parent_id?.toString() || "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setParentForNew(null);
    setFormNombre("");
    setFormParentId("");
  };

  const handleSubmit = () => {
    if (!formNombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    const data = {
      nombre: formNombre.trim(),
      parent_id: formParentId ? parseInt(formParentId) : null,
    };

    if (editingItem) {
      updateFamilia.mutate({ id: editingItem.id, data });
    } else {
      createFamilia.mutate(data);
    }
  };

  const confirmDelete = (item: FamiliaProducto) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (itemToDelete) {
      deleteFamilia.mutate(itemToDelete.id);
    }
  };

  // Render tree node
  const renderNode = (node: TreeNode) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const levelColors = [
      "border-l-primary",
      "border-l-blue-500",
      "border-l-green-500",
      "border-l-amber-500",
    ];

    return (
      <div key={node.id} className="select-none">
        <Collapsible open={isExpanded} onOpenChange={() => hasChildren && toggleNode(node.id)}>
          <div
            className={cn(
              "flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 group border-l-4",
              levelColors[node.level % levelColors.length]
            )}
            style={{ marginLeft: `${node.level * 24}px` }}
          >
            {hasChildren ? (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            ) : (
              <div className="w-6" />
            )}

            {isExpanded && hasChildren ? (
              <FolderOpen className="h-4 w-4 text-primary" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground" />
            )}

            <span className="flex-1 font-medium">{node.nombre}</span>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  openCreateDialog(node.id);
                }}
                title="Agregar subfamilia"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditDialog(node);
                }}
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDelete(node);
                }}
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <span className="text-xs text-muted-foreground">
              {hasChildren && `(${node.children.length})`}
            </span>
          </div>

          {hasChildren && (
            <CollapsibleContent>
              {node.children.map(renderNode)}
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8 text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Familias de Productos</h1>
          <p className="text-sm text-muted-foreground">
            {familias.length} familias en total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expandir todo
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Colapsar todo
          </Button>
          <Button onClick={() => openCreateDialog(null)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Familia Raíz
          </Button>
        </div>
      </div>

      {/* Tree View */}
      <div className="border rounded-lg p-4 bg-card">
        {tree.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay familias de productos registradas
          </div>
        ) : (
          <div className="space-y-1">{tree.map(renderNode)}</div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-l-4 border-l-primary" />
          <span>Nivel 1 (Abuelo)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-l-4 border-l-blue-500" />
          <span>Nivel 2 (Padre)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-l-4 border-l-green-500" />
          <span>Nivel 3 (Hijo)</span>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Familia" : "Nueva Familia"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                placeholder="Nombre de la familia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Familia Padre (opcional)</Label>
              <Select value={formParentId} onValueChange={setFormParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin padre (familia raíz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin padre (familia raíz)</SelectItem>
                  {getValidParents(editingItem?.id).map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingItem ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar familia?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete && (
                <>
                  Se eliminará <strong>{itemToDelete.nombre}</strong>.
                  {familias.some((f) => f.parent_id === itemToDelete.id) && (
                    <span className="block mt-2 text-destructive">
                      ⚠️ Esta familia tiene subfamilias. Primero debe eliminar o reubicar las subfamilias.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
