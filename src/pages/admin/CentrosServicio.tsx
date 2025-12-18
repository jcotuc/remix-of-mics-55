import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Users, Building2, Loader2, UserCog } from "lucide-react";

interface CentroServicio {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  responsable: string | null;
  numero_bodega: string | null;
  supervisor_id: string | null;
  activo: boolean;
  es_central: boolean;
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

export default function CentrosServicio() {
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [supervisores, setSupervisores] = useState<SupervisorRegional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCentroDialog, setShowCentroDialog] = useState(false);
  const [showAsignarDialog, setShowAsignarDialog] = useState(false);
  const [editingCentro, setEditingCentro] = useState<CentroServicio | null>(null);
  const [selectedCentro, setSelectedCentro] = useState<string>("");
  const [selectedUsuario, setSelectedUsuario] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
    telefono: "",
    email: "",
    numero_bodega: "",
    supervisor_id: "",
    activo: true,
    es_central: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [centrosRes, usuariosRes, supervisoresRes] = await Promise.all([
      supabase.from("centros_servicio").select("*").order("nombre"),
      supabase.from("profiles").select("*").order("nombre"),
      // Obtener usuarios con rol supervisor_regional
      supabase
        .from("user_roles")
        .select("user_id, profiles!inner(id, user_id, nombre, apellido, email)")
        .eq("role", "supervisor_regional"),
    ]);

    if (centrosRes.data) setCentros(centrosRes.data);
    if (usuariosRes.data) setUsuarios(usuariosRes.data);
    if (supervisoresRes.data) {
      const sups = supervisoresRes.data.map((item: any) => ({
        id: item.profiles.id,
        user_id: item.profiles.user_id,
        nombre: item.profiles.nombre,
        apellido: item.profiles.apellido,
        email: item.profiles.email,
      }));
      setSupervisores(sups);
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
      supervisor_id: "",
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
      supervisor_id: centro.supervisor_id || "",
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
          supervisor_id: formData.supervisor_id || null,
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
        supervisor_id: formData.supervisor_id || null,
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
    const sup = supervisores.find((s) => s.id === supervisorId);
    return sup ? `${sup.nombre} ${sup.apellido}` : null;
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
          <p className="text-muted-foreground">Gestión de centros y asignación de personal</p>
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
                        {getSupervisorNombre(centro.supervisor_id) && (
                          <p className="text-sm">Supervisor: {getSupervisorNombre(centro.supervisor_id)}</p>
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
            <div>
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Centro Principal"
              />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Dirección completa"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="1234-5678"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="centro@empresa.com"
                />
              </div>
            </div>
            <div>
              <Label>Número de Bodega</Label>
              <Input
                value={formData.numero_bodega}
                onChange={(e) => setFormData({ ...formData, numero_bodega: e.target.value })}
                placeholder="B001"
              />
            </div>
            <div>
              <Label>Supervisor Regional</Label>
              <Select 
                value={formData.supervisor_id || "__none__"} 
                onValueChange={(val) => setFormData({ ...formData, supervisor_id: val === "__none__" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar supervisor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin asignar</SelectItem>
                  {supervisores.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.nombre} {sup.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <div>
              <Label>Usuario</Label>
              <Select value={selectedUsuario} onValueChange={setSelectedUsuario}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre} {u.apellido} - {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nuevo Centro de Servicio</Label>
              <Select value={selectedCentro} onValueChange={setSelectedCentro}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {centros.filter((c) => c.activo).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAsignarDialog(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleAsignarUsuario} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Asignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
