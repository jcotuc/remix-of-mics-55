import { useState } from "react";
import { Plus, Search, Edit, Eye, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { incidentes, clientes, productos, tecnicos } from "@/data/mockData";
import { Incidente, StatusIncidente } from "@/types";

export default function Incidentes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [incidentesList, setIncidentesList] = useState<Incidente[]>(incidentes);

  const statusOptions: StatusIncidente[] = [
    "Ingresado", "Diagnostico", "Repuestos solicitados", 
    "Reparado", "Documentado", "Entregado"
  ];

  const filteredIncidentes = incidentesList.filter(incidente => {
    const matchesSearch = incidente.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incidente.descripcionProblema.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || incidente.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getClienteName = (codigo: string) => {
    const cliente = clientes.find(c => c.codigo === codigo);
    return cliente ? cliente.nombre : "Cliente no encontrado";
  };

  const getProductDescription = (codigo: string) => {
    const producto = productos.find(p => p.codigo === codigo);
    return producto ? producto.descripcion : "Producto no encontrado";
  };

  const getTecnicoName = (codigo: string) => {
    const tecnico = tecnicos.find(t => t.codigo === codigo);
    return tecnico ? `${tecnico.nombre} ${tecnico.apellido}` : "Técnico no encontrado";
  };

  const isProductDiscontinued = (codigoProducto: string) => {
    const producto = productos.find(p => p.codigo === codigoProducto);
    return producto?.descontinuado || false;
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
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
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
                  {incidentesList.filter(i => ["Diagnostico", "Repuestos solicitados", "Reparado"].includes(i.status)).length}
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
                  {incidentesList.filter(i => i.status === "Entregado").length}
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
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableRow key={incidente.id}>
                    <TableCell className="font-medium">{incidente.id}</TableCell>
                    <TableCell>{getClienteName(incidente.codigoCliente)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{getProductDescription(incidente.codigoProducto)}</span>
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
                        <Button variant="outline" size="sm">
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