import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Eye, AlertTriangle, CheckCircle, Calendar, Stethoscope, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { incidentes, clientes, productos, tecnicos } from "@/data/mockData";
import { Incidente, StatusIncidente } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export default function Incidentes() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [incidentesList, setIncidentesList] = useState<Incidente[]>(incidentes);
  const [selectedIncidentes, setSelectedIncidentes] = useState<string[]>([]);

  // Helper functions moved before they are used
  const getClienteName = (codigo: string) => {
    const cliente = clientes.find(c => c.codigo === codigo);
    return cliente ? cliente.nombre : "Cliente no encontrado";
  };

  const getProductDisplayName = (codigo: string) => {
    return `Código: ${codigo}`;
  };

  const getTecnicoName = (codigo: string) => {
    const tecnico = tecnicos.find(t => t.codigo === codigo);
    return tecnico ? `${tecnico.nombre} ${tecnico.apellido}` : "Técnico no encontrado";
  };

  const isProductDiscontinued = (codigoProducto: string) => {
    const producto = productos.find(p => p.codigo === codigoProducto);
    return producto?.descontinuado || false;
  };

  const statusOptions: StatusIncidente[] = [
    "Pendiente de diagnostico", "En diagnostico", "pendiente repuestos",
    "Reparado", "Presupuesto", "Canje", "Nota de credito", "Cambio por garantia"
  ];

  const categoryOptions = ["Electricas", "Neumaticas", "Hidraulicas", "4 tiempos", "2 tiempos", "Estacionarias"];

  const filteredIncidentes = incidentesList
    .filter(incidente => {
      const matchesSearch = incidente.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incidente.descripcionProblema.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getClienteName(incidente.codigoCliente).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getProductDisplayName(incidente.codigoProducto).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || incidente.status === statusFilter;
      
      const producto = productos.find(p => p.codigo === incidente.codigoProducto);
      const matchesCategory = categoryFilter === "all" || (producto && producto.categoria === categoryFilter);
      
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => new Date(a.fechaIngreso).getTime() - new Date(b.fechaIngreso).getTime()); // FIFO ordering

  const handleSelectIncidente = (incidenteId: string, checked: boolean) => {
    if (checked) {
      setSelectedIncidentes(prev => [...prev, incidenteId]);
    } else {
      setSelectedIncidentes(prev => prev.filter(id => id !== incidenteId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIncidentes(filteredIncidentes.map(i => i.id));
    } else {
      setSelectedIncidentes([]);
    }
  };

  const handleVerIncidente = (incidenteId: string) => {
    navigate(`/incidentes/${incidenteId}`);
  };

  const handleRowClick = (incidenteId: string, event: React.MouseEvent) => {
    // Evitar navegación si se hace click en checkbox o botones
    if ((event.target as HTMLElement).closest('input[type="checkbox"]') || 
        (event.target as HTMLElement).closest('button')) {
      return;
    }
    navigate(`/incidentes/${incidenteId}`);
  };

  const handleDiagnosticar = (incidenteId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    // Aquí puedes navegar a una página de diagnóstico o abrir un modal
    navigate(`/incidentes/${incidenteId}/diagnostico`);
  };

  const getProductDescription = async (codigo: string) => {
    // Primero buscar en productos de mock data
    const producto = productos.find(p => p.codigo === codigo);
    if (producto) {
      return producto.descripcion;
    }
    
    // Si no se encuentra, buscar en la base de datos
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('descripcion')
        .eq('codigo', codigo)
        .single();
      
      if (error || !data) {
        return "Producto no encontrado";
      }
      
      return data.descripcion;
    } catch (error) {
      return "Producto no encontrado";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Incidentes</h1>
          <p className="text-muted-foreground">
            Seguimiento de reparaciones y servicios técnicos
          </p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => navigate("/incidentes/nuevo")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Incidente
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
                  {incidentesList.filter(i => i.status === "Pendiente de diagnostico").length}
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
                  {incidentesList.filter(i => ["En diagnostico", "pendiente repuestos", "Presupuesto"].includes(i.status)).length}
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
                  {incidentesList.filter(i => ["Reparado", "Canje", "Nota de credito", "Cambio por garantia"].includes(i.status)).length}
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
                  {incidentesList.filter(i => i.coberturaGarantia).length}
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
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

            {selectedIncidentes.length > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {selectedIncidentes.length} seleccionado(s)
                </Badge>
                <Button variant="outline" size="sm">
                  Asignar Técnico
                </Button>
                <Button variant="outline" size="sm">
                  Cambiar Estado
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIncidentes.length === filteredIncidentes.length && filteredIncidentes.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
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
                {filteredIncidentes.map((incidente) => (
                  <TableRow 
                    key={incidente.id}
                    className={`${selectedIncidentes.includes(incidente.id) ? "bg-muted/50" : ""} cursor-pointer hover:bg-muted/30`}
                    onClick={(e) => handleRowClick(incidente.id, e)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIncidentes.includes(incidente.id)}
                        onCheckedChange={(checked) => handleSelectIncidente(incidente.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{incidente.id}</TableCell>
                    <TableCell>{getClienteName(incidente.codigoCliente)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{getProductDisplayName(incidente.codigoProducto)}</span>
                        {isProductDiscontinued(incidente.codigoProducto) && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Descontinuado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{getTecnicoName(incidente.codigoTecnico)}</TableCell>
                    <TableCell>
                      <StatusBadge status={incidente.status} />
                    </TableCell>
                    <TableCell>
                      {incidente.coberturaGarantia ? (
                        <Badge className="bg-success text-success-foreground">
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{incidente.fechaIngreso}</TableCell>
                     <TableCell className="text-right">
                       <div className="flex items-center justify-end space-x-2">
                         {incidente.status === "Pendiente de diagnostico" && (
                           <>
                             <Button 
                               variant="secondary" 
                               size="sm"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 // Asignar técnico al incidente
                                 const updatedIncidentes = incidentesList.map(inc => 
                                   inc.id === incidente.id 
                                     ? { ...inc, tecnicoAsignado: "TEC001" } // En un caso real, esto sería dinámico
                                     : inc
                                 );
                                 setIncidentesList(updatedIncidentes);
                               }}
                             >
                               <User className="h-4 w-4 mr-1" />
                               Asignarme
                             </Button>
                             <Button 
                               variant="default" 
                               size="sm"
                               onClick={(e) => handleDiagnosticar(incidente.id, e)}
                               className="bg-primary text-primary-foreground hover:bg-primary/90"
                             >
                               <Stethoscope className="h-4 w-4 mr-1" />
                               Diagnosticar
                             </Button>
                           </>
                         )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleVerIncidente(incidente.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}