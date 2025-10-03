import { useState, useEffect } from "react";
import { Search, Plus, DollarSign, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Producto = Database['public']['Tables']['productos']['Row'];
type Cliente = Database['public']['Tables']['clientes']['Row'];

export default function ConsultaPrecios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [cantidad, setCantidad] = useState("1");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 3) {
      fetchProductos();
    } else {
      setProductos([]);
    }
  }, [searchTerm]);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .or(`codigo.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error('Error al buscar productos:', error);
      toast.error('Error al buscar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearCotizacion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProducto || !selectedCliente || !precioUnitario) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    try {
      const { error } = await supabase
        .from('cotizaciones')
        .insert({
          codigo_cliente: selectedCliente,
          codigo_producto: selectedProducto.codigo,
          cantidad: parseInt(cantidad),
          precio_unitario: parseFloat(precioUnitario),
          notas: notas || null
        });

      if (error) throw error;

      toast.success('Cotización creada exitosamente');
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error al crear cotización:', error);
      toast.error('Error al crear la cotización');
    }
  };

  const resetForm = () => {
    setSelectedProducto(null);
    setSelectedCliente("");
    setCantidad("1");
    setPrecioUnitario("");
    setNotas("");
  };

  const abrirDialogoCotizacion = (producto: Producto) => {
    setSelectedProducto(producto);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Consulta de Precios</h1>
          <p className="text-muted-foreground">
            Busca productos y crea cotizaciones para clientes
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Búsqueda de Productos</CardTitle>
          <CardDescription>
            Ingresa el código o descripción del producto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando...
            </div>
          ) : productos.length === 0 && searchTerm.length >= 3 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No se encontraron productos</p>
            </div>
          ) : productos.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Clave</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.map((producto) => (
                    <TableRow key={producto.id}>
                      <TableCell className="font-medium">{producto.codigo}</TableCell>
                      <TableCell>{producto.clave}</TableCell>
                      <TableCell>{producto.descripcion}</TableCell>
                      <TableCell>
                        {producto.descontinuado ? (
                          <span className="text-destructive">Descontinuado</span>
                        ) : (
                          <span className="text-success">Activo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => abrirDialogoCotizacion(producto)}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Cotizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Cotización</DialogTitle>
            <DialogDescription>
              {selectedProducto?.descripcion}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCrearCotizacion} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente *</Label>
              <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.codigo} value={cliente.codigo}>
                      {cliente.nombre} - {cliente.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad *</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precio">Precio Unitario (Q) *</Label>
                <Input
                  id="precio"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioUnitario}
                  onChange={(e) => setPrecioUnitario(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Información adicional..."
                rows={3}
              />
            </div>

            {selectedProducto && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Total</p>
                <p className="text-2xl font-bold">
                  Q {(parseFloat(cantidad) * parseFloat(precioUnitario || "0")).toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Crear Cotización
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
