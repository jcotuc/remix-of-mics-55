import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, Hash, Wrench, X } from "lucide-react";
import { StatusBadge } from "@/components/shared";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { withTimeout } from "@/utils/withTimeout";
import type { IncidenteSchema } from "@/generated/actions.d";
import { mycsapi } from "@/mics-api";
import {
  WelcomeHeader,
  UrgentAlerts,
  QuickActions,
  DailySummary,
  MyActivity,
  AreaOverview,
} from "@/components/home";

const Index = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilter, setSearchFilter] = useState("all");
  const [showSearch, setShowSearch] = useState(false);
  const [incidentes, setIncidentes] = useState<IncidenteSchema[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await withTimeout(
        mycsapi.get("/api/v1/incidentes", { query: { limit: 100 } }),
        8000,
        "incidentes.list",
      );
      setIncidentes(response.results as any);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtros para el buscador
  const filteredIncidentes = incidentes.filter(incidente => {
    if (!searchTerm) return false;
    
    const codigo = incidente.codigo?.toLowerCase() || "";
    const productoCodigo = incidente.producto?.codigo?.toLowerCase() || "";
    const fechaCreacion = incidente.created_at 
      ? new Date(incidente.created_at).toLocaleDateString() 
      : "";
    
    const matchesSearch = searchFilter === "all" ? 
      codigo.includes(searchTerm.toLowerCase()) ||
      productoCodigo.includes(searchTerm.toLowerCase()) ||
      fechaCreacion.includes(searchTerm)
      : searchFilter === "codigo" ? codigo.includes(searchTerm.toLowerCase())
      : searchFilter === "maquina" ? productoCodigo.includes(searchTerm.toLowerCase())
      : searchFilter === "fecha" ? fechaCreacion.includes(searchTerm)
      : false;
    
    return matchesSearch;
  });
  
  const handleIncidenteClick = (id: number) => {
    navigate(`/incidentes/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <WelcomeHeader />

      {/* Urgent Alerts */}
      <UrgentAlerts incidentes={incidentes} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Search Toggle */}
      {!showSearch ? (
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setShowSearch(true)}
        >
          <Search className="h-4 w-4 mr-2" />
          Buscar incidentes...
        </Button>
      ) : (
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Buscador de Incidentes</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setShowSearch(false);
                  setSearchTerm("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="flex items-center space-x-2 flex-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Código, producto o fecha..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              <Select value={searchFilter} onValueChange={setSearchFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filtrar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="codigo">
                    <div className="flex items-center">
                      <Hash className="h-4 w-4 mr-2" />
                      N° Incidente
                    </div>
                  </SelectItem>
                  <SelectItem value="maquina">
                    <div className="flex items-center">
                      <Wrench className="h-4 w-4 mr-2" />
                      Producto
                    </div>
                  </SelectItem>
                  <SelectItem value="fecha">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Fecha
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {searchTerm && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {filteredIncidentes.length} resultado(s)
                </div>
                {filteredIncidentes.slice(0, 5).map((incidente) => (
                  <div 
                    key={incidente.id} 
                    className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleIncidenteClick(incidente.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{incidente.codigo}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {incidente.producto?.codigo || 'N/A'} • {incidente.created_at ? new Date(incidente.created_at).toLocaleDateString('es-GT') : 'N/A'}
                      </p>
                    </div>
                    <StatusBadge status={incidente.estado} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Summary */}
      <DailySummary incidentes={incidentes} />

      {/* Two Column Layout for Activity and Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MyActivity incidentes={incidentes} />
        <AreaOverview incidentes={incidentes} />
      </div>
    </div>
  );
};

export default Index;
