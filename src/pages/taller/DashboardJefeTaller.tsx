import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Wrench, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

      // Incidentes por estado - usando los estados correctos del enum
      const { data: enDiagnostico } = await supabase
        .from("incidentes")
        .select("id")
        .eq("estado", "EN_DIAGNOSTICO");

      const { data: pendienteRepuestos } = await supabase
        .from("incidentes")
        .select("id")
        .eq("estado", "ESPERA_REPUESTOS");

      const { data: esperaAprobacion } = await supabase
        .from("incidentes")
        .select("id")
        .eq("estado", "ESPERA_APROBACION");

      // Incidentes activos (asignados a técnicos) - usando propietario_id
      const { data: asignados } = await supabase
        .from("incidentes")
        .select("id, propietario_id")
        .not("propietario_id", "is", null)
        .in("estado", ["EN_DIAGNOSTICO", "ESPERA_REPUESTOS", "EN_REPARACION"]);

      // Estadísticas por técnico - usando usuarios con rol tecnico
      const { data: tecnicos } = await (supabase as any)
        .from("usuarios")
        .select("id, nombre, apellido")
        .eq("rol", "tecnico")
        .eq("activo", true);

      const { data: diagnosticos } = await supabase
        .from("diagnosticos")
        .select("id, tecnico_id, estado");

      const tecnicoStats: TecnicoStats[] = (tecnicos || []).map((tec: any) => {
        const incidentesTec = (asignados || []).filter(
          (i) => i.propietario_id === tec.id
        );
        const diagnosticosTec = (diagnosticos || []).filter(
          (d) => d.tecnico_id === tec.id && d.estado === "COMPLETADO"
        );

        return {
          nombre: `${tec.nombre || ""} ${tec.apellido || ""}`.trim() || "Sin nombre",
          asignados: incidentesTec.length,
          completados: diagnosticosTec.length,
        };
      })
        .sort((a: TecnicoStats, b: TecnicoStats) => b.completados - a.completados)
        .slice(0, 5);

      setStats({
        incidentesAsignados: asignados?.length || 0,
        enDiagnostico: enDiagnostico?.length || 0,
        pendienteRepuestos: pendienteRepuestos?.length || 0,
        aprobacionesPendientes: esperaAprobacion?.length || 0,
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
