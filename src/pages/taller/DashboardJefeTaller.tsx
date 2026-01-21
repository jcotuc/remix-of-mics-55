import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Wrench, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { apiBackendAction } from "@/lib/api-backend";

interface TecnicoStats {
  nombre: string;
  asignados: number;
  completados: number;
}

interface DashboardStats {
  incidentesAsignados: number;
  enDiagnostico: number;
  pendienteRepuestos: number;
  aprobacionesPendientes: number;
  tecnicos: TecnicoStats[];
}

export default function DashboardJefeTaller() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch data in parallel using apiBackendAction
      const [incidentesResponse, usuariosResponse, diagnosticosResponse] = await Promise.all([
        apiBackendAction("incidentes.list", { limit: 5000 }),
        apiBackendAction("usuarios.list", {}),
        apiBackendAction("diagnosticos.list", { limit: 5000 })
      ]);

      const incidentes = incidentesResponse.results || [];
      const usuarios = usuariosResponse.results || [];
      const diagnosticos = diagnosticosResponse.results || [];

      // Calculate stats from fetched data
      const enDiagnostico = incidentes.filter((i: any) => i.estado === "EN_DIAGNOSTICO").length;
      const pendienteRepuestos = incidentes.filter((i: any) => i.estado === "ESPERA_REPUESTOS").length;
      const esperaAprobacion = incidentes.filter((i: any) => i.estado === "ESPERA_APROBACION").length;
      
      // Incidentes activos con propietario
      const asignados = incidentes.filter((i: any) => 
        i.propietario_id && 
        ["EN_DIAGNOSTICO", "ESPERA_REPUESTOS", "EN_REPARACION"].includes(i.estado)
      );

      // Técnicos activos
      const tecnicos = usuarios.filter((u: any) => u.rol === "tecnico" && u.activo);

      const tecnicoStats: TecnicoStats[] = tecnicos.map((tec: any) => {
        const incidentesTec = asignados.filter((i: any) => i.propietario_id === tec.id);
        const diagnosticosTec = diagnosticos.filter(
          (d: any) => d.tecnico_id === tec.id && d.estado === "COMPLETADO"
        );

        return {
          nombre: `${tec.nombre || ""} ${tec.apellido || ""}`.trim() || "Sin nombre",
          asignados: incidentesTec.length,
          completados: diagnosticosTec.length,
        };
      })
        .sort((a, b) => b.completados - a.completados)
        .slice(0, 5);

      setStats({
        incidentesAsignados: asignados.length,
        enDiagnostico,
        pendienteRepuestos,
        aprobacionesPendientes: esperaAprobacion,
        tecnicos: tecnicoStats,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
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
      <h1 className="text-3xl font-bold">Dashboard Jefe de Taller</h1>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Incidentes Asignados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.incidentesAsignados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En Diagnóstico</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enDiagnostico}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendiente Repuestos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendienteRepuestos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aprobaciones Pendientes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aprobacionesPendientes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Rendimiento por Técnico */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 - Rendimiento de Técnicos</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.tecnicos.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay técnicos con asignaciones
            </p>
          ) : (
            <div className="space-y-3">
              {stats.tecnicos.map((tec, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{tec.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {tec.asignados} asignados • {tec.completados} completados
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
