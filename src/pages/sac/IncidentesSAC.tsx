import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";

type IncidenteDB = {
  id: string;
  codigo: string;
  status: string;
  codigo_producto: string;
  codigo_cliente: string;
  codigo_tecnico: string | null;
  descripcion_problema: string;
  fecha_ingreso: string;
  familia_padre_id: number | null;
  cobertura_garantia: boolean;
};

type ClienteDB = {
  codigo: string;
  nombre: string;
};

type AsignacionSAC = {
  id: string;
  incidente_id: string;
  user_id: string;
  activo: boolean;
};

type NotificacionCount = {
  incidente_id: string;
  count: number;
};

export default function IncidentesSAC() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [incidentesList, setIncidentesList] = useState<IncidenteDB[]>([]);
  const [clientes, setClientes] = useState<ClienteDB[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionSAC[]>([]);
  const [notificacionesCount, setNotificacionesCount] = useState<NotificacionCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // Fetch incidents that need SAC attention (only Presupuesto and Porcentaje for notifications)
      const { data: incidentesData, error: incidentesError } = await supabase
        .from("incidentes")
        .select("*")
        .in("status", [
          "Presupuesto",
          "Porcentaje"
        ])
        .order("fecha_ingreso", { ascending: false });

      if (incidentesError) throw incidentesError;

      // Fetch clients
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("codigo, nombre");

      if (clientesError) throw clientesError;

      // Fetch active SAC assignments
      const { data: asignacionesData, error: asignacionesError } = await supabase
        .from("asignaciones_sac")
        .select("*")
        .eq("activo", true);

      if (asignacionesError) throw asignacionesError;

      // Fetch notification counts for each incident
      const { data: notificacionesData, error: notificacionesError } = await supabase
        .from("notificaciones_cliente")
        .select("incidente_id, numero_notificacion");

      if (notificacionesError) throw notificacionesError;

      // Count notifications per incident (get max numero_notificacion for each)
      const notifCounts: NotificacionCount[] = [];
      if (notificacionesData) {
        const grouped = notificacionesData.reduce((acc, notif) => {
          if (!acc[notif.incidente_id]) {
            acc[notif.incidente_id] = 0;
          }
          acc[notif.incidente_id] = Math.max(acc[notif.incidente_id], notif.numero_notificacion);
          return acc;
        }, {} as Record<string, number>);

        Object.entries(grouped).forEach(([incidente_id, count]) => {
          notifCounts.push({ incidente_id, count });
        });
      }

      setIncidentesList(incidentesData || []);
      setClientes(clientesData || []);
      setAsignaciones(asignacionesData || []);
      setNotificacionesCount(notifCounts);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const getClienteName = (codigoCliente: string) => {
    const cliente = clientes.find((c) => c.codigo === codigoCliente);
    return cliente ? cliente.nombre : codigoCliente;
  };

  const isAssignedToMe = (incidenteId: string) => {
    if (!currentUserId) return false;
    return asignaciones.some(
      (a) => a.incidente_id === incidenteId && a.user_id === currentUserId && a.activo
    );
  };

  const isAssignedToOther = (incidenteId: string) => {
    if (!currentUserId) return false;
    return asignaciones.some(
      (a) => a.incidente_id === incidenteId && a.user_id !== currentUserId && a.activo
    );
  };

  const getNotificacionCount = (incidenteId: string) => {
    const notif = notificacionesCount.find((n) => n.incidente_id === incidenteId);
    return notif ? notif.count : 0;
  };

  const handleRowClick = (incidente: IncidenteDB) => {
    if (isAssignedToOther(incidente.id)) {
      toast.error("Este incidente está siendo atendido por otro agente");
      return;
    }
    navigate(`/sac/incidentes/${incidente.id}`);
  };

  const filteredIncidentes = incidentesList.filter((incidente) => {
    const matchesSearch =
      incidente.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClienteName(incidente.codigo_cliente).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "todos" || incidente.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    "Presupuesto",
    "Porcentaje"
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando incidentes...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Pendientes por Notificar</h1>
        <p className="text-muted-foreground">Presupuestos y Porcentajes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Presupuestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidentesList.filter((i) => i.status === "Presupuesto").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Porcentajes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidentesList.filter((i) => i.status === "Porcentaje").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[250px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Incidentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Garantía</TableHead>
                  <TableHead>Notificaciones</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead>Asignación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidentes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No hay incidentes para mostrar
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncidentes.map((incidente) => (
                    <TableRow
                      key={incidente.id}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        isAssignedToOther(incidente.id) ? "opacity-60" : ""
                      }`}
                      onClick={() => handleRowClick(incidente)}
                    >
                      <TableCell className="font-medium">{incidente.codigo}</TableCell>
                      <TableCell>{getClienteName(incidente.codigo_cliente)}</TableCell>
                      <TableCell>
                        <StatusBadge status={incidente.status as any} />
                      </TableCell>
                      <TableCell>
                        {incidente.cobertura_garantia ? (
                          <Badge variant="default">Sí</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold">
                          {getNotificacionCount(incidente.id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(incidente.fecha_ingreso).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {isAssignedToMe(incidente.id) && (
                          <Badge variant="default">Asignado a mí</Badge>
                        )}
                        {isAssignedToOther(incidente.id) && (
                          <Badge variant="secondary" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            En uso
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
