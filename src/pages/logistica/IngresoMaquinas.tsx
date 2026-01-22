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
import { apiBackendAction } from "@/lib/api-backend";
import type { IncidenteSchema, ClienteSchema, ProductoSchema, Embarque } from "@/generated/actions.d";
import { WhatsAppStyleMediaCapture, MediaFile } from "@/components/features/media";
import { uploadMediaToStorage, saveIncidentePhotos } from "@/lib/uploadMedia";
import { OutlinedInput, OutlinedTextarea, OutlinedSelect } from "@/components/ui/outlined-input";

type IncidenteConCliente = IncidenteSchema & { cliente?: ClienteSchema };

export default function IngresoMaquinas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmbarque, setSelectedEmbarque] = useState<string>("all");
  const [incidentes, setIncidentes] = useState<IncidenteConCliente[]>([]);
  const [embarques, setEmbarques] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para crear incidente manual
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [clientesSAP, setClientesSAP] = useState<ClienteSchema[]>([]);
  const [productos, setProductos] = useState<ProductoSchema[]>([]);
  const [manualIncidente, setManualIncidente] = useState({
    codigo_cliente: "",
    sku_maquina: "",
    descripcion_problema: ""
  });
  const [creatingIncidente, setCreatingIncidente] = useState(false);

  // Estados para formalización de ingreso
  const [selectedIncidenteForIngreso, setSelectedIncidenteForIngreso] = useState<IncidenteConCliente | null>(null);
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
      
      // Use apiBackendAction for incidents and embarques
      const [incidentesResponse, embarquesResponse] = await Promise.all([
        apiBackendAction("incidentes.list", { limit: 1000 }),
        apiBackendAction("embarques.list", { limit: 200 })
      ]);

      // Filter by status and sort by created_at
      const filtered = incidentesResponse.results
        .filter(inc => inc.estado === "EN_ENTREGA")
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      // Map to include cliente property for compatibility
      const incidentesWithClients: IncidenteConCliente[] = filtered.map(inc => ({
        ...inc,
        cliente: inc.cliente || undefined
      }));

      setIncidentes(incidentesWithClients);
      setEmbarques(embarquesResponse.data.map((e: Embarque) => e.numero_embarque));

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientesSAP = async () => {
    try {
      // Use direct Supabase for codigo_sap filter (not in schema)
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .not('codigo_sap', 'is', null)
        .order('nombre');
      
      if (error) throw error;
      setClientesSAP((data || []) as any);
    } catch (error) {
      console.error('Error fetching clientes SAP:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const response = await apiBackendAction("productos.list", { limit: 2000 });
      setProductos(response.results);
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
        tipologia: 'REPARACION' as const,
        aplica_garantia: false,
        fecha_ingreso: new Date().toISOString(),
        tracking_token: crypto.randomUUID(),
        observaciones: `SKU Maquina: ${manualIncidente.sku_maquina}`
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
        String(selectedIncidenteForIngreso.id)
      );

      // 2. Guardar referencias en incidente_fotos
      await saveIncidentePhotos(
        String(selectedIncidenteForIngreso.id),
        fotosSubidas,
        'ingreso'
      );

      // 3. Actualizar incidente: status + observaciones si SKU fue corregido
      const updateData: any = {
        estado: 'EN_DIAGNOSTICO'
      };

      // Store SKU in observaciones if different
      const existingObservaciones = selectedIncidenteForIngreso.observaciones || '';
      if (skuVerificado) {
        updateData.observaciones = `SKU Verificado: ${skuVerificado}. ${observacionesIngreso || ''} ${existingObservaciones}`.trim();
      }

      const { error: updateError } = await supabase
        .from('incidentes')
        .update(updateData)
        .eq('id', selectedIncidenteForIngreso.id);

      if (updateError) throw updateError;

      toast.success("Ingreso formalizado correctamente");

      // 4. Cerrar modal y refrescar datos
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
    const clienteName = inc.cliente?.nombre || "";
    const productoCodigo = inc.producto?.codigo || "";
    const matchesSearch = 
      inc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productoCodigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clienteName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEmbarque = selectedEmbarque === "all";

    return matchesSearch && matchesEmbarque;
  });

  // Helper to get SKU from observaciones
  const getSkuFromObservaciones = (observaciones: string | null): string => {
    if (!observaciones) return '';
    const match = observaciones.match(/SKU.*?:\s*(\S+)/i);
    return match ? match[1] : '';
  };

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
                    <TableCell>{incidente.producto?.codigo || '-'}</TableCell>
                    <TableCell>{incidente.cliente?.nombre || "N/A"}</TableCell>
                    <TableCell>{getSkuFromObservaciones(incidente.observaciones) || '-'}</TableCell>
                    <TableCell>
                      {new Date(incidente.created_at || '').toLocaleDateString('es-GT')}
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
                          setSkuVerificado(getSkuFromObservaciones(incidente.observaciones) || "");
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
                value={getSkuFromObservaciones(selectedIncidenteForIngreso?.observaciones || null) || "N/A"} 
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
                className={skuVerificado !== getSkuFromObservaciones(selectedIncidenteForIngreso?.observaciones || null) ? 
                  "border-yellow-500" : ""}
              />
              {skuVerificado && skuVerificado !== getSkuFromObservaciones(selectedIncidenteForIngreso?.observaciones || null) && (
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Incidente Manual</DialogTitle>
            <DialogDescription>
              Crear un nuevo incidente para máquinas que llegan sin registro previo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <OutlinedInput
              label="Código de Cliente *"
              value={manualIncidente.codigo_cliente}
              onChange={(e) => setManualIncidente({...manualIncidente, codigo_cliente: e.target.value})}
              placeholder="Ej: HPC-000001"
            />
            
            <OutlinedInput
              label="SKU de la Máquina *"
              value={manualIncidente.sku_maquina}
              onChange={(e) => setManualIncidente({...manualIncidente, sku_maquina: e.target.value})}
              placeholder="Ej: ABC123456"
            />

            <OutlinedTextarea
              label="Descripción del Problema *"
              value={manualIncidente.descripcion_problema}
              onChange={(e) => setManualIncidente({...manualIncidente, descripcion_problema: e.target.value})}
              placeholder="Describa el problema reportado..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateManualIncidente}
              disabled={creatingIncidente}
            >
              {creatingIncidente ? "Creando..." : "Crear Incidente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
