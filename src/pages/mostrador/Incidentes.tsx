import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Eye, AlertTriangle, CheckCircle, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { productos, tecnicos } from "@/data/mockData";
import { StatusIncidente } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type IncidenteDB = Database['public']['Tables']['incidentes']['Row'];
type ClienteDB = Database['public']['Tables']['clientes']['Row'];

export default function IncidentesMostrador() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [incidentesList, setIncidentesList] = useState<IncidenteDB[]>([]);
  const [clientesList, setClientesList] = useState<ClienteDB[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Cargar incidentes y clientes en paralelo
      const [incidentesResult, clientesResult] = await Promise.all([
        supabase.from('incidentes').select('*').order('fecha_ingreso', { ascending: false }),
        supabase.from('clientes').select('*')
      ]);

      if (incidentesResult.error) throw incidentesResult.error;
      if (clientesResult.error) throw clientesResult.error;
      
      setIncidentesList(incidentesResult.data || []);
      setClientesList(clientesResult.data || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const getClienteName = (codigo: string) => {
    const cliente = clientesList.find(c => c.codigo === codigo);
    return cliente ? cliente.nombre : "Cliente no encontrado";
  };

  const getProductDisplayName = (codigo: string) => {
    return `Código: ${codigo}`;
  };

  const getTecnicoName = (codigo: string) => {
    const tecnico = tecnicos.find(t => t.codigo === codigo);
    return tecnico ? `${tecnico.nombre} ${tecnico.apellido}` : "No asignado";
  };

  const isProductDiscontinued = (codigoProducto: string) => {
    const producto = productos.find(p => p.codigo === codigoProducto);
    return producto?.descontinuado || false;
  };

  const statusOptions: StatusIncidente[] = [
    "Ingresado", "En ruta", "Pendiente de diagnostico", "En diagnostico", "Pendiente por repuestos",
    "Presupuesto", "Porcentaje", "Reparado", "Cambio por garantia", "Nota de credito", "Bodega pedido", "Rechazado"
  ];

  const categoryOptions = ["Electricas", "Neumaticas", "Hidraulicas", "4 tiempos", "2 tiempos", "Estacionarias"];

  const filteredIncidentes = incidentesList
    .filter(incidente => {
      const matchesSearch = incidente.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incidente.descripcion_problema.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getClienteName(incidente.codigo_cliente).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getProductDisplayName(incidente.codigo_producto).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || incidente.status === statusFilter;
      
      const producto = productos.find(p => p.codigo === incidente.codigo_producto);
      const matchesCategory = categoryFilter === "all" || (producto && producto.categoria === categoryFilter);
      
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime());

  const handleRowClick = (incidenteId: string) => {
    navigate(`/mostrador/seguimiento/${incidenteId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Consulta de Incidentes</h1>
          <p className="text-muted-foreground">
            Consulte el estado de los incidentes y seguimiento de reparaciones
          </p>
        </div>
        <Button onClick={() => navigate("/mostrador/incidentes/nuevo")}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Incidente
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">
                  {incidentesList.filter(i => i.status === "Ingresado").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-info" />
              <div>
                <p className="text-sm text-muted-foreground">En Proceso</p>
                <p className="text-2xl font-bold">
                  {incidentesList.filter(i => ["En diagnostico", "Pendiente por repuestos", "Presupuesto"].includes(i.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Completados</p>
                <p className="text-2xl font-bold">
                  {incidentesList.filter(i => i.status === "Reparado").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Con Garantía</p>
                <p className="text-2xl font-bold">
                  {incidentesList.filter(i => i.cobertura_garantia).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Incidentes</CardTitle>
          <CardDescription>
            {filteredIncidentes.length} incidentes registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar incidentes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por familia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las familias</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Garantía</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Cargando incidentes...
                    </TableCell>
                  </TableRow>
                ) : filteredIncidentes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No hay incidentes registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncidentes.map((incidente) => (
                  <TableRow 
                    key={incidente.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => handleRowClick(incidente.id)}
                  >
                    <TableCell className="font-medium">{incidente.codigo}</TableCell>
                    <TableCell>{getClienteName(incidente.codigo_cliente)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{getProductDisplayName(incidente.codigo_producto)}</span>
                        {isProductDiscontinued(incidente.codigo_producto) && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Descontinuado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{getTecnicoName(incidente.codigo_tecnico || '')}</TableCell>
                    <TableCell>
                      <StatusBadge status={incidente.status as StatusIncidente} />
                    </TableCell>
                    <TableCell>
                      {incidente.cobertura_garantia ? (
                        <Badge className="bg-success text-success-foreground">
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(incidente.fecha_ingreso).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(incidente.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
