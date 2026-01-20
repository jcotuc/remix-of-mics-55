import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toastHelpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Users, Plus, Trash2, Search, Save, Loader2, UserCog, Copy, Check, Eye } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { ScrollArea } from "@/components/ui/scroll-area";

type AppRole = Database['public']['Enums']['app_role'];

interface Permiso {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  modulo: string;
  activo: boolean;
}

interface PermisoRol {
  id: string;
  rol: AppRole;
  permiso_id: string;
}

interface PermisoUsuario {
  id: string;
  user_id: string;
  permiso_id: string;
  es_denegado: boolean;
  motivo: string | null;
}

interface Profile {
  user_id: string;
  nombre: string;
  apellido: string;
  email: string;
}

interface UserRole {
  user_id: string;
  role: AppRole;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gerente_centro', label: 'Gerente de Centro' },
  { value: 'supervisor_regional', label: 'Supervisor Regional CS' },
  { value: 'jefe_taller', label: 'Jefe de Taller' },
  { value: 'jefe_logistica', label: 'Jefe de Logística' },
  { value: 'jefe_bodega', label: 'Jefe de Bodega' },
  { value: 'supervisor_bodega', label: 'Supervisor de Bodega' },
  { value: 'supervisor_calidad', label: 'Supervisor de Calidad' },
  { value: 'supervisor_sac', label: 'Supervisor de Servicio al Cliente' },
  { value: 'supervisor_inventarios', label: 'Supervisor Inventarios' },
  { value: 'mostrador', label: 'Dependiente de Mostrador' },
  { value: 'auxiliar_bodega', label: 'Auxiliar de Bodega' },
  { value: 'auxiliar_logistica', label: 'Auxiliar de Logística' },
  { value: 'control_calidad', label: 'Coordinador de Calidad' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'digitador', label: 'Digitador' },
  { value: 'asesor', label: 'Asesor' },
  { value: 'capacitador', label: 'Capacitador' },
];

const MODULOS = [
  { value: 'mostrador', label: 'Mostrador', color: 'bg-blue-500' },
  { value: 'logistica', label: 'Logística', color: 'bg-green-500' },
  { value: 'taller', label: 'Taller', color: 'bg-orange-500' },
  { value: 'bodega', label: 'Bodega', color: 'bg-purple-500' },
  { value: 'sac', label: 'SAC', color: 'bg-pink-500' },
  { value: 'calidad', label: 'Calidad', color: 'bg-cyan-500' },
  { value: 'admin', label: 'Admin', color: 'bg-red-500' },
  { value: 'gerencia', label: 'Gerencia', color: 'bg-yellow-500' },
];

