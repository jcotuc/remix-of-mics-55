import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, AlertTriangle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Incidente = Database['public']['Tables']['incidentes']['Row'];
type Cliente = Database['public']['Tables']['clientes']['Row'];

type RepuestoConStock = {
  id: string;
  codigo: string;
  descripcion: string;
  stock: number;
  ubicacion: string | null;
};

export default function FaltanteAccesorios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [repuestoSearch, setRepuestoSearch] = useState("");
  const [incidentes, setIncidentes] = useState<(Incidente & { cliente: Cliente })[]>([]);
  const [repuestos, setRepuestos] = useState<RepuestoConStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [consultaOpen, setConsultaOpen] = useState(false);

  useEffect(() => {
    fetchIncidentes();
  }, []);

  const fetchIncidentes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('incidentes')
        .select('*, clientes!inner(*)')
        .eq('status', 'Reparado')
        .not('accesorios', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const incidentesWithClients = (data || []).map((inc: any) => ({
        ...inc,
        cliente: inc.clientes
      }));

      setIncidentes(incidentesWithClients);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar faltantes');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepuestos = async () => {
    if (!repuestoSearch.trim()) {
      setRepuestos([]);
      return;
    }

    try {
      // Buscar repuestos
      const { data: repuestosData, error: repError } = await supabase
        .from('repuestos')
        .select('id, codigo, descripcion')
        .or(`codigo.ilike.%${repuestoSearch}%,descripcion.ilike.%${repuestoSearch}%`)
        .limit(20);

      if (repError) throw repError;

      // Buscar stock en inventario
      const codigos = repuestosData?.map(r => r.codigo) || [];
      const { data: inventarioData } = await supabase
        .from('inventario')
        .select('codigo_repuesto, cantidad, ubicacion')
        .in('codigo_repuesto', codigos);

      // Combinar datos
      const repuestosConStock: RepuestoConStock[] = (repuestosData || []).map(rep => {
        const inv = inventarioData?.find(i => i.codigo_repuesto === rep.codigo);
        return {
          id: rep.id,
          codigo: rep.codigo,
          descripcion: rep.descripcion,
          stock: inv?.cantidad || 0,
          ubicacion: inv?.ubicacion || null
        };
      });

      setRepuestos(repuestosConStock);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al buscar repuestos');
    }
  };

  useEffect(() => {
    if (consultaOpen) {
      fetchRepuestos();
    }
  }, [repuestoSearch, consultaOpen]);

  const filteredIncidentes = incidentes.filter(inc =>
    inc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inc.codigo_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inc.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-primary" />
            Faltante de Accesorios
          </h1>
          <p className="text-muted-foreground mt-2">
            Máquinas reparadas con accesorios faltantes
          </p>
        </div>
        <Button onClick={() => setConsultaOpen(true)}>
          <Package className="h-4 w-4 mr-2" />
          Consultar Repuestos
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Reportes de Faltantes
          </CardTitle>
          <CardDescription>Máquinas que no se entregaron con todos sus accesorios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por código, producto o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          ) : filteredIncidentes.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay reportes de faltantes</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Accesorios Faltantes</TableHead>
                  <TableHead>Fecha Reparación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidentes.map((incidente) => (
                  <TableRow key={incidente.id}>
                    <TableCell className="font-medium">{incidente.codigo}</TableCell>
                    <TableCell>{incidente.codigo_producto}</TableCell>
                    <TableCell>{incidente.cliente.nombre}</TableCell>
                    <TableCell>{incidente.accesorios || '-'}</TableCell>
                    <TableCell>
                      {new Date(incidente.updated_at).toLocaleDateString('es-GT')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">Pendiente</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">Ver Detalle</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={consultaOpen} onOpenChange={setConsultaOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consulta de Repuestos en Bodega</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar repuesto por código o descripción..."
                value={repuestoSearch}
                onChange={(e) => setRepuestoSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {repuestos.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Ubicación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repuestos.map((rep) => (
                    <TableRow key={rep.id}>
                      <TableCell className="font-medium">{rep.codigo}</TableCell>
                      <TableCell>{rep.descripcion}</TableCell>
                      <TableCell>
                        <Badge variant={rep.stock > 0 ? "default" : "secondary"}>
                          {rep.stock}
                        </Badge>
                      </TableCell>
                      <TableCell>{rep.ubicacion || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : repuestoSearch ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No se encontraron repuestos</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Ingresa un término de búsqueda</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
