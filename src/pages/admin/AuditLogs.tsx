import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Eye, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AuditLog {
  id: string;
  tabla_afectada: string;
  registro_id: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  usuario_id: string | null;
  usuario_email: string | null;
  valores_anteriores: Record<string, any> | null;
  valores_nuevos: Record<string, any> | null;
  campos_modificados: string[] | null;
  created_at: string;
}

const TABLES = [
  { value: "all", label: "Todas las tablas" },
  { value: "incidentes", label: "Incidentes" },
  { value: "clientes", label: "Clientes" },
  { value: "diagnosticos", label: "Diagnósticos" },
  { value: "garantias_manuales", label: "Garantías Manuales" },
  { value: "user_roles", label: "Roles de Usuario" },
  { value: "revisiones_stock_cemaco", label: "Revisiones Stock Cemaco" },
  { value: "guias_envio", label: "Guías de Envío" },
  { value: "solicitudes_repuestos", label: "Solicitudes Repuestos" },
  { value: "solicitudes_cambio", label: "Solicitudes de Cambio" },
];

const ACTIONS = [
  { value: "all", label: "Todas las acciones" },
  { value: "INSERT", label: "Creación" },
  { value: "UPDATE", label: "Actualización" },
  { value: "DELETE", label: "Eliminación" },
];

const PAGE_SIZE = 50;

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [tableFilter, actionFilter, dateFrom, dateTo, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (tableFilter !== "all") {
        query = query.eq("tabla_afectada", tableFilter);
      }
      if (actionFilter !== "all") {
        query = query.eq("accion", actionFilter as "INSERT" | "UPDATE" | "DELETE");
      }
      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo + "T23:59:59");
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setLogs((data || []) as AuditLog[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.registro_id.toLowerCase().includes(term) ||
      log.usuario_email?.toLowerCase().includes(term) ||
      log.tabla_afectada.toLowerCase().includes(term)
    );
  });

  const getActionBadge = (accion: string) => {
    switch (accion) {
      case "INSERT":
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Creación</Badge>;
      case "UPDATE":
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Actualización</Badge>;
      case "DELETE":
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Eliminación</Badge>;
      default:
        return <Badge variant="outline">{accion}</Badge>;
    }
  };

  const getTableBadge = (tabla: string) => {
    const colors: Record<string, string> = {
      incidentes: "bg-blue-500/20 text-blue-700 border-blue-500/30",
      clientes: "bg-purple-500/20 text-purple-700 border-purple-500/30",
      diagnosticos: "bg-cyan-500/20 text-cyan-700 border-cyan-500/30",
      garantias_manuales: "bg-orange-500/20 text-orange-700 border-orange-500/30",
      user_roles: "bg-red-500/20 text-red-700 border-red-500/30",
    };
    return (
      <Badge className={colors[tabla] || "bg-muted text-muted-foreground"}>
        {tabla}
      </Badge>
    );
  };

  const renderDiff = (log: AuditLog) => {
    if (log.accion === "INSERT") {
      return (
        <div className="space-y-2">
          <h4 className="font-medium text-green-600">Valores Nuevos:</h4>
          <pre className="bg-green-50 dark:bg-green-950/30 p-3 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(log.valores_nuevos, null, 2)}
          </pre>
        </div>
      );
    }

    if (log.accion === "DELETE") {
      return (
        <div className="space-y-2">
          <h4 className="font-medium text-red-600">Valores Eliminados:</h4>
          <pre className="bg-red-50 dark:bg-red-950/30 p-3 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(log.valores_anteriores, null, 2)}
          </pre>
        </div>
      );
    }

    // UPDATE - show diff
    const changedFields = log.campos_modificados || [];
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Campos Modificados:</h4>
          <div className="flex flex-wrap gap-1">
            {changedFields.map((field) => (
              <Badge key={field} variant="outline" className="text-xs">
                {field}
              </Badge>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-red-600 mb-2">Antes:</h4>
            <div className="space-y-1">
              {changedFields.map((field) => (
                <div key={field} className="bg-red-50 dark:bg-red-950/30 p-2 rounded text-xs">
                  <span className="font-medium">{field}:</span>{" "}
                  <span className="text-muted-foreground">
                    {JSON.stringify(log.valores_anteriores?.[field])}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-green-600 mb-2">Después:</h4>
            <div className="space-y-1">
              {changedFields.map((field) => (
                <div key={field} className="bg-green-50 dark:bg-green-950/30 p-2 rounded text-xs">
                  <span className="font-medium">{field}:</span>{" "}
                  <span className="text-muted-foreground">
                    {JSON.stringify(log.valores_nuevos?.[field])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Historial de Cambios - Auditoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, email, tabla..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tabla" />
              </SelectTrigger>
              <SelectContent>
                {TABLES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por acción" />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Desde"
              />
            </div>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Hasta"
            />
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground mb-4">
            {totalCount} registros encontrados
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando registros de auditoría...
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Tabla</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Registro ID</TableHead>
                      <TableHead className="text-right">Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No se encontraron registros de auditoría
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.usuario_email || (
                              <span className="text-muted-foreground italic">Sistema</span>
                            )}
                          </TableCell>
                          <TableCell>{getTableBadge(log.tabla_afectada)}</TableCell>
                          <TableCell>{getActionBadge(log.accion)}</TableCell>
                          <TableCell className="font-mono text-xs max-w-[150px] truncate">
                            {log.registro_id}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Página {page + 1} de {totalPages || 1}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalle de Cambio
              {selectedLog && getActionBadge(selectedLog.accion)}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Fecha:</span>{" "}
                  <span className="font-medium">
                    {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Usuario:</span>{" "}
                  <span className="font-medium">
                    {selectedLog.usuario_email || "Sistema"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tabla:</span>{" "}
                  {getTableBadge(selectedLog.tabla_afectada)}
                </div>
                <div>
                  <span className="text-muted-foreground">Registro ID:</span>{" "}
                  <code className="bg-muted px-1 rounded text-xs">
                    {selectedLog.registro_id}
                  </code>
                </div>
              </div>
              <div className="border-t pt-4">{renderDiff(selectedLog)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
