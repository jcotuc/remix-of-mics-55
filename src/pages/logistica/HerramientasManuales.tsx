import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";
import { useState } from "react";

export default function HerramientasManuales() {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - replace with actual data from Supabase
  const herramientas = [
    {
      id: "1",
      codigo: "INC-000123",
      producto: "Taladro Percutor 1/2",
      cliente: "Ferretería El Progreso",
      embarque: "EMB-2024-001",
      fechaIngreso: "2024-03-15",
      estado: "Pendiente ingreso"
    },
    {
      id: "2",
      codigo: "INC-000124",
      producto: "Sierra Circular 7 1/4",
      cliente: "Constructora ABC",
      embarque: "EMB-2024-002",
      fechaIngreso: "2024-03-16",
      estado: "Ingresado"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Herramientas Manuales</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de herramientas manuales en embarques
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Herramienta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Herramientas en Tránsito</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, producto o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Embarque</TableHead>
                <TableHead>Fecha Ingreso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {herramientas.map((herramienta) => (
                <TableRow key={herramienta.id}>
                  <TableCell className="font-medium">{herramienta.codigo}</TableCell>
                  <TableCell>{herramienta.producto}</TableCell>
                  <TableCell>{herramienta.cliente}</TableCell>
                  <TableCell>{herramienta.embarque}</TableCell>
                  <TableCell>{herramienta.fechaIngreso}</TableCell>
                  <TableCell>
                    <Badge variant={herramienta.estado === "Ingresado" ? "default" : "secondary"}>
                      {herramienta.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Ver Detalles
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
