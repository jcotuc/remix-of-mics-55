import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, FileText, Printer, PackagePlus } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

type Cliente = {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  correo: string | null;
  celular: string;
  telefono_principal: string | null;
  municipio: string | null;
  departamento: string | null;
};

export default function Guias() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("crear");
  const [searchTerm, setSearchTerm] = useState("");
  const [guias, setGuias] = useState<Guia[]>([]);
  const [loading, setLoading] = useState(true);
  const [incidentesDisponibles, setIncidentesDisponibles] = useState<any[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [openClienteCombobox, setOpenClienteCombobox] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  
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
    remitente: "Centro de servicio GUA",
    direccion_remitente: "27 Calle Bodega C 41-55 Zona 5 Guatemala Guatemala",
    telefono_destinatario: ""
  });
  
  // Consulta state
  const [consultaData, setConsultaData] = useState({
    numero_guia: "",
    estado_guia: "",
    fecha_guia: "",
    remitente: "",
    direccion_remitente: "",
    referencia_1: "",
    referencia_2: "",
    piezas: "",
    peso: "",
    tarifa: "",
    fecha_ingreso: "",
    fecha_promesa: "",
    destinatario: "",
    direccion_destinatario: "",
    recibido_por: "",
    fecha_entrega: "",
    operador_pod: ""
  });

  useEffect(() => {
    fetchGuias();
    fetchIncidentesDisponibles();
    fetchClientes();
    loadCentroServicioUsuario();
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

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  const loadCentroServicioUsuario = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener el centro de servicio asociado al usuario
      // Por ahora usamos el centro GUA por defecto
      const { data: centro, error } = await supabase
        .from('centros_servicio')
        .select('*')
        .eq('codigo', 'GUA')
        .single();

      if (error) throw error;

      if (centro) {
        setFormData(prev => ({
          ...prev,
          remitente: centro.nombre,
          direccion_remitente: centro.direccion || "27 Calle Bodega C 41-55 Zona 5 Guatemala Guatemala"
        }));
      }
    } catch (error) {
      console.error('Error loading centro servicio:', error);
    }
  };

  const calcularFechaPromesa = (ciudad: string): string => {
    const hoy = new Date();
    let diasAgregar = 1; // Por defecto 1 día para Ciudad de Guatemala
    
    const ciudadLower = ciudad.toLowerCase();
    
    // Departamentos cercanos (1-2 días)
    if (ciudadLower.includes('guatemala') || ciudadLower.includes('mixco') || 
        ciudadLower.includes('villa nueva') || ciudadLower.includes('sacatepéquez') ||
        ciudadLower.includes('antigua')) {
      diasAgregar = 1;
    }
    // Departamentos medianamente lejanos (2-3 días)
    else if (ciudadLower.includes('escuintla') || ciudadLower.includes('chimaltenango') ||
             ciudadLower.includes('sololá') || ciudadLower.includes('alta verapaz') ||
             ciudadLower.includes('baja verapaz') || ciudadLower.includes('izabal')) {
      diasAgregar = 2;
    }
    // Departamentos lejanos (3-4 días)
    else if (ciudadLower.includes('petén') || ciudadLower.includes('quiché') ||
             ciudadLower.includes('huehuetenango') || ciudadLower.includes('san marcos') ||
             ciudadLower.includes('quetzaltenango') || ciudadLower.includes('totonicapán') ||
             ciudadLower.includes('suchitepéquez') || ciudadLower.includes('retalhuleu')) {
      diasAgregar = 3;
    }
    // Otros departamentos (2 días)
    else {
      diasAgregar = 2;
    }
    
    // Calcular fecha promesa
    const fechaPromesa = new Date(hoy);
    fechaPromesa.setDate(fechaPromesa.getDate() + diasAgregar);
    
    // Formatear como YYYY-MM-DD
    return format(fechaPromesa, 'yyyy-MM-dd');
  };

  const handleClienteSelect = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    const ciudadDestino = `${cliente.municipio || ""}, ${cliente.departamento || ""}`.trim();
    const fechaPromesa = calcularFechaPromesa(ciudadDestino);
    
    setFormData(prev => ({
      ...prev,
      destinatario: cliente.nombre,
      direccion_destinatario: cliente.direccion || "",
      ciudad_destino: ciudadDestino,
      telefono_destinatario: cliente.celular || cliente.telefono_principal || "",
      referencia_1: cliente.codigo,
      fecha_promesa_entrega: fechaPromesa
    }));
    setOpenClienteCombobox(false);
    
    toast({
      title: "Cliente seleccionado",
      description: `${cliente.nombre} - Entrega estimada: ${format(new Date(fechaPromesa), 'dd/MM/yyyy')}`
    });
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
      // Generar número de guía local
      const { data: numeroGuia, error: numeroError } = await supabase
        .rpc('generar_numero_guia');

      if (numeroError) throw numeroError;

      // Llamar al edge function para crear la guía en Zigo
      const { data: zigoResponse, error: zigoError } = await supabase.functions.invoke('zigo-create-guide', {
        body: {
          guiaData: {
            ...formData,
            peso: formData.peso ? parseFloat(formData.peso) : null,
            tarifa: formData.tarifa ? parseFloat(formData.tarifa) : null
          }
        }
      });

      if (zigoError) {
        console.error('Error llamando edge function:', zigoError);
        throw new Error('Error al conectar con Zigo: ' + zigoError.message);
      }

      if (!zigoResponse.success) {
        throw new Error(zigoResponse.error || 'Error desconocido al crear guía en Zigo');
      }

      console.log('Respuesta de Zigo:', zigoResponse);

      // Guardar la guía en la base de datos local
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
        description: `Guía ${numeroGuia} creada en Zigo y guardada localmente`
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
        direccion_remitente: "42A Av 9-16 Zona 5, Ciudad de Guatemala",
        telefono_destinatario: ""
      });
      
      fetchGuias();
      fetchIncidentesDisponibles();
      setActiveTab("consultar");
    } catch (error) {
      console.error('Error creating guia:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la guía",
        variant: "destructive"
      });
    }
  };
  
  const handleSearch = async () => {
    if (!consultaData.numero_guia) {
      toast({
        title: "Error",
        description: "Ingrese un número de guía para buscar",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const numeroIngresado = consultaData.numero_guia.trim();
      
      // Primero autenticarse en Zigo para obtener el token
      const authResponse = await fetch('https://dev-api-entregas.zigo.com.gt:443/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'hpcgt',
          password: 'sMn4bqe3'
        })
      });

      if (!authResponse.ok) {
        throw new Error('Error al autenticar con Zigo');
      }

      const authData = await authResponse.json();
      const accessToken = authData.data.accessToken;
      
      // Intentar diferentes formatos de la guía
      const formatosPosibles = [
        numeroIngresado.toUpperCase(), // Mayúsculas tal cual
        `${numeroIngresado.toUpperCase()}-001`, // Mayúsculas + sufijo -001
        numeroIngresado.toLowerCase(), // Minúsculas
        `${numeroIngresado.toLowerCase()}-001`, // Minúsculas + sufijo
      ];
      
      console.log('Formatos a probar:', formatosPosibles);
      
      let guiaEncontrada = false;
      let guiaData = null;
      
      // Intentar cada formato con autenticación
      for (const formato of formatosPosibles) {
        if (guiaEncontrada) break;
        
        try {
          console.log(`Probando formato: ${formato}`);
          const zigoUrl = `https://dev-api-entregas.zigo.com.gt:443/guide/${formato}`;
          
          const response = await fetch(zigoUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': 'V1c7NjZhYmEtMGQyMi00YmM3LWFkZjgtNTVlNzFiNDFjNzFiQDIwMjUtMDEtMTE=',
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            guiaData = result.data;
            guiaEncontrada = true;
            console.log('✓ Guía encontrada con formato:', formato);
            break;
          } else {
            console.log(`✗ Formato ${formato} no encontrado`);
          }
        } catch (error) {
          console.log(`✗ Error con formato ${formato}:`, error);
        }
      }
      
      if (!guiaEncontrada) {
        throw new Error('No se encontró con ningún formato');
      }
      
      // Llenar el formulario con los datos de Zigo
      setConsultaData({
        numero_guia: guiaData.guideNumber || numeroIngresado,
        estado_guia: guiaData.guideStatusId || "",
        fecha_guia: guiaData.guideDate || "",
        remitente: guiaData.senderName || "",
        direccion_remitente: guiaData.senderAddress || "",
        referencia_1: guiaData.reference01 || "",
        referencia_2: guiaData.reference02 || "",
        piezas: guiaData.totalPieces?.toString() || "",
        peso: guiaData.totalWeight?.toString() || "",
        tarifa: guiaData.totalFee?.toString() || "",
        fecha_ingreso: guiaData.entryDate || "",
        fecha_promesa: guiaData.projectedDeliveryDate || "",
        destinatario: guiaData.recipientName || "",
        direccion_destinatario: guiaData.recipientAddress || "",
        recibido_por: guiaData.podName || "",
        fecha_entrega: guiaData.podDate || "",
        operador_pod: guiaData.podOperator || ""
      });
      
      toast({
        title: "Éxito",
        description: `Guía ${guiaData.guideNumber} encontrada en Zigo`
      });
      
    } catch (zigoError) {
      console.error('Error buscando en Zigo:', zigoError);
      
      // Si falla Zigo, buscar en la base de datos local
      try {
        const { data, error } = await supabase
          .from('guias_envio')
          .select('*')
          .ilike('numero_guia', `%${consultaData.numero_guia}%`)
          .maybeSingle();
          
        if (error) throw error;
        
        if (data) {
          setConsultaData({
            numero_guia: data.numero_guia,
            estado_guia: data.estado,
            fecha_guia: data.fecha_guia ? format(new Date(data.fecha_guia), 'yyyy-MM-dd') : "",
            remitente: data.remitente,
            direccion_remitente: data.direccion_remitente || "",
            referencia_1: data.referencia_1 || "",
            referencia_2: data.referencia_2 || "",
            piezas: data.cantidad_piezas?.toString() || "",
            peso: data.peso?.toString() || "",
            tarifa: data.tarifa?.toString() || "",
            fecha_ingreso: data.fecha_ingreso ? format(new Date(data.fecha_ingreso), 'yyyy-MM-dd') : "",
            fecha_promesa: data.fecha_promesa_entrega ? format(new Date(data.fecha_promesa_entrega), 'yyyy-MM-dd') : "",
            destinatario: data.destinatario,
            direccion_destinatario: data.direccion_destinatario,
            recibido_por: data.recibido_por || "",
            fecha_entrega: data.fecha_entrega ? format(new Date(data.fecha_entrega), 'yyyy-MM-dd') : "",
            operador_pod: data.operador_pod || ""
          });
          
          toast({
            title: "Éxito",
            description: "Guía encontrada en base de datos local"
          });
        } else {
          throw new Error('No se encontró en base de datos local');
        }
      } catch (error) {
        console.error('Error searching guia:', error);
        toast({
          title: "Error",
          description: `No se encontró la guía "${consultaData.numero_guia}". Intente con el número completo como aparece en Zigo (ej: ZG25J00084660-001)`,
          variant: "destructive"
        });
      }
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Sistema Zigo - Guías de Envío</h1>
        <p className="text-muted-foreground mt-1">
          Gestión de guías para transporte de máquinas
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="crear" className="flex items-center gap-2">
            <PackagePlus className="h-4 w-4" />
            Crear Guía
          </TabsTrigger>
          <TabsTrigger value="consultar" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Consultar Guías
          </TabsTrigger>
        </TabsList>

        {/* Tab: Crear Guía */}
        <TabsContent value="crear" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nueva Guía de Envío</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna Izquierda */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label htmlFor="remitente">Remitente:</Label>
                      <Input
                        id="remitente"
                        value={formData.remitente}
                        onChange={(e) => setFormData({ ...formData, remitente: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="direccion_remitente">Dir. Rem.:</Label>
                      <Input
                        id="direccion_remitente"
                        value={formData.direccion_remitente}
                        onChange={(e) => setFormData({ ...formData, direccion_remitente: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="referencia_1">Ref. 1:</Label>
                      <Input
                        id="referencia_1"
                        value={formData.referencia_1}
                        onChange={(e) => setFormData({ ...formData, referencia_1: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="referencia_2">Ref. 2:</Label>
                      <Input
                        id="referencia_2"
                        value={formData.referencia_2}
                        onChange={(e) => setFormData({ ...formData, referencia_2: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="cantidad_piezas">Pzs.:</Label>
                      <Input
                        id="cantidad_piezas"
                        type="number"
                        min="1"
                        value={formData.cantidad_piezas}
                        onChange={(e) => setFormData({ ...formData, cantidad_piezas: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="peso">Peso:</Label>
                      <Input
                        id="peso"
                        type="number"
                        step="0.01"
                        value={formData.peso}
                        onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tarifa">Tarifa:</Label>
                      <Input
                        id="tarifa"
                        type="number"
                        step="0.01"
                        value={formData.tarifa}
                        onChange={(e) => setFormData({ ...formData, tarifa: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Columna Derecha */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="fecha_ingreso_display">Fec. Ingreso:</Label>
                      <Input
                        id="fecha_ingreso_display"
                        type="date"
                        value={format(new Date(), 'yyyy-MM-dd')}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fecha_promesa_entrega">Fec. PromesaE.:</Label>
                      <Input
                        id="fecha_promesa_entrega"
                        type="date"
                        value={formData.fecha_promesa_entrega}
                        onChange={(e) => setFormData({ ...formData, fecha_promesa_entrega: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Buscar Cliente: *</Label>
                    <Popover open={openClienteCombobox} onOpenChange={setOpenClienteCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openClienteCombobox}
                          className="w-full justify-between"
                        >
                          {clienteSeleccionado
                            ? `${clienteSeleccionado.nombre} (${clienteSeleccionado.codigo})`
                            : "Seleccione un cliente..."}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar cliente..." />
                          <CommandList>
                            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                            <CommandGroup>
                              {clientes.map((cliente) => (
                                <CommandItem
                                  key={cliente.id}
                                  value={`${cliente.nombre} ${cliente.codigo}`}
                                  onSelect={() => handleClienteSelect(cliente)}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{cliente.nombre}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {cliente.codigo} - {cliente.celular}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="destinatario">Destinatario: *</Label>
                    <Input
                      id="destinatario"
                      value={formData.destinatario}
                      onChange={(e) => setFormData({ ...formData, destinatario: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label htmlFor="direccion_destinatario">Dir. Dest.: *</Label>
                      <Textarea
                        id="direccion_destinatario"
                        value={formData.direccion_destinatario}
                        onChange={(e) => setFormData({ ...formData, direccion_destinatario: e.target.value })}
                        required
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="ciudad_destino">Ciudad: *</Label>
                      <Input
                        id="ciudad_destino"
                        value={formData.ciudad_destino}
                        onChange={(e) => setFormData({ ...formData, ciudad_destino: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="telefono_destinatario">Teléfono:</Label>
                      <Input
                        id="telefono_destinatario"
                        value={formData.telefono_destinatario}
                        onChange={(e) => setFormData({ ...formData, telefono_destinatario: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Incidentes a Enviar - Full Width */}
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label>Incidentes a Enviar:</Label>
                  <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                    {incidentesDisponibles.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay incidentes listos para envío</p>
                    ) : (
                      <div className="space-y-2">
                        {incidentesDisponibles.map((incidente) => (
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
                              className="h-4 w-4"
                            />
                            <label htmlFor={incidente.codigo} className="text-sm cursor-pointer flex-1">
                              {incidente.codigo} - {incidente.descripcion_problema.substring(0, 50)}...
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => {
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
                    direccion_remitente: "42A Av 9-16 Zona 5, Ciudad de Guatemala",
                    telefono_destinatario: ""
                  });
                }}>
                  Limpiar
                </Button>
                <Button onClick={handleCreate}>
                  <PackagePlus className="h-4 w-4 mr-2" />
                  Crear Guía
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Consultar Guías */}
        <TabsContent value="consultar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consulta de Guías</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Formulario de búsqueda */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Columna Izquierda */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="search_guia">Guía:</Label>
                      <Input
                        id="search_guia"
                        value={consultaData.numero_guia}
                        onChange={(e) => setConsultaData({ ...consultaData, numero_guia: e.target.value })}
                        placeholder="Número de guía"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleSearch} size="icon">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Estado Guía:</Label>
                      <Input value={consultaData.estado_guia} disabled className="bg-muted" />
                    </div>
                    <div>
                      <Label>Fecha Guía:</Label>
                      <Input value={consultaData.fecha_guia} disabled className="bg-muted" />
                    </div>
                  </div>

                  <div>
                    <Label>Remitente:</Label>
                    <Input value={consultaData.remitente} disabled className="bg-muted" />
                  </div>

                  <div>
                    <Label>Dir. Rem.:</Label>
                    <Input value={consultaData.direccion_remitente} disabled className="bg-muted" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Ref. 1:</Label>
                      <Input value={consultaData.referencia_1} disabled className="bg-muted" />
                    </div>
                    <div>
                      <Label>Ref. 2:</Label>
                      <Input value={consultaData.referencia_2} disabled className="bg-muted" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Pzs.:</Label>
                      <Input value={consultaData.piezas} disabled className="bg-muted" />
                    </div>
                    <div>
                      <Label>Peso:</Label>
                      <Input value={consultaData.peso} disabled className="bg-muted" />
                    </div>
                    <div>
                      <Label>Tarifa:</Label>
                      <Input value={consultaData.tarifa} disabled className="bg-muted" />
                    </div>
                  </div>
                </div>

                {/* Columna Derecha */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Fec. Ingreso:</Label>
                      <Input value={consultaData.fecha_ingreso} disabled className="bg-muted" />
                    </div>
                    <div>
                      <Label>Fec. PromesaE.:</Label>
                      <Input value={consultaData.fecha_promesa} disabled className="bg-muted" />
                    </div>
                  </div>

                  <div>
                    <Label>Destinatario:</Label>
                    <Input value={consultaData.destinatario} disabled className="bg-muted" />
                  </div>

                  <div>
                    <Label>Dir. Dest.:</Label>
                    <Textarea value={consultaData.direccion_destinatario} disabled className="bg-muted" rows={2} />
                  </div>

                  <div>
                    <Label>Recibió:</Label>
                    <Input value={consultaData.recibido_por} disabled className="bg-muted" />
                  </div>

                  <div>
                    <Label>F. Entrega:</Label>
                    <Input value={consultaData.fecha_entrega} disabled className="bg-muted" />
                  </div>

                  <div>
                    <Label>Op.POD:</Label>
                    <Input value={consultaData.operador_pod} disabled className="bg-muted" />
                  </div>
                </div>
              </div>

              {/* Tabla de guías */}
              <div className="border-t pt-4">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por número de guía, destino o destinatario..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No. Guía</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Destinatario</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Fecha Creación</TableHead>
                        <TableHead>Fecha Entrega</TableHead>
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
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setConsultaData({
                                    numero_guia: guia.numero_guia,
                                    estado_guia: guia.estado,
                                    fecha_guia: format(new Date(guia.fecha_guia), 'yyyy-MM-dd'),
                                    remitente: guia.remitente,
                                    direccion_remitente: guia.direccion_remitente || "",
                                    referencia_1: guia.referencia_1 || "",
                                    referencia_2: guia.referencia_2 || "",
                                    piezas: guia.cantidad_piezas?.toString() || "",
                                    peso: guia.peso?.toString() || "",
                                    tarifa: guia.tarifa?.toString() || "",
                                    fecha_ingreso: format(new Date(guia.fecha_ingreso), 'yyyy-MM-dd'),
                                    fecha_promesa: guia.fecha_promesa_entrega ? format(new Date(guia.fecha_promesa_entrega), 'yyyy-MM-dd') : "",
                                    destinatario: guia.destinatario,
                                    direccion_destinatario: guia.direccion_destinatario,
                                    recibido_por: guia.recibido_por || "",
                                    fecha_entrega: guia.fecha_entrega ? format(new Date(guia.fecha_entrega), 'yyyy-MM-dd') : "",
                                    operador_pod: guia.operador_pod || ""
                                  });
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
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
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
