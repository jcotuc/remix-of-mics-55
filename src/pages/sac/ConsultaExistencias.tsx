import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Package, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { mycsapi } from "@/mics-api";

type RepuestoConStock = {
  id: number;
  codigo: string;
  clave: string;
  descripcion: string;
  stock: number;
  disponible_mostrador: boolean;
  ubicacion: string | null;
};

export default function ConsultaExistencias() {
  const [searchTerm, setSearchTerm] = useState("");
  const [repuestos, setRepuestos] = useState<RepuestoConStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Ingresa un código o descripción para buscar");
      return;
    }

    try {
      setLoading(true);
      setSearched(true);

      // Search repuestos via API
      const [repuestosRes, inventarioRes] = await Promise.all([
        mycsapi.get("/api/v1/repuestos", { query: { search: searchTerm, limit: 50 } as any }),
        mycsapi.get("/api/v1/inventario", { query: { limit: 5000 } })
      ]);

      const repuestosData = repuestosRes.results || [];
      const inventarioData = (inventarioRes as any).data || [];

      // Combine data
      const repuestosConStock: RepuestoConStock[] = repuestosData.map(rep => {
        const inv = inventarioData.find(i => i.codigo_repuesto === rep.codigo);
        return {
          id: rep.id,
          codigo: rep.codigo,
          clave: '',
          descripcion: rep.descripcion || '',
          disponible_mostrador: false,
          stock: inv?.cantidad || 0,
          ubicacion: inv?.bodega || null
        };
      });

      setRepuestos(repuestosConStock);

      if (repuestosConStock.length === 0) {
        toast.info("No se encontraron repuestos");
      }
    } catch (error: any) {
      console.error("Error searching parts:", error);
      toast.error("Error al buscar repuestos");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Consulta de Existencias y Precios</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Búsqueda de Repuestos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, clave o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Resultados ({repuestos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {repuestos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron repuestos con ese criterio
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Clave</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center">Disponibilidad</TableHead>
                      <TableHead>Ubicación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repuestos.map((repuesto) => (
                      <TableRow key={repuesto.id}>
                        <TableCell className="font-medium">{repuesto.codigo}</TableCell>
                        <TableCell>{repuesto.clave}</TableCell>
                        <TableCell>{repuesto.descripcion}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={repuesto.stock > 0 ? "default" : "secondary"}
                          >
                            {repuesto.stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {repuesto.disponible_mostrador ? (
                            <Badge variant="default" className="gap-1">
                              <Package className="h-3 w-3" />
                              Disponible
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No disponible</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {repuesto.ubicacion || (
                            <span className="text-muted-foreground">Sin ubicación</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Información de Precios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Para información de precios específicos, por favor contacta al departamento de ventas
            o consulta el sistema de cotizaciones.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
