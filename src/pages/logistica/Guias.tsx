import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileText, Printer } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Guia = {
  id: string;
  numero_guia: string;
  fecha_guia: string;
  fecha_ingreso: string;
  fecha_promesa_entrega: string | null;
  fecha_entrega: string | null;
  remitente: string;
  direccion_remitente: string | null;
  destinatario: string;
  direccion_destinatario: string;
  ciudad_destino: string;
  cantidad_piezas: number;
  peso: number | null;
  tarifa: number | null;
  referencia_1: string | null;
  referencia_2: string | null;
  estado: string;
  recibido_por: string | null;
  operador_pod: string | null;
  incidentes_codigos: string[] | null;
};

export default function Guias() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [guias, setGuias] = useState<Guia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [incidentesDisponibles, setIncidentesDisponibles] = useState<any[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    destinatario: "",
    direccion_destinatario: "",
    ciudad_destino: "",
    cantidad_piezas: 1,
    peso: "",
    tarifa: "",
    referencia_1: "",
    referencia_2: "",
    fecha_promesa_entrega: "",
    incidentes_codigos: [] as string[],
    remitente: "ZIGO",
    direccion_remitente: "42A Av 9-16 Zona 5, Ciudad de Guatemala"
  });

  useEffect(() => {
    fetchGuias();
    fetchIncidentesDisponibles();
  }, []);

  const fetchGuias = async () => {
    try {
      const { data, error } = await supabase
        .from('guias_envio')
        .select('*')
        .order('fecha_guia', { ascending: false });

      if (error) throw error;
      setGuias(data || []);
    } catch (error) {
      console.error('Error fetching guias:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las guías",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidentesDisponibles = async () => {
    try {
      // Obtener incidentes que están listos para envío (status: "Logistica envio")
      const { data, error } = await supabase
        .from('incidentes')
        .select('id, codigo, descripcion_problema, codigo_cliente, quiere_envio')
        .eq('status', 'Logistica envio')
        .eq('quiere_envio', true)
        .order('fecha_ingreso', { ascending: false });

      if (error) throw error;
      setIncidentesDisponibles(data || []);
    } catch (error) {
      console.error('Error fetching incidentes:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.destinatario || !formData.direccion_destinatario || !formData.ciudad_destino) {
      toast({
        title: "Error",
        description: "Por favor complete los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    try {
      // Generar número de guía
      const { data: numeroGuia, error: numeroError } = await supabase
        .rpc('generar_numero_guia');

      if (numeroError) throw numeroError;

      const { error } = await supabase
        .from('guias_envio')
        .insert({
          numero_guia: numeroGuia,
          destinatario: formData.destinatario,
          direccion_destinatario: formData.direccion_destinatario,
          ciudad_destino: formData.ciudad_destino,
          cantidad_piezas: formData.cantidad_piezas,
          peso: formData.peso ? parseFloat(formData.peso) : null,
          tarifa: formData.tarifa ? parseFloat(formData.tarifa) : null,
          referencia_1: formData.referencia_1 || null,
          referencia_2: formData.referencia_2 || null,
          fecha_promesa_entrega: formData.fecha_promesa_entrega || null,
          incidentes_codigos: formData.incidentes_codigos.length > 0 ? formData.incidentes_codigos : null,
          remitente: formData.remitente,
          direccion_remitente: formData.direccion_remitente
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Guía ${numeroGuia} creada correctamente`
      });

      // Reset form
      setFormData({
        destinatario: "",
        direccion_destinatario: "",
        ciudad_destino: "",
        cantidad_piezas: 1,
        peso: "",
        tarifa: "",
        referencia_1: "",
        referencia_2: "",
        fecha_promesa_entrega: "",
        incidentes_codigos: [],
        remitente: "ZIGO",
        direccion_remitente: "42A Av 9-16 Zona 5, Ciudad de Guatemala"
      });
      
      setDialogOpen(false);
      fetchGuias();
      fetchIncidentesDisponibles();
    } catch (error) {
      console.error('Error creating guia:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la guía",
        variant: "destructive"
      });
    }
  };

  const handlePrint = (guia: Guia) => {
    // Implementar lógica de impresión
    toast({
      title: "Impresión",
      description: `Preparando guía ${guia.numero_guia} para imprimir`
    });
  };

  const filteredGuias = guias.filter(guia => 
    guia.numero_guia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guia.destinatario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guia.ciudad_destino.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Guías de Envío</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de guías para transporte de máquinas
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Guía
        </Button>
      </div>

      {/* Dialog para crear nueva guía */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Guía de Envío</DialogTitle>
            <DialogDescription>
              Complete la información para generar una nueva guía de envío
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            {/* Remitente */}
            <div className="col-span-2">
              <h3 className="font-semibold mb-2">Remitente</h3>
            </div>
            <div>
              <Label htmlFor="remitente">Remitente</Label>
              <Input
                id="remitente"
                value={formData.remitente}
                onChange={(e) => setFormData({ ...formData, remitente: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="direccion_remitente">Dirección Remitente</Label>
              <Input
                id="direccion_remitente"
                value={formData.direccion_remitente}
                onChange={(e) => setFormData({ ...formData, direccion_remitente: e.target.value })}
              />
            </div>

            {/* Destinatario */}
            <div className="col-span-2 mt-4">
              <h3 className="font-semibold mb-2">Destinatario</h3>
            </div>
            <div>
              <Label htmlFor="destinatario">Destinatario *</Label>
              <Input
                id="destinatario"
                value={formData.destinatario}
                onChange={(e) => setFormData({ ...formData, destinatario: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="ciudad_destino">Ciudad Destino *</Label>
              <Input
                id="ciudad_destino"
                value={formData.ciudad_destino}
                onChange={(e) => setFormData({ ...formData, ciudad_destino: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="direccion_destinatario">Dirección Destinatario *</Label>
              <Textarea
                id="direccion_destinatario"
                value={formData.direccion_destinatario}
                onChange={(e) => setFormData({ ...formData, direccion_destinatario: e.target.value })}
                required
              />
            </div>

            {/* Información del envío */}
            <div className="col-span-2 mt-4">
              <h3 className="font-semibold mb-2">Información del Envío</h3>
            </div>
            <div>
              <Label htmlFor="cantidad_piezas">Pzs. (Piezas) *</Label>
              <Input
                id="cantidad_piezas"
                type="number"
                min="1"
                value={formData.cantidad_piezas}
                onChange={(e) => setFormData({ ...formData, cantidad_piezas: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label htmlFor="peso">Peso (kg)</Label>
              <Input
                id="peso"
                type="number"
                step="0.01"
                value={formData.peso}
                onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="tarifa">Tarifa</Label>
              <Input
                id="tarifa"
                type="number"
                step="0.01"
                value={formData.tarifa}
                onChange={(e) => setFormData({ ...formData, tarifa: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fecha_promesa_entrega">Fecha Promesa Entrega</Label>
              <Input
                id="fecha_promesa_entrega"
                type="date"
                value={formData.fecha_promesa_entrega}
                onChange={(e) => setFormData({ ...formData, fecha_promesa_entrega: e.target.value })}
              />
            </div>

            {/* Referencias */}
            <div className="col-span-2 mt-4">
              <h3 className="font-semibold mb-2">Referencias</h3>
            </div>
            <div>
              <Label htmlFor="referencia_1">Ref. 1</Label>
              <Input
                id="referencia_1"
                value={formData.referencia_1}
                onChange={(e) => setFormData({ ...formData, referencia_1: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="referencia_2">Ref. 2</Label>
              <Input
                id="referencia_2"
                value={formData.referencia_2}
                onChange={(e) => setFormData({ ...formData, referencia_2: e.target.value })}
              />
            </div>

            {/* Incidentes */}
            <div className="col-span-2 mt-4">
              <Label>Incidentes a Enviar</Label>
              <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                {incidentesDisponibles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay incidentes listos para envío</p>
                ) : (
                  incidentesDisponibles.map((incidente) => (
                    <div key={incidente.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={incidente.codigo}
                        checked={formData.incidentes_codigos.includes(incidente.codigo)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              incidentes_codigos: [...formData.incidentes_codigos, incidente.codigo]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              incidentes_codigos: formData.incidentes_codigos.filter(c => c !== incidente.codigo)
                            });
                          }
                        }}
                      />
                      <label htmlFor={incidente.codigo} className="text-sm cursor-pointer">
                        {incidente.codigo} - {incidente.descripcion_problema.substring(0, 50)}...
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>
              Crear Guía
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Guías</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número de guía o destino..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Guía</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Transportista</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead>Fecha Salida</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Cargando guías...
                  </TableCell>
                </TableRow>
              ) : filteredGuias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No se encontraron guías
                  </TableCell>
                </TableRow>
              ) : (
                filteredGuias.map((guia) => (
                  <TableRow key={guia.id}>
                    <TableCell className="font-medium">{guia.numero_guia}</TableCell>
                    <TableCell>{guia.ciudad_destino}</TableCell>
                    <TableCell>{guia.destinatario}</TableCell>
                    <TableCell>{guia.cantidad_piezas}</TableCell>
                    <TableCell>{format(new Date(guia.fecha_guia), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      {guia.fecha_entrega ? format(new Date(guia.fecha_entrega), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={guia.estado === "entregado" ? "default" : "secondary"}>
                        {guia.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handlePrint(guia)}>
                        <Printer className="h-4 w-4 mr-1" />
                        Imprimir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
