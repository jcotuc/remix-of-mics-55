import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownCircle, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ItemIngreso {
  sku: string;
  descripcion: string;
  cantidad: number;
  ubicacion: string;
}

export default function IngresosInventario() {
  const [items, setItems] = useState<ItemIngreso[]>([]);
  const [formItem, setFormItem] = useState<ItemIngreso>({
    sku: '',
    descripcion: '',
    cantidad: 0,
    ubicacion: ''
  });
  const [motivo, setMotivo] = useState('');
  const [referencia, setReferencia] = useState('');

  const agregarItem = () => {
    if (!formItem.sku || !formItem.cantidad || !formItem.ubicacion) {
      toast.error("Complete todos los campos del item");
      return;
    }

    setItems([...items, formItem]);
    setFormItem({ sku: '', descripcion: '', cantidad: 0, ubicacion: '' });
    toast.success("Item agregado");
  };

  const eliminarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const procesarIngreso = async () => {
    if (items.length === 0) {
      toast.error("Agregue al menos un item");
      return;
    }

    if (!motivo) {
      toast.error("Ingrese el motivo del ingreso");
      return;
    }

    try {
      for (const item of items) {
        await supabase.from('movimientos_inventario').insert({
          codigo_repuesto: item.sku,
          tipo_movimiento: 'entrada',
          cantidad: item.cantidad,
          ubicacion: item.ubicacion,
          motivo: motivo,
          referencia: referencia || 'Ingreso manual'
        });
      }

      toast.success("Ingreso procesado exitosamente");
      setItems([]);
      setMotivo('');
      setReferencia('');
    } catch (error) {
      toast.error("Error al procesar ingreso");
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <ArrowDownCircle className="h-8 w-8 text-green-600" />
        <h1 className="text-3xl font-bold">Ingresos Manuales de Inventario</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agregar Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>SKU / Código</Label>
              <Input
                placeholder="REP-001"
                value={formItem.sku}
                onChange={(e) => setFormItem({...formItem, sku: e.target.value})}
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                placeholder="Descripción del repuesto"
                value={formItem.descripcion}
                onChange={(e) => setFormItem({...formItem, descripcion: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="1"
                  value={formItem.cantidad || ''}
                  onChange={(e) => setFormItem({...formItem, cantidad: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input
                  placeholder="A-01-01"
                  value={formItem.ubicacion}
                  onChange={(e) => setFormItem({...formItem, ubicacion: e.target.value})}
                />
              </div>
            </div>
            <Button onClick={agregarItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Item
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Ingreso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Referencia (Opcional)</Label>
              <Input
                placeholder="Número de orden, factura, etc."
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
              />
            </div>
            <div>
              <Label>Motivo del Ingreso *</Label>
              <Textarea
                placeholder="Describa el motivo del ingreso manual"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={4}
              />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Items agregados:</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items a Ingresar</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{item.sku}</TableCell>
                    <TableCell>{item.descripcion}</TableCell>
                    <TableCell className="text-right">{item.cantidad}</TableCell>
                    <TableCell>{item.ubicacion}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => eliminarItem(idx)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4">
              <Button onClick={procesarIngreso} className="w-full" size="lg">
                Procesar Ingreso
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
