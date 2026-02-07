import { useEffect, useState } from "react";
import type { IncidenteSchema } from "@/generated/actions.d";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, TrendingUp, Package } from "lucide-react";
import { mycsapi } from "@/mics-api";

export default function ControlCalidadDashboard() {
  const [stats, setStats] = useState({
    totalAuditorias: 0,
    aprobadas: 0,
    rechazadas: 0,
    reingresos: 0,
    defectosTotal: 0,
    defectosCriticos: 0,
    reincidenciasPendientes: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [auditoriasRes, defectosRes, incidentesRes] = await Promise.all([
        mycsapi.fetch("/api/v1/auditorias-calidad", { method: "GET" }),
        mycsapi.fetch("/api/v1/defectos-calidad", { method: "GET" }),
        mycsapi.get("/api/v1/incidentes", { query: { limit: 2000 } }),
      ]);

      const auditorias = (auditoriasRes as any).results || [];
      const defectos = (defectosRes as any).results || [];
      const incidentes = incidentesRes.results || [];

      const aprobadas = auditorias.filter((a: any) => a.resultado === "aprobado").length;
      const rechazadas = auditorias.filter((a: any) => a.resultado === "rechazado").length;
      const reingresos = auditorias.filter((a: any) => a.resultado === "reingreso").length;
      const defectosCriticos = defectos.filter((d: any) => d.gravedad === "critica").length;

      // Count pending incidents as approximation
      const reincidenciasPendientes = incidentes.filter((i: any) =>
        ["EN_DIAGNOSTICO", "EN_REPARACION"].includes(i.estado)
      ).length;

      setStats({
        totalAuditorias: auditorias.length,
        aprobadas,
        rechazadas,
        reingresos,
        defectosTotal: defectos.length,
        defectosCriticos,
        reincidenciasPendientes,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const tasaAprobacion = stats.totalAuditorias > 0 
    ? ((stats.aprobadas / stats.totalAuditorias) * 100).toFixed(1)
    : "0";

  const tasaReingreso = stats.totalAuditorias > 0
    ? ((stats.reingresos / stats.totalAuditorias) * 100).toFixed(1)
    : "0";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Control de Calidad</h1>
        <p className="text-muted-foreground">Panel de supervisión y análisis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Auditorías</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAuditorias}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Aprobación</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{tasaAprobacion}%</div>
            <p className="text-xs text-muted-foreground">{stats.aprobadas} aprobadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Reingreso</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{tasaReingreso}%</div>
            <p className="text-xs text-muted-foreground">{stats.reingresos} reingresos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Defectos Críticos</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.defectosCriticos}</div>
            <p className="text-xs text-muted-foreground">de {stats.defectosTotal} totales</p>
          </CardContent>
        </Card>
      </div>

      {stats.reincidenciasPendientes > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              Incidentes Pendientes de Revisión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-yellow-600">{stats.reincidenciasPendientes}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Incidentes que requieren verificación
                </p>
              </div>
              <a href="/calidad/reincidencias">
                <Button variant="outline">Ver Reincidencias</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Resultados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Aprobadas</span>
              </div>
              <span className="font-bold">{stats.aprobadas}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>Rechazadas</span>
              </div>
              <span className="font-bold">{stats.rechazadas}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span>Reingresos</span>
              </div>
              <span className="font-bold">{stats.reingresos}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href="/calidad/reincidencias" className="block p-3 rounded-lg border hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <div className="font-medium">Verificar Reincidencias</div>
                  <div className="text-sm text-muted-foreground">Validar reclamos de clientes</div>
                </div>
              </div>
            </a>
            <a href="/calidad/auditorias" className="block p-3 rounded-lg border hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <div className="font-medium">Gestionar Auditorías</div>
                  <div className="text-sm text-muted-foreground">Verificar reparaciones</div>
                </div>
              </div>
            </a>
            <a href="/calidad/defectos" className="block p-3 rounded-lg border hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5" />
                <div>
                  <div className="font-medium">Análisis de Defectos</div>
                  <div className="text-sm text-muted-foreground">Identificar problemas recurrentes</div>
                </div>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
