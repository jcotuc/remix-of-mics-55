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
  const [selectedMaquina, setSelectedMaquina] = useState('');
  const [maquinasDisponibles, setMaquinasDisponibles] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);

  useEffect(() => {
    fetchMaquinas();
    fetchDespieces();
  }, []);

  const fetchMaquinas = async () => {
    // Cargar incidentes con sus productos
    const { data, error } = await supabase
      .from('incidentes')
      .select(`
        id,
        codigo,
        sku_maquina,
        codigo_producto,
        productos (
          codigo,
          descripcion
        )
      `)
      .not('sku_maquina', 'is', null)
      .order('fecha_ingreso', { ascending: false });
    
    if (error) {
      toast.error('Error al cargar máquinas');
      return;
    }
    setMaquinasDisponibles(data || []);
  };

  const fetchDespieces = async () => {
    setLoading(true);
    // Por ahora usamos datos de ejemplo
    // En el futuro se puede crear una tabla en Supabase
    setDespieces([
      {
        id: '1',
        sku: 'MAQ-001',
        descripcion: 'Compresor Industrial 5HP',
        fechaIngreso: '2024-01-10',
        estado: 'disponible',
        repuestosDisponibles: [
          { codigo: 'REP-101', descripcion: 'Motor 5HP', cantidadOriginal: 1, cantidadDisponible: 1 },
          { codigo: 'REP-102', descripcion: 'Válvula de presión', cantidadOriginal: 2, cantidadDisponible: 2 },
        ]
      }
    ]);
    setLoading(false);
  };

  const handleVerDetalle = (despiece: Despiece) => {
    setSelectedDespiece(despiece);
    setDialogOpen(true);
  };

  const handleAgregarDespiece = async () => {
    if (!selectedMaquina) {
      toast.error('Seleccione una máquina');
      return;
    }

    const maquina = maquinasDisponibles.find(m => m.id === selectedMaquina);
    if (!maquina) return;

    // Obtener repuestos del producto de la máquina
    const { data: repuestos, error } = await supabase
      .from('repuestos')
      .select('codigo, descripcion')
      .eq('codigo_producto', maquina.codigo_producto);

    if (error) {
      toast.error('Error al cargar repuestos');
      return;
    }
    
    const nuevoDespiece: Despiece = {
      id: Date.now().toString(),
      sku: maquina.sku_maquina,
      descripcion: maquina.productos?.descripcion || '',
      fechaIngreso: new Date().toISOString().split('T')[0],
      estado: 'disponible',
      repuestosDisponibles: (repuestos || []).map(r => ({
        codigo: r.codigo,
        descripcion: r.descripcion,
        cantidadOriginal: 1,
        cantidadDisponible: 1
      }))
    };

    setDespieces([...despieces, nuevoDespiece]);
    toast.success('Máquina agregada para despiece');
    
    // Limpiar formulario
    setSelectedMaquina('');
    setAddDialogOpen(false);
  };

  const handleUsarRepuesto = async (despieceId: string, codigoRepuesto: string) => {
    const updatedDespieces = despieces.map(d => {
      if (d.id === despieceId) {
        const updatedRepuestos = d.repuestosDisponibles.map(r => {
          if (r.codigo === codigoRepuesto && r.cantidadDisponible > 0) {
            return { ...r, cantidadDisponible: r.cantidadDisponible - 1 };
          }
          return r;
        });

        const todosAgotados = updatedRepuestos.every(r => r.cantidadDisponible === 0);
        
        return {
          ...d,
          repuestosDisponibles: updatedRepuestos,
          estado: todosAgotados ? 'agotado' as const : 'en_uso' as const
        };
      }
      return d;
    });

    setDespieces(updatedDespieces);
    setSelectedDespiece(updatedDespieces.find(d => d.id === despieceId) || null);
    toast.success("Repuesto utilizado exitosamente");
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
                <TableHead>SKU</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha Ingreso</TableHead>
                <TableHead>Repuestos Disponibles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDespieces.map((despiece) => (
                <TableRow key={despiece.id}>
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
              ))}
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
              <Label>Seleccionar Máquina del Sistema</Label>
              <Select value={selectedMaquina} onValueChange={setSelectedMaquina}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una máquina ingresada" />
                </SelectTrigger>
                <SelectContent>
                  {maquinasDisponibles.map((maquina) => (
                    <SelectItem key={maquina.id} value={maquina.id}>
                      SKU: {maquina.sku_maquina} - {maquina.productos?.descripcion} (Inc: {maquina.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Al seleccionar la máquina, se cargarán automáticamente todos los repuestos disponibles según su modelo
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
