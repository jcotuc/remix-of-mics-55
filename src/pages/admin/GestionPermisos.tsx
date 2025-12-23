import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Shield, Users, Plus, Trash2, Search, Save, Loader2 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

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
  permiso?: Permiso;
  profile?: { nombre: string; apellido: string; email: string };
}

interface Profile {
  user_id: string;
  nombre: string;
  apellido: string;
  email: string;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'mostrador', label: 'Mostrador' },
  { value: 'logistica', label: 'Logística' },
  { value: 'taller', label: 'Taller' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'digitador', label: 'Digitador' },
  { value: 'bodega', label: 'Bodega' },
  { value: 'sac', label: 'SAC' },
  { value: 'control_calidad', label: 'Control de Calidad' },
  { value: 'jefe_taller', label: 'Jefe de Taller' },
  { value: 'asesor', label: 'Asesor' },
  { value: 'gerente_centro', label: 'Gerente de Centro' },
  { value: 'supervisor_regional', label: 'Supervisor Regional' },
  { value: 'supervisor_sac', label: 'Supervisor SAC' },
  { value: 'supervisor_calidad', label: 'Supervisor Calidad' },
  { value: 'supervisor_bodega', label: 'Supervisor Bodega' },
  { value: 'jefe_bodega', label: 'Jefe de Bodega' },
  { value: 'jefe_logistica', label: 'Jefe de Logística' },
  { value: 'auxiliar_bodega', label: 'Auxiliar Bodega' },
  { value: 'auxiliar_logistica', label: 'Auxiliar Logística' },
  { value: 'supervisor_inventarios', label: 'Supervisor Inventarios' },
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [permisosRoles, setPermisosRoles] = useState<PermisoRol[]>([]);
  const [permisosUsuarios, setPermisosUsuarios] = useState<PermisoUsuario[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  const [selectedRol, setSelectedRol] = useState<AppRole>('admin');
  const [selectedPermisos, setSelectedPermisos] = useState<Set<string>>(new Set());
  
  const [searchUser, setSearchUser] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPermisoId, setSelectedPermisoId] = useState<string>('');
  const [esDenegado, setEsDenegado] = useState(false);
  const [motivo, setMotivo] = useState('');

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [permisosRes, permisosRolesRes, permisosUsuariosRes, profilesRes] = await Promise.all([
        supabase.from('permisos').select('*').order('modulo', { ascending: true }),
        supabase.from('permisos_roles').select('*'),
        supabase.from('permisos_usuarios').select('*'),
        supabase.from('profiles').select('user_id, nombre, apellido, email'),
      ]);

      if (permisosRes.error) throw permisosRes.error;
      if (permisosRolesRes.error) throw permisosRolesRes.error;
      if (permisosUsuariosRes.error) throw permisosUsuariosRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setPermisos(permisosRes.data || []);
      setPermisosRoles(permisosRolesRes.data || []);
      setPermisosUsuarios(permisosUsuariosRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      // Delete existing permisos for this rol
      await supabase
        .from('permisos_roles')
        .delete()
        .eq('rol', selectedRol);

      // Insert new permisos
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

      toast({ title: "Éxito", description: "Permisos del rol actualizados" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPermisoUsuario = async () => {
    if (!selectedUserId || !selectedPermisoId) {
      toast({ title: "Error", description: "Selecciona usuario y permiso", variant: "destructive" });
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

      toast({ title: "Éxito", description: "Permiso especial asignado" });
      setDialogOpen(false);
      setSelectedUserId('');
      setSelectedPermisoId('');
      setEsDenegado(false);
      setMotivo('');
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeletePermisoUsuario = async (id: string) => {
    try {
      const { error } = await supabase
        .from('permisos_usuarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Éxito", description: "Permiso especial eliminado" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  const getPermisoNombre = (permisoId: string) => {
    return permisos.find(p => p.id === permisoId)?.nombre || 'Desconocido';
  };

  const getProfileNombre = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    return profile ? `${profile.nombre} ${profile.apellido}` : 'Desconocido';
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
          <p className="text-muted-foreground">Administra permisos por rol y permisos especiales por usuario</p>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Permisos por Rol
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="h-4 w-4" />
            Permisos Especiales
          </TabsTrigger>
        </TabsList>

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
      </Tabs>

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
    </div>
  );
}
