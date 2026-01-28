import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Calendar, Hash, Wrench } from "lucide-react";
import { StatusBadge } from "@/components/shared";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MostradorDashboard } from "@/components/dashboard/MostradorDashboard";
import { TallerDashboard } from "@/components/dashboard/TallerDashboard";
import { LogisticaDashboard } from "@/components/dashboard/LogisticaDashboard";
import { SACDashboard } from "@/components/dashboard/SACDashboard";
import { getIncidentesApiV1IncidentesGet } from "@/generated_sdk";
import type { IncidenteSchema } from "@/generated_sdk/types.gen";

const Index = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilter, setSearchFilter] = useState("all");
  const [incidentes, setIncidentes] = useState<IncidenteSchema[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getIncidentesApiV1IncidentesGet({
        query: { limit: 500 },
        responseStyle: 'data',
      });
      if (response && response.results) {
        setIncidentes(response.results);
      } else {
        setIncidentes([]);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setIncidentes([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtros para el buscador - using schema from apiBackendAction
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

  // Determinar la pestaña por defecto según el rol
  const getDefaultTab = () => {
    if (userRole === 'admin') return 'mostrador';
    return userRole || 'mostrador';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Dashboard - Centro de Servicio</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Panel de control interactivo por área
        </p>
      </div>

      {/* Buscador de incidentes - Disponible para todas las áreas */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Buscador de Incidentes</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Busca incidentes por código, ID producto o fecha de ingreso
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar incidentes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={searchFilter} onValueChange={setSearchFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los campos</SelectItem>
                <SelectItem value="codigo">
                  <div className="flex items-center">
                    <Hash className="h-4 w-4 mr-2" />
                    N° Incidente
                  </div>
                </SelectItem>
                <SelectItem value="maquina">
                  <div className="flex items-center">
                    <Wrench className="h-4 w-4 mr-2" />
                    ID Producto
                  </div>
                </SelectItem>
                <SelectItem value="fecha">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Fecha Ingreso
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {searchTerm && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {filteredIncidentes.length} resultado(s) encontrado(s)
              </div>
              {filteredIncidentes.slice(0, 5).map((incidente) => (
                <div 
                  key={incidente.id} 
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-2"
                  onClick={() => handleIncidenteClick(incidente.id)}
                >
                  <div className="flex-1">
                    <p className="font-medium text-xs sm:text-sm">{incidente.codigo}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Producto: {incidente.producto?.codigo || 'N/A'} | Fecha: {incidente.created_at ? new Date(incidente.created_at).toLocaleDateString('es-GT') : 'N/A'}
                    </p>
                  </div>
                  <StatusBadge status={incidente.estado} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboards por área */}
      <Tabs defaultValue={getDefaultTab()} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
          <TabsTrigger value="mostrador" className="text-xs sm:text-sm">Mostrador</TabsTrigger>
          <TabsTrigger value="taller" className="text-xs sm:text-sm">Taller</TabsTrigger>
          <TabsTrigger value="logistica" className="text-xs sm:text-sm">Logística</TabsTrigger>
          <TabsTrigger value="sac" className="text-xs sm:text-sm">SAC</TabsTrigger>
        </TabsList>

        <TabsContent value="mostrador" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-10">
                <p className="text-center text-muted-foreground">Cargando datos...</p>
              </CardContent>
            </Card>
          ) : (
            <MostradorDashboard incidentes={incidentes} />
          )}
        </TabsContent>

        <TabsContent value="taller" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-10">
                <p className="text-center text-muted-foreground">Cargando datos...</p>
              </CardContent>
            </Card>
          ) : (
            <TallerDashboard incidentes={incidentes} />
          )}
        </TabsContent>

        <TabsContent value="logistica" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-10">
                <p className="text-center text-muted-foreground">Cargando datos...</p>
              </CardContent>
            </Card>
          ) : (
            <LogisticaDashboard incidentes={incidentes} />
          )}
        </TabsContent>

        <TabsContent value="sac" className="space-y-4">
          <SACDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
