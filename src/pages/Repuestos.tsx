import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package, RefreshCw, Upload, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Repuesto, Producto } from "@/types";
import { insertAllRepuestos } from "@/scripts/insertRepuestos";
import { importSustitutos } from "@/scripts/importSustitutos";
import { useToast } from "@/components/ui/use-toast";

interface RepuestoExtendido extends Repuesto {
  codigoPadre?: string | null;
  esCodigoPadre?: boolean | null;
}

export default function Repuestos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [repuestosList, setRepuestosList] = useState<RepuestoExtendido[]>([]);
  const [productosList, setProductosList] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importingSustitutos, setImportingSustitutos] = useState(false);
  const [mostrarSoloPadres, setMostrarSoloPadres] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRepuestosAndProductos();
  }, []);

  const fetchRepuestosAndProductos = async () => {
    try {
      setLoading(true);
      
      // Fetch repuestos (sin límite)
      let allRepuestos: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: repuestosData, error: repuestosError } = await supabase
          .from('repuestos')
          .select('*')
          .order('codigo')
          .range(from, from + pageSize - 1);

        if (repuestosError) {
          console.error('Error fetching repuestos:', repuestosError);
          return;
        }

        if (!repuestosData || repuestosData.length === 0) break;
        
        allRepuestos = [...allRepuestos, ...repuestosData];
        
        if (repuestosData.length < pageSize) break;
        from += pageSize;
      }

      console.log('Total repuestos cargados:', allRepuestos.length);

      // Fetch productos
      const { data: productosData, error: productosError } = await supabase
        .from('productos')
        .select('*')
        .order('descripcion');

      if (productosError) {
        console.error('Error fetching productos:', productosError);
        return;
      }

      console.log('Productos fetched:', productosData?.length);

      // Transform data to match frontend types
      const transformedRepuestos: RepuestoExtendido[] = allRepuestos?.map((r: any) => ({
        numero: r.numero,
        codigo: r.codigo,
        clave: r.clave,
        descripcion: r.descripcion,
        urlFoto: r.url_foto || "/api/placeholder/40/40",
        codigoProducto: r.codigo_producto,
        codigoPadre: r.codigo_padre,
        esCodigoPadre: r.es_codigo_padre
      })) || [];

      const transformedProductos: Producto[] = productosData?.map((p: any) => ({
        codigo: p.codigo,
        clave: p.clave,
        descripcion: p.descripcion,
        descontinuado: p.descontinuado,
        urlFoto: p.url_foto || "/api/placeholder/400/300",
        categoria: "Electricas" as const
      })) || [];

      console.log('Repuestos transformados:', transformedRepuestos.length);
      console.log('Productos transformados:', transformedProductos.length);

      setRepuestosList(transformedRepuestos);
      setProductosList(transformedProductos);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRepuestos = repuestosList.filter(repuesto => {
    const matchesSearch = repuesto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repuesto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repuesto.clave.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProduct = selectedProduct === "all" || repuesto.codigoProducto === selectedProduct;
    
    // Filter to show only parent codes if toggle is enabled
    const matchesPadreFilter = !mostrarSoloPadres || 
      repuesto.esCodigoPadre === true || 
      repuesto.codigoPadre === null;
    
    return matchesSearch && matchesProduct && matchesPadreFilter;
  });

  const handleImportSustitutos = async () => {
    setImportingSustitutos(true);
    try {
      const result = await importSustitutos();
      if (result.success) {
        toast({
          title: "Importación de sustitutos exitosa",
          description: result.message,
        });
        await fetchRepuestosAndProductos();
      } else {
        toast({
          title: "Error en la importación",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error importing sustitutos:', error);
      toast({
        title: "Error",
        description: "Error al importar los sustitutos",
        variant: "destructive",
      });
    } finally {
      setImportingSustitutos(false);
    }
  };

  const getProductDescription = (codigoProducto: string) => {
    const producto = productosList.find(p => p.codigo === codigoProducto);
    return producto ? producto.descripcion : "Producto no encontrado";
  };

  const handleImportRepuestos = async () => {
    setImporting(true);
    try {
      const result = await insertAllRepuestos();
      if (result.success) {
        toast({
          title: "Importación exitosa",
          description: "Los repuestos han sido importados correctamente",
        });
        await fetchRepuestosAndProductos();
      } else {
        toast({
          title: "Error en la importación",
          description: "Hubo un problema al importar los repuestos",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error importing repuestos:', error);
      toast({
        title: "Error",
        description: "Error al importar los repuestos",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
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
            onClick={handleImportRepuestos}
            disabled={importing || loading}
          >
            <Upload className={`h-4 w-4 mr-2 ${importing ? 'animate-pulse' : ''}`} />
            Importar Repuestos
          </Button>
          <Button 
            variant="outline"
            onClick={handleImportSustitutos}
            disabled={importingSustitutos || loading}
          >
            <GitBranch className={`h-4 w-4 mr-2 ${importingSustitutos ? 'animate-pulse' : ''}`} />
            Importar Sustitutos
          </Button>
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

            <div className="flex items-center space-x-2">
              <Switch
                id="mostrar-padres"
                checked={mostrarSoloPadres}
                onCheckedChange={setMostrarSoloPadres}
              />
              <Label htmlFor="mostrar-padres" className="text-sm">
                Solo códigos padre
              </Label>
            </div>
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
                {filteredRepuestos.map((repuesto) => (
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
                    <TableCell>{repuesto.codigo}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}