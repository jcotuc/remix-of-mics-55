import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, Clock, FileText, Percent } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { TablePagination } from "@/components/TablePagination";
import { OutlinedInput, OutlinedSelect } from "@/components/ui/outlined-input";
import { differenceInDays } from "date-fns";

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

type DiagnosticoInfo = {
  incidente_id: string;
  costo_estimado: number | null;
};

export default function IncidentesSAC() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [incidentesList, setIncidentesList] = useState<IncidenteDB[]>([]);
  const [clientes, setClientes] = useState<ClienteDB[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionSAC[]>([]);
  const [notificacionesCount, setNotificacionesCount] = useState<NotificacionCount[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      const { data: incidentesData, error: incidentesError } = await supabase
        .from("incidentes")
        .select("*")
        .in("status", ["Presupuesto", "Porcentaje"])
        .order("fecha_ingreso", { ascending: false });

      if (incidentesError) throw incidentesError;

      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("codigo, nombre");

      if (clientesError) throw clientesError;

      const { data: asignacionesData, error: asignacionesError } = await supabase
        .from("asignaciones_sac")
        .select("*")
        .eq("activo", true);

      if (asignacionesError) throw asignacionesError;

      const { data: notificacionesData, error: notificacionesError } = await supabase
        .from("notificaciones_cliente")
        .select("incidente_id, numero_notificacion");

      if (notificacionesError) throw notificacionesError;

      // Fetch diagnosticos for cost info
      const incidenteIds = incidentesData?.map(i => i.id) || [];
      const { data: diagnosticosData, error: diagnosticosError } = await supabase
        .from("diagnosticos")
        .select("incidente_id, costo_estimado")
        .in("incidente_id", incidenteIds);

      if (diagnosticosError) {
        console.error("Error fetching diagnosticos:", diagnosticosError);
      }

      setDiagnosticos(diagnosticosData || []);

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

  const getCostoEstimado = (incidenteId: string) => {
    const diag = diagnosticos.find((d) => d.incidente_id === incidenteId);
    return diag?.costo_estimado || null;
  };

  const getDiasDesdeIngreso = (fechaIngreso: string) => {
    return differenceInDays(new Date(), new Date(fechaIngreso));
  };

  const handleRowClick = (incidente: IncidenteDB) => {
    if (isAssignedToOther(incidente.id)) {
      toast.error("Este incidente está siendo atendido por otro agente");
      return;
    }
    navigate(`/sac/incidentes/${incidente.id}`);
  };

  const filteredIncidentes = useMemo(() => {
    return incidentesList.filter((incidente) => {
      const matchesSearch =
        incidente.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getClienteName(incidente.codigo_cliente).toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "todos" || incidente.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [incidentesList, searchTerm, statusFilter, clientes]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredIncidentes.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIncidentes = filteredIncidentes.slice(startIndex, startIndex + itemsPerPage);

  const statusOptions = [
    { value: "todos", label: "Todos los estados" },
    { value: "Presupuesto", label: "Presupuesto" },
    { value: "Porcentaje", label: "Porcentaje" }
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
        <div>
          <h1 className="text-3xl font-bold">Pendientes por Notificar</h1>
          <p className="text-muted-foreground">Gestión de Presupuestos y Porcentajes</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Presupuestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {incidentesList.filter((i) => i.status === "Presupuesto").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pendientes de aprobación cliente</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Porcentajes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {incidentesList.filter((i) => i.status === "Porcentaje").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Con descuento aplicado</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <OutlinedInput
                label="Buscar por código o cliente"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="w-full md:w-64">
              <OutlinedSelect
                label="Filtrar por Estado"
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={statusOptions}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Incidentes ({filteredIncidentes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Costo Est.</TableHead>
                  <TableHead className="text-center">Días</TableHead>
                  <TableHead className="text-center">Notif.</TableHead>
                  <TableHead>Asignación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedIncidentes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No hay incidentes para mostrar
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedIncidentes.map((incidente) => {
                    const dias = getDiasDesdeIngreso(incidente.fecha_ingreso);
                    const costo = getCostoEstimado(incidente.id);
                    
                    return (
                      <TableRow
                        key={incidente.id}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          isAssignedToOther(incidente.id) ? "opacity-60" : ""
                        }`}
                        onClick={() => handleRowClick(incidente)}
                      >
                        <TableCell className="font-medium">{incidente.codigo}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {getClienteName(incidente.codigo_cliente)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={incidente.status as any} />
                        </TableCell>
                        <TableCell className="text-right">
                          {costo ? (
                            <span className="font-semibold text-primary">
                              Q {Number(costo).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={dias > 7 ? "destructive" : dias > 3 ? "secondary" : "outline"}
                            className="gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {dias}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={getNotificacionCount(incidente.id) >= 3 ? "destructive" : "outline"} 
                            className="font-semibold"
                          >
                            {getNotificacionCount(incidente.id)}/3
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isAssignedToMe(incidente.id) && (
                            <Badge variant="default" className="bg-green-600">Mío</Badge>
                          )}
                          {isAssignedToOther(incidente.id) && (
                            <Badge variant="secondary" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              En uso
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {filteredIncidentes.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredIncidentes.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
