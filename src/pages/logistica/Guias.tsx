import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileText } from "lucide-react";
import { useState } from "react";

export default function Guias() {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - replace with actual data from Supabase
  const guias = [
    {
      id: "1",
      numeroGuia: "GUIA-2024-001",
      destino: "Quetzaltenango",
      transportista: "Transporte ZIGO",
      cantidadMaquinas: 3,
      fechaCreacion: "2024-03-15",
      fechaSalida: "2024-03-16",
      estado: "En tránsito"
    },
    {
      id: "2",
      numeroGuia: "GUIA-2024-002",
      destino: "Escuintla",
      transportista: "Transporte ZIGO",
      cantidadMaquinas: 2,
      fechaCreacion: "2024-03-14",
      fechaSalida: "2024-03-15",
      estado: "Entregado"
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Guías de Envío</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de guías para transporte de máquinas
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Guía
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Guías</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número de guía o destino..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Guía</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Transportista</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead>Fecha Salida</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guias.map((guia) => (
                <TableRow key={guia.id}>
                  <TableCell className="font-medium">{guia.numeroGuia}</TableCell>
                  <TableCell>{guia.destino}</TableCell>
                  <TableCell>{guia.transportista}</TableCell>
                  <TableCell>{guia.cantidadMaquinas}</TableCell>
                  <TableCell>{guia.fechaCreacion}</TableCell>
                  <TableCell>{guia.fechaSalida}</TableCell>
                  <TableCell>
                    <Badge variant={guia.estado === "Entregado" ? "default" : "secondary"}>
                      {guia.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-1" />
                      Imprimir
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
