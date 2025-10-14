import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin } from "lucide-react";

export default function ConsultaUbicaciones() {
  const [searchTerm, setSearchTerm] = useState("");

  // Datos de ejemplo - reemplazar con datos reales de Supabase
  const ubicaciones = [
    {
      id: "1",
      codigo: "INC-000123",
      producto: "Taladro Eléctrico",
      cliente: "Juan Pérez",
      ubicacionActual: "Taller - Área de Diagnóstico",
      estado: "En diagnóstico",
      ultimaActualizacion: "2024-01-15 10:30"
    },
    {
      id: "2",
      codigo: "INC-000145",
      producto: "Sierra Circular",
      cliente: "María López",
      ubicacionActual: "Bodega - Pendiente Repuestos",
      estado: "Pendiente por repuestos",
      ultimaActualizacion: "2024-01-14 15:20"
    },
  ];

  const filteredUbicaciones = ubicaciones.filter(u =>
    u.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.cliente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Consulta de Ubicaciones</h1>
        <p className="text-muted-foreground">Localización de máquinas en el centro de servicio</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ubicaciones de Máquinas
          </CardTitle>
          <CardDescription>Rastrea la ubicación actual de las máquinas</CardDescription>
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
                <TableHead>Ubicación Actual</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última Actualización</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUbicaciones.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.codigo}</TableCell>
                  <TableCell>{item.producto}</TableCell>
                  <TableCell>{item.cliente}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {item.ubicacionActual}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.estado}</Badge>
                  </TableCell>
                  <TableCell>{item.ultimaActualizacion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
