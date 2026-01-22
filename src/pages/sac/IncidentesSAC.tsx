import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; // Only for auth
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, Clock, FileText, Percent } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge, TablePagination } from "@/components/shared";
import { OutlinedInput, OutlinedSelect } from "@/components/ui/outlined-input";
import { differenceInDays } from "date-fns";
import { apiBackendAction } from "@/lib/api-backend";
import type { IncidenteSchema } from "@/generated/actions.d";

type IncidenteConCliente = IncidenteSchema;

type AsignacionSAC = {
  id: number;
  incidente_id: number;
  user_id: number;
  activo: boolean;
};

export default function IncidentesSAC() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [incidentesList, setIncidentesList] = useState<IncidenteConCliente[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionSAC[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
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
        // Get user profile via apiBackendAction
        const { result: perfil } = await apiBackendAction("usuarios.getByAuthUid", { auth_uid: user.id });
        if (perfil) {
          setCurrentUserId((perfil as any).id);
        }
      }

      // Use apiBackendAction for incidents
      const incidentesResponse = await apiBackendAction("incidentes.list", { limit: 1000 });
      
      // Filter by status client-side
      const filtered = incidentesResponse.results
        .filter(inc => inc.estado === "ESPERA_APROBACION" || inc.estado === "REPARADO")
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      // Fetch SAC assignments via apiBackendAction
      const { results: asignacionesData } = await apiBackendAction("asignaciones_sac.list", { activo: true });

      setIncidentesList(filtered);
      setAsignaciones((asignacionesData || []) as AsignacionSAC[]);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const isAssignedToMe = (incidenteId: number) => {
    if (!currentUserId) return false;
    return asignaciones.some(
      (a) => a.incidente_id === incidenteId && a.user_id === currentUserId && a.activo
    );
  };

  const isAssignedToOther = (incidenteId: number) => {
    if (!currentUserId) return false;
    return asignaciones.some(
      (a) => a.incidente_id === incidenteId && a.user_id !== currentUserId && a.activo
    );
  };

  const getDiasDesdeIngreso = (incidente: IncidenteConCliente) => {
    const fecha = incidente.created_at;
    if (!fecha) return 0;
    return differenceInDays(new Date(), new Date(fecha));
  };

  const handleRowClick = (incidente: IncidenteConCliente) => {
    if (isAssignedToOther(incidente.id)) {
      toast.error("Este incidente está siendo atendido por otro agente");
      return;
    }
    navigate(`/sac/incidentes/${incidente.id}`);
  };

  const filteredIncidentes = useMemo(() => {
    return incidentesList.filter((incidente) => {
      const clienteName = incidente.cliente?.nombre || "";
      const matchesSearch =
        incidente.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clienteName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "todos" || incidente.estado === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [incidentesList, searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredIncidentes.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIncidentes = filteredIncidentes.slice(startIndex, startIndex + itemsPerPage);

  const statusOptions = [
    { value: "todos", label: "Todos los estados" },
    { value: "ESPERA_APROBACION", label: "Espera Aprobación" },
    { value: "REPARADO", label: "Reparado" }
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
          <p className="text-muted-foreground">Gestión de Presupuestos y Notificaciones</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Espera Aprobación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {incidentesList.filter((i) => i.estado === "ESPERA_APROBACION").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pendientes de aprobación cliente</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Reparados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {incidentesList.filter((i) => i.estado === "REPARADO").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Listos para entregar</p>
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
                  <TableHead className="text-center">Días</TableHead>
                  <TableHead>Asignación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedIncidentes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No hay incidentes para mostrar
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedIncidentes.map((incidente) => {
                    const dias = getDiasDesdeIngreso(incidente);
                    
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
                          {incidente.cliente?.nombre || "Desconocido"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={incidente.estado} />
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
