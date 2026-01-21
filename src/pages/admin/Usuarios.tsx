import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Pencil, Filter, User, Shield, Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Usuario {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  telefono: string | null;
  activo: boolean;
  centro_de_servicio_id: number | null;
  created_at: string;
  centro?: { nombre: string; codigo: string } | null;
}

interface Rol {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string | null;
}

interface UsuarioRol {
  usuario_id: number;
  rol_id: number;
}

interface CentroServicio {
  id: number;
  nombre: string;
  codigo: string;
}

const ITEMS_PER_PAGE = 15;

export default function Usuarios() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroCentro, setFiltroCentro] = useState<string>("all");
  const [filtroRol, setFiltroRol] = useState<string>("all");
  const [filtroActivo, setFiltroActivo] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  
  // Form state
  const [formCentroId, setFormCentroId] = useState<string>("");
  const [formActivo, setFormActivo] = useState(true);
  const [formRoles, setFormRoles] = useState<number[]>([]);

  // Queries
  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("usuarios")
        .select("*, centro:centros_de_servicio(nombre, codigo)")
        .order("nombre");
      if (error) throw error;
      return data as Usuario[];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("roles")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return data as Rol[];
    },
  });

  const { data: usuarioRoles = [] } = useQuery({
    queryKey: ["usuario-roles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("usuario_roles")
        .select("usuario_id, rol_id");
      if (error) throw error;
      return data as UsuarioRol[];
    },
  });

  const { data: centros = [] } = useQuery({
    queryKey: ["centros-servicio"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("centros_de_servicio")
        .select("id, nombre, codigo")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data as CentroServicio[];
    },
  });

  // Map roles by user
  const rolesByUser = useMemo(() => {
    const map = new Map<number, number[]>();
    usuarioRoles.forEach((ur) => {
      const current = map.get(ur.usuario_id) || [];
      current.push(ur.rol_id);
      map.set(ur.usuario_id, current);
    });
    return map;
  }, [usuarioRoles]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return usuarios.filter((u) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const fullName = `${u.nombre} ${u.apellido || ""}`.toLowerCase();
        if (!fullName.includes(search) && !u.email.toLowerCase().includes(search)) {
          return false;
        }
      }
      
      // Centro filter
      if (filtroCentro !== "all" && u.centro_de_servicio_id?.toString() !== filtroCentro) {
        return false;
      }
      
      // Rol filter
      if (filtroRol !== "all") {
        const userRoles = rolesByUser.get(u.id) || [];
        if (!userRoles.includes(parseInt(filtroRol))) {
          return false;
        }
      }
      
      // Activo filter
      if (filtroActivo !== "all") {
        const isActive = filtroActivo === "true";
        if (u.activo !== isActive) {
          return false;
        }
      }
      
      return true;
    });
  }, [usuarios, searchTerm, filtroCentro, filtroRol, filtroActivo, rolesByUser]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Mutations
  const updateUsuario = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { centro_de_servicio_id: number | null; activo: boolean } }) => {
      const { error } = await (supabase as any)
        .from("usuarios")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuario actualizado");
    },
    onError: () => toast.error("Error al actualizar usuario"),
  });

  const updateRoles = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: number; roleIds: number[] }) => {
      // Delete existing roles
      const { error: deleteError } = await (supabase as any)
        .from("usuario_roles")
        .delete()
        .eq("usuario_id", userId);
      if (deleteError) throw deleteError;

      // Insert new roles
      if (roleIds.length > 0) {
        const { error: insertError } = await (supabase as any)
          .from("usuario_roles")
          .insert(roleIds.map((rolId) => ({ usuario_id: userId, rol_id: rolId })));
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuario-roles"] });
    },
    onError: () => toast.error("Error al actualizar roles"),
  });

  // Handlers
  const openEditDialog = (user: Usuario) => {
    setEditingUser(user);
    setFormCentroId(user.centro_de_servicio_id?.toString() || "");
    setFormActivo(user.activo);
    setFormRoles(rolesByUser.get(user.id) || []);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async () => {
    if (!editingUser) return;

    await updateUsuario.mutateAsync({
      id: editingUser.id,
      data: {
        centro_de_servicio_id: formCentroId ? parseInt(formCentroId) : null,
        activo: formActivo,
      },
    });

    await updateRoles.mutateAsync({
      userId: editingUser.id,
      roleIds: formRoles,
    });

    closeDialog();
  };

  const toggleRole = (roleId: number) => {
    setFormRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const getRoleName = (rolId: number) => {
    return roles.find((r) => r.id === rolId)?.nombre || "";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            {filteredUsers.length} usuarios {filteredUsers.length !== usuarios.length && `de ${usuarios.length}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          <Select value={filtroCentro} onValueChange={(v) => { setFiltroCentro(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los centros</SelectItem>
              {centros.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.codigo} - {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroRol} onValueChange={(v) => { setFiltroRol(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id.toString()}>
                  {r.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroActivo} onValueChange={(v) => { setFiltroActivo(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Centro de Servicio</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingUsuarios ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => {
                const userRoleIds = rolesByUser.get(user.id) || [];
                return (
                  <TableRow key={user.id} className={!user.activo ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {user.nombre} {user.apellido || ""}
                          </div>
                          {user.telefono && (
                            <div className="text-xs text-muted-foreground">{user.telefono}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      {user.centro ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{user.centro.codigo}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {userRoleIds.length === 0 ? (
                          <span className="text-muted-foreground text-sm">Sin roles</span>
                        ) : (
                          userRoleIds.slice(0, 3).map((rolId) => (
                            <Badge key={rolId} variant="secondary" className="text-xs">
                              {getRoleName(rolId)}
                            </Badge>
                          ))
                        )}
                        {userRoleIds.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{userRoleIds.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={user.activo ? "default" : "secondary"}>
                        {user.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-6 py-4">
              {/* User info (read-only) */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {editingUser.nombre} {editingUser.apellido || ""}
                    </div>
                    <div className="text-sm text-muted-foreground">{editingUser.email}</div>
                  </div>
                </div>
              </div>

              {/* Centro de servicio */}
              <div className="space-y-2">
                <Label>Centro de Servicio</Label>
                <Select value={formCentroId} onValueChange={setFormCentroId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar centro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin centro asignado</SelectItem>
                    {centros.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.codigo} - {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado activo */}
              <div className="flex items-center justify-between">
                <Label htmlFor="activo">Usuario activo</Label>
                <Switch
                  id="activo"
                  checked={formActivo}
                  onCheckedChange={setFormActivo}
                />
              </div>

              {/* Roles */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Roles asignados
                </Label>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-1">
                  {roles.map((rol) => (
                    <div
                      key={rol.id}
                      className="flex items-center space-x-2 p-2 rounded border hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`rol-${rol.id}`}
                        checked={formRoles.includes(rol.id)}
                        onCheckedChange={() => toggleRole(rol.id)}
                      />
                      <label
                        htmlFor={`rol-${rol.id}`}
                        className="text-sm font-medium leading-none cursor-pointer flex-1"
                      >
                        {rol.nombre}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
