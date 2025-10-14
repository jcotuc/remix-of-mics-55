import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle } from "lucide-react";

export default function DanosTransporte() {
  const [searchTerm, setSearchTerm] = useState("");

  // Datos de ejemplo - reemplazar con datos reales de Supabase
  const danos = [
    {
      id: "1",
      codigo: "INC-000156",
      producto: "Compresor de Aire",
      cliente: "Taller Mecánico El Rápido",
      transportista: "Cargo Express",
      fechaReporte: "2024-01-15",
      tipoDano: "Golpe en carcasa",
      estado: "Pendiente"
    },
    {
      id: "2",
      codigo: "INC-000178",
      producto: "Hidrolavadora",
      cliente: "Car Wash Premium",
      transportista: "Envíos Rápidos",
      fechaReporte: "2024-01-13",
      tipoDano: "Manguera rota",
      estado: "En reclamo"
    },
  ];

  const filteredDanos = danos.filter(d =>
    d.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.transportista.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Daños por Transporte</h1>
        <p className="text-muted-foreground">Registro de incidencias por daños durante el transporte</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Reportes de Daños
          </CardTitle>
          <CardDescription>Lista de máquinas dañadas durante el transporte</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por código, producto o transportista..."
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
                <TableHead>Transportista</TableHead>
                <TableHead>Tipo de Daño</TableHead>
                <TableHead>Fecha Reporte</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDanos.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.codigo}</TableCell>
                  <TableCell>{item.producto}</TableCell>
                  <TableCell>{item.cliente}</TableCell>
                  <TableCell>{item.transportista}</TableCell>
                  <TableCell>{item.tipoDano}</TableCell>
                  <TableCell>{item.fechaReporte}</TableCell>
                  <TableCell>
                    <Badge variant={item.estado === "Pendiente" ? "destructive" : "secondary"}>
                      {item.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">Ver Detalle</Button>
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
