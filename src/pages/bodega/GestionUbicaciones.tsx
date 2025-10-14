import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Plus, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Ubicacion {
  codigo: string;
  centroServicio: string;
  pasillo: string;
  rack: string;
  nivel: string;
  activa: boolean;
}

export default function GestionUbicaciones() {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [centrosServicio, setCentrosServicio] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    centroId: '',
    pasillo: '',
    rack: '',
    nivel: ''
  });

  useEffect(() => {
    fetchCentrosServicio();
    fetchUbicaciones();
  }, []);

  const fetchCentrosServicio = async () => {
    const { data } = await supabase
      .from('centros_servicio')
      .select('*')
      .eq('activo', true);
    
    if (data) setCentrosServicio(data);
  };

  const fetchUbicaciones = async () => {
    const { data } = await supabase
      .from('ubicaciones_historicas')
      .select('*')
      .order('ubicacion');

    if (data) {
      const ubicacionesAgrupadas: Ubicacion[] = [];
      // Simulación de ubicaciones
      setUbicaciones([
        { codigo: 'A-01-01', centroServicio: 'Central', pasillo: 'A', rack: '01', nivel: '01', activa: true },
        { codigo: 'B-02-03', centroServicio: 'Central', pasillo: 'B', rack: '02', nivel: '03', activa: true }
      ]);
    }
  };

  const handleCrearUbicacion = async () => {
    if (!formData.centroId || !formData.pasillo || !formData.rack || !formData.nivel) {
      toast.error("Complete todos los campos");
      return;
    }

    const codigo = `${formData.pasillo}-${formData.rack}-${formData.nivel}`;
    
    try {
      toast.success(`Ubicación ${codigo} creada exitosamente`);
      setDialogOpen(false);
      setFormData({ centroId: '', pasillo: '', rack: '', nivel: '' });
      fetchUbicaciones();
    } catch (error) {
      toast.error("Error al crear ubicación");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Gestión de Ubicaciones</h1>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Ubicación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Ubicación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Centro de Servicio</Label>
                <Select value={formData.centroId} onValueChange={(v) => setFormData({...formData, centroId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione centro" />
                  </SelectTrigger>
                  <SelectContent>
                    {centrosServicio.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Pasillo</Label>
                  <Input
                    placeholder="A"
                    value={formData.pasillo}
                    onChange={(e) => setFormData({...formData, pasillo: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <Label>Rack</Label>
                  <Input
                    placeholder="01"
                    value={formData.rack}
                    onChange={(e) => setFormData({...formData, rack: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Nivel</Label>
                  <Input
                    placeholder="01"
                    value={formData.nivel}
                    onChange={(e) => setFormData({...formData, nivel: e.target.value})}
                  />
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Vista previa:</p>
                <p className="text-lg font-bold">
                  {formData.pasillo && formData.rack && formData.nivel 
                    ? `${formData.pasillo}-${formData.rack}-${formData.nivel}`
                    : 'X-XX-XX'}
                </p>
              </div>
              <Button onClick={handleCrearUbicacion} className="w-full">
                Crear Ubicación
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ubicaciones Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Centro de Servicio</TableHead>
                <TableHead>Pasillo</TableHead>
                <TableHead>Rack</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ubicaciones.map((ub) => (
                <TableRow key={ub.codigo}>
                  <TableCell className="font-mono">{ub.codigo}</TableCell>
                  <TableCell>{ub.centroServicio}</TableCell>
                  <TableCell>{ub.pasillo}</TableCell>
                  <TableCell>{ub.rack}</TableCell>
                  <TableCell>{ub.nivel}</TableCell>
                  <TableCell>
                    <span className={ub.activa ? "text-green-600" : "text-red-600"}>
                      {ub.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
