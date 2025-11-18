import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Wrench, Clock, CheckCircle, Search, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

const FAMILIAS = [
  "Electricas",
  "Hidraulicas", 
  "Compresores",
  "2 Tiempos",
  "Hidrolavadoras",
  "Estacionarias"
] as const;

export default function Asignaciones() {
  const navigate = useNavigate();
  const [incidentes, setIncidentes] = useState<IncidenteDB[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<IncidenteDB[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidentes();
  }, []);

  const fetchIncidentes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .eq('status', 'Ingresado')
        .order('fecha_ingreso', { ascending: true });

      if (error) throw error;
      setIncidentes(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar incidentes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('incidentes')
        .select('*')
        .or(`codigo.ilike.%${searchTerm}%,descripcion_problema.ilike.%${searchTerm}%,codigo_cliente.ilike.%${searchTerm}%`)
        .order('fecha_ingreso', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error en la búsqueda');
    }
  };

  const handleAsignar = async (incidenteId: string, familia: string) => {
    const incidentesFamilia = getIncidentesPorFamilia(familia);
    const primerIncidente = incidentesFamilia[0];

    if (primerIncidente?.id !== incidenteId) {
      toast.error('Solo puedes asignar el primer incidente de la fila (FIFO)');
      return;
    }

    try {
      const { error } = await supabase
        .from('incidentes')
        .update({ status: 'En diagnostico' })
        .eq('id', incidenteId);

      if (error) throw error;
      
      toast.success('Incidente asignado');
      fetchIncidentes();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al asignar');
    }
  };

  const getIncidentesPorFamilia = (familia: string) => {
    return incidentes.filter(inc => inc.familia_producto === familia);
  };

  const getDiasDesdeIngreso = (fechaIngreso: string) => {
    const dias = Math.floor((Date.now() - new Date(fechaIngreso).getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  const getDiaMaxPorFamilia = (familia: string) => {
    const incidentesFamilia = getIncidentesPorFamilia(familia);
    if (incidentesFamilia.length === 0) return 0;
    return Math.max(...incidentesFamilia.map(inc => getDiasDesdeIngreso(inc.fecha_ingreso)));
  };

  // Métricas adicionales
  const [productividadGeneral, setProductividadGeneral] = useState(0);
  
  useEffect(() => {
    const fetchProductividad = async () => {
      try {
        // Productividad general: diagnósticos completados en los últimos 7 días
        const hace7Dias = new Date();
        hace7Dias.setDate(hace7Dias.getDate() - 7);
        
        const { data } = await supabase
          .from('diagnosticos')
          .select('id')
          .eq('estado', 'completado')
          .gte('updated_at', hace7Dias.toISOString());
        
        setProductividadGeneral(data?.length || 0);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchProductividad();
  }, []);

  const pendientesDiagnosticar = incidentes.length;
  const diaMaximo = incidentes.length > 0 
    ? Math.max(...incidentes.map(inc => getDiasDesdeIngreso(inc.fecha_ingreso))) 
    : 0;
  const familiasActivas = FAMILIAS.filter(f => getIncidentesPorFamilia(f).length > 0).length;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wrench className="h-8 w-8 text-primary" />
          Asignaciones de Taller - Sistema FIFO
        </h1>
        <p className="text-muted-foreground mt-2">
          Sistema Kanban por familias - Solo se puede asignar la primera máquina de cada fila
        </p>
      </div>

      {/* Dashboard de métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendientes por Diagnosticar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{pendientesDiagnosticar}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Productividad General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{productividadGeneral}</div>
            <p className="text-xs text-muted-foreground mt-1">últimos 7 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Día Más Alto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{diaMaximo}</div>
            <p className="text-xs text-muted-foreground mt-1">días esperando</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Familias Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{familiasActivas}</div>
            <p className="text-xs text-muted-foreground mt-1">de {FAMILIAS.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda Global de Incidentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por código, cliente o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{searchResults.length} resultados</p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchResults.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/mostrador/seguimiento/${inc.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{inc.codigo}</p>
                        <p className="text-sm text-muted-foreground truncate">{inc.descripcion_problema}</p>
                      </div>
                      <Badge variant="outline">{inc.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sistema Kanban por familias */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Cola de Asignación por Familias (FIFO)</h2>
        
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {FAMILIAS.map((familia) => {
                const incidentesFamilia = getIncidentesPorFamilia(familia);
                const diaMax = getDiaMaxPorFamilia(familia);

                return (
                  <div key={familia} className="flex-shrink-0 w-80">
                    <Card className="h-full flex flex-col">
                      <CardHeader className="pb-3 border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold">{familia}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-bold">
                              {incidentesFamilia.length}
                            </Badge>
                            {diaMax > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {diaMax}d
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="flex-1 p-3 overflow-y-auto max-h-[600px]">
                        {incidentesFamilia.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Sin incidentes</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {incidentesFamilia.map((inc, index) => {
                              const esPrimero = index === 0;
                              const dias = getDiasDesdeIngreso(inc.fecha_ingreso);

                              return (
                                <div
                                  key={inc.id}
                                  className={`p-2.5 border rounded-lg transition-all duration-200 animate-fade-in ${
                                    esPrimero 
                                      ? 'border-primary bg-primary/10 shadow-md hover:shadow-lg hover:scale-[1.02]' 
                                      : 'border-muted bg-card hover:bg-muted/50'
                                  }`}
                                  style={{ animationDelay: `${index * 50}ms` }}
                                >
                                  <div className="space-y-2">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          {esPrimero && (
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                          )}
                                          <p className="font-semibold text-xs truncate">{inc.codigo}</p>
                                        </div>
                                        {!esPrimero && (
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            #{index + 1} en fila
                                          </p>
                                        )}
                                      </div>
                                      
                                      {esPrimero && (
                                        <Badge variant="default" className="text-xs px-1.5 py-0">
                                          SIGUIENTE
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Descripción */}
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">
                                      {inc.descripcion_problema}
                                    </p>

                                    {/* Badges */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ${
                                          dias > 7 ? 'bg-red-50 text-red-700 border-red-200' :
                                          dias > 3 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                          'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}
                                      >
                                        <Clock className="h-3 w-3 mr-1" />
                                        {dias}d
                                      </Badge>
                                      {inc.cobertura_garantia && (
                                        <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                                          Garantía
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1.5 pt-1">
                                      <Button
                                        size="sm"
                                        variant={esPrimero ? "default" : "outline"}
                                        className={`flex-1 h-8 text-xs ${esPrimero ? 'hover-scale' : ''}`}
                                        onClick={() => handleAsignar(inc.id, familia)}
                                        disabled={!esPrimero}
                                      >
                                        {esPrimero ? '✓ Asignarme' : '🔒 Bloqueado'}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 px-2"
                                        onClick={() => navigate(`/mostrador/seguimiento/${inc.id}`)}
                                      >
                                        👁️
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leyenda */}
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <span>Siguiente en asignar (FIFO)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
                <span>+7 días esperando</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-100 border border-orange-200" />
                <span>4-7 días esperando</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
                <span>0-3 días esperando</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}