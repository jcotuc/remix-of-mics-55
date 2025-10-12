import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  Users,
  TrendingUp,
  Activity,
  Calendar
} from "lucide-react";

interface Stats {
  total: number;
  completados: number;
  enProceso: number;
  pendientes: number;
  misTotales: number;
  misCompletados: number;
}

interface DigitadorStats {
  nombre: string;
  completados: number;
  enProceso: number;
}

export default function DigitadorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    completados: 0,
    enProceso: 0,
    pendientes: 0,
    misTotales: 0,
    misCompletados: 0
  });
  const [digitadores, setDigitadores] = useState<DigitadorStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellido')
        .eq('user_id', user.id)
        .maybeSingle();

      const miNombre = profile ? `${profile.nombre} ${profile.apellido}` : user.email;

      // Obtener todos los diagnósticos
      const { data: diagnosticos } = await supabase
        .from('diagnosticos')
        .select('estado, digitador_asignado, digitador_codigo');

      if (diagnosticos) {
        const total = diagnosticos.length;
        const completados = diagnosticos.filter(d => d.estado === 'completado').length;
        const enProceso = diagnosticos.filter(d => d.digitador_asignado).length;
        const pendientes = total - completados - enProceso;

        const misTotales = diagnosticos.filter(d => 
          d.digitador_codigo === miNombre || d.digitador_asignado === miNombre
        ).length;
        const misCompletados = diagnosticos.filter(d => 
          d.digitador_codigo === miNombre && d.estado === 'completado'
        ).length;

        setStats({
          total,
          completados,
          enProceso,
          pendientes,
          misTotales,
          misCompletados
        });

        // Agrupar por digitador
        const digitadorMap = new Map<string, DigitadorStats>();
        
        diagnosticos.forEach(d => {
          if (d.digitador_codigo) {
            const nombre = d.digitador_codigo;
            const existing = digitadorMap.get(nombre) || { nombre, completados: 0, enProceso: 0 };
            
            if (d.estado === 'completado') {
              existing.completados++;
            }
            if (d.digitador_asignado === nombre) {
              existing.enProceso++;
            }
            
            digitadorMap.set(nombre, existing);
          }
        });

        setDigitadores(
          Array.from(digitadorMap.values())
            .sort((a, b) => b.completados - a.completados)
        );
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Activity className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Digitalización</h1>
          <p className="text-muted-foreground mt-1">
            Métricas y estadísticas del equipo de digitadores
          </p>
        </div>
        <Button onClick={() => navigate('/digitador/pendientes')} size="lg">
          <FileText className="h-4 w-4 mr-2" />
          Ver Pendientes
        </Button>
      </div>

      {/* Estadísticas Personales */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Mis Estadísticas
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Digitalizados</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.misTotales}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Diagnósticos totales procesados
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-background">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.misCompletados}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Diagnósticos finalizados exitosamente
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Estadísticas Generales */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Estadísticas Generales
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Diagnósticos en sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.completados}</div>
              <p className="text-xs text-muted-foreground">Finalizados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.enProceso}</div>
              <p className="text-xs text-muted-foreground">Siendo digitalizados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendientes}</div>
              <p className="text-xs text-muted-foreground">Por procesar</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ranking de Digitadores */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Rendimiento del Equipo
        </h2>
        <Card>
          <CardContent className="pt-6">
            {digitadores.length > 0 ? (
              <div className="space-y-3">
                {digitadores.map((dig, idx) => (
                  <div 
                    key={dig.nombre}
                    className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-muted/50 to-background hover:from-muted transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                        ${idx === 0 ? 'bg-yellow-500 text-white' : 
                          idx === 1 ? 'bg-gray-400 text-white' : 
                          idx === 2 ? 'bg-orange-600 text-white' : 
                          'bg-muted text-muted-foreground'}
                      `}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{dig.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {dig.enProceso > 0 && `${dig.enProceso} en proceso`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{dig.completados}</div>
                      <p className="text-xs text-muted-foreground">completados</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">No hay datos de digitadores aún</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
