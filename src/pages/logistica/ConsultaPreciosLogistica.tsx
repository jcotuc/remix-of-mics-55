import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, DollarSign } from "lucide-react";

export default function ConsultaPreciosLogistica() {
  const [searchTerm, setSearchTerm] = useState("");

  // Datos de ejemplo - reemplazar con datos reales de Supabase
  const productos = [
    {
      id: "1",
      codigo: "PROD-001",
      descripcion: "Taladro Eléctrico 1/2\"",
      precio: "Q 450.00",
      stock: "15",
      categoria: "Eléctricas"
    },
    {
      id: "2",
      codigo: "PROD-002",
      descripcion: "Sierra Circular 7 1/4\"",
      precio: "Q 850.00",
      stock: "8",
      categoria: "Eléctricas"
    },
  ];

  const filteredProductos = productos.filter(p =>
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Consulta de Precios</h1>
        <p className="text-muted-foreground">Consulta de precios de productos y repuestos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Listado de Precios
          </CardTitle>
          <CardDescription>Búsqueda de precios de productos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por código o descripción..."
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
                <TableHead>Descripción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProductos.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.codigo}</TableCell>
                  <TableCell>{item.descripcion}</TableCell>
                  <TableCell>{item.categoria}</TableCell>
                  <TableCell>{item.stock}</TableCell>
                  <TableCell className="font-semibold">{item.precio}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
