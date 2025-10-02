import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, Package, Wrench, FileText, TrendingUp, AlertTriangle, Search, Calendar, Hash } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];
type ClienteDB = Database['public']['Tables']['clientes']['Row'];

const Index = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilter, setSearchFilter] = useState("all");
  const [incidentes, setIncidentes] = useState<IncidenteDB[]>([]);
  const [clientes, setClientes] = useState<ClienteDB[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incidentesResult, clientesResult] = await Promise.all([
        supabase.from('incidentes').select('*').order('fecha_ingreso', { ascending: false }),
        supabase.from('clientes').select('*')
      ]);

      if (incidentesResult.data) setIncidentes(incidentesResult.data);
      if (clientesResult.data) setClientes(clientesResult.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Métricas específicas para el dashboard del taller
  const incidentesPendienteDiagnostico = incidentes.filter(i => i.status === "Ingresado").length;
  const incidentesPendienteRepuestos = incidentes.filter(i => i.status === "Repuestos solicitados").length;
  const incidentesEnDiagnostico = incidentes.filter(i => i.status === "Diagnostico").length;
  
  const getClienteName = (codigo: string) => {
    const cliente = clientes.find(c => c.codigo === codigo);
    return cliente ? cliente.nombre : "Cliente no encontrado";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard - Centro de Servicio</h1>
        <p className="text-muted-foreground">
          Resumen general del sistema de gestión
        </p>
      </div>

      {/* Métricas del taller */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de Diagnóstico</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{incidentesPendienteDiagnostico}</div>
            <p className="text-xs text-muted-foreground">
              Requieren diagnóstico
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes por Repuestos</CardTitle>
            <Package className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{incidentesPendienteRepuestos}</div>
            <p className="text-xs text-muted-foreground">
              Esperando repuestos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Diagnóstico</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{incidentesEnDiagnostico}</div>
            <p className="text-xs text-muted-foreground">
              Siendo diagnosticados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Buscador de incidentes */}
      <Card>
        <CardHeader>
          <CardTitle>Buscador de Incidentes</CardTitle>
          <CardDescription>
            Busca incidentes por código, máquina o fecha de ingreso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar incidentes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={searchFilter} onValueChange={setSearchFilter}>
              <SelectTrigger className="w-48">
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
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleIncidenteClick(incidente.id)}
                >
                  <div>
                    <p className="font-medium text-sm">{incidente.codigo}</p>
                    <p className="text-xs text-muted-foreground">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Accesos Rápidos</CardTitle>
            <CardDescription>
              Navegación directa a las secciones principales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <a href="/clientes" className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">Clientes</span>
              </a>
              <a href="/productos" className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Package className="h-5 w-5 text-primary" />
                <span className="font-medium">Productos</span>
              </a>
              <a href="/repuestos" className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Wrench className="h-5 w-5 text-primary" />
                <span className="font-medium">Repuestos</span>
              </a>
              <a href="/incidentes" className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Incidentes</span>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimos incidentes registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-center text-muted-foreground">Cargando...</p>
              ) : incidentes.slice(0, 5).map((incidente) => (
                <div key={incidente.id} className="flex items-center justify-between p-2 border-l-2 border-primary/20 pl-4">
                  <div>
                    <p className="font-medium text-sm">{incidente.codigo}</p>
                    <p className="text-xs text-muted-foreground">{incidente.descripcion_problema.substring(0, 50)}...</p>
                  </div>
                  <span className="text-xs bg-muted px-2 py-1 rounded">{incidente.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
