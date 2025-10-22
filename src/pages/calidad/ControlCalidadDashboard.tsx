import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle, TrendingUp, Package } from "lucide-react";

export default function ControlCalidadDashboard() {
  const [stats, setStats] = useState({
    totalAuditorias: 0,
    aprobadas: 0,
    rechazadas: 0,
    reingresos: 0,
    defectosTotal: 0,
    defectosCriticos: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: auditorias } = await supabase.from("auditorias_calidad").select("resultado");
      const { data: defectos } = await supabase.from("defectos_calidad").select("gravedad");

      const aprobadas = auditorias?.filter((a) => a.resultado === "aprobado").length || 0;
      const rechazadas = auditorias?.filter((a) => a.resultado === "rechazado").length || 0;
      const reingresos = auditorias?.filter((a) => a.resultado === "reingreso").length || 0;
      const defectosCriticos = defectos?.filter((d) => d.gravedad === "critica").length || 0;

      setStats({
        totalAuditorias: auditorias?.length || 0,
        aprobadas,
        rechazadas,
        reingresos,
        defectosTotal: defectos?.length || 0,
        defectosCriticos,
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
