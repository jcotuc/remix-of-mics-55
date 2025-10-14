import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function IngresoMaquinas() {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - replace with actual data from Supabase
  const maquinas = [
    {
      id: "1",
      codigo: "INC-000123",
      producto: "Taladro Percutor 1/2",
      cliente: "Ferretería El Progreso",
      embarque: "EMB-2024-001",
      fechaLlegada: "2024-03-15",
      estado: "Pendiente ingreso"
    },
    {
      id: "2",
      codigo: "INC-000124",
      producto: "Sierra Circular 7 1/4",
      cliente: "Constructora ABC",
      embarque: "EMB-2024-001",
      fechaLlegada: "2024-03-15",
      estado: "Pendiente ingreso"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ingreso de Máquinas</h1>
          <p className="text-muted-foreground mt-1">
            Dar ingreso a máquinas que llegan en embarques
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Máquinas Pendientes de Ingreso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, producto o embarque..."
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
                <TableHead>Fecha Llegada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maquinas.map((maquina) => (
                <TableRow key={maquina.id}>
                  <TableCell className="font-medium">{maquina.codigo}</TableCell>
                  <TableCell>{maquina.producto}</TableCell>
                  <TableCell>{maquina.cliente}</TableCell>
                  <TableCell>{maquina.embarque}</TableCell>
                  <TableCell>{maquina.fechaLlegada}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{maquina.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="default" size="sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Dar Ingreso
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
