import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Calendar, Hash, Wrench } from "lucide-react";
import { StatusBadge } from "@/components/shared";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MostradorDashboard } from "@/components/dashboard/MostradorDashboard";
import { TallerDashboard } from "@/components/dashboard/TallerDashboard";
import { LogisticaDashboard } from "@/components/dashboard/LogisticaDashboard";
import { BodegaDashboard } from "@/components/dashboard/BodegaDashboard";
import { SACDashboard } from "@/components/dashboard/SACDashboard";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];

const Index = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilter, setSearchFilter] = useState("all");
  const [incidentes, setIncidentes] = useState<IncidenteDB[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('incidentes')
        .select('*')
        .order('fecha_ingreso', { ascending: false });

      if (data) setIncidentes(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtros para el buscador
  const filteredIncidentes = incidentes.filter(incidente => {
    if (!searchTerm) return false;
    
    const matchesSearch = searchFilter === "all" ? 
      incidente.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incidente.codigo_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      new Date(incidente.fecha_ingreso).toLocaleDateString().includes(searchTerm)
      : searchFilter === "codigo" ? incidente.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      : searchFilter === "maquina" ? incidente.codigo_producto.toLowerCase().includes(searchTerm.toLowerCase())
      : searchFilter === "fecha" ? new Date(incidente.fecha_ingreso).toLocaleDateString().includes(searchTerm)
      : false;
    
    return matchesSearch;
  });
  
  const handleIncidenteClick = (id: string) => {
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
            Busca incidentes por código, máquina o fecha de ingreso
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
                    Código Máquina
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
                      Máquina: {incidente.codigo_producto} | Fecha: {new Date(incidente.fecha_ingreso).toLocaleDateString('es-GT')}
                    </p>
                  </div>
                  <StatusBadge status={incidente.status as any} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboards por área */}
      <Tabs defaultValue={getDefaultTab()} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1">
          <TabsTrigger value="mostrador" className="text-xs sm:text-sm">Mostrador</TabsTrigger>
          <TabsTrigger value="taller" className="text-xs sm:text-sm">Taller</TabsTrigger>
          <TabsTrigger value="logistica" className="text-xs sm:text-sm">Logística</TabsTrigger>
          <TabsTrigger value="bodega" className="text-xs sm:text-sm">Bodega</TabsTrigger>
          <TabsTrigger value="sac" className="text-xs sm:text-sm col-span-2 sm:col-span-1">SAC</TabsTrigger>
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

        <TabsContent value="bodega" className="space-y-4">
          <BodegaDashboard />
        </TabsContent>

        <TabsContent value="sac" className="space-y-4">
          <SACDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
