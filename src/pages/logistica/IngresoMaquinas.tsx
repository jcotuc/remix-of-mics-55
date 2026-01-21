import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle, Package, Plus, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { WhatsAppStyleMediaCapture, MediaFile } from "@/components/features/media";
import { uploadMediaToStorage, saveIncidentePhotos } from "@/lib/uploadMedia";
import { OutlinedInput, OutlinedTextarea, OutlinedSelect } from "@/components/ui/outlined-input";

type Incidente = Database['public']['Tables']['incidentes']['Row'];
type Cliente = Database['public']['Tables']['clientes']['Row'];
type Producto = Database['public']['Tables']['productos']['Row'];

export default function IngresoMaquinas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmbarque, setSelectedEmbarque] = useState<string>("all");
  const [incidentes, setIncidentes] = useState<(Incidente & { cliente: Cliente })[]>([]);
  const [embarques, setEmbarques] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para crear incidente manual
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [clientesSAP, setClientesSAP] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [manualIncidente, setManualIncidente] = useState({
    codigo_cliente: "",
    sku_maquina: "",
    descripcion_problema: ""
  });
  const [creatingIncidente, setCreatingIncidente] = useState(false);

  // Estados para formalización de ingreso
  const [selectedIncidenteForIngreso, setSelectedIncidenteForIngreso] = useState<(Incidente & { cliente: Cliente }) | null>(null);
  const [showFormalizarDialog, setShowFormalizarDialog] = useState(false);
  const [skuVerificado, setSkuVerificado] = useState("");
  const [fotosIngreso, setFotosIngreso] = useState<MediaFile[]>([]);
  const [observacionesIngreso, setObservacionesIngreso] = useState("");
  const [procesandoIngreso, setProcesandoIngreso] = useState(false);

  useEffect(() => {
    fetchData();
    fetchClientesSAP();
    fetchProductos();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch incidents with estado "EN_ENTREGA"
      const { data: incidentesData, error: incidentesError } = await supabase
        .from('incidentes')
        .select('*, clientes!inner(*)')
        .eq('estado', 'EN_ENTREGA')
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

  const fetchClientesSAP = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .not('codigo_sap', 'is', null)
        .order('nombre');

      if (error) throw error;
      setClientesSAP(data || []);
    } catch (error) {
      console.error('Error fetching clientes SAP:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('descripcion');

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error('Error fetching productos:', error);
    }
  };

  const handleCreateManualIncidente = async () => {
    if (!manualIncidente.codigo_cliente || !manualIncidente.sku_maquina || 
        !manualIncidente.descripcion_problema) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    setCreatingIncidente(true);
    try {
      // Buscar el producto por SKU
      const { data: productoData, error: productoError } = await supabase
        .from('productos')
        .select('codigo')
        .or(`codigo.ilike.%${manualIncidente.sku_maquina}%,clave.ilike.%${manualIncidente.sku_maquina}%`)
        .limit(1)
        .single();

      if (productoError || !productoData) {
        toast.error('No se encontró el producto con ese SKU');
        setCreatingIncidente(false);
        return;
      }

      // Generar código de incidente
      const { data: codigoData, error: codigoError } = await (supabase as any)
        .rpc('generar_codigo_incidente');

      if (codigoError) throw codigoError;

      // Buscar cliente por código
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('id')
        .eq('codigo', manualIncidente.codigo_cliente)
        .single();

      if (!clienteData) {
        toast.error('No se encontró el cliente con ese código');
        setCreatingIncidente(false);
        return;
      }

      const nuevoIncidente = {
        codigo: codigoData,
        cliente_id: clienteData.id,
        centro_de_servicio_id: 1,
        producto_id: null,
        descripcion_problema: manualIncidente.descripcion_problema,
        estado: 'EN_DIAGNOSTICO' as const,
        tipologia: 'GARANTIA' as const,
        aplica_garantia: false,
        fecha_ingreso: new Date().toISOString(),
        tracking_token: crypto.randomUUID()
      };

      const { error } = await supabase
        .from('incidentes')
        .insert([nuevoIncidente]);

      if (error) throw error;

      toast.success('Incidente creado exitosamente');
      setShowManualDialog(false);
      setManualIncidente({
        codigo_cliente: "",
        sku_maquina: "",
        descripcion_problema: ""
      });
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear incidente');
    } finally {
      setCreatingIncidente(false);
    }
  };

  const handleFormalizarIngreso = async () => {
    if (!selectedIncidenteForIngreso || fotosIngreso.length === 0) {
      toast.error("Debe capturar al menos una foto");
      return;
    }

    setProcesandoIngreso(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // 1. Subir fotos a storage
      const fotosSubidas = await uploadMediaToStorage(
        fotosIngreso,
        selectedIncidenteForIngreso.id
      );

      // 2. Guardar referencias en incidente_fotos
      await saveIncidentePhotos(
        selectedIncidenteForIngreso.id,
        fotosSubidas,
        'ingreso'
      );

      // 3. Crear registro de auditoría en ingresos_logistica
      const { error: ingresoError } = await supabase
        .from('ingresos_logistica')
        .insert({
          incidente_id: selectedIncidenteForIngreso.id,
          recibido_por: user.id,
          sku_original: selectedIncidenteForIngreso.sku_maquina || "",
          sku_corregido: skuVerificado !== selectedIncidenteForIngreso.sku_maquina ? 
            skuVerificado : null,
          fotos_urls: fotosSubidas.map(f => f.url),
          observaciones: observacionesIngreso || null
        });

      if (ingresoError) throw ingresoError;

      // 4. Actualizar incidente: status + SKU si fue corregido
      const updateData: any = {
        estado: 'EN_DIAGNOSTICO'
      };

      // Store SKU in observaciones if different

      if (skuVerificado && skuVerificado !== (selectedIncidenteForIngreso as any).sku_maquina) {
        updateData.observaciones = `SKU Verificado: ${skuVerificado}. ${observacionesIngreso || ''}`;
      }

      const { error: updateError } = await supabase
        .from('incidentes')
        .update(updateData)
        .eq('id', selectedIncidenteForIngreso.id);

      if (updateError) throw updateError;

      toast.success("Ingreso formalizado correctamente");

      // 5. Cerrar modal y refrescar datos
      setShowFormalizarDialog(false);
      setFotosIngreso([]);
      setObservacionesIngreso("");
      setSkuVerificado("");
      setSelectedIncidenteForIngreso(null);
      fetchData();

    } catch (error) {
      console.error('Error al formalizar ingreso:', error);
      toast.error('Error al formalizar el ingreso');
    } finally {
      setProcesandoIngreso(false);
    }
  };


  const filteredIncidentes = incidentes.filter(inc => {
    const matchesSearch = 
      inc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(inc.producto_id || '').includes(searchTerm.toLowerCase()) ||
      inc.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEmbarque = selectedEmbarque === "all";

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
        <Button onClick={() => setShowManualDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Incidente Manual
        </Button>
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
                    <TableCell>{incidente.producto_id || '-'}</TableCell>
                    <TableCell>{incidente.cliente.nombre}</TableCell>
                    <TableCell>{(incidente as any).sku_maquina || '-'}</TableCell>
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
                        onClick={() => {
                          setSelectedIncidenteForIngreso(incidente);
                          setSkuVerificado((incidente as any).sku_maquina || "");
                          setFotosIngreso([]);
                          setObservacionesIngreso("");
                          setShowFormalizarDialog(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Recibir e Inspeccionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Formalización de Ingreso */}
      <Dialog open={showFormalizarDialog} onOpenChange={setShowFormalizarDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Formalizar Ingreso Físico</DialogTitle>
            <DialogDescription>
              Incidente: {selectedIncidenteForIngreso?.codigo} | 
              Cliente: {selectedIncidenteForIngreso?.cliente?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Verificación SKU */}
            <div className="space-y-2">
              <Label>SKU Registrado en Sistema</Label>
              <Input 
                value={(selectedIncidenteForIngreso as any)?.sku_maquina || "N/A"} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>SKU Físico Verificado *</Label>
              <Input
                value={skuVerificado}
                onChange={(e) => setSkuVerificado(e.target.value)}
                placeholder="Ingrese el SKU que ve en la máquina física"
                className={skuVerificado !== (selectedIncidenteForIngreso as any)?.sku_maquina ? 
                  "border-yellow-500" : ""}
              />
              {skuVerificado && skuVerificado !== (selectedIncidenteForIngreso as any)?.sku_maquina && (
                <p className="text-sm text-yellow-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  El SKU físico difiere del registrado. Se actualizará automáticamente.
                </p>
              )}
            </div>

            {/* Captura de Fotos - OBLIGATORIA */}
            <div className="space-y-2">
              <Label>Fotos de Ingreso * (mínimo 1, máximo 10)</Label>
              <WhatsAppStyleMediaCapture
                media={fotosIngreso}
                onMediaChange={setFotosIngreso}
                maxFiles={10}
              />
              {fotosIngreso.length === 0 && (
                <p className="text-sm text-destructive">
                  Debe capturar al menos una foto antes de formalizar
                </p>
              )}
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label>Observaciones (Opcional)</Label>
              <Textarea
                value={observacionesIngreso}
                onChange={(e) => setObservacionesIngreso(e.target.value)}
                placeholder="Indique cualquier daño, faltante de accesorios, etc."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFormalizarDialog(false);
                setFotosIngreso([]);
                setObservacionesIngreso("");
                setSkuVerificado("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleFormalizarIngreso}
              disabled={!skuVerificado || fotosIngreso.length === 0 || procesandoIngreso}
            >
              {procesandoIngreso ? "Procesando..." : "Confirmar Ingreso Formal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear incidente manual */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Incidente Manual - Clientes SAP</DialogTitle>
            <DialogDescription>
              Registre un incidente manualmente para clientes SAP
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente SAP *</Label>
              <Select 
                value={manualIncidente.codigo_cliente} 
                onValueChange={(value) => setManualIncidente({ ...manualIncidente, codigo_cliente: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un cliente SAP" />
                </SelectTrigger>
                <SelectContent>
                  {clientesSAP.map((cliente) => (
                    <SelectItem key={cliente.codigo} value={cliente.codigo}>
                      {cliente.nombre} - SAP: {cliente.codigo_sap}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU Máquina *</Label>
              <Input
                id="sku"
                value={manualIncidente.sku_maquina}
                onChange={(e) => setManualIncidente({ ...manualIncidente, sku_maquina: e.target.value })}
                placeholder="Código o clave del producto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción del Problema *</Label>
              <Textarea
                id="descripcion"
                value={manualIncidente.descripcion_problema}
                onChange={(e) => setManualIncidente({ ...manualIncidente, descripcion_problema: e.target.value })}
                placeholder="Describa el problema reportado..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateManualIncidente} disabled={creatingIncidente}>
              {creatingIncidente ? 'Creando...' : 'Crear Incidente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