export default function GestionPermisos() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [permisosRoles, setPermisosRoles] = useState<PermisoRol[]>([]);
  const [permisosUsuarios, setPermisosUsuarios] = useState<PermisoUsuario[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  
  const [selectedRol, setSelectedRol] = useState<AppRole>('admin');
  const [selectedPermisos, setSelectedPermisos] = useState<Set<string>>(new Set());
  
  const [searchUser, setSearchUser] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPermisoId, setSelectedPermisoId] = useState<string>('');
  const [esDenegado, setEsDenegado] = useState(false);
  const [motivo, setMotivo] = useState('');

  // Para vista de usuarios y permisos
  const [searchUserList, setSearchUserList] = useState('');
  const [viewUserPermisosDialog, setViewUserPermisosDialog] = useState(false);
  const [viewingUser, setViewingUser] = useState<Profile | null>(null);

  // Para perfiles personalizados (mix de roles)
  const [perfilNombre, setPerfilNombre] = useState('');
  const [rolesSeleccionados, setRolesSeleccionados] = useState<Set<AppRole>>(new Set());
  const [permisosPerfilCustom, setPermisosPerfilCustom] = useState<Set<string>>(new Set());
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [userToAssign, setUserToAssign] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Update selected permisos when rol changes
    const rolPermisos = permisosRoles
      .filter(pr => pr.rol === selectedRol)
      .map(pr => pr.permiso_id);
    setSelectedPermisos(new Set(rolPermisos));
  }, [selectedRol, permisosRoles]);

  // Calcular permisos del perfil basado en roles seleccionados
  useEffect(() => {
    const permisosFromRoles = new Set<string>();
    rolesSeleccionados.forEach(rol => {
      permisosRoles
        .filter(pr => pr.rol === rol)
        .forEach(pr => permisosFromRoles.add(pr.permiso_id));
    });
    setPermisosPerfilCustom(permisosFromRoles);
  }, [rolesSeleccionados, permisosRoles]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [permisosRes, permisosRolesRes, permisosUsuariosRes, profilesRes, userRolesRes] = await Promise.all([
        supabase.from('permisos').select('*').order('modulo', { ascending: true }),
        supabase.from('permisos_roles').select('*'),
        supabase.from('permisos_usuarios').select('*'),
        supabase.from('profiles').select('user_id, nombre, apellido, email'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      if (permisosRes.error) throw permisosRes.error;
      if (permisosRolesRes.error) throw permisosRolesRes.error;
      if (permisosUsuariosRes.error) throw permisosUsuariosRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (userRolesRes.error) throw userRolesRes.error;

      setPermisos(permisosRes.data || []);
      setPermisosRoles(permisosRolesRes.data || []);
      setPermisosUsuarios(permisosUsuariosRes.data || []);
      setProfiles(profilesRes.data || []);
      setUserRoles(userRolesRes.data || []);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePermisoToggle = (permisoId: string) => {
    const newSelected = new Set(selectedPermisos);
    if (newSelected.has(permisoId)) {
      newSelected.delete(permisoId);
    } else {
      newSelected.add(permisoId);
    }
    setSelectedPermisos(newSelected);
  };

  const handleSaveRolPermisos = async () => {
    setSaving(true);
    try {
      await supabase
        .from('permisos_roles')
        .delete()
        .eq('rol', selectedRol);

      if (selectedPermisos.size > 0) {
        const inserts = Array.from(selectedPermisos).map(permisoId => ({
          rol: selectedRol,
          permiso_id: permisoId,
        }));
        
        const { error } = await supabase
          .from('permisos_roles')
          .insert(inserts);
        
        if (error) throw error;
      }

      showSuccess("Permisos del rol actualizados");
      fetchData();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPermisoUsuario = async () => {
    if (!selectedUserId || !selectedPermisoId) {
      showError("Selecciona usuario y permiso");
      return;
    }

    try {
      const { error } = await supabase
        .from('permisos_usuarios')
        .insert({
          user_id: selectedUserId,
          permiso_id: selectedPermisoId,
          es_denegado: esDenegado,
          motivo: motivo || null,
        });

      if (error) throw error;

      showSuccess("Permiso especial asignado");
      setDialogOpen(false);
      setSelectedUserId('');
      setSelectedPermisoId('');
      setEsDenegado(false);
      setMotivo('');
      fetchData();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleDeletePermisoUsuario = async (id: string) => {
    try {
      const { error } = await supabase
        .from('permisos_usuarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccess("Permiso especial eliminado");
      fetchData();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleRolToggle = (rol: AppRole) => {
    const newSelected = new Set(rolesSeleccionados);
    if (newSelected.has(rol)) {
      newSelected.delete(rol);
    } else {
      newSelected.add(rol);
    }
    setRolesSeleccionados(newSelected);
  };

  const handleAssignPerfilToUser = async () => {
    if (!userToAssign || permisosPerfilCustom.size === 0) {
      showError("Selecciona un usuario y al menos un rol");
      return;
    }

    setSaving(true);
    try {
      // Insertar todos los permisos como permisos especiales otorgados
      const inserts = Array.from(permisosPerfilCustom).map(permisoId => ({
        user_id: userToAssign,
        permiso_id: permisoId,
        es_denegado: false,
        motivo: `Perfil personalizado: ${perfilNombre || 'Mix de roles'}`,
      }));

      const { error } = await supabase
        .from('permisos_usuarios')
        .insert(inserts);

      if (error) throw error;

      showSuccess(`${permisosPerfilCustom.size} permisos asignados al usuario`);
      setAssignDialogOpen(false);
      setUserToAssign('');
      fetchData();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const permisosByModulo = permisos.reduce((acc, p) => {
    if (!acc[p.modulo]) acc[p.modulo] = [];
    acc[p.modulo].push(p);
    return acc;
  }, {} as Record<string, Permiso[]>);

  const filteredProfiles = profiles.filter(p => 
    searchUser === '' || 
    p.nombre.toLowerCase().includes(searchUser.toLowerCase()) ||
    p.apellido.toLowerCase().includes(searchUser.toLowerCase()) ||
    p.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredUserList = profiles.filter(p => 
    searchUserList === '' || 
    p.nombre.toLowerCase().includes(searchUserList.toLowerCase()) ||
    p.apellido.toLowerCase().includes(searchUserList.toLowerCase()) ||
    p.email.toLowerCase().includes(searchUserList.toLowerCase())
  );

  const getPermisoNombre = (permisoId: string) => {
    return permisos.find(p => p.id === permisoId)?.nombre || 'Desconocido';
  };

  const getProfileNombre = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    return profile ? `${profile.nombre} ${profile.apellido}` : 'Desconocido';
  };

  const getUserRoles = (userId: string): AppRole[] => {
    return userRoles.filter(ur => ur.user_id === userId).map(ur => ur.role);
  };

  const getRolLabel = (rol: AppRole) => {
    return ROLES.find(r => r.value === rol)?.label || rol;
  };

  const getUserPermisos = (userId: string) => {
    const roles = getUserRoles(userId);
    const permisosFromRoles = new Set<string>();
    
    roles.forEach(rol => {
      permisosRoles
        .filter(pr => pr.rol === rol)
        .forEach(pr => permisosFromRoles.add(pr.permiso_id));
    });

    // Agregar permisos especiales otorgados
    permisosUsuarios
      .filter(pu => pu.user_id === userId && !pu.es_denegado)
      .forEach(pu => permisosFromRoles.add(pu.permiso_id));

    // Quitar permisos denegados
    permisosUsuarios
      .filter(pu => pu.user_id === userId && pu.es_denegado)
      .forEach(pu => permisosFromRoles.delete(pu.permiso_id));

    return Array.from(permisosFromRoles)
      .map(id => permisos.find(p => p.id === id))
      .filter(Boolean) as Permiso[];
  };

  const getUserPermisosEspeciales = (userId: string) => {
    return permisosUsuarios.filter(pu => pu.user_id === userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Gestión de Permisos</h1>
          <p className="text-muted-foreground">Administra permisos por rol, usuarios y perfiles personalizados</p>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Permisos por Rol
          </TabsTrigger>
          <TabsTrigger value="usuarios-lista" className="gap-2">
            <Users className="h-4 w-4" />
            Usuarios y Permisos
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2">
            <UserCog className="h-4 w-4" />
            Permisos Especiales
          </TabsTrigger>
          <TabsTrigger value="perfiles" className="gap-2">
            <Copy className="h-4 w-4" />
            Mix de Roles
          </TabsTrigger>
        </TabsList>

        {/* TAB: Permisos por Rol */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permisos por Rol</CardTitle>
              <CardDescription>
                Selecciona un rol y marca los permisos que deseas asignarle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Label>Rol:</Label>
                <Select value={selectedRol} onValueChange={(v) => setSelectedRol(v as AppRole)}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(rol => (
                      <SelectItem key={rol.value} value={rol.value}>
                        {rol.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleSaveRolPermisos} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar Cambios
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {MODULOS.map(modulo => (
                  <Card key={modulo.value} className="overflow-hidden">
                    <CardHeader className="py-3 bg-muted/50">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${modulo.color}`} />
                        {modulo.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-3 space-y-2">
                      {permisosByModulo[modulo.value]?.map(permiso => (
                        <div key={permiso.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={permiso.id}
                            checked={selectedPermisos.has(permiso.id)}
                            onCheckedChange={() => handlePermisoToggle(permiso.id)}
                          />
                          <label
                            htmlFor={permiso.id}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {permiso.nombre}
                          </label>
                        </div>
                      )) || (
                        <p className="text-sm text-muted-foreground">Sin permisos</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Lista de Usuarios y sus Permisos */}
        <TabsContent value="usuarios-lista" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios y sus Permisos</CardTitle>
              <CardDescription>
                Ve todos los usuarios con sus roles y permisos efectivos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuario..."
                  value={searchUserList}
                  onChange={(e) => setSearchUserList(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Permisos Especiales</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUserList.map(profile => {
                    const roles = getUserRoles(profile.user_id);
                    const especiales = getUserPermisosEspeciales(profile.user_id);
                    
                    return (
                      <TableRow key={profile.user_id}>
                        <TableCell className="font-medium">
                          {profile.nombre} {profile.apellido}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {profile.email}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {roles.length === 0 ? (
                              <span className="text-muted-foreground text-sm">Sin roles</span>
                            ) : (
                              roles.map(rol => (
                                <Badge key={rol} variant="secondary" className="text-xs">
                                  {getRolLabel(rol)}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {especiales.filter(e => !e.es_denegado).length > 0 && (
                              <Badge variant="default" className="text-xs">
                                +{especiales.filter(e => !e.es_denegado).length} otorgados
                              </Badge>
                            )}
                            {especiales.filter(e => e.es_denegado).length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                -{especiales.filter(e => e.es_denegado).length} denegados
                              </Badge>
                            )}
                            {especiales.length === 0 && (
                              <span className="text-muted-foreground text-sm">Ninguno</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewingUser(profile);
                              setViewUserPermisosDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Permisos Especiales */}
        <TabsContent value="usuarios" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Permisos Especiales por Usuario</CardTitle>
                  <CardDescription>
                    Asigna permisos adicionales o deniega permisos específicos a usuarios individuales
                  </CardDescription>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Permiso Especial
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuario..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Permiso</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="w-20">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permisosUsuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No hay permisos especiales asignados
                      </TableCell>
                    </TableRow>
                  ) : (
                    permisosUsuarios
                      .filter(pu => {
                        if (!searchUser) return true;
                        const profile = profiles.find(p => p.user_id === pu.user_id);
                        if (!profile) return false;
                        const fullName = `${profile.nombre} ${profile.apellido} ${profile.email}`.toLowerCase();
                        return fullName.includes(searchUser.toLowerCase());
                      })
                      .map(pu => (
                        <TableRow key={pu.id}>
                          <TableCell>{getProfileNombre(pu.user_id)}</TableCell>
                          <TableCell>{getPermisoNombre(pu.permiso_id)}</TableCell>
                          <TableCell>
                            <Badge variant={pu.es_denegado ? "destructive" : "default"}>
                              {pu.es_denegado ? "Denegado" : "Otorgado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {pu.motivo || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePermisoUsuario(pu.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Mix de Roles */}
        <TabsContent value="perfiles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crear Mix de Roles</CardTitle>
              <CardDescription>
                Combina permisos de múltiples roles y asígnalos a un usuario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del perfil (opcional)</Label>
                  <Input
                    placeholder="Ej: Supervisor Híbrido"
                    value={perfilNombre}
                    onChange={(e) => setPerfilNombre(e.target.value)}
                    className="max-w-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Selecciona los roles a combinar:</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {ROLES.map(rol => (
                      <div
                        key={rol.value}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          rolesSeleccionados.has(rol.value)
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleRolToggle(rol.value)}
                      >
                        <div className="flex items-center gap-2">
                          {rolesSeleccionados.has(rol.value) ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <div className="h-4 w-4 border rounded" />
                          )}
                          <span className="text-sm font-medium">{rol.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {rolesSeleccionados.size > 0 && (
                  <Card className="bg-muted/50">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">
                        Permisos resultantes ({permisosPerfilCustom.size})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-3">
                      <ScrollArea className="h-48">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {Array.from(permisosPerfilCustom)
                            .map(id => permisos.find(p => p.id === id))
                            .filter(Boolean)
                            .sort((a, b) => a!.modulo.localeCompare(b!.modulo))
                            .map(permiso => (
                              <div key={permiso!.id} className="flex items-center gap-2 text-sm">
                                <Badge variant="outline" className="text-xs">
                                  {permiso!.modulo}
                                </Badge>
                                <span>{permiso!.nombre}</span>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => setAssignDialogOpen(true)}
                    disabled={permisosPerfilCustom.size === 0}
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Asignar a Usuario
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRolesSeleccionados(new Set());
                      setPerfilNombre('');
                    }}
                  >
                    Limpiar Selección
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Agregar Permiso Especial */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Permiso Especial</DialogTitle>
            <DialogDescription>
              Asigna un permiso adicional o deniega un permiso específico a un usuario
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredProfiles.map(profile => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.nombre} {profile.apellido} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Permiso</Label>
              <Select value={selectedPermisoId} onValueChange={setSelectedPermisoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar permiso..." />
                </SelectTrigger>
                <SelectContent>
                  {permisos.map(permiso => (
                    <SelectItem key={permiso.id} value={permiso.id}>
                      [{permiso.modulo}] {permiso.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="es_denegado"
                checked={esDenegado}
                onCheckedChange={(checked) => setEsDenegado(checked as boolean)}
              />
              <label htmlFor="es_denegado" className="text-sm">
                Denegar este permiso (quitar en lugar de otorgar)
              </label>
            </div>

            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Razón por la cual se asigna este permiso especial..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddPermisoUsuario}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ver Permisos de Usuario */}
      <Dialog open={viewUserPermisosDialog} onOpenChange={setViewUserPermisosDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Permisos de {viewingUser?.nombre} {viewingUser?.apellido}
            </DialogTitle>
            <DialogDescription>
              {viewingUser?.email}
            </DialogDescription>
          </DialogHeader>

          {viewingUser && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Roles asignados:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {getUserRoles(viewingUser.user_id).map(rol => (
                    <Badge key={rol} variant="secondary">
                      {getRolLabel(rol)}
                    </Badge>
                  ))}
                  {getUserRoles(viewingUser.user_id).length === 0 && (
                    <span className="text-muted-foreground text-sm">Sin roles</span>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Permisos efectivos ({getUserPermisos(viewingUser.user_id).length}):</Label>
                <ScrollArea className="h-64 mt-2 border rounded-lg p-3">
                  <div className="space-y-1">
                    {getUserPermisos(viewingUser.user_id)
                      .sort((a, b) => a.modulo.localeCompare(b.modulo))
                      .map(permiso => (
                        <div key={permiso.id} className="flex items-center gap-2 text-sm py-1">
                          <Badge variant="outline" className="text-xs">
                            {permiso.modulo}
                          </Badge>
                          <span>{permiso.nombre}</span>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>

              {getUserPermisosEspeciales(viewingUser.user_id).length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Permisos especiales:</Label>
                  <div className="mt-1 space-y-1">
                    {getUserPermisosEspeciales(viewingUser.user_id).map(pe => (
                      <div key={pe.id} className="flex items-center gap-2 text-sm">
                        <Badge variant={pe.es_denegado ? "destructive" : "default"} className="text-xs">
                          {pe.es_denegado ? "Denegado" : "Otorgado"}
                        </Badge>
                        <span>{getPermisoNombre(pe.permiso_id)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setViewUserPermisosDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Asignar Perfil a Usuario */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Permisos a Usuario</DialogTitle>
            <DialogDescription>
              Se asignarán {permisosPerfilCustom.size} permisos como permisos especiales
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Seleccionar Usuario</Label>
              <Select value={userToAssign} onValueChange={setUserToAssign}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(profile => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.nombre} {profile.apellido} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Roles combinados: {Array.from(rolesSeleccionados).map(r => getRolLabel(r)).join(', ')}
              </p>
              <p className="text-sm font-medium mt-1">
                Total de permisos a asignar: {permisosPerfilCustom.size}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignPerfilToUser} disabled={saving || !userToAssign}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Asignar Permisos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
