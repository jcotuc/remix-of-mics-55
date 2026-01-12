import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OutlinedInput, OutlinedSelect } from "@/components/ui/outlined-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Edit, Trash2, RefreshCw, Search, Settings, Plus, Users, Building2, Shield, FileSpreadsheet } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { TablePagination } from "@/components/TablePagination";
import * as XLSX from "xlsx";
type UserRole = "admin" | "mostrador" | "logistica" | "taller" | "bodega" | "tecnico" | "digitador" | "jefe_taller" | "sac" | "control_calidad" | "asesor" | "gerente_centro" | "supervisor_regional" | "jefe_logistica" | "jefe_bodega" | "supervisor_bodega" | "supervisor_calidad" | "supervisor_sac" | "auxiliar_bodega" | "auxiliar_logistica" | "supervisor_inventarios" | "capacitador";

// Roles obsoletos que no se muestran en los selectores pero se pueden ver en la tabla
const OBSOLETE_ROLES = ["logistica", "taller", "bodega", "sac"];
interface CentroServicio {
  id: string;
  nombre: string;
}
interface Puesto {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}
interface UserData {
  id: string;
  email: string;
  nombre: string;
  codigo_empleado: string | null;
  centro_servicio_id: string | null;
  centro_servicio_nombre: string | null;
  role: UserRole | null;
  created_at: string;
}
export default function Usuarios() {
  const {
    userRole,
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [centrosServicio, setCentrosServicio] = useState<CentroServicio[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [centroFilter, setCentroFilter] = useState<string>("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPuestosDialogOpen, setIsPuestosDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isFormatDialogOpen, setIsFormatDialogOpen] = useState(false);

  // Excel import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Puestos form states
  const [newPuestoNombre, setNewPuestoNombre] = useState("");
  const [newPuestoDescripcion, setNewPuestoDescripcion] = useState("");
  const [puestosLoading, setPuestosLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nombre: "",
    apellido: "",
    codigo_empleado: "",
    centro_servicio_id: "",
    role: "" as UserRole | ""
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
      fetchCentrosServicio();
      fetchPuestos();
    }
  }, [userRole]);
  const fetchCentrosServicio = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("centros_servicio").select("id, nombre").eq("activo", true).order("nombre");
      if (error) throw error;
      setCentrosServicio(data || []);
    } catch (error: any) {
      console.error("Error fetching centros:", error);
    }
  };
  const fetchPuestos = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("puestos").select("*").order("nombre");
      if (error) throw error;
      setPuestos(data || []);
    } catch (error: any) {
      console.error("Error fetching puestos:", error);
    }
  };
  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch profiles with centro_servicio relationship
      const {
        data: profiles,
        error: profilesError
      } = await supabase.from("profiles").select(`
          *,
          centros_servicio:centro_servicio_id (nombre)
        `).order("created_at", {
        ascending: false
      });
      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(profiles.map(async profile => {
        const {
          data: roleData
        } = await supabase.from("user_roles").select("role").eq("user_id", profile.user_id).maybeSingle();
        return {
          id: profile.user_id,
          email: profile.email,
          nombre: profile.nombre + (profile.apellido ? ` ${profile.apellido}` : ''),
          codigo_empleado: profile.codigo_empleado || null,
          centro_servicio_id: profile.centro_servicio_id,
          centro_servicio_nombre: profile.centros_servicio?.nombre || null,
          role: roleData?.role || null,
          created_at: profile.created_at
        };
      }));
      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };
  const handleCreatePuesto = async () => {
    if (!newPuestoNombre.trim()) {
      toast.error("El nombre del puesto es obligatorio");
      return;
    }
    try {
      setPuestosLoading(true);
      const {
        error
      } = await supabase.from("puestos").insert({
        nombre: newPuestoNombre.trim(),
        descripcion: newPuestoDescripcion.trim() || null
      });
      if (error) throw error;
      toast.success("Puesto creado exitosamente");
      setNewPuestoNombre("");
      setNewPuestoDescripcion("");
      fetchPuestos();
    } catch (error: any) {
      console.error("Error creating puesto:", error);
      if (error.message.includes("duplicate")) {
        toast.error("Ya existe un puesto con ese nombre");
      } else {
        toast.error(error.message || "Error al crear puesto");
      }
    } finally {
      setPuestosLoading(false);
    }
  };
  const handleTogglePuestoActivo = async (puesto: Puesto) => {
    try {
      const {
        error
      } = await supabase.from("puestos").update({
        activo: !puesto.activo
      }).eq("id", puesto.id);
      if (error) throw error;
      toast.success(puesto.activo ? "Puesto desactivado" : "Puesto activado");
      fetchPuestos();
    } catch (error: any) {
      console.error("Error toggling puesto:", error);
      toast.error("Error al actualizar puesto");
    }
  };
  const handleCreateUser = async () => {
    if (!formData.codigo_empleado || !formData.nombre || !formData.apellido || !formData.role || !formData.centro_servicio_id || !formData.password) {
      toast.error("Código de empleado, nombre, apellido, puesto, centro de servicio y contraseña son obligatorios");
      return;
    }
    try {
      // Use email if provided, otherwise generate from codigo_empleado
      const email = formData.email || `${formData.codigo_empleado.toLowerCase()}@sistema.local`;

      // Create user via Supabase Auth
      const {
        data: authData,
        error: authError
      } = await supabase.auth.signUp({
        email: email,
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre,
            apellido: formData.apellido
          }
        }
      });
      if (authError) throw authError;
      if (authData.user) {
        // Create profile
        const {
          error: profileError
        } = await supabase.from("profiles").insert({
          user_id: authData.user.id,
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: email,
          codigo_empleado: formData.codigo_empleado,
          centro_servicio_id: formData.centro_servicio_id
        });
        if (profileError) throw profileError;

        // Assign role
        const {
          error: roleError
        } = await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: formData.role
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
    if (!selectedUser || !formData.nombre || !formData.apellido || !formData.role || !formData.centro_servicio_id) {
      toast.error("Nombre, apellido, puesto y centro de servicio son obligatorios");
      return;
    }
    try {
      // Update profile
      const {
        error: profileError
      } = await supabase.from("profiles").update({
        nombre: formData.nombre,
        apellido: formData.apellido,
        codigo_empleado: formData.codigo_empleado || null,
        centro_servicio_id: formData.centro_servicio_id
      }).eq("user_id", selectedUser.id);
      if (profileError) throw profileError;

      // Update or insert role
      const {
        data: existingRole
      } = await supabase.from("user_roles").select("id").eq("user_id", selectedUser.id).maybeSingle();
      if (existingRole) {
        const {
          error: roleError
        } = await supabase.from("user_roles").update({
          role: formData.role
        }).eq("user_id", selectedUser.id);
        if (roleError) throw roleError;
      } else {
        const {
          error: roleError
        } = await supabase.from("user_roles").insert({
          user_id: selectedUser.id,
          role: formData.role
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
      // Call edge function to delete user (requires service_role key)
      const {
        data,
        error
      } = await supabase.functions.invoke("admin-delete-user", {
        body: {
          userId: selectedUser.id
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuario eliminado exitosamente");
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Error al eliminar usuario");
    }
  };
  const openEditDialog = (user: UserData) => {
    setSelectedUser(user);
    // Split nombre into nombre and apellido
    const nameParts = user.nombre.split(' ');
    const nombre = nameParts[0] || '';
    const apellido = nameParts.slice(1).join(' ') || '';
    setFormData({
      email: user.email,
      password: "",
      nombre: nombre,
      apellido: apellido,
      codigo_empleado: user.codigo_empleado || "",
      centro_servicio_id: user.centro_servicio_id || "",
      role: user.role || ""
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
      codigo_empleado: "",
      centro_servicio_id: "",
      role: ""
    });
  };
  const getRoleBadgeVariant = (role: UserRole | null) => {
    if (!role) return "secondary";
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      admin: "destructive",
      jefe_taller: "destructive",
      jefe_logistica: "destructive",
      jefe_bodega: "destructive",
      gerente_centro: "destructive",
      supervisor_regional: "outline",
      supervisor_bodega: "outline",
      supervisor_calidad: "outline",
      supervisor_sac: "outline",
      supervisor_inventarios: "outline",
      mostrador: "default",
      logistica: "default",
      taller: "default",
      bodega: "default",
      sac: "default",
      control_calidad: "default",
      tecnico: "secondary",
      digitador: "secondary",
      asesor: "secondary",
      auxiliar_bodega: "secondary",
      auxiliar_logistica: "secondary",
      capacitador: "secondary"
    };
    return variants[role] || "secondary";
  };
  const getRoleLabel = (role: UserRole | null) => {
    if (!role) return "Sin Rol";
    const labels: Record<string, string> = {
      admin: "Administrador",
      mostrador: "Dependiente de Mostrador",
      logistica: "Logística (obsoleto)",
      taller: "Taller (obsoleto)",
      bodega: "Bodega (obsoleto)",
      tecnico: "Técnico",
      digitador: "Digitador",
      jefe_taller: "Jefe de Taller",
      sac: "SAC (obsoleto)",
      control_calidad: "Coordinador de Calidad",
      asesor: "Asesor",
      gerente_centro: "Gerente de Centro",
      supervisor_regional: "Supervisor Regional CS",
      jefe_logistica: "Jefe de Logística",
      jefe_bodega: "Jefe de Bodega",
      supervisor_bodega: "Supervisor de Bodega",
      supervisor_calidad: "Supervisor de Calidad",
      supervisor_sac: "Supervisor de Servicio al Cliente",
      auxiliar_bodega: "Auxiliar de Bodega",
      auxiliar_logistica: "Auxiliar de Logística",
      supervisor_inventarios: "Supervisor Inventarios",
      capacitador: "Capacitador"
    };
    return labels[role] || role;
  };

  // Roles disponibles para selección (excluye los obsoletos)
  const availableRoles = [{
    value: "admin",
    label: "Administrador"
  }, {
    value: "gerente_centro",
    label: "Gerente de Centro"
  }, {
    value: "supervisor_regional",
    label: "Supervisor Regional CS"
  }, {
    value: "jefe_taller",
    label: "Jefe de Taller"
  }, {
    value: "jefe_logistica",
    label: "Jefe de Logística"
  }, {
    value: "jefe_bodega",
    label: "Jefe de Bodega"
  }, {
    value: "supervisor_bodega",
    label: "Supervisor de Bodega"
  }, {
    value: "supervisor_calidad",
    label: "Supervisor de Calidad"
  }, {
    value: "supervisor_sac",
    label: "Supervisor de Servicio al Cliente"
  }, {
    value: "supervisor_inventarios",
    label: "Supervisor Inventarios"
  }, {
    value: "mostrador",
    label: "Dependiente de Mostrador"
  }, {
    value: "auxiliar_bodega",
    label: "Auxiliar de Bodega"
  }, {
    value: "auxiliar_logistica",
    label: "Auxiliar de Logística"
  }, {
    value: "control_calidad",
    label: "Coordinador de Calidad"
  }, {
    value: "tecnico",
    label: "Técnico"
  }, {
    value: "digitador",
    label: "Digitador"
  }, {
    value: "asesor",
    label: "Asesor"
  }, {
    value: "capacitador",
    label: "Capacitador"
  }];
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase()) || user.codigo_empleado && user.codigo_empleado.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesCentro = centroFilter === "all" || user.centro_servicio_id === centroFilter;
    return matchesSearch && matchesRole && matchesCentro;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, centroFilter]);

  // Excel import handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFormatDialogOpen(false); // Close format dialog

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        setImportData(jsonData);
        setIsImportDialogOpen(true);
      } catch (error) {
        toast.error("Error al leer el archivo Excel");
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImportUsers = async () => {
    if (importData.length === 0) {
      toast.error("No hay datos para importar");
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of importData) {
      try {
        const codigo = row["codigo_empleado"] || row["Código"] || row["codigo"];
        const nombre = row["nombre"] || row["Nombre"];
        const apellido = row["apellido"] || row["Apellido"] || "";
        const email = row["email"] || row["Email"] || `${codigo?.toLowerCase()}@sistema.local`;
        const password = row["password"] || row["contraseña"] || "123456";
        const roleName = row["puesto"] || row["rol"] || row["Puesto"] || row["Rol"] || "mostrador";
        const centroNombre = row["centro"] || row["Centro"] || row["centro_servicio"];

        if (!codigo || !nombre) {
          errorCount++;
          continue;
        }

        // Find centro by name
        const centro = centrosServicio.find(c => 
          c.nombre.toLowerCase().includes(centroNombre?.toLowerCase() || "")
        );

        // Find role
        const role = availableRoles.find(r => 
          r.label.toLowerCase().includes(roleName?.toLowerCase() || "") ||
          r.value.toLowerCase() === roleName?.toLowerCase()
        );

        // Create user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { nombre, apellido }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          // Create profile
          await supabase.from("profiles").insert({
            user_id: authData.user.id,
            nombre: nombre,
            apellido: apellido,
            email: email,
            codigo_empleado: codigo,
            centro_servicio_id: centro?.id || null
          });

          // Assign role
          if (role) {
            await supabase.from("user_roles").insert({
              user_id: authData.user.id,
              role: role.value as any
            });
          }

          successCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    setImporting(false);
    setIsImportDialogOpen(false);
    setImportData([]);
    
    toast.success(`Importación completada: ${successCount} usuarios creados, ${errorCount} errores`);
    fetchUsers();
  };
  if (authLoading || userRole !== "admin" && loading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Cargando...</div>
      </div>;
  }
  if (userRole !== "admin") {
    return null;
  }
  return <div className="container mx-auto py-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Usuarios totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <Shield className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{availableRoles.length}</p>
                <p className="text-sm text-muted-foreground">Roles disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Building2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{centrosServicio.length}</p>
                <p className="text-sm text-muted-foreground">Centros de servicio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Administración de Usuarios</CardTitle>
              
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <Button onClick={() => setIsFormatDialogOpen(true)} variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importar Excel
              </Button>
              <Button onClick={() => setIsPuestosDialogOpen(true)} variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Gestionar roles
              </Button>
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <OutlinedInput 
                label="Buscar por código, nombre o email"
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por puesto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los puestos</SelectItem>
                {availableRoles.map(role => <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={centroFilter} onValueChange={setCentroFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {centrosServicio.map(centro => <SelectItem key={centro.id} value={centro.id}>
                    {centro.nombre}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          {loading ? <div className="text-center py-8">Cargando usuarios...</div> : <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Centro de Servicio</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length === 0 ? <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No se encontraron usuarios
                      </TableCell>
                    </TableRow> : paginatedUsers.map(user => <TableRow key={user.id}>
                        <TableCell className="font-mono text-sm">
                          {user.codigo_empleado || "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {user.nombre}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.centro_servicio_nombre || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="icon" onClick={() => openEditDialog(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => openDeleteDialog(user)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>)}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(items) => {
                  setItemsPerPage(items);
                  setCurrentPage(1);
                }}
              />
            </div>}
        </CardContent>
      </Card>

      {/* Gestionar Roles Dialog */}
      <Dialog open={isPuestosDialogOpen} onOpenChange={setIsPuestosDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestionar roles</DialogTitle>
            <DialogDescription>
              Crea y administra los roles personalizados del sistema.
            </DialogDescription>
          </DialogHeader>
          
          {/* Formulario para crear nuevo rol */}
          <div className="space-y-4 border-b pb-4">
            <h4 className="font-medium">Crear Nuevo Rol</h4>
            <div className="grid gap-3">
              <OutlinedInput 
                id="puesto-nombre" 
                label="Nombre del Rol"
                value={newPuestoNombre} 
                onChange={e => setNewPuestoNombre(e.target.value)} 
                placeholder="Ej: Supervisor de Ventas" 
              />
              <OutlinedInput 
                id="puesto-descripcion" 
                label="Descripción (opcional)"
                value={newPuestoDescripcion} 
                onChange={e => setNewPuestoDescripcion(e.target.value)} 
                placeholder="Descripción del rol..." 
              />
              <Button onClick={handleCreatePuesto} disabled={puestosLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Rol
              </Button>
            </div>
          </div>

          {/* Lista de roles personalizados */}
          <div className="space-y-4">
            <h4 className="font-medium">Roles Personalizados</h4>
            {puestos.length === 0 ? <p className="text-sm text-muted-foreground">
                No hay roles personalizados. Los roles del sistema están predefinidos.
              </p> : <div className="space-y-2">
                {puestos.map(puesto => <div key={puesto.id} className={`flex items-center justify-between p-3 border rounded-lg ${!puesto.activo ? "opacity-50" : ""}`}>
                    <div>
                      <p className="font-medium">{puesto.nombre}</p>
                      {puesto.descripcion && <p className="text-sm text-muted-foreground">{puesto.descripcion}</p>}
                    </div>
                    <Button variant={puesto.activo ? "outline" : "default"} size="sm" onClick={() => handleTogglePuestoActivo(puesto)}>
                      {puesto.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </div>)}
              </div>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPuestosDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo usuario.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <OutlinedInput 
              label="Código de Empleado"
              value={formData.codigo_empleado} 
              onChange={e => setFormData({
                ...formData,
                codigo_empleado: e.target.value
              })} 
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <OutlinedInput 
                label="Nombre"
                value={formData.nombre} 
                onChange={e => setFormData({
                  ...formData,
                  nombre: e.target.value
                })} 
                required
              />
              <OutlinedInput 
                label="Apellido"
                value={formData.apellido} 
                onChange={e => setFormData({
                  ...formData,
                  apellido: e.target.value
                })} 
                required
              />
            </div>
            <OutlinedSelect
              label="Puesto"
              value={formData.role}
              onValueChange={value => setFormData({
                ...formData,
                role: value as UserRole
              })}
              options={availableRoles.map(role => ({ value: role.value, label: role.label }))}
              required
            />
            <OutlinedSelect
              label="Centro de Servicio"
              value={formData.centro_servicio_id}
              onValueChange={value => setFormData({
                ...formData,
                centro_servicio_id: value
              })}
              options={centrosServicio.map(centro => ({ value: centro.id, label: centro.nombre }))}
              required
            />
            <OutlinedInput 
              label="Email (opcional)"
              type="email" 
              value={formData.email} 
              onChange={e => setFormData({
                ...formData,
                email: e.target.value
              })} 
            />
            <OutlinedInput 
              label="Contraseña"
              type="password" 
              value={formData.password} 
              onChange={e => setFormData({
                ...formData,
                password: e.target.value
              })} 
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
            setIsCreateDialogOpen(false);
            resetForm();
          }}>
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
            <OutlinedInput 
              label="Código de Empleado"
              value={formData.codigo_empleado} 
              onChange={e => setFormData({
                ...formData,
                codigo_empleado: e.target.value
              })} 
            />
            <div className="grid grid-cols-2 gap-4">
              <OutlinedInput 
                label="Nombre"
                value={formData.nombre} 
                onChange={e => setFormData({
                  ...formData,
                  nombre: e.target.value
                })} 
                required
              />
              <OutlinedInput 
                label="Apellido"
                value={formData.apellido} 
                onChange={e => setFormData({
                  ...formData,
                  apellido: e.target.value
                })} 
                required
              />
            </div>
            <OutlinedSelect
              label="Puesto"
              value={formData.role}
              onValueChange={value => setFormData({
                ...formData,
                role: value as UserRole
              })}
              options={availableRoles.map(role => ({ value: role.value, label: role.label }))}
              required
            />
            <OutlinedSelect
              label="Centro de Servicio"
              value={formData.centro_servicio_id}
              onValueChange={value => setFormData({
                ...formData,
                centro_servicio_id: value
              })}
              options={centrosServicio.map(centro => ({ value: centro.id, label: centro.nombre }))}
              required
            />
            <OutlinedInput 
              label="Email"
              value={formData.email} 
              disabled 
              className="text-muted-foreground" 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
            setIsEditDialogOpen(false);
            setSelectedUser(null);
            resetForm();
          }}>
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
              <strong>{selectedUser?.nombre}</strong> y todos sus datos asociados.
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

      {/* Format Info Dialog */}
      <Dialog open={isFormatDialogOpen} onOpenChange={setIsFormatDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Formato de Excel para Importación</DialogTitle>
            <DialogDescription>
              Asegúrate de que tu archivo Excel contenga las siguientes columnas
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Columna</TableHead>
                  <TableHead>Alternativas</TableHead>
                  <TableHead>Obligatoria</TableHead>
                  <TableHead>Valor por defecto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-sm">codigo_empleado</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Código, codigo</TableCell>
                  <TableCell><Badge variant="destructive">Sí</Badge></TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-sm">nombre</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Nombre</TableCell>
                  <TableCell><Badge variant="destructive">Sí</Badge></TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-sm">apellido</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Apellido</TableCell>
                  <TableCell><Badge variant="secondary">No</Badge></TableCell>
                  <TableCell className="text-muted-foreground">Vacío</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-sm">email</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Email</TableCell>
                  <TableCell><Badge variant="secondary">No</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{"{codigo}@sistema.local"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-sm">password</TableCell>
                  <TableCell className="text-sm text-muted-foreground">contraseña</TableCell>
                  <TableCell><Badge variant="secondary">No</Badge></TableCell>
                  <TableCell className="font-mono text-xs">123456</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-sm">puesto</TableCell>
                  <TableCell className="text-sm text-muted-foreground">rol, Puesto, Rol</TableCell>
                  <TableCell><Badge variant="secondary">No</Badge></TableCell>
                  <TableCell className="text-muted-foreground">mostrador</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-sm">centro</TableCell>
                  <TableCell className="text-sm text-muted-foreground">Centro, centro_servicio</TableCell>
                  <TableCell><Badge variant="secondary">No</Badge></TableCell>
                  <TableCell className="text-muted-foreground">Sin asignar</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-lg">
            <p><strong>Notas:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Los roles deben coincidir con los roles del sistema (ej: "Técnico", "Administrador")</li>
              <li>Los centros deben coincidir con los nombres de centros de servicio existentes</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormatDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => fileInputRef.current?.click()}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Seleccionar archivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Excel Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Usuarios desde Excel</DialogTitle>
            <DialogDescription>
              Se encontraron {importData.length} registros. Revisa los datos antes de importar.
            </DialogDescription>
          </DialogHeader>
          
          {importData.length > 0 && (
            <div className="border rounded-lg overflow-x-auto max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(importData[0]).slice(0, 5).map((key) => (
                      <TableHead key={key}>{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).slice(0, 5).map((val: any, j) => (
                        <TableCell key={j} className="text-sm">{String(val || "-")}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {importData.length > 10 && (
                <p className="text-sm text-muted-foreground p-2 text-center">
                  ... y {importData.length - 10} registros más
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportDialogOpen(false);
              setImportData([]);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleImportUsers} disabled={importing}>
              {importing ? "Importando..." : `Importar ${importData.length} usuarios`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}