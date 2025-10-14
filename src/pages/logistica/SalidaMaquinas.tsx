import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Send } from "lucide-react";
import { useState } from "react";

export default function SalidaMaquinas() {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - replace with actual data from Supabase
  const maquinas = [
    {
      id: "1",
      codigo: "INC-000125",
      producto: "Esmeril Angular 4 1/2",
      cliente: "Ferretería San José",
      destino: "Antigua Guatemala",
      fechaReparacion: "2024-03-14",
      estado: "Lista para envío"
    },
    {
      id: "2",
      codigo: "INC-000126",
      producto: "Rotomartillo 1",
      cliente: "Constructora XYZ",
      destino: "Chimaltenango",
      fechaReparacion: "2024-03-13",
      estado: "Lista para envío"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Salida de Máquinas</h1>
          <p className="text-muted-foreground mt-1">
            Gestionar salida de máquinas reparadas a destinos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Máquinas Listas para Envío</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, producto o destino..."
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
                <TableHead>Destino</TableHead>
                <TableHead>Fecha Reparación</TableHead>
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
                  <TableCell>{maquina.destino}</TableCell>
                  <TableCell>{maquina.fechaReparacion}</TableCell>
                  <TableCell>
                    <Badge variant="default">{maquina.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="default" size="sm">
                      <Send className="h-4 w-4 mr-1" />
                      Crear Guía
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
