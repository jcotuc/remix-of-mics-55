import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Incidente = Database['public']['Tables']['incidentes']['Row'];
type Cliente = Database['public']['Tables']['clientes']['Row'];

export default function IngresoMaquinas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmbarque, setSelectedEmbarque] = useState<string>("all");
  const [incidentes, setIncidentes] = useState<(Incidente & { cliente: Cliente })[]>([]);
  const [embarques, setEmbarques] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch incidents with embarque_id and status "Ingresado"
      const { data: incidentesData, error: incidentesError } = await supabase
        .from('incidentes')
        .select('*, clientes!inner(*)')
        .not('embarque_id', 'is', null)
        .eq('status', 'Ingresado')
        .order('fecha_ingreso', { ascending: false });

      if (incidentesError) throw incidentesError;

      const incidentesWithClients = (incidentesData || []).map((inc: any) => ({
        ...inc,
        cliente: inc.clientes
      }));

      setIncidentes(incidentesWithClients);

      // Get unique embarque numbers
      const { data: embarquesData } = await supabase
        .from('embarques')
        .select('numero_embarque')
        .order('fecha_llegada', { ascending: false });

      setEmbarques(embarquesData?.map(e => e.numero_embarque) || []);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleIngresoFormal = async (incidenteId: string) => {
    try {
      const { error } = await supabase
        .from('incidentes')
        .update({ 
          status: 'Pendiente de diagnostico',
          updated_at: new Date().toISOString()
        })
        .eq('id', incidenteId);

      if (error) throw error;

      toast.success('Ingreso formal completado');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar ingreso');
    }
  };

  const filteredIncidentes = incidentes.filter(inc => {
    const matchesSearch = 
      inc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.codigo_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEmbarque = selectedEmbarque === "all" || 
      (inc.embarque_id && inc.embarque_id === selectedEmbarque);

    return matchesSearch && matchesEmbarque;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Ingreso de Máquinas
          </h1>
          <p className="text-muted-foreground mt-2">
            Ingreso formal de máquinas que llegan en embarques
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Máquinas Pendientes de Ingreso ({filteredIncidentes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, producto o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedEmbarque} onValueChange={setSelectedEmbarque}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrar por embarque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los embarques</SelectItem>
                {embarques.map((num) => (
                  <SelectItem key={num} value={num}>{num}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          ) : filteredIncidentes.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay máquinas pendientes de ingreso</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>SKU Máquina</TableHead>
                  <TableHead>Fecha Llegada</TableHead>
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
                    <TableCell>{incidente.sku_maquina || '-'}</TableCell>
                    <TableCell>
                      {new Date(incidente.fecha_ingreso).toLocaleDateString('es-GT')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Pendiente Ingreso</Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleIngresoFormal(incidente.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Dar Ingreso
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
