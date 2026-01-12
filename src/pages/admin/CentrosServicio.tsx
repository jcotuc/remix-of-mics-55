import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OutlinedInput, OutlinedSelect } from "@/components/ui/outlined-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Users, Building2, Loader2, UserCog, MapPin, X } from "lucide-react";

interface CentroServicio {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  responsable_id: string | null;
  numero_bodega: string | null;
  activo: boolean;
  es_central: boolean;
}

interface JefeTaller {
  user_id: string;
  nombre: string;
  apellido: string;
  centro_servicio_id: string | null;
}

interface Usuario {
  id: string;
  user_id: string;
  nombre: string;
  apellido: string;
  email: string;
  centro_servicio_id: string | null;
}

interface SupervisorRegional {
  id: string;
  user_id: string;
  nombre: string;
  apellido: string;
  email: string;
}

interface CentroSupervisor {
  id: string;
  supervisor_id: string;
  centro_servicio_id: string;
}

export default function CentrosServicio() {
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [supervisores, setSupervisores] = useState<SupervisorRegional[]>([]);
  const [jefesTaller, setJefesTaller] = useState<JefeTaller[]>([]);
  const [centrosSupervisor, setCentrosSupervisor] = useState<CentroSupervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCentroDialog, setShowCentroDialog] = useState(false);
  const [showAsignarDialog, setShowAsignarDialog] = useState(false);
  const [showAsignarCentrosDialog, setShowAsignarCentrosDialog] = useState(false);
  const [editingCentro, setEditingCentro] = useState<CentroServicio | null>(null);
  const [selectedCentro, setSelectedCentro] = useState<string>("");
  const [selectedUsuario, setSelectedUsuario] = useState<string>("");
  const [selectedSupervisor, setSelectedSupervisor] = useState<SupervisorRegional | null>(null);
  const [selectedCentrosIds, setSelectedCentrosIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
    telefono: "",
    email: "",
    numero_bodega: "",
    responsable_id: "",
    activo: true,
    es_central: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [centrosRes, usuariosRes, rolesRes, jefesRolesRes, centrosSupervisorRes] = await Promise.all([
      supabase.from("centros_servicio").select("*").order("nombre"),
      supabase.from("profiles").select("*").order("nombre"),
      // Obtener solo los user_id con rol supervisor_regional
      supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "supervisor_regional"),
      // Obtener solo los user_id con rol jefe_taller
      supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "jefe_taller"),
      // Obtener asignaciones de centros a supervisores
      supabase.from("centros_supervisor").select("*"),
    ]);

    if (centrosRes.data) setCentros(centrosRes.data);
    if (usuariosRes.data) setUsuarios(usuariosRes.data);
    if (centrosSupervisorRes.data) setCentrosSupervisor(centrosSupervisorRes.data);
    
    // Obtener los perfiles de los supervisores regionales
    if (rolesRes.data && rolesRes.data.length > 0) {
      const supervisorUserIds = rolesRes.data.map((r) => r.user_id);
      const { data: perfilesSupervisores } = await supabase
        .from("profiles")
        .select("id, user_id, nombre, apellido, email")
        .in("user_id", supervisorUserIds);
      
      if (perfilesSupervisores) {
        setSupervisores(perfilesSupervisores);
      }
    } else {
      setSupervisores([]);
    }

    // Obtener los perfiles de los jefes de taller
    if (jefesRolesRes.data && jefesRolesRes.data.length > 0) {
      const jefesUserIds = jefesRolesRes.data.map((r) => r.user_id);
      const { data: perfilesJefes } = await supabase
        .from("profiles")
        .select("user_id, nombre, apellido, centro_servicio_id")
        .in("user_id", jefesUserIds);
      
      if (perfilesJefes) {
        setJefesTaller(perfilesJefes);
      }
    } else {
      setJefesTaller([]);
    }
    
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingCentro(null);
    setFormData({
      nombre: "",
      direccion: "",
      telefono: "",
      email: "",
      numero_bodega: "",
      responsable_id: "",
      activo: true,
      es_central: false,
    });
    setShowCentroDialog(true);
  };

  const handleOpenEdit = (centro: CentroServicio) => {
    setEditingCentro(centro);
    setFormData({
      nombre: centro.nombre,
      direccion: centro.direccion || "",
      telefono: centro.telefono || "",
      email: centro.email || "",
      numero_bodega: centro.numero_bodega || "",
      responsable_id: centro.responsable_id || "",
      activo: centro.activo,
      es_central: centro.es_central,
    });
    setShowCentroDialog(true);
  };

  const handleSaveCentro = async () => {
    if (!formData.nombre) {
      toast.error("El nombre es requerido");
      return;
    }

    setSaving(true);

    if (editingCentro) {
      const { error } = await supabase
        .from("centros_servicio")
        .update({
          nombre: formData.nombre,
          direccion: formData.direccion || null,
          telefono: formData.telefono || null,
          email: formData.email || null,
          numero_bodega: formData.numero_bodega || null,
          responsable_id: formData.responsable_id || null,
          activo: formData.activo,
          es_central: formData.es_central,
        })
        .eq("id", editingCentro.id);

      if (error) {
        toast.error("Error al actualizar centro");
      } else {
        toast.success("Centro actualizado");
        setShowCentroDialog(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from("centros_servicio").insert({
        nombre: formData.nombre,
        direccion: formData.direccion || null,
        telefono: formData.telefono || null,
        email: formData.email || null,
        numero_bodega: formData.numero_bodega || null,
        responsable_id: formData.responsable_id || null,
        activo: formData.activo,
        es_central: formData.es_central,
      });

      if (error) {
        toast.error("Error al crear centro");
      } else {
        toast.success("Centro creado");
        setShowCentroDialog(false);
        fetchData();
      }
    }

    setSaving(false);
  };

  const handleAsignarUsuario = async () => {
    if (!selectedUsuario) {
      toast.error("Seleccione un usuario");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ centro_servicio_id: selectedCentro || null })
      .eq("id", selectedUsuario);

    if (error) {
      toast.error("Error al asignar usuario");
    } else {
      toast.success("Usuario asignado correctamente");
      setShowAsignarDialog(false);
      setSelectedUsuario("");
      setSelectedCentro("");
      fetchData();
    }

    setSaving(false);
  };

  const handleOpenAsignarCentros = (supervisor: SupervisorRegional) => {
    setSelectedSupervisor(supervisor);
    // Obtener los centros actuales del supervisor
    const centrosDelSupervisor = centrosSupervisor
      .filter((cs) => cs.supervisor_id === supervisor.user_id)
      .map((cs) => cs.centro_servicio_id);
    setSelectedCentrosIds(centrosDelSupervisor);
    setShowAsignarCentrosDialog(true);
  };

  const handleSaveAsignacionCentros = async () => {
    if (!selectedSupervisor) return;

    setSaving(true);

    // Eliminar asignaciones actuales del supervisor
    const { error: deleteError } = await supabase
      .from("centros_supervisor")
      .delete()
      .eq("supervisor_id", selectedSupervisor.user_id);

    if (deleteError) {
      toast.error("Error al actualizar asignaciones");
      setSaving(false);
      return;
    }

    // Insertar nuevas asignaciones
    if (selectedCentrosIds.length > 0) {
      const nuevasAsignaciones = selectedCentrosIds.map((centroId) => ({
        supervisor_id: selectedSupervisor.user_id,
        centro_servicio_id: centroId,
      }));

      const { error: insertError } = await supabase
        .from("centros_supervisor")
        .insert(nuevasAsignaciones);

      if (insertError) {
        toast.error("Error al crear asignaciones");
        setSaving(false);
        return;
      }
    }

    toast.success("Centros asignados correctamente");
    setShowAsignarCentrosDialog(false);
    setSelectedSupervisor(null);
    setSelectedCentrosIds([]);
    fetchData();

    setSaving(false);
  };

  const handleRemoveCentroFromSupervisor = async (supervisorUserId: string, centroId: string) => {
    const { error } = await supabase
      .from("centros_supervisor")
      .delete()
      .eq("supervisor_id", supervisorUserId)
      .eq("centro_servicio_id", centroId);

    if (error) {
      toast.error("Error al quitar centro");
    } else {
      toast.success("Centro removido");
      fetchData();
    }
  };

  const getUsuariosCentro = (centroId: string) => {
    return usuarios.filter((u) => u.centro_servicio_id === centroId);
  };

  const getCentroNombre = (centroId: string | null) => {
    if (!centroId) return "Sin asignar";
    const centro = centros.find((c) => c.id === centroId);
    return centro ? centro.nombre : "Desconocido";
  };

  const getSupervisorNombre = (supervisorId: string | null) => {
    if (!supervisorId) return null;
    const sup = supervisores.find((s) => s.user_id === supervisorId);
    return sup ? `${sup.nombre} ${sup.apellido}` : null;
  };

  const getResponsableNombre = (responsableId: string | null) => {
    if (!responsableId) return null;
    const jefe = jefesTaller.find((j) => j.user_id === responsableId);
    return jefe ? `${jefe.nombre} ${jefe.apellido}` : null;
  };

  const getCentrosDelSupervisor = (supervisorUserId: string) => {
    const centroIds = centrosSupervisor
      .filter((cs) => cs.supervisor_id === supervisorUserId)
      .map((cs) => cs.centro_servicio_id);
    return centros.filter((c) => centroIds.includes(c.id));
  };

  const toggleCentroSelection = (centroId: string) => {
    setSelectedCentrosIds((prev) =>
      prev.includes(centroId)
        ? prev.filter((id) => id !== centroId)
        : [...prev, centroId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Centros de Servicio</h1>
          <p className="text-muted-foreground">Gestión de centros, personal y supervisores regionales</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAsignarDialog(true)}>
            <UserCog className="mr-2 h-4 w-4" />
            Reasignar Usuario
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Centro
          </Button>
        </div>
      </div>

      <Tabs defaultValue="centros">
        <TabsList>
          <TabsTrigger value="centros">Centros de Servicio</TabsTrigger>
          <TabsTrigger value="personal">Personal por Centro</TabsTrigger>
          <TabsTrigger value="supervisores">Supervisores Regionales</TabsTrigger>
        </TabsList>

        <TabsContent value="centros" className="space-y-4">
          <div className="grid gap-4">
            {centros.map((centro) => (
              <Card key={centro.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{centro.nombre}</h3>
                          <Badge variant={centro.activo ? "default" : "secondary"}>
                            {centro.activo ? "Activo" : "Inactivo"}
                          </Badge>
                          {centro.es_central && (
                            <Badge variant="outline">Central</Badge>
                          )}
                        </div>
                        {centro.numero_bodega && (
                          <p className="text-sm text-muted-foreground">Bodega: {centro.numero_bodega}</p>
                        )}
                        {centro.direccion && (
                          <p className="text-sm text-muted-foreground">{centro.direccion}</p>
                        )}
                        {getResponsableNombre(centro.responsable_id) && (
                          <p className="text-sm">Responsable: {getResponsableNombre(centro.responsable_id)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {getUsuariosCentro(centro.id).length}
                        </p>
                        <p className="text-xs text-muted-foreground">Usuarios</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleOpenEdit(centro)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Personal Asignado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Centro Asignado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">
                          {usuario.nombre} {usuario.apellido}
                        </TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>
                          <Badge variant={usuario.centro_servicio_id ? "default" : "secondary"}>
                            {getCentroNombre(usuario.centro_servicio_id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUsuario(usuario.id);
                              setSelectedCentro(usuario.centro_servicio_id || "");
                              setShowAsignarDialog(true);
                            }}
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supervisores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Supervisores Regionales y sus Centros
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supervisores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay supervisores regionales registrados</p>
                  <p className="text-sm">Asigna el rol "supervisor_regional" a usuarios desde Usuarios</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {supervisores.map((supervisor) => {
                    const centrosAsignados = getCentrosDelSupervisor(supervisor.user_id);
                    return (
                      <Card key={supervisor.id} className="border-l-4 border-l-primary">
                        <CardContent className="pt-4">
                          <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div>
                              <h4 className="font-semibold text-lg">
                                {supervisor.nombre} {supervisor.apellido}
                              </h4>
                              <p className="text-sm text-muted-foreground">{supervisor.email}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {centrosAsignados.length === 0 ? (
                                  <span className="text-sm text-muted-foreground italic">
                                    Sin centros asignados
                                  </span>
                                ) : (
                                  centrosAsignados.map((centro) => (
                                    <Badge
                                      key={centro.id}
                                      variant="secondary"
                                      className="flex items-center gap-1"
                                    >
                                      <Building2 className="h-3 w-3" />
                                      {centro.nombre}
                                      <button
                                        onClick={() =>
                                          handleRemoveCentroFromSupervisor(
                                            supervisor.user_id,
                                            centro.id
                                          )
                                        }
                                        className="ml-1 hover:text-destructive"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                            <div className="flex items-start">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAsignarCentros(supervisor)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Asignar Centros
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Centro */}
      <Dialog open={showCentroDialog} onOpenChange={setShowCentroDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCentro ? "Editar Centro de Servicio" : "Nuevo Centro de Servicio"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <OutlinedInput
              label="Nombre *"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Centro Principal"
            />
            <OutlinedInput
              label="Dirección"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Dirección completa"
            />
            <div className="grid grid-cols-2 gap-4">
              <OutlinedInput
                label="Teléfono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="1234-5678"
              />
              <OutlinedInput
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="centro@empresa.com"
              />
            </div>
            <OutlinedInput
              label="Número de Bodega"
              value={formData.numero_bodega}
              onChange={(e) => setFormData({ ...formData, numero_bodega: e.target.value })}
              placeholder="B001"
            />
            <OutlinedSelect
              label="Responsable (Jefe de Taller)"
              value={formData.responsable_id || "__none__"}
              onValueChange={(val) => setFormData({ ...formData, responsable_id: val === "__none__" ? "" : val })}
              options={[
                { value: "__none__", label: "Sin asignar" },
                ...jefesTaller.map((jefe) => ({
                  value: jefe.user_id,
                  label: `${jefe.nombre} ${jefe.apellido}`
                }))
              ]}
              placeholder="Seleccionar responsable..."
            />
            {editingCentro && (
              <div>
                <Label>Supervisores Regionales Asignados</Label>
                <div className="mt-2 p-3 bg-muted/50 rounded-md border">
                  {(() => {
                    const supervisoresAsignados = centrosSupervisor
                      .filter((cs) => cs.centro_servicio_id === editingCentro.id)
                      .map((cs) => supervisores.find((s) => s.user_id === cs.supervisor_id))
                      .filter(Boolean);
                    
                    if (supervisoresAsignados.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground">
                          Sin supervisores asignados
                        </p>
                      );
                    }
                    
                    return (
                      <div className="flex flex-wrap gap-2">
                        {supervisoresAsignados.map((sup) => (
                          <Badge key={sup!.user_id} variant="secondary">
                            {sup!.nombre} {sup!.apellido}
                          </Badge>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Gestiona asignaciones desde la pestaña "Supervisores Regionales"
                </p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(val) => setFormData({ ...formData, activo: val })}
                />
                <Label>Activo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.es_central}
                  onCheckedChange={(val) => setFormData({ ...formData, es_central: val })}
                />
                <Label>Es Central</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCentroDialog(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCentro} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingCentro ? "Guardar Cambios" : "Crear Centro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Asignar Usuario */}
      <Dialog open={showAsignarDialog} onOpenChange={setShowAsignarDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reasignar Usuario a Centro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <OutlinedSelect
              label="Usuario"
              value={selectedUsuario}
              onValueChange={setSelectedUsuario}
              options={usuarios.map((u) => ({
                value: u.id,
                label: `${u.nombre} ${u.apellido} - ${u.email}`
              }))}
              placeholder="Seleccionar usuario..."
            />
            <OutlinedSelect
              label="Centro de Servicio"
              value={selectedCentro || "__none__"}
              onValueChange={(val) => setSelectedCentro(val === "__none__" ? "" : val)}
              options={[
                { value: "__none__", label: "Sin asignar" },
                ...centros.map((c) => ({
                  value: c.id,
                  label: c.nombre
                }))
              ]}
              placeholder="Seleccionar centro..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAsignarDialog(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleAsignarUsuario} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Asignar Centros a Supervisor */}
      <Dialog open={showAsignarCentrosDialog} onOpenChange={setShowAsignarCentrosDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Asignar Centros a {selectedSupervisor?.nombre} {selectedSupervisor?.apellido}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecciona los centros que supervisará este usuario:
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-3">
              {centros.map((centro) => (
                <div
                  key={centro.id}
                  className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                  onClick={() => toggleCentroSelection(centro.id)}
                >
                  <Checkbox
                    checked={selectedCentrosIds.includes(centro.id)}
                    onCheckedChange={() => toggleCentroSelection(centro.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{centro.nombre}</p>
                    {centro.direccion && (
                      <p className="text-xs text-muted-foreground">{centro.direccion}</p>
                    )}
                  </div>
                  <Badge variant={centro.activo ? "default" : "secondary"} className="text-xs">
                    {centro.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedCentrosIds.length} centro(s) seleccionado(s)
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAsignarCentrosDialog(false);
                setSelectedSupervisor(null);
                setSelectedCentrosIds([]);
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveAsignacionCentros} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Asignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
