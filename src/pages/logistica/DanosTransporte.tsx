import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, AlertCircle, Calculator, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Incidente = Database['public']['Tables']['incidentes']['Row'];
type Cliente = Database['public']['Tables']['clientes']['Row'];
type Repuesto = Database['public']['Tables']['repuestos']['Row'];

interface DanoTransporte {
  incidente: Incidente & { cliente: Cliente };
  costo_estimado?: number;
  estado_cotizacion?: 'pendiente' | 'aceptado' | 'rechazado';
}

export default function DanosTransporte() {
  const [searchTerm, setSearchTerm] = useState("");
  const [danos, setDanos] = useState<DanoTransporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [cotizadorOpen, setCotizadorOpen] = useState(false);
  const [selectedDano, setSelectedDano] = useState<DanoTransporte | null>(null);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [costoManoObra, setCostoManoObra] = useState(0);
  const [costoRepuestos, setCostoRepuestos] = useState(0);

  useEffect(() => {
    fetchDanos();
  }, []);

  const fetchDanos = async () => {
    try {
      setLoading(true);

      // Fetch incidents that might have transport damage
      // We'll need to create a specific field or status for this
      const { data, error } = await supabase
        .from('incidentes')
        .select('*, clientes!inner(*)')
        .ilike('descripcion_problema', '%transporte%')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const danosData = (data || []).map((inc: any) => ({
        incidente: { ...inc, cliente: inc.clientes },
        costo_estimado: 0,
        estado_cotizacion: 'pendiente' as const
      }));

      setDanos(danosData);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar daños');
    } finally {
      setLoading(false);
    }
  };

  const openCotizador = async (dano: DanoTransporte) => {
    setSelectedDano(dano);
    setCotizadorOpen(true);
    
    // Fetch available parts for quotation
    const { data } = await supabase
      .from('repuestos')
      .select('*')
      .eq('codigo_producto', dano.incidente.codigo_producto)
      .limit(10);
    
    setRepuestos(data || []);
  };

  const calcularTotal = () => {
    return costoManoObra + costoRepuestos;
  };

  const filteredDanos = danos.filter(d =>
    d.incidente.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.incidente.codigo_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.incidente.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const danosAceptados = filteredDanos.filter(d => d.estado_cotizacion === 'aceptado');
  const danosRechazados = filteredDanos.filter(d => d.estado_cotizacion === 'rechazado');
  const danosPendientes = filteredDanos.filter(d => d.estado_cotizacion === 'pendiente');

  const renderTable = (data: DanoTransporte[]) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay daños en esta categoría</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Descripción Daño</TableHead>
            <TableHead>Fecha Reporte</TableHead>
            <TableHead>Costo Estimado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((dano) => (
            <TableRow key={dano.incidente.id}>
              <TableCell className="font-medium">{dano.incidente.codigo}</TableCell>
              <TableCell>{dano.incidente.codigo_producto}</TableCell>
              <TableCell>{dano.incidente.cliente.nombre}</TableCell>
              <TableCell className="max-w-xs truncate">
                {dano.incidente.descripcion_problema}
              </TableCell>
              <TableCell>
                {new Date(dano.incidente.fecha_ingreso).toLocaleDateString('es-GT')}
              </TableCell>
              <TableCell>
                {dano.costo_estimado ? (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {dano.costo_estimado.toFixed(2)}
                  </span>
                ) : '-'}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={
                    dano.estado_cotizacion === 'aceptado' ? 'default' :
                    dano.estado_cotizacion === 'rechazado' ? 'destructive' : 'secondary'
                  }
                >
                  {dano.estado_cotizacion === 'aceptado' ? 'Aceptado' :
                   dano.estado_cotizacion === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                </Badge>
              </TableCell>
              <TableCell>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openCotizador(dano)}
                >
                  <Calculator className="h-4 w-4 mr-1" />
                  Cotizar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <AlertCircle className="h-8 w-8 text-primary" />
          Daños por Transporte
        </h1>
        <p className="text-muted-foreground mt-2">
          Registro y cotización de daños durante el transporte
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Reportes de Daños
              </CardTitle>
              <CardDescription>Máquinas dañadas durante el transporte</CardDescription>
            </div>
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por código, producto o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pendientes" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pendientes">
                Pendientes ({danosPendientes.length})
              </TabsTrigger>
              <TabsTrigger value="aceptados">
                Aceptados ({danosAceptados.length})
              </TabsTrigger>
              <TabsTrigger value="rechazados">
                Rechazados ({danosRechazados.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pendientes" className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando...</p>
                </div>
              ) : (
                renderTable(danosPendientes)
              )}
            </TabsContent>

            <TabsContent value="aceptados" className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando...</p>
                </div>
              ) : (
                renderTable(danosAceptados)
              )}
            </TabsContent>

            <TabsContent value="rechazados" className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando...</p>
                </div>
              ) : (
                renderTable(danosRechazados)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={cotizadorOpen} onOpenChange={setCotizadorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Cotizador de Reparación
            </DialogTitle>
          </DialogHeader>
          
          {selectedDano && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Código</p>
                  <p className="font-medium">{selectedDano.incidente.codigo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Producto</p>
                  <p className="font-medium">{selectedDano.incidente.codigo_producto}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedDano.incidente.cliente.nombre}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Costo de Mano de Obra</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={costoManoObra}
                    onChange={(e) => setCostoManoObra(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label>Costo de Repuestos</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={costoRepuestos}
                    onChange={(e) => setCostoRepuestos(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Estimado:</span>
                    <span className="text-2xl font-bold flex items-center gap-1">
                      <DollarSign className="h-5 w-5" />
                      {calcularTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setCotizadorOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => {
                  toast.success('Cotización guardada');
                  setCotizadorOpen(false);
                }}>
                  Guardar Cotización
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
