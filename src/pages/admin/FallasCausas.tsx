import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Plus, Pencil, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";

interface Falla {
  id: number;
  nombre: string;
  familia_id: number | null;
  created_at: string;
  familia?: { nombre: string } | null;
}

interface Causa {
  id: number;
  nombre: string;
  familia_id: number | null;
  created_at: string;
  familia?: { nombre: string } | null;
}

interface FamiliaProducto {
  id: number;
  nombre: string;
}

export default function FallasCausas() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("fallas");
  const [filtroFamilia, setFiltroFamilia] = useState<string>("all");
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Falla | Causa | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; type: "falla" | "causa" } | null>(null);
  
  // Form state
  const [formNombre, setFormNombre] = useState("");
  const [formFamiliaId, setFormFamiliaId] = useState<string>("");

  // Queries
  const { data: familias = [] } = useQuery({
    queryKey: ["familias-producto"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("familias_producto")
        .select("id, nombre")
        .order("nombre");
      if (error) throw error;
      return data as FamiliaProducto[];
    },
  });

  const { data: fallas = [], isLoading: loadingFallas } = useQuery({
    queryKey: ["fallas", filtroFamilia],
    queryFn: async () => {
      let query = (supabase as any)
        .from("fallas")
        .select("*, familia:familias_producto(nombre)")
        .order("nombre");
      
      if (filtroFamilia !== "all") {
        query = query.eq("familia_id", parseInt(filtroFamilia));
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Falla[];
    },
  });

  const { data: causas = [], isLoading: loadingCausas } = useQuery({
    queryKey: ["causas", filtroFamilia],
    queryFn: async () => {
      let query = (supabase as any)
        .from("causas")
        .select("*, familia:familias_producto(nombre)")
        .order("nombre");
      
      if (filtroFamilia !== "all") {
        query = query.eq("familia_id", parseInt(filtroFamilia));
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Causa[];
    },
  });

  // Mutations
  const createFalla = useMutation({
    mutationFn: async (data: { nombre: string; familia_id: number | null }) => {
      const { error } = await (supabase as any).from("fallas").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fallas"] });
      toast.success("Falla creada exitosamente");
      closeDialog();
    },
    onError: () => toast.error("Error al crear falla"),
  });

  const updateFalla = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { nombre: string; familia_id: number | null } }) => {
      const { error } = await (supabase as any).from("fallas").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fallas"] });
      toast.success("Falla actualizada exitosamente");
      closeDialog();
    },
    onError: () => toast.error("Error al actualizar falla"),
  });

  const deleteFalla = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await (supabase as any).from("fallas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fallas"] });
      toast.success("Falla eliminada exitosamente");
      setDeleteDialogOpen(false);
    },
    onError: () => toast.error("Error al eliminar falla"),
  });

  const createCausa = useMutation({
    mutationFn: async (data: { nombre: string; familia_id: number | null }) => {
      const { error } = await (supabase as any).from("causas").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["causas"] });
      toast.success("Causa creada exitosamente");
      closeDialog();
    },
    onError: () => toast.error("Error al crear causa"),
  });

  const updateCausa = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { nombre: string; familia_id: number | null } }) => {
      const { error } = await (supabase as any).from("causas").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["causas"] });
      toast.success("Causa actualizada exitosamente");
      closeDialog();
    },
    onError: () => toast.error("Error al actualizar causa"),
  });

  const deleteCausa = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await (supabase as any).from("causas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["causas"] });
      toast.success("Causa eliminada exitosamente");
      setDeleteDialogOpen(false);
    },
    onError: () => toast.error("Error al eliminar causa"),
  });

  // Handlers
  const openCreateDialog = () => {
    setEditingItem(null);
    setFormNombre("");
    setFormFamiliaId("");
    setDialogOpen(true);
  };

  const openEditDialog = (item: Falla | Causa) => {
    setEditingItem(item);
    setFormNombre(item.nombre);
    setFormFamiliaId(item.familia_id?.toString() || "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormNombre("");
    setFormFamiliaId("");
  };

  const handleSubmit = () => {
    if (!formNombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    const data = {
      nombre: formNombre.trim(),
      familia_id: formFamiliaId ? parseInt(formFamiliaId) : null,
    };

    if (activeTab === "fallas") {
      if (editingItem) {
        updateFalla.mutate({ id: editingItem.id, data });
      } else {
        createFalla.mutate(data);
      }
    } else {
      if (editingItem) {
        updateCausa.mutate({ id: editingItem.id, data });
      } else {
        createCausa.mutate(data);
      }
    }
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === "falla") {
      deleteFalla.mutate(itemToDelete.id);
    } else {
      deleteCausa.mutate(itemToDelete.id);
    }
  };

  const confirmDelete = (id: number, type: "falla" | "causa") => {
    setItemToDelete({ id, type });
    setDeleteDialogOpen(true);
  };

  const entityLabel = activeTab === "fallas" ? "Falla" : "Causa";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Fallas y Causas</h1>
      </div>

      {/* Filtro por familia */}
      <div className="flex items-center gap-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filtroFamilia} onValueChange={setFiltroFamilia}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filtrar por familia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las familias</SelectItem>
            {familias.map((f) => (
              <SelectItem key={f.id} value={f.id.toString()}>
                {f.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="fallas">Fallas ({fallas.length})</TabsTrigger>
            <TabsTrigger value="causas">Causas ({causas.length})</TabsTrigger>
          </TabsList>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva {entityLabel}
          </Button>
        </div>

        <TabsContent value="fallas" className="mt-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Familia de Producto</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingFallas ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : fallas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No hay fallas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  fallas.map((falla) => (
                    <TableRow key={falla.id}>
                      <TableCell className="font-mono text-sm">{falla.id}</TableCell>
                      <TableCell className="font-medium">{falla.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {falla.familia?.nombre || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(falla)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDelete(falla.id, "falla")}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="causas" className="mt-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Familia de Producto</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCausas ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : causas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No hay causas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  causas.map((causa) => (
                    <TableRow key={causa.id}>
                      <TableCell className="font-mono text-sm">{causa.id}</TableCell>
                      <TableCell className="font-medium">{causa.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {causa.familia?.nombre || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(causa)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDelete(causa.id, "causa")}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `Editar ${entityLabel}` : `Nueva ${entityLabel}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                placeholder={`Nombre de la ${entityLabel.toLowerCase()}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="familia">Familia de Producto (opcional)</Label>
              <Select value={formFamiliaId} onValueChange={setFormFamiliaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar familia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin familia</SelectItem>
                  {familias.map((f) => (
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
            <AlertDialogTitle>¿Eliminar {itemToDelete?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente este registro.
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
