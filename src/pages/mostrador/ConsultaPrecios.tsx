import { useState, useEffect } from "react";
import { Search, DollarSign, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { apiBackendAction } from "@/lib/api-backend";
import { toast } from "sonner";
import type { ClienteSchema } from "@/generated/actions.d";

type ProductoDisplay = {
  id: number;
  codigo: string;
  clave?: string | null;
  descripcion?: string | null;
  descontinuado?: boolean | null;
  unidades_disponibles?: number | null;
  precio_minimo?: number | null;
  precio_cliente?: number | null;
  precio_con_descuento?: number | null;
};

// Por ahora todos son consumidores finales, despues se define la logica por prefijo
const esFerretero = (_codigoCliente: string): boolean => {
  return false;
};

const formatQuetzales = (value: number | null | undefined): string => {
  if (value == null) return "Q 0.00";
  return `Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const calcularDescuento = (precioCliente: number | null | undefined, precioConDescuento: number | null | undefined): string => {
  if (!precioCliente || !precioConDescuento || precioCliente === 0) return "0%";
  const descuento = ((precioCliente - precioConDescuento) / precioCliente) * 100;
  return `${descuento.toFixed(1)}%`;
};

export default function ConsultaPrecios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [productos, setProductos] = useState<ProductoDisplay[]>([]);
  const [clientes, setClientes] = useState<ClienteSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [selectedProducto, setSelectedProducto] = useState<ProductoDisplay | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [cantidad, setCantidad] = useState("1");
  const [tipoPrecio, setTipoPrecio] = useState<"cliente" | "minimo">("cliente");
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
      const { results } = await apiBackendAction("clientes.list", { limit: 5000 });
      const sorted = [...results].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      setClientes(sorted);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const { results } = await apiBackendAction("productos.search", { 
        search: searchTerm, 
        limit: 20 
      });
      setProductos(results.map(r => ({
        id: r.id,
        codigo: r.codigo,
        clave: r.clave as string | null | undefined,
        descripcion: r.descripcion as string | null | undefined,
        descontinuado: r.descontinuado as boolean | null | undefined,
        unidades_disponibles: (r as any).unidades_disponibles as number | null | undefined,
        precio_minimo: (r as any).precio_minimo as number | null | undefined,
        precio_cliente: (r as any).precio_cliente as number | null | undefined,
        precio_con_descuento: (r as any).precio_con_descuento as number | null | undefined,
      })));
    } catch (error) {
      console.error('Error al buscar productos:', error);
      toast.error('Error al buscar productos');
    } finally {
      setLoading(false);
    }
  };

  const getPrecioSeleccionado = (): number => {
    if (!selectedProducto) return 0;
    
    // Si es ferretero, solo precio con descuento
    if (selectedCliente && esFerretero(selectedCliente)) {
      return selectedProducto.precio_con_descuento || 0;
    }
    
    // Consumidor final: segun seleccion
    return tipoPrecio === "cliente" 
      ? (selectedProducto.precio_cliente || 0)
      : (selectedProducto.precio_minimo || 0);
  };

  const handleCrearCotizacion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProducto || !selectedCliente) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    const precioFinal = getPrecioSeleccionado();
    if (precioFinal <= 0) {
      toast.error('El precio seleccionado no es válido');
      return;
    }

    try {
      await apiBackendAction("cotizaciones.create", {
        codigo_cliente: selectedCliente,
        codigo_producto: selectedProducto.codigo,
        cantidad: parseInt(cantidad),
        precio_unitario: precioFinal,
        notas: notas || null
      } as any);

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
    setTipoPrecio("cliente");
    setNotas("");
  };

  const abrirDialogoCotizacion = (producto: ProductoDisplay) => {
    setSelectedProducto(producto);
    setTipoPrecio("cliente");
    setIsDialogOpen(true);
  };

  const clienteEsFerretero = selectedCliente ? esFerretero(selectedCliente) : false;

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
            Ingresa el código o descripción del producto (mínimo 3 caracteres)
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
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Clave</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">U. Disponibles</TableHead>
                    <TableHead className="text-right">Precio Mínimo</TableHead>
                    <TableHead className="text-right">Precio Cliente</TableHead>
                    <TableHead className="text-right">Descuento</TableHead>
                    <TableHead className="text-right">Precio c/Descuento</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.map((producto) => (
                    <TableRow key={producto.id}>
                      <TableCell className="font-medium font-mono">{producto.codigo}</TableCell>
                      <TableCell className="text-muted-foreground">{producto.clave || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{producto.descripcion}</TableCell>
                      <TableCell>
                        {producto.descontinuado ? (
                          <Badge variant="destructive">Descontinuado</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">Activo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={producto.unidades_disponibles && producto.unidades_disponibles > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                          {producto.unidades_disponibles || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatQuetzales(producto.precio_minimo)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatQuetzales(producto.precio_cliente)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {calcularDescuento(producto.precio_cliente, producto.precio_con_descuento)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {formatQuetzales(producto.precio_con_descuento)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => abrirDialogoCotizacion(producto)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Cotización</DialogTitle>
            <DialogDescription>
              {selectedProducto?.codigo} - {selectedProducto?.descripcion}
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

            {/* Selector de tipo de precio */}
            <div className="space-y-3">
              <Label>Tipo de Precio *</Label>
              
              {clienteEsFerretero ? (
                // Ferretero: solo precio con descuento
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Precio con Descuento</p>
                      <p className="text-sm text-muted-foreground">
                        Descuento ferretero aplicado
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {formatQuetzales(selectedProducto?.precio_con_descuento)}
                    </p>
                  </div>
                </div>
              ) : (
                // Consumidor final: elegir entre precio cliente o precio minimo
                <RadioGroup 
                  value={tipoPrecio} 
                  onValueChange={(v) => setTipoPrecio(v as "cliente" | "minimo")}
                  className="space-y-2"
                >
                  <div className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${tipoPrecio === "cliente" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="cliente" id="precio-cliente" />
                      <div>
                        <Label htmlFor="precio-cliente" className="cursor-pointer font-medium">
                          Precio Cliente
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Precio mínimo de venta
                        </p>
                      </div>
                    </div>
                    <p className="text-xl font-bold">
                      {formatQuetzales(selectedProducto?.precio_cliente)}
                    </p>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${tipoPrecio === "minimo" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="minimo" id="precio-minimo" />
                      <div>
                        <Label htmlFor="precio-minimo" className="cursor-pointer font-medium">
                          Precio Mínimo
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Precio máximo de venta
                        </p>
                      </div>
                    </div>
                    <p className="text-xl font-bold">
                      {formatQuetzales(selectedProducto?.precio_minimo)}
                    </p>
                  </div>
                </RadioGroup>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
                className="max-w-32"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Información adicional..."
                rows={2}
              />
            </div>

            {selectedProducto && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total</p>
                    <p className="text-sm text-muted-foreground">
                      {cantidad} x {formatQuetzales(getPrecioSeleccionado())}
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-primary">
                    {formatQuetzales(parseFloat(cantidad) * getPrecioSeleccionado())}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
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
