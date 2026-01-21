import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, Package, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiBackendAction } from "@/lib/api";
import type { Embarque, ClienteSchema, IncidenteSchema } from "@/generated/actions.d";

export default function Embarques() {
  const navigate = useNavigate();
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [numeroEmbarque, setNumeroEmbarque] = useState("");
  const [transportista, setTransportista] = useState("");
  const [notas, setNotas] = useState("");
  const [creatingTest, setCreatingTest] = useState(false);

  useEffect(() => {
    fetchEmbarques();
  }, []);

  const fetchEmbarques = async () => {
    try {
      setLoading(true);
      const response = await apiBackendAction("embarques.list", { limit: 200 });
      const data = response.data || [];
      // Sort by fecha_llegada descending
      const sorted = [...data].sort((a, b) => 
        new Date(b.fecha_llegada || 0).getTime() - new Date(a.fecha_llegada || 0).getTime()
      );
      setEmbarques(sorted);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar embarques');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await apiBackendAction("embarques.create", {
        numero_embarque: numeroEmbarque,
        transportista,
        notas,
        fecha_llegada: new Date().toISOString(),
      });

      toast.success('Embarque creado');
      setDialogOpen(false);
      setNumeroEmbarque("");
      setTransportista("");
      setNotas("");
      fetchEmbarques();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear embarque');
    }
  };

  const createTestEmbarque = async () => {
    setCreatingTest(true);
    try {
      // 1. Crear embarque
      await apiBackendAction("embarques.create", {
        numero_embarque: 'EMB-2024-001',
        transportista: 'Transportes Guatemala Express',
        notas: 'Embarque de prueba con máquinas desde zonas',
        fecha_llegada: new Date().toISOString(),
      });
      
      toast.success(`Embarque de prueba creado`);
      fetchEmbarques();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear embarque de prueba');
    } finally {
      setCreatingTest(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" />
            Embarques
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestión de embarques y transporte
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="lg" 
            className="gap-2"
            onClick={createTestEmbarque}
            disabled={creatingTest}
          >
            <Sparkles className="h-4 w-4" />
            {creatingTest ? "Creando..." : "Crear Embarque de Prueba"}
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Embarque
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Embarque</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número *</Label>
                  <Input
                    id="numero"
                    placeholder="EMB-001"
                    value={numeroEmbarque}
                    onChange={(e) => setNumeroEmbarque(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transportista">Transportista</Label>
                  <Input
                    id="transportista"
                    placeholder="Nombre"
                    value={transportista}
                    onChange={(e) => setTransportista(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notas">Notas</Label>
                  <Input
                    id="notas"
                    placeholder="Observaciones"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Crear</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Lista de Embarques
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          ) : embarques.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay embarques</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha Llegada</TableHead>
                  <TableHead>Transportista</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {embarques.map((embarque) => (
                  <TableRow key={embarque.id}>
                    <TableCell className="font-medium">{embarque.numero_embarque}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {new Date(embarque.fecha_llegada).toLocaleDateString('es-GT')}
                      </div>
                    </TableCell>
                    <TableCell>{embarque.transportista || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{embarque.notas || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">En Ruta</Badge>
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
