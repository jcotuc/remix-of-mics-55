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
  const [incidentesEnDiagnostico, setIncidentesEnDiagnostico] = useState<IncidenteDB[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<IncidenteDB[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidentes();
  }, []);

  const fetchIncidentes = async () => {
    try {
      setLoading(true);
      const [pendientes, enDiagnostico] = await Promise.all([
        supabase
          .from('incidentes')
          .select('*')
          .eq('status', 'Ingresado')
          .order('fecha_ingreso', { ascending: true }),
        supabase
          .from('incidentes')
          .select('*')
          .eq('status', 'En diagnostico')
          .order('fecha_ingreso', { ascending: true })
      ]);

      if (pendientes.error) throw pendientes.error;
      if (enDiagnostico.error) throw enDiagnostico.error;

      setIncidentes(pendientes.data || []);
      setIncidentesEnDiagnostico(enDiagnostico.data || []);
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
            <CardTitle className="text-sm font-medium">Total Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{incidentes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">En Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{incidentesEnDiagnostico.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Día Máximo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {incidentes.length > 0 ? Math.max(...incidentes.map(inc => getDiasDesdeIngreso(inc.fecha_ingreso))) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">días esperando</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Familias Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {FAMILIAS.filter(f => getIncidentesPorFamilia(f).length > 0).length}
            </div>
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
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Tablero Kanban - Por Familias</h2>
        
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {FAMILIAS.map((familia) => {
              const incidentesFamilia = getIncidentesPorFamilia(familia);
              const diaMax = getDiaMaxPorFamilia(familia);

              return (
                <Card key={familia} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{familia}</CardTitle>
                      <Badge variant="secondary">{incidentesFamilia.length}</Badge>
                    </div>
                    {incidentesFamilia.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Máx: {diaMax} {diaMax === 1 ? 'día' : 'días'}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    {incidentesFamilia.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Sin incidentes</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {incidentesFamilia.map((inc, index) => {
                          const esPrimero = index === 0;
                          const dias = getDiasDesdeIngreso(inc.fecha_ingreso);

                          return (
                            <div
                              key={inc.id}
                              className={`p-3 border rounded-lg space-y-2 ${
                                esPrimero 
                                  ? 'border-primary bg-primary/5 shadow-sm' 
                                  : 'border-muted bg-muted/30 opacity-60'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm truncate">{inc.codigo}</p>
                                    {esPrimero && (
                                      <Badge variant="default" className="text-xs">
                                        Siguiente
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate mt-1">
                                    {inc.descripcion_problema}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {dias} {dias === 1 ? 'día' : 'días'}
                                    </Badge>
                                    {inc.cobertura_garantia && (
                                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                        Garantía
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={esPrimero ? "default" : "outline"}
                                  className="flex-1"
                                  onClick={() => handleAsignar(inc.id, familia)}
                                  disabled={!esPrimero}
                                >
                                  {esPrimero ? 'Asignarme' : 'Bloqueado'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigate(`/mostrador/seguimiento/${inc.id}`)}
                                >
                                  Ver
                                </Button>
                              </div>

                              {!esPrimero && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Posición {index + 1} en fila
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* En Diagnóstico */}
      {incidentesEnDiagnostico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-600" />
              En Diagnóstico ({incidentesEnDiagnostico.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {incidentesEnDiagnostico.map((inc) => (
                <div
                  key={inc.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/mostrador/seguimiento/${inc.id}`)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{inc.codigo}</p>
                      <Badge variant="outline" className="bg-blue-50">
                        {inc.familia_producto || 'Sin familia'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {inc.descripcion_problema}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getDiasDesdeIngreso(inc.fecha_ingreso)} días en proceso
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}