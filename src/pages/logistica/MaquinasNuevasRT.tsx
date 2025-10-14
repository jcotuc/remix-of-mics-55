import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, PackageCheck } from "lucide-react";

export default function MaquinasNuevasRT() {
  const [searchTerm, setSearchTerm] = useState("");

  // Datos de ejemplo - reemplazar con datos reales de Supabase
  const maquinasRT = [
    {
      id: "1",
      sku: "SKU-001234",
      producto: "Taladro Inalámbrico",
      cliente: "Ferretería Central",
      fechaIngreso: "2024-01-15",
      motivo: "DOA - No enciende",
      estado: "Pendiente revisión"
    },
    {
      id: "2",
      sku: "SKU-005678",
      producto: "Esmeril Angular",
      cliente: "Constructora López",
      fechaIngreso: "2024-01-14",
      motivo: "Defecto de fábrica",
      estado: "En proceso"
    },
  ];

  const filteredMaquinas = maquinasRT.filter(m =>
    m.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.cliente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Máquinas Nuevas RT</h1>
        <p className="text-muted-foreground">Registro de máquinas nuevas con problemas de fábrica</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Máquinas Nuevas en Garantía
          </CardTitle>
          <CardDescription>Lista de máquinas nuevas ingresadas por defectos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por SKU, producto o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha Ingreso</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaquinas.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>{item.producto}</TableCell>
                  <TableCell>{item.cliente}</TableCell>
                  <TableCell>{item.fechaIngreso}</TableCell>
                  <TableCell>{item.motivo}</TableCell>
                  <TableCell>
                    <Badge variant={item.estado === "Pendiente revisión" ? "destructive" : "secondary"}>
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
