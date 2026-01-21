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
  const [useDialogOpen, setUseDialogOpen] = useState(false);
  const [selectedDespiece, setSelectedDespiece] = useState<Despiece | null>(null);
  const [selectedRepuesto, setSelectedRepuesto] = useState<RepuestoDespiece | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Formulario para nuevo despiece
  const [selectedProducto, setSelectedProducto] = useState('');
  const [productosDisponibles, setProductosDisponibles] = useState<any[]>([]);
  
  // Para asignar a incidente
  const [selectedIncidente, setSelectedIncidente] = useState('');
  const [incidentesActivos, setIncidentesActivos] = useState<any[]>([]);
  const [incidentesFiltrados, setIncidentesFiltrados] = useState<any[]>([]);

  useEffect(() => {
    fetchProductos();
    fetchDespieces();
    fetchIncidentesActivos();
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

  const fetchIncidentesActivos = async () => {
    // Obtener incidentes que ya tienen diagnóstico
    const { data: incidentesConDiagnostico, error: incidentesError } = await supabase
      .from('diagnosticos')
      .select('incidente_id')
      .not('incidente_id', 'is', null);
    
    if (incidentesError) {
      console.error('Error al cargar diagnósticos:', incidentesError);
      return;
    }

    const incidenteIds = incidentesConDiagnostico?.map(d => d.incidente_id) || [];
    
    if (incidenteIds.length === 0) {
      setIncidentesActivos([]);
      return;
    }

    // Cargar información de los incidentes
    const { data: incidentesData, error } = await supabase
      .from('incidentes')
      .select('id, codigo, descripcion_problema, status')
      .in('id', incidenteIds)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error al cargar incidentes:', error);
      return;
    }
    
    setIncidentesActivos(incidentesData || []);
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

    // Obtener usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Debe iniciar sesión para agregar despieces');
      return;
    }

    const producto = productosDisponibles.find(p => p.codigo === selectedProducto);
    if (!producto) return;

    // Obtener repuestos del producto usando la tabla de relación
    const { data: relacionesRepuestos, error: repuestosError } = await (supabase as any)
      .from('repuestos_productos')
      .select('repuesto_id, repuestos(codigo, descripcion)')
      .eq('producto_id', producto.id);

    if (repuestosError) {
      toast.error('Error al cargar repuestos');
      return;
    }
    
    // Mapear los repuestos desde la relación
    const repuestos = (relacionesRepuestos || [])
      .filter((r: any) => r.repuestos)
      .map((r: any) => ({
        codigo: r.repuestos.codigo,
        descripcion: r.repuestos.descripcion
      }));

    const repuestosDisponibles = (repuestos || []).map((r: any) => ({
      codigo: r.codigo,
      descripcion: r.descripcion,
      cantidadOriginal: 1,
      cantidadDisponible: 1
    }));
    
    // Generar un SKU único para este despiece
    const timestamp = Date.now();
    const skuDespiece = `DSP-${producto.codigo}-${timestamp}`;
    
    // Obtener el ID del usuario de la tabla usuarios
    const { data: usuarioData } = await (supabase as any)
      .from('usuarios')
      .select('id')
      .eq('auth_uid', user.id)
      .single();
    
    // Insertar en base de datos
    const { error } = await supabase
      .from('despieces')
      .insert({
        sku_maquina: skuDespiece,
        codigo_producto: producto.codigo,
        descripcion: producto.descripcion,
        estado: 'disponible',
        repuestos_disponibles: repuestosDisponibles,
        created_by: usuarioData?.id || null
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

  const handleOpenUseDialog = async (despiece: Despiece, repuesto: RepuestoDespiece) => {
    setSelectedDespiece(despiece);
    setSelectedRepuesto(repuesto);
    setSelectedIncidente('');
    
    // Filtrar incidentes que tienen solicitud de este repuesto específico
    const filtrados = [];
    
    for (const incidente of incidentesActivos) {
      const { data: solicitudes } = await supabase
        .from('solicitudes_repuestos')
        .select('id, repuestos')
        .eq('incidente_id', incidente.id)
        .single();
      
      if (solicitudes) {
        // Verificar si el repuesto está en la solicitud
        const repuestosSolicitados = solicitudes.repuestos as any[];
        const tieneRepuesto = repuestosSolicitados.some(
          (r: any) => r.codigo === repuesto.codigo
        );
        
        if (tieneRepuesto) {
          filtrados.push(incidente);
        }
      }
    }
    
    setIncidentesFiltrados(filtrados);
    setUseDialogOpen(true);
  };

  const handleUsarRepuesto = async () => {
    if (!selectedDespiece || !selectedRepuesto) return;
    
    if (!selectedIncidente) {
      toast.error('Debe seleccionar un incidente');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Debe iniciar sesión');
      return;
    }

    // Verificar que el incidente tiene diagnóstico
    const incidenteSeleccionado = incidentesActivos.find(i => i.codigo === selectedIncidente);
    if (!incidenteSeleccionado) {
      toast.error('Incidente no válido');
      return;
    }

    // Verificar que existe solicitud de repuestos para este incidente con este repuesto
    const { data: solicitud } = await supabase
      .from('solicitudes_repuestos')
      .select('id, repuestos')
      .eq('incidente_id', incidenteSeleccionado.id)
      .single();

    if (!solicitud) {
      toast.error('Este incidente no tiene solicitud de repuestos');
      return;
    }

    const repuestosSolicitados = solicitud.repuestos as any[];
    const repuestoSolicitado = repuestosSolicitados.find(
      (r: any) => r.codigo === selectedRepuesto.codigo
    );

    if (!repuestoSolicitado) {
      toast.error('Este repuesto no está en la solicitud del incidente');
      return;
    }

    const updatedRepuestos = selectedDespiece.repuestosDisponibles.map(r => {
      if (r.codigo === selectedRepuesto.codigo && r.cantidadDisponible > 0) {
        return { ...r, cantidadDisponible: r.cantidadDisponible - 1 };
      }
      return r;
    });

    const todosAgotados = updatedRepuestos.every(r => r.cantidadDisponible === 0);
    const nuevoEstado = todosAgotados ? 'agotado' : 'en_uso';

    // Actualizar despiece - el ID es number
    const { error: despieceError } = await supabase
      .from('despieces')
      .update({
        repuestos_disponibles: updatedRepuestos as any,
        estado: nuevoEstado
      })
      .eq('id', Number(selectedDespiece.id));

    if (despieceError) {
      console.error('Error al actualizar despiece:', despieceError);
      toast.error('Error al usar repuesto');
      return;
    }

    // Obtener repuesto_id y usuario_id para el movimiento
    const { data: repuestoData } = await supabase
      .from('repuestos')
      .select('id')
      .eq('codigo', selectedRepuesto.codigo)
      .single();
    
    const { data: usuarioData } = await (supabase as any)
      .from('usuarios')
      .select('id')
      .eq('auth_uid', user.id)
      .single();

    // Registrar movimiento de inventario desde ubicación de despiece
    const ubicacionDespiece = `DESPIECE-${selectedDespiece.sku}`;
    const { error: movimientoError } = await supabase
      .from('movimientos_inventario')
      .insert({
        repuesto_id: repuestoData?.id || 0,
        centro_servicio_id: 1, // Default centro
        tipo_movimiento: 'SALIDA',
        cantidad: 1,
        stock_anterior: 1,
        stock_nuevo: 0,
        ubicacion: ubicacionDespiece,
        referencia: selectedIncidente,
        motivo: `Repuesto usado de despiece ${selectedDespiece.sku} para incidente ${selectedIncidente}`,
        created_by_id: usuarioData?.id || 0
      });

    if (movimientoError) {
      console.error('Error al registrar movimiento:', movimientoError);
    }

    toast.success(`Repuesto asignado al incidente ${selectedIncidente}`);
    fetchDespieces();
    fetchIncidentesActivos();
    setDialogOpen(false);
    setUseDialogOpen(false);
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
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              Repuestos Disponibles - {selectedDespiece?.sku}
            </DialogTitle>
          </DialogHeader>
          {selectedDespiece && (
            <>
              <div className="p-4 bg-muted rounded-lg flex-shrink-0">
                <div className="flex items-center gap-4">
                  {selectedDespiece.fotoUrl && (
                    <img 
                      src={selectedDespiece.fotoUrl} 
                      alt={selectedDespiece.descripcion}
                      className="w-20 h-20 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{selectedDespiece.descripcion}</p>
                    <p className="text-sm text-muted-foreground">
                      Fecha de ingreso: {selectedDespiece.fechaIngreso}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Estado: {getEstadoBadge(selectedDespiece.estado)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Original</TableHead>
                      <TableHead className="text-right">Disponible</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDespiece.repuestosDisponibles.map((repuesto) => (
                      <TableRow key={repuesto.codigo}>
                        <TableCell className="font-mono text-sm">{repuesto.codigo}</TableCell>
                        <TableCell className="max-w-md">{repuesto.descripcion}</TableCell>
                        <TableCell className="text-right">{repuesto.cantidadOriginal}</TableCell>
                        <TableCell className="text-right">
                          <span className={repuesto.cantidadDisponible === 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                            {repuesto.cantidadDisponible}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={repuesto.cantidadDisponible === 0}
                            onClick={() => handleOpenUseDialog(selectedDespiece, repuesto)}
                          >
                            Usar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
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

      <Dialog open={useDialogOpen} onOpenChange={setUseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Repuesto a Incidente</DialogTitle>
          </DialogHeader>
          {selectedRepuesto && selectedDespiece && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Repuesto: {selectedRepuesto.codigo}</p>
                <p className="text-sm text-muted-foreground">{selectedRepuesto.descripcion}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Desde: DESPIECE-{selectedDespiece.sku}
                </p>
              </div>
              <div>
                <Label>Seleccionar Incidente</Label>
                <Select value={selectedIncidente} onValueChange={setSelectedIncidente}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el incidente" />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentesFiltrados.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No hay incidentes con diagnóstico que tengan solicitud de este repuesto
                      </div>
                    ) : (
                      incidentesFiltrados.map((incidente) => (
                        <SelectItem key={incidente.codigo} value={incidente.codigo}>
                          {incidente.codigo} - {incidente.descripcion_problema.substring(0, 50)}...
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Solo se muestran incidentes con diagnóstico y solicitud de este repuesto
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUsarRepuesto}>
              Asignar Repuesto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
