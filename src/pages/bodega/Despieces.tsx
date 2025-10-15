import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Despiece {
  id: string;
  sku: string;
  descripcion: string;
  fechaIngreso: string;
  estado: 'disponible' | 'en_uso' | 'agotado';
  repuestosDisponibles: RepuestoDespiece[];
  fotoUrl?: string;
}

interface RepuestoDespiece {
  codigo: string;
  descripcion: string;
  cantidadOriginal: number;
  cantidadDisponible: number;
}

export default function Despieces() {
  const [despieces, setDespieces] = useState<Despiece[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDespiece, setSelectedDespiece] = useState<Despiece | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Formulario para nuevo despiece
  const [selectedProducto, setSelectedProducto] = useState('');
  const [productosDisponibles, setProductosDisponibles] = useState<any[]>([]);

  useEffect(() => {
    fetchProductos();
    fetchDespieces();
  }, []);

  const fetchProductos = async () => {
    // Cargar productos (máquinas) del catálogo
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('descripcion', { ascending: true });
    
    if (error) {
      toast.error('Error al cargar productos');
      return;
    }
    setProductosDisponibles(data || []);
  };

  const fetchDespieces = async () => {
    setLoading(true);
    
    // Primero obtener los despieces
    const { data: despiecesData, error: despiecesError } = await supabase
      .from('despieces')
      .select('*')
      .order('fecha_ingreso', { ascending: false });
    
    if (despiecesError) {
      console.error('Error al cargar despieces:', despiecesError);
      toast.error('Error al cargar despieces');
      setLoading(false);
      return;
    }

    // Obtener los códigos de productos únicos
    const codigosProductos = [...new Set(despiecesData?.map(d => d.codigo_producto) || [])];
    
    // Cargar las fotos de los productos
    const { data: productosData } = await supabase
      .from('productos')
      .select('codigo, url_foto')
      .in('codigo', codigosProductos);

    const productosMap = new Map(productosData?.map(p => [p.codigo, p.url_foto]) || []);

    const despiecesFormateados = (despiecesData || []).map(d => ({
      id: d.id,
      sku: d.sku_maquina,
      descripcion: d.descripcion,
      fechaIngreso: new Date(d.fecha_ingreso).toLocaleDateString(),
      estado: d.estado as 'disponible' | 'en_uso' | 'agotado',
      repuestosDisponibles: (d.repuestos_disponibles as any) || [],
      fotoUrl: productosMap.get(d.codigo_producto) || undefined
    }));

    setDespieces(despiecesFormateados as any);
    setLoading(false);
  };

  const handleVerDetalle = (despiece: Despiece) => {
    setSelectedDespiece(despiece);
    setDialogOpen(true);
  };

  const handleAgregarDespiece = async () => {
    if (!selectedProducto) {
      toast.error('Seleccione un producto');
      return;
    }

    const producto = productosDisponibles.find(p => p.codigo === selectedProducto);
    if (!producto) return;

    // Obtener repuestos del producto
    const { data: repuestos, error: repuestosError } = await supabase
      .from('repuestos')
      .select('codigo, descripcion')
      .eq('codigo_producto', producto.codigo);

    if (repuestosError) {
      toast.error('Error al cargar repuestos');
      return;
    }

    const repuestosDisponibles = (repuestos || []).map(r => ({
      codigo: r.codigo,
      descripcion: r.descripcion,
      cantidadOriginal: 1,
      cantidadDisponible: 1
    }));
    
    // Generar un SKU único para este despiece
    const timestamp = Date.now();
    const skuDespiece = `DSP-${producto.codigo}-${timestamp}`;
    
    // Insertar en base de datos
    const { error } = await supabase
      .from('despieces')
      .insert({
        sku_maquina: skuDespiece,
        codigo_producto: producto.codigo,
        descripcion: producto.descripcion,
        estado: 'disponible',
        repuestos_disponibles: repuestosDisponibles
      });

    if (error) {
      console.error('Error al agregar despiece:', error);
      toast.error('Error al agregar producto para despiece');
      return;
    }

    toast.success('Producto agregado para despiece');
    
    // Limpiar formulario y recargar
    setSelectedProducto('');
    setAddDialogOpen(false);
    fetchDespieces();
  };

  const handleUsarRepuesto = async (despieceId: string, codigoRepuesto: string) => {
    const despiece = despieces.find(d => d.id === despieceId);
    if (!despiece) return;

    const updatedRepuestos = despiece.repuestosDisponibles.map(r => {
      if (r.codigo === codigoRepuesto && r.cantidadDisponible > 0) {
        return { ...r, cantidadDisponible: r.cantidadDisponible - 1 };
      }
      return r;
    });

    const todosAgotados = updatedRepuestos.every(r => r.cantidadDisponible === 0);
    const nuevoEstado = todosAgotados ? 'agotado' : 'en_uso';

    // Actualizar en base de datos
    const { error } = await supabase
      .from('despieces')
      .update({
        repuestos_disponibles: updatedRepuestos as any,
        estado: nuevoEstado
      })
      .eq('id', despieceId);

    if (error) {
      console.error('Error al actualizar despiece:', error);
      toast.error('Error al usar repuesto');
      return;
    }

    toast.success("Repuesto utilizado exitosamente");
    fetchDespieces();
    setDialogOpen(false);
  };

  const getEstadoBadge = (estado: string) => {
    const config = {
      'disponible': { variant: 'default' as const, label: 'Disponible' },
      'en_uso': { variant: 'secondary' as const, label: 'En Uso' },
      'agotado': { variant: 'destructive' as const, label: 'Agotado' }
    };
    const { variant, label } = config[estado as keyof typeof config] || config.disponible;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const filteredDespieces = despieces.filter(d => 
    d.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Despieces de Máquinas</h1>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Máquina para Despiece
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Despieces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{despieces.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {despieces.filter(d => d.estado === 'disponible').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {despieces.filter(d => d.estado === 'en_uso').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Buscar Despiece</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por SKU o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha Ingreso</TableHead>
                <TableHead>Repuestos Disponibles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Cargando despieces...
                  </TableCell>
                </TableRow>
              ) : filteredDespieces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No hay máquinas para despiece. Agregue una nueva.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDespieces.map((despiece) => (
                  <TableRow key={despiece.id}>
                    <TableCell>
                      {despiece.fotoUrl ? (
                        <img 
                          src={despiece.fotoUrl} 
                          alt={despiece.descripcion}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                          <Wrench className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{despiece.sku}</TableCell>
                    <TableCell>{despiece.descripcion}</TableCell>
                    <TableCell>{despiece.fechaIngreso}</TableCell>
                    <TableCell>
                      {despiece.repuestosDisponibles.filter(r => r.cantidadDisponible > 0).length} / {despiece.repuestosDisponibles.length}
                    </TableCell>
                    <TableCell>{getEstadoBadge(despiece.estado)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleVerDetalle(despiece)}>
                        Ver Detalle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Repuestos Disponibles - {selectedDespiece?.sku}
            </DialogTitle>
          </DialogHeader>
          {selectedDespiece && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedDespiece.descripcion}</p>
                <p className="text-sm text-muted-foreground">
                  Fecha de ingreso: {selectedDespiece.fechaIngreso}
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDespiece.repuestosDisponibles.map((repuesto) => (
                    <TableRow key={repuesto.codigo}>
                      <TableCell className="font-mono">{repuesto.codigo}</TableCell>
                      <TableCell>{repuesto.descripcion}</TableCell>
                      <TableCell className="text-right">{repuesto.cantidadOriginal}</TableCell>
                      <TableCell className="text-right">
                        <span className={repuesto.cantidadDisponible === 0 ? 'text-red-600' : 'text-green-600'}>
                          {repuesto.cantidadDisponible}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={repuesto.cantidadDisponible === 0}
                          onClick={() => handleUsarRepuesto(selectedDespiece.id, repuesto.codigo)}
                        >
                          Usar Repuesto
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Máquina para Despiece</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Seleccionar Producto del Catálogo</Label>
              <Select value={selectedProducto} onValueChange={setSelectedProducto}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un producto del catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {productosDisponibles.map((producto) => (
                    <SelectItem key={producto.codigo} value={producto.codigo}>
                      {producto.codigo} - {producto.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Al seleccionar el producto, se cargarán automáticamente todos los repuestos disponibles según el modelo
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAgregarDespiece}>
              Agregar Máquina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
