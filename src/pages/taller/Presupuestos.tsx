import { useState, useEffect } from "react";
import { FileText, DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Presupuesto = {
  id: string;
  incidente_codigo: string;
  monto_repuestos: number;
  monto_mano_obra: number;
  monto_total: number;
  estado: "pendiente" | "aprobado" | "rechazado" | "facturado";
  fecha_creacion: string;
  observaciones: string;
};

export default function Presupuestos() {
  const navigate = useNavigate();
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNuevo, setShowNuevo] = useState(false);
  const [formData, setFormData] = useState({
    incidente_codigo: "",
    monto_repuestos: "",
    monto_mano_obra: "",
    observaciones: ""
  });

  useEffect(() => {
    fetchPresupuestos();
  }, []);

  const fetchPresupuestos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('incidentes')
        .select('codigo, status')
        .in('status', ['En diagnostico', 'Reparado']);

      if (error) throw error;

      // Simular presupuestos
      const presupuestosSimulados: Presupuesto[] = (data || []).slice(0, 15).map((inc, idx) => {
        const montoRepuestos = Math.floor(Math.random() * 500) + 100;
        const montoManoObra = Math.floor(Math.random() * 300) + 50;
        return {
          id: `PRE-${String(idx + 1).padStart(6, '0')}`,
          incidente_codigo: inc.codigo,
          monto_repuestos: montoRepuestos,
          monto_mano_obra: montoManoObra,
          monto_total: montoRepuestos + montoManoObra,
          estado: idx % 4 === 0 ? "pendiente" : idx % 4 === 1 ? "aprobado" : idx % 4 === 2 ? "rechazado" : "facturado",
          fecha_creacion: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
          observaciones: `Presupuesto para ${inc.codigo}`
        };
      });

      setPresupuestos(presupuestosSimulados);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar presupuestos');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearPresupuesto = () => {
    if (!formData.incidente_codigo || !formData.monto_repuestos || !formData.monto_mano_obra) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    const montoRepuestos = parseFloat(formData.monto_repuestos);
    const montoManoObra = parseFloat(formData.monto_mano_obra);

    const nuevoPresupuesto: Presupuesto = {
      id: `PRE-${String(presupuestos.length + 1).padStart(6, '0')}`,
      incidente_codigo: formData.incidente_codigo,
      monto_repuestos: montoRepuestos,
      monto_mano_obra: montoManoObra,
      monto_total: montoRepuestos + montoManoObra,
      estado: "pendiente",
      fecha_creacion: new Date().toISOString(),
      observaciones: formData.observaciones
    };

    setPresupuestos([nuevoPresupuesto, ...presupuestos]);
    setShowNuevo(false);
    setFormData({
      incidente_codigo: "",
      monto_repuestos: "",
      monto_mano_obra: "",
      observaciones: ""
    });
    toast.success('Presupuesto creado exitosamente');
  };

  const handleAprobar = (id: string) => {
    setPresupuestos(prev => prev.map(p =>
      p.id === id ? { ...p, estado: "aprobado" as const } : p
    ));
    toast.success('Presupuesto aprobado');
  };

  const handleRechazar = (id: string) => {
    setPresupuestos(prev => prev.map(p =>
      p.id === id ? { ...p, estado: "rechazado" as const } : p
    ));
    toast.success('Presupuesto rechazado');
  };

  const getEstadoBadge = (estado: Presupuesto['estado']) => {
    switch (estado) {
      case "pendiente":
        return <Badge className="bg-orange-500"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case "aprobado":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Aprobado</Badge>;
      case "rechazado":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rechazado</Badge>;
      case "facturado":
        return <Badge className="bg-blue-500"><DollarSign className="h-3 w-3 mr-1" />Facturado</Badge>;
    }
  };

  const pendientes = presupuestos.filter(p => p.estado === "pendiente").length;
  const aprobados = presupuestos.filter(p => p.estado === "aprobado").length;
  const totalMonto = presupuestos
    .filter(p => p.estado === "aprobado" || p.estado === "facturado")
    .reduce((acc, p) => acc + p.monto_total, 0);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Presupuestos
          </h1>
          <p className="text-muted-foreground mt-2">
            Cotizaciones y aprobaciones de servicios
          </p>
        </div>
        <Button onClick={() => setShowNuevo(true)}>
          <FileText className="h-4 w-4 mr-2" />
          Nuevo Presupuesto
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendientes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Aprobados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aprobados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Monto Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Q{totalMonto.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{presupuestos.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Presupuestos</CardTitle>
          <CardDescription>
            {presupuestos.length} presupuestos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Incidente</TableHead>
                  <TableHead>Repuestos</TableHead>
                  <TableHead>Mano de Obra</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presupuestos.map((presupuesto) => (
                  <TableRow key={presupuesto.id}>
                    <TableCell className="font-medium">{presupuesto.id}</TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => navigate(`/incidentes/${presupuesto.incidente_codigo}`)}
                      >
                        {presupuesto.incidente_codigo}
                      </Button>
                    </TableCell>
                    <TableCell>Q{presupuesto.monto_repuestos.toFixed(2)}</TableCell>
                    <TableCell>Q{presupuesto.monto_mano_obra.toFixed(2)}</TableCell>
                    <TableCell className="font-bold">Q{presupuesto.monto_total.toFixed(2)}</TableCell>
                    <TableCell>{new Date(presupuesto.fecha_creacion).toLocaleDateString('es-GT')}</TableCell>
                    <TableCell>{getEstadoBadge(presupuesto.estado)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {presupuesto.estado === "pendiente" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAprobar(presupuesto.id)}
                            >
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRechazar(presupuesto.id)}
                            >
                              Rechazar
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNuevo} onOpenChange={setShowNuevo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Presupuesto</DialogTitle>
            <DialogDescription>
              Complete los datos del presupuesto
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Código de Incidente *</Label>
              <Input
                value={formData.incidente_codigo}
                onChange={(e) => setFormData({ ...formData, incidente_codigo: e.target.value })}
                placeholder="INC-000001"
              />
            </div>

            <div>
              <Label>Monto Repuestos (Q) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.monto_repuestos}
                onChange={(e) => setFormData({ ...formData, monto_repuestos: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Mano de Obra (Q) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.monto_mano_obra}
                onChange={(e) => setFormData({ ...formData, monto_mano_obra: e.target.value })}
                placeholder="0.00"
              />
            </div>

            {formData.monto_repuestos && formData.monto_mano_obra && (
              <div className="bg-muted p-3 rounded">
                <p className="text-sm font-bold">
                  Total: Q{(parseFloat(formData.monto_repuestos) + parseFloat(formData.monto_mano_obra)).toFixed(2)}
                </p>
              </div>
            )}

            <div>
              <Label>Observaciones</Label>
              <Textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Detalles adicionales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNuevo(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearPresupuesto}>
              Crear Presupuesto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
