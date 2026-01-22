import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiBackendAction } from "@/lib/api-backend";
import { TablePagination } from "@/components/shared";

interface Producto {
  id: number;
  codigo: string;
  descripcion?: string;
}

interface RepuestoExtendido {
  numero: string;
  codigo: string;
  clave: string;
  descripcion: string;
  urlFoto: string;
  codigoProducto: string;
  productoId?: string | null;
  codigoPadre?: string | null;
  esCodigoPadre?: boolean | null;
  codigosHijos?: string[];
}

export default function Repuestos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [repuestosList, setRepuestosList] = useState<RepuestoExtendido[]>([]);
  const [productosList, setProductosList] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [hijoPadreMap, setHijoPadreMap] = useState<Map<string, string>>(new Map());
  const [padreHijosMap, setPadreHijosMap] = useState<Map<string, string[]>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    fetchRepuestosAndProductos();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProduct]);

  const fetchRepuestosAndProductos = async () => {
    try {
      setLoading(true);
      
      // Fetch all relaciones in batches using apiBackendAction
      let allRelaciones: any[] = [];
      let relOffset = 0;
      const relPageSize = 1000;
      
      while (true) {
        const { results: relacionesData } = await apiBackendAction("repuestos_relaciones.list", { 
          limit: relPageSize, 
          offset: relOffset 
        });

        if (!relacionesData || relacionesData.length === 0) break;
        
        allRelaciones = [...allRelaciones, ...relacionesData];
        
        if (relacionesData.length < relPageSize) break;
        relOffset += relPageSize;
      }
      
      console.log('Total relaciones cargadas:', allRelaciones.length);

      const newHijoPadreMap = new Map<string, string>();
      const newPadreHijosMap = new Map<string, string[]>();
      
      allRelaciones.forEach((r: any) => {
        const hijo = r.Hijo;
        const padre = r.Padre;
        
        if (hijo && padre) {
          newHijoPadreMap.set(hijo, padre);
          
          const hijos = newPadreHijosMap.get(padre) || [];
          hijos.push(hijo);
          newPadreHijosMap.set(padre, hijos);
        }
      });
      
      setHijoPadreMap(newHijoPadreMap);
      setPadreHijosMap(newPadreHijosMap);
      
      // Fetch repuestos using existing handler
      const { results: repuestosData } = await apiBackendAction("repuestos.list", {});

      // Fetch productos using apiBackendAction
      const { results: productosData } = await apiBackendAction("productos.list", { limit: 2000 });

      const codigosHijo = new Set(newHijoPadreMap.keys());
      
      // Create a map of producto id -> producto for quick lookup
      const productosMap = new Map<string, any>();
      productosData?.forEach((p: any) => {
        productosMap.set(String(p.id), p);
        productosMap.set(p.codigo, p);
      });

      const transformedRepuestos: RepuestoExtendido[] = (repuestosData || [])
        .filter((r: any) => !codigosHijo.has(r.codigo))
        .map((r: any) => {
          const producto = r.producto_id 
            ? productosMap.get(String(r.producto_id))
            : productosMap.get(r.codigo_producto);
          
          return {
            numero: r.numero,
            codigo: r.codigo,
            clave: r.clave,
            descripcion: r.descripcion,
            urlFoto: r.url_foto || "/api/placeholder/40/40",
            codigoProducto: producto?.codigo || r.codigo_producto,
            productoId: r.producto_id,
            codigoPadre: r.codigo_padre,
            esCodigoPadre: r.es_codigo_padre,
            codigosHijos: newPadreHijosMap.get(r.codigo) || []
          };
        });

      setRepuestosList(transformedRepuestos);
      setProductosList(productosData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRepuestos = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    
    return repuestosList.filter(repuesto => {
      let matchesSearch = repuesto.descripcion.toLowerCase().includes(search) ||
        repuesto.codigo.toLowerCase().includes(search) ||
        repuesto.clave.toLowerCase().includes(search);
      
      if (!matchesSearch && search) {
        const padreDelBuscado = hijoPadreMap.get(search.toUpperCase());
        if (padreDelBuscado) {
          matchesSearch = repuesto.codigo === padreDelBuscado;
        }
        
        if (!matchesSearch && repuesto.codigosHijos && repuesto.codigosHijos.length > 0) {
          matchesSearch = repuesto.codigosHijos.some(hijo => 
            hijo.toLowerCase().includes(search)
          );
        }
      }
      
      const matchesProduct = selectedProduct === "all" || repuesto.codigoProducto === selectedProduct;
      
      return matchesSearch && matchesProduct;
    });
  }, [repuestosList, searchTerm, selectedProduct, hijoPadreMap]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRepuestos.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRepuestos = filteredRepuestos.slice(startIndex, startIndex + itemsPerPage);

  const getProductDescription = (codigoProducto: string) => {
    const producto = productosList.find(p => p.codigo === codigoProducto);
    return producto?.descripcion || "Producto no encontrado";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-lg">Cargando repuestos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Catálogo de Repuestos</h1>
          <p className="text-muted-foreground">
            Administra los repuestos disponibles para cada producto
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline"
            onClick={fetchRepuestosAndProductos}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Repuesto
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Repuestos</CardTitle>
          <CardDescription>
            {filteredRepuestos.length} repuestos disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center flex-wrap gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar repuestos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-[250px]">
                <Package className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por producto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los productos</SelectItem>
                {productosList.map((producto) => (
                  <SelectItem key={producto.codigo} value={producto.codigo}>
                    {producto.codigo} - {producto.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foto</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Clave</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRepuestos.map((repuesto) => (
                  <TableRow key={repuesto.codigo}>
                    <TableCell>
                      <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                        <img 
                          src={repuesto.urlFoto} 
                          alt={repuesto.descripcion}
                          className="w-10 h-10 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = "/api/placeholder/40/40";
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{repuesto.numero}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {repuesto.codigo}
                        {repuesto.codigosHijos && repuesto.codigosHijos.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {repuesto.codigosHijos.length} hijo{repuesto.codigosHijos.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{repuesto.clave}</TableCell>
                    <TableCell>{repuesto.descripcion}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getProductDescription(repuesto.codigoProducto)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRepuestos.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}