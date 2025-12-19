import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, TrendingUp, Truck, Package, Users, Settings } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CentroStats {
  nombre: string;
  incidentes: number;
  eficiencia: number;
  stock: number;
}

interface DashboardStats {
  centros: CentroStats[];
  transitosActivos: number;
  stockConsolidado: number;
  tiempoPromedioTransferencia: number;
}

interface SupervisorRegional {
  id: string;
  user_id: string;
  nombre: string;
  apellido: string;
  email: string;
  centrosAsignados: { id: string; nombre: string }[];
}

interface CentroServicio {
  id: string;
  nombre: string;
}

export default function DashboardSupervisorRegional() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [supervisores, setSupervisores] = useState<SupervisorRegional[]>([]);
  const [centros, setCentros] = useState<CentroServicio[]>([]);
  const [loadingSupervisores, setLoadingSupervisores] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<SupervisorRegional | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCentros, setSelectedCentros] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data: centrosData } = await supabase
        .from('centros_servicio')
        .select('*')
        .eq('activo', true);

      const { data: incidentes } = await supabase
        .from('incidentes')
        .select('centro_servicio');

      const { data: stockDept } = await supabase
        .from('stock_departamental')
        .select('centro_servicio_id, cantidad_actual');

      const centroStats: CentroStats[] = centrosData?.map(centro => {
        const incidentesCentro = incidentes?.filter(i => i.centro_servicio === centro.nombre).length || 0;
        const stockCentro = stockDept?.filter(s => s.centro_servicio_id === centro.id)
          .reduce((sum, s) => sum + s.cantidad_actual, 0) || 0;

        return {
          nombre: centro.nombre,
          incidentes: incidentesCentro,
          eficiencia: 0,
          stock: stockCentro
        };
      }).sort((a, b) => b.incidentes - a.incidentes) || [];

      const { data: transitos } = await supabase
        .from('transitos_bodega')
        .select('*')
        .eq('estado', 'en_transito');

      const stockConsolidado = stockDept?.reduce((sum, s) => sum + s.cantidad_actual, 0) || 0;

      setStats({
        centros: centroStats,
        transitosActivos: transitos?.length || 0,
        stockConsolidado,
        tiempoPromedioTransferencia: 0
      });

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervisoresYCentros = async () => {
    try {
      setLoadingSupervisores(true);

      // Obtener todos los centros de servicio
      const { data: centrosData } = await supabase
        .from('centros_servicio')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');

      setCentros(centrosData || []);

      // Obtener usuarios con rol supervisor_regional
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'supervisor_regional');

      if (!rolesData || rolesData.length === 0) {
        setSupervisores([]);
        return;
      }

      const userIds = rolesData.map(r => r.user_id);

      // Obtener perfiles de los supervisores
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, user_id, nombre, apellido, email')
        .in('user_id', userIds);

      // Obtener asignaciones de centros
      const { data: asignacionesData } = await supabase
        .from('centros_supervisor')
        .select('supervisor_id, centro_servicio_id, centros_servicio(id, nombre)')
        .in('supervisor_id', userIds);

      // Mapear supervisores con sus centros asignados
      const supervisoresConCentros: SupervisorRegional[] = (profilesData || []).map(profile => {
        const centrosDelSupervisor = (asignacionesData || [])
          .filter(a => a.supervisor_id === profile.user_id)
          .map(a => ({
            id: (a.centros_servicio as any)?.id || '',
            nombre: (a.centros_servicio as any)?.nombre || ''
          }))
          .filter(c => c.id);

        return {
          id: profile.id,
          user_id: profile.user_id,
          nombre: profile.nombre,
          apellido: profile.apellido,
          email: profile.email,
          centrosAsignados: centrosDelSupervisor
        };
      });

      setSupervisores(supervisoresConCentros);

    } catch (error) {
      console.error('Error cargando supervisores:', error);
      toast.error('Error al cargar supervisores');
    } finally {
      setLoadingSupervisores(false);
    }
  };

  const openAssignDialog = (supervisor: SupervisorRegional) => {
    setSelectedSupervisor(supervisor);
    setSelectedCentros(supervisor.centrosAsignados.map(c => c.id));
    setDialogOpen(true);
  };

  const handleCentroToggle = (centroId: string) => {
    setSelectedCentros(prev => 
      prev.includes(centroId) 
        ? prev.filter(id => id !== centroId)
        : [...prev, centroId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!selectedSupervisor) return;

    try {
      setSaving(true);

      // Eliminar asignaciones actuales
      await supabase
        .from('centros_supervisor')
        .delete()
        .eq('supervisor_id', selectedSupervisor.user_id);

      // Crear nuevas asignaciones
      if (selectedCentros.length > 0) {
        const nuevasAsignaciones = selectedCentros.map(centroId => ({
          supervisor_id: selectedSupervisor.user_id,
          centro_servicio_id: centroId
        }));

        const { error } = await supabase
          .from('centros_supervisor')
          .insert(nuevasAsignaciones);

        if (error) throw error;
      }

      toast.success('Centros asignados correctamente');
      setDialogOpen(false);
      fetchSupervisoresYCentros();

    } catch (error) {
      console.error('Error guardando asignaciones:', error);
      toast.error('Error al guardar asignaciones');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Supervisor Regional</h1>

      <Tabs defaultValue="dashboard" onValueChange={(value) => {
        if (value === 'gestion') fetchSupervisoresYCentros();
      }}>
        <TabsList>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="gestion" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Gestión de Centros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* KPIs Regionales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Centros Activos</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.centros.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tránsitos Activos</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.transitosActivos}</div>
                <p className="text-xs text-muted-foreground">Entre centros</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Stock Consolidado</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.stockConsolidado}</div>
                <p className="text-xs text-muted-foreground">Total de items</p>
              </CardContent>
            </Card>
          </div>

          {/* Ranking de Centros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Ranking de Centros de Servicio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.centros.map((centro, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{centro.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {centro.incidentes} incidentes • {centro.stock} items en stock
                        </p>
                      </div>
                      <span className="text-2xl font-bold text-muted-foreground">#{idx + 1}</span>
                    </div>
                    <Progress
                      value={stats.centros[0].incidentes > 0 ? (centro.incidentes / stats.centros[0].incidentes) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gestion" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Asignación de Centros a Supervisores Regionales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSupervisores ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : supervisores.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay supervisores regionales registrados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supervisor</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Centros Asignados</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supervisores.map((supervisor) => (
                      <TableRow key={supervisor.id}>
                        <TableCell className="font-medium">
                          {supervisor.nombre} {supervisor.apellido}
                        </TableCell>
                        <TableCell>{supervisor.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {supervisor.centrosAsignados.length === 0 ? (
                              <span className="text-muted-foreground text-sm">Sin asignar</span>
                            ) : (
                              supervisor.centrosAsignados.map(centro => (
                                <Badge key={centro.id} variant="secondary">
                                  {centro.nombre}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAssignDialog(supervisor)}
                          >
                            <Building2 className="h-4 w-4 mr-1" />
                            Asignar Centros
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para asignar centros */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Asignar Centros a {selectedSupervisor?.nombre} {selectedSupervisor?.apellido}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto py-4">
            {centros.map(centro => (
              <div key={centro.id} className="flex items-center space-x-3">
                <Checkbox
                  id={centro.id}
                  checked={selectedCentros.includes(centro.id)}
                  onCheckedChange={() => handleCentroToggle(centro.id)}
                />
                <label
                  htmlFor={centro.id}
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {centro.nombre}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAssignments} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
