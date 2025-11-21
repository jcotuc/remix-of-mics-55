import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Edit, Trash2, RefreshCw, Search } from "lucide-react";

type UserRole = "admin" | "mostrador" | "logistica" | "taller" | "bodega" | "tecnico" | "digitador" | "jefe_taller" | "sac" | "control_calidad" | "asesor";

interface UserData {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  role: UserRole | null;
  created_at: string;
}

export default function Usuarios() {
  const { userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nombre: "",
    apellido: "",
    role: "" as UserRole | "",
  });
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  useEffect(() => {
    if (!authLoading && userRole !== "admin") {
      toast.error("Acceso denegado. Solo administradores pueden acceder.");
      navigate("/");
    }
  }, [userRole, authLoading, navigate]);

  useEffect(() => {
    if (userRole === "admin") {
      fetchUsers();
    }
  }, [userRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles with user_roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.user_id)
            .maybeSingle();

          return {
            id: profile.user_id,
            email: profile.email,
            nombre: profile.nombre,
            apellido: profile.apellido,
            role: roleData?.role || null,
            created_at: profile.created_at,
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password || !formData.nombre || !formData.apellido || !formData.role) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre,
            apellido: formData.apellido,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            user_id: authData.user.id,
            nombre: formData.nombre,
            apellido: formData.apellido,
            email: formData.email,
          });

        if (profileError) throw profileError;

        // Assign role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: formData.role,
          });

        if (roleError) throw roleError;

        toast.success("Usuario creado exitosamente");
        setIsCreateDialogOpen(false);
        resetForm();
        fetchUsers();
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Error al crear usuario");
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !formData.nombre || !formData.apellido || !formData.role) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          nombre: formData.nombre,
          apellido: formData.apellido,
        })
        .eq("user_id", selectedUser.id);

      if (profileError) throw profileError;

      // Update or insert role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", selectedUser.id)
        .maybeSingle();

      if (existingRole) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: formData.role })
          .eq("user_id", selectedUser.id);

        if (roleError) throw roleError;
      } else {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: selectedUser.id,
            role: formData.role,
          });

        if (roleError) throw roleError;
      }

      toast.success("Usuario actualizado exitosamente");
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Error al actualizar usuario");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      // Delete user from auth (this will cascade to profiles and user_roles)
      const { error } = await supabase.auth.admin.deleteUser(selectedUser.id);

      if (error) throw error;

      toast.success("Usuario eliminado exitosamente");
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Error al eliminar usuario. Se requieren permisos de administrador.");
    }
  };

  const openEditDialog = (user: UserData) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: "",
      nombre: user.nombre,
      apellido: user.apellido,
      role: user.role || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: UserData) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      nombre: "",
      apellido: "",
      role: "",
    });
  };

  const getRoleBadgeVariant = (role: UserRole | null) => {
    if (!role) return "secondary";
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      admin: "destructive",
      mostrador: "default",
      logistica: "default",
      taller: "default",
      bodega: "default",
      sac: "default",
      control_calidad: "default",
    };
    return variants[role] || "secondary";
  };

  const getRoleLabel = (role: UserRole | null) => {
    if (!role) return "Sin Rol";
    const labels: Record<string, string> = {
      admin: "Administrador",
      mostrador: "Mostrador",
      logistica: "Logística",
      taller: "Taller",
      bodega: "Bodega",
      tecnico: "Técnico",
      digitador: "Digitador",
      jefe_taller: "Jefe de Taller",
      sac: "SAC",
      control_calidad: "Control de Calidad",
      asesor: "Asesor",
    };
    return labels[role] || role;
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  if (authLoading || (userRole !== "admin" && loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Cargando...</div>
      </div>
    );
  }

  if (userRole !== "admin") {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Administración de Usuarios</CardTitle>
              <CardDescription>
                Gestiona usuarios, roles y permisos del sistema
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchUsers} variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Crear Usuario
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, apellido o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="mostrador">Mostrador</SelectItem>
                <SelectItem value="logistica">Logística</SelectItem>
                <SelectItem value="taller">Taller</SelectItem>
                <SelectItem value="bodega">Bodega</SelectItem>
                <SelectItem value="sac">SAC</SelectItem>
                <SelectItem value="control_calidad">Control de Calidad</SelectItem>
                <SelectItem value="asesor">Asesor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="text-center py-8">Cargando usuarios...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No se encontraron usuarios
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.nombre} {user.apellido}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString("es-GT")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo usuario. Se enviará un correo de confirmación.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Juan"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apellido">Apellido *</Label>
              <Input
                id="apellido"
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                placeholder="Pérez"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Puesto *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="mostrador">Mostrador</SelectItem>
                  <SelectItem value="logistica">Logística</SelectItem>
                  <SelectItem value="taller">Taller</SelectItem>
                  <SelectItem value="bodega">Bodega</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="digitador">Digitador</SelectItem>
                  <SelectItem value="jefe_taller">Jefe de Taller</SelectItem>
                  <SelectItem value="sac">SAC</SelectItem>
                  <SelectItem value="control_calidad">Control de Calidad</SelectItem>
                  <SelectItem value="asesor">Asesor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser}>Crear Usuario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Actualiza la información del usuario seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={formData.email} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-nombre">Nombre *</Label>
              <Input
                id="edit-nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-apellido">Apellido *</Label>
              <Input
                id="edit-apellido"
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Puesto *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="mostrador">Mostrador</SelectItem>
                  <SelectItem value="logistica">Logística</SelectItem>
                  <SelectItem value="taller">Taller</SelectItem>
                  <SelectItem value="bodega">Bodega</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="digitador">Digitador</SelectItem>
                  <SelectItem value="jefe_taller">Jefe de Taller</SelectItem>
                  <SelectItem value="sac">SAC</SelectItem>
                  <SelectItem value="control_calidad">Control de Calidad</SelectItem>
                  <SelectItem value="asesor">Asesor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedUser(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleEditUser}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el usuario{" "}
              <strong>{selectedUser?.nombre} {selectedUser?.apellido}</strong> y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar Usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
