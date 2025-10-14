import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MovimientoCardex {
  fecha: string;
  tipo: string;
  cantidad: number;
  saldoAnterior: number;
  saldoNuevo: number;
  referencia: string;
  usuario: string;
}

export default function ConsultaCardex() {
  const [searchUbicacion, setSearchUbicacion] = useState('');
  const [searchSKU, setSearchSKU] = useState('');
  const [movimientosPorUbicacion, setMovimientosPorUbicacion] = useState<MovimientoCardex[]>([]);
  const [movimientosPorSKU, setMovimientosPorSKU] = useState<MovimientoCardex[]>([]);
  const [loading, setLoading] = useState(false);

  const buscarPorUbicacion = async () => {
    if (!searchUbicacion.trim()) {
      toast.error("Ingrese una ubicación");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('movimientos_inventario')
        .select('*')
        .eq('ubicacion', searchUbicacion)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const movimientos = data.map(m => ({
        fecha: new Date(m.created_at).toLocaleString(),
        tipo: m.tipo_movimiento,
        cantidad: m.cantidad,
        saldoAnterior: m.stock_anterior || 0,
        saldoNuevo: m.stock_nuevo || 0,
        referencia: m.referencia || 'N/A',
        usuario: 'Sistema'
      }));

      setMovimientosPorUbicacion(movimientos);
      toast.success("Movimientos encontrados");
    } catch (error: any) {
      toast.error("Error al buscar movimientos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const buscarPorSKU = async () => {
    if (!searchSKU.trim()) {
      toast.error("Ingrese un SKU");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('movimientos_inventario')
        .select('*')
        .eq('codigo_repuesto', searchSKU)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const movimientos = data.map(m => ({
        fecha: new Date(m.created_at).toLocaleString(),
        tipo: m.tipo_movimiento,
        cantidad: m.cantidad,
        saldoAnterior: m.stock_anterior || 0,
        saldoNuevo: m.stock_nuevo || 0,
        referencia: m.referencia || 'N/A',
        usuario: 'Sistema'
      }));

      setMovimientosPorSKU(movimientos);
      toast.success("Movimientos encontrados");
    } catch (error: any) {
      toast.error("Error al buscar movimientos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Consulta de Cardex</h1>
      </div>

      <Tabs defaultValue="ubicacion" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ubicacion">Por Ubicación</TabsTrigger>
          <TabsTrigger value="sku">Por SKU</TabsTrigger>
        </TabsList>

        <TabsContent value="ubicacion">
          <Card>
            <CardHeader>
              <CardTitle>Cardex por Ubicación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Ubicación</Label>
                  <Input
                    placeholder="Ej: A-01-01"
                    value={searchUbicacion}
                    onChange={(e) => setSearchUbicacion(e.target.value)}
                  />
                </div>
                <Button onClick={buscarPorUbicacion} disabled={loading} className="mt-6">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>

              {movimientosPorUbicacion.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Saldo Anterior</TableHead>
                        <TableHead className="text-right">Saldo Nuevo</TableHead>
                        <TableHead>Referencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movimientosPorUbicacion.map((mov, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{mov.fecha}</TableCell>
                          <TableCell>{mov.tipo}</TableCell>
                          <TableCell className="text-right">{mov.cantidad}</TableCell>
                          <TableCell className="text-right">{mov.saldoAnterior}</TableCell>
                          <TableCell className="text-right">{mov.saldoNuevo}</TableCell>
                          <TableCell>{mov.referencia}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sku">
          <Card>
            <CardHeader>
              <CardTitle>Cardex por SKU</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>SKU / Código</Label>
                  <Input
                    placeholder="Ej: REP-001"
                    value={searchSKU}
                    onChange={(e) => setSearchSKU(e.target.value)}
                  />
                </div>
                <Button onClick={buscarPorSKU} disabled={loading} className="mt-6">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>

              {movimientosPorSKU.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Saldo Anterior</TableHead>
                        <TableHead className="text-right">Saldo Nuevo</TableHead>
                        <TableHead>Referencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movimientosPorSKU.map((mov, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{mov.fecha}</TableCell>
                          <TableCell>{mov.tipo}</TableCell>
                          <TableCell className="text-right">{mov.cantidad}</TableCell>
                          <TableCell className="text-right">{mov.saldoAnterior}</TableCell>
                          <TableCell className="text-right">{mov.saldoNuevo}</TableCell>
                          <TableCell>{mov.referencia}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
