import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle } from "lucide-react";

export default function FaltanteAccesorios() {
  const [searchTerm, setSearchTerm] = useState("");

  // Datos de ejemplo - reemplazar con datos reales de Supabase
  const faltantes = [
    {
      id: "1",
      codigo: "INC-000123",
      producto: "Taladro Eléctrico",
      cliente: "Juan Pérez",
      accesoriosFaltantes: "Cable de poder, brocas",
      fechaReporte: "2024-01-15",
      estado: "Pendiente"
    },
    {
      id: "2",
      codigo: "INC-000145",
      producto: "Sierra Circular",
      cliente: "María López",
      accesoriosFaltantes: "Guía de corte",
      fechaReporte: "2024-01-14",
      estado: "En proceso"
    },
  ];

  const filteredFaltantes = faltantes.filter(f =>
    f.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cliente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Faltante de Accesorios</h1>
        <p className="text-muted-foreground">Registro de accesorios faltantes en máquinas ingresadas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Reportes de Faltantes
          </CardTitle>
          <CardDescription>Lista de máquinas con accesorios faltantes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
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
                <TableHead>Accesorios Faltantes</TableHead>
                <TableHead>Fecha Reporte</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFaltantes.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.codigo}</TableCell>
                  <TableCell>{item.producto}</TableCell>
                  <TableCell>{item.cliente}</TableCell>
                  <TableCell>{item.accesoriosFaltantes}</TableCell>
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
