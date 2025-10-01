import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, CheckCircle2, User, Package, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Producto } from "@/types";

const centrosServicio = [
  'Zona 5 (Principal)',
  'Zona 4',
  'Chimaltenango', 
  'Río Hondo',
  'Escuintla',
  'Xela',
  'Jutiapa',
  'Huehuetenango'
];

const tipologias = [
  'Cambio de aceite',
  'Reparación de motor',
  'Revisión eléctrica',
  'Cambio de repuestos',
  'Mantenimiento preventivo',
  'Calibración',
  'Limpieza general',
  'Otros'
];

interface Cliente {
  codigo: string;
  nombre: string;
  nit: string;
  direccion?: string;
  correo?: string;
  telefono_principal?: string;
  telefono_secundario?: string;
  nombre_facturacion?: string;
  pais?: string;
  departamento?: string;
  municipio?: string;
}

export default function NuevoIncidente() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(1);
  
  // Paso 1: Cliente
  const [esNuevoCliente, setEsNuevoCliente] = useState<boolean | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  
  // Datos del nuevo cliente
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    nit: "",
    direccion: "",
    correo: "",
    telefono_principal: "",
    telefono_secundario: "",
    nombre_facturacion: "",
    pais: "Guatemala",
    departamento: "",
    municipio: ""
  });

  // Datos del cliente existente
  const [datosClienteExistente, setDatosClienteExistente] = useState({
    nombre: "",
    nit: "",
    correo: "",
    telefono_principal: "",
    telefono_secundario: ""
  });
  
  // Paso 2: Incidente
  const [skuMaquina, setSkuMaquina] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [productosEncontrados, setProductosEncontrados] = useState<Producto[]>([]);
  const [descripcionProblema, setDescripcionProblema] = useState("");
  const [accesorios, setAccesorios] = useState("");
  const [centroServicio, setCentroServicio] = useState("");
  const [quiereEnvio, setQuiereEnvio] = useState<string>("");
  const [ingresadoMostrador, setIngresadoMostrador] = useState(true);
  const [esReingreso, setEsReingreso] = useState(false);
  const [logObservaciones, setLogObservaciones] = useState("");
  const [tipologia, setTipologia] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Buscar clientes
  useEffect(() => {
    if (busquedaCliente.length >= 3 && esNuevoCliente === false) {
      const fetchClientes = async () => {
        try {
          const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .or(`nombre.ilike.%${busquedaCliente}%,nit.ilike.%${busquedaCliente}%`);
          
          if (error) throw error;
          setClientesEncontrados(data || []);
        } catch (error) {
          console.error('Error fetching clientes:', error);
        }
      };
      fetchClientes();
    } else {
      setClientesEncontrados([]);
    }
  }, [busquedaCliente, esNuevoCliente]);

  // Buscar productos
  useEffect(() => {
    if (skuMaquina.length >= 3) {
      const fetchProductos = async () => {
        try {
          const { data, error } = await supabase
            .from('productos')
            .select('*')
            .or(`codigo.ilike.%${skuMaquina}%,clave.ilike.%${skuMaquina}%`);
          
          if (error) throw error;

          const transformedData: Producto[] = (data || []).map(item => ({
            codigo: item.codigo.trim(),
            clave: item.clave.trim(),
            descripcion: item.descripcion.trim(),
            descontinuado: item.descontinuado,
            urlFoto: item.url_foto || "/api/placeholder/200/200",
            categoria: "Electricas" as const
          }));

          setProductosEncontrados(transformedData);
          if (transformedData.length === 1) {
            setProductoSeleccionado(transformedData[0]);
          }
        } catch (error) {
          console.error('Error fetching productos:', error);
        }
      };
      fetchProductos();
    }
  }, [skuMaquina]);

  const seleccionarCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setDatosClienteExistente({
      nombre: cliente.nombre,
      nit: cliente.nit,
      correo: cliente.correo || "",
      telefono_principal: cliente.telefono_principal || "",
      telefono_secundario: cliente.telefono_secundario || ""
    });
    setBusquedaCliente("");
    setClientesEncontrados([]);
  };

  const validarPaso1 = () => {
    if (esNuevoCliente === null) {
      toast({ title: "Error", description: "Seleccione si es un cliente nuevo o existente", variant: "destructive" });
      return false;
    }

    if (esNuevoCliente) {
      if (!nuevoCliente.nombre || !nuevoCliente.nit || !nuevoCliente.direccion || 
          !nuevoCliente.correo || !nuevoCliente.telefono_principal || !nuevoCliente.nombre_facturacion ||
          !nuevoCliente.departamento || !nuevoCliente.municipio) {
        toast({ title: "Error", description: "Complete todos los campos obligatorios del cliente", variant: "destructive" });
        return false;
      }
    } else {
      if (!clienteSeleccionado) {
        toast({ title: "Error", description: "Seleccione un cliente existente", variant: "destructive" });
        return false;
      }
      if (!datosClienteExistente.nombre || !datosClienteExistente.nit || 
          !datosClienteExistente.correo || !datosClienteExistente.telefono_principal) {
        toast({ title: "Error", description: "Complete todos los campos obligatorios del cliente", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const validarPaso2 = () => {
    if (!productoSeleccionado) {
      toast({ title: "Error", description: "Seleccione un producto (SKU de la máquina)", variant: "destructive" });
      return false;
    }
    if (!descripcionProblema.trim()) {
      toast({ title: "Error", description: "Ingrese la descripción del problema", variant: "destructive" });
      return false;
    }
    if (!centroServicio) {
      toast({ title: "Error", description: "Seleccione un centro de servicio", variant: "destructive" });
      return false;
    }
    if (!quiereEnvio) {
      toast({ title: "Error", description: "Indique si quiere envío o viene a recoger", variant: "destructive" });
      return false;
    }
    if (!tipologia) {
      toast({ title: "Error", description: "Seleccione la tipología", variant: "destructive" });
      return false;
    }
    return true;
  };

  const guardarIncidente = async () => {
    if (!validarPaso2()) return;

    setGuardando(true);
    try {
      let codigoCliente = clienteSeleccionado?.codigo;

      // Si es nuevo cliente, crearlo primero
      if (esNuevoCliente) {
        // Generar código HPC
        const { data: codigoData, error: codigoError } = await supabase
          .rpc('generar_codigo_hpc');
        
        if (codigoError) throw codigoError;
        
        const nuevoCodigoHPC = codigoData;

        // Insertar nuevo cliente
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .insert({
            codigo: nuevoCodigoHPC,
            nombre: nuevoCliente.nombre,
            nit: nuevoCliente.nit,
            direccion: nuevoCliente.direccion,
            correo: nuevoCliente.correo,
            telefono_principal: nuevoCliente.telefono_principal,
            telefono_secundario: nuevoCliente.telefono_secundario,
            nombre_facturacion: nuevoCliente.nombre_facturacion,
            pais: nuevoCliente.pais,
            departamento: nuevoCliente.departamento,
            municipio: nuevoCliente.municipio,
            celular: nuevoCliente.telefono_principal // Para compatibilidad con el campo existente
          })
          .select()
          .single();

        if (clienteError) throw clienteError;
        codigoCliente = clienteData.codigo;
        
        toast({ title: "Cliente creado", description: `Código HPC: ${nuevoCodigoHPC}` });
      } else {
        // Actualizar datos del cliente existente
        const { error: updateError } = await supabase
          .from('clientes')
          .update({
            nombre: datosClienteExistente.nombre,
            nit: datosClienteExistente.nit,
            correo: datosClienteExistente.correo,
            telefono_principal: datosClienteExistente.telefono_principal,
            telefono_secundario: datosClienteExistente.telefono_secundario,
            celular: datosClienteExistente.telefono_principal
          })
          .eq('codigo', clienteSeleccionado!.codigo);

        if (updateError) throw updateError;
      }

      // Crear el incidente
      const { error: incidenteError } = await supabase
        .from('incidentes')
        .insert({
          codigo_cliente: codigoCliente,
          codigo_producto: productoSeleccionado!.codigo,
          sku_maquina: skuMaquina,
          descripcion_problema: descripcionProblema,
          accesorios: accesorios || null,
          centro_servicio: centroServicio,
          quiere_envio: quiereEnvio === 'envio',
          ingresado_en_mostrador: ingresadoMostrador,
          es_reingreso: esReingreso,
          log_observaciones: logObservaciones || null,
          tipologia: tipologia,
          status: 'Ingresado',
          cobertura_garantia: false,
          producto_descontinuado: productoSeleccionado!.descontinuado,
          codigo_tecnico: 'TEC-001' // Default, se puede cambiar después
        });

      if (incidenteError) throw incidenteError;

      toast({ 
        title: "Incidente creado exitosamente", 
        description: "El incidente ha sido registrado en el sistema" 
      });
      
      navigate("/incidentes");
    } catch (error) {
      console.error('Error al guardar:', error);
      toast({ 
        title: "Error", 
        description: "No se pudo guardar el incidente. Intente nuevamente.", 
        variant: "destructive" 
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate("/incidentes")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Incidentes
        </Button>
        <h1 className="text-2xl font-bold">Nuevo Incidente</h1>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              paso >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {paso > 1 ? <CheckCircle2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <span className={`font-medium ${paso >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Cliente
            </span>
          </div>
          <div className={`w-20 h-1 ${paso >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              paso >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              <Package className="w-5 h-5" />
            </div>
            <span className={`font-medium ${paso >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Incidente
            </span>
          </div>
        </div>
      </div>

      {/* Paso 1: Cliente */}
      {paso === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
            <CardDescription>Seleccione si es un cliente nuevo o existente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup 
              value={esNuevoCliente === null ? "" : esNuevoCliente ? "nuevo" : "existente"} 
              onValueChange={(value) => {
                setEsNuevoCliente(value === "nuevo");
                setClienteSeleccionado(null);
                setBusquedaCliente("");
              }}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nuevo" id="cliente-nuevo" />
                <Label htmlFor="cliente-nuevo" className="cursor-pointer">Nuevo Cliente</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existente" id="cliente-existente" />
                <Label htmlFor="cliente-existente" className="cursor-pointer">Cliente Existente</Label>
              </div>
            </RadioGroup>

            {esNuevoCliente === true && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span>Se generará automáticamente un código HPC para este cliente</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={nuevoCliente.nombre}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                      placeholder="Nombre completo del cliente"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nit">NIT *</Label>
                    <Input
                      id="nit"
                      value={nuevoCliente.nit}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, nit: e.target.value })}
                      placeholder="NIT o CF"
                    />
                  </div>

                  <div>
                    <Label htmlFor="nombre-facturacion">Nombre de Facturación *</Label>
                    <Input
                      id="nombre-facturacion"
                      value={nuevoCliente.nombre_facturacion}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre_facturacion: e.target.value })}
                      placeholder="Nombre para facturar"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="direccion">Dirección *</Label>
                    <Input
                      id="direccion"
                      value={nuevoCliente.direccion}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
                      placeholder="Dirección completa"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="correo">Correo Electrónico *</Label>
                    <Input
                      id="correo"
                      type="email"
                      value={nuevoCliente.correo}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, correo: e.target.value })}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telefono-principal">Teléfono Principal *</Label>
                    <Input
                      id="telefono-principal"
                      value={nuevoCliente.telefono_principal}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono_principal: e.target.value })}
                      placeholder="1234-5678"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telefono-secundario">Teléfono Secundario</Label>
                    <Input
                      id="telefono-secundario"
                      value={nuevoCliente.telefono_secundario}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono_secundario: e.target.value })}
                      placeholder="1234-5678"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pais">País *</Label>
                    <Input
                      id="pais"
                      value={nuevoCliente.pais}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, pais: e.target.value })}
                      placeholder="Guatemala"
                    />
                  </div>

                  <div>
                    <Label htmlFor="departamento">Departamento *</Label>
                    <Input
                      id="departamento"
                      value={nuevoCliente.departamento}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, departamento: e.target.value })}
                      placeholder="Departamento"
                    />
                  </div>

                  <div>
                    <Label htmlFor="municipio">Municipio *</Label>
                    <Input
                      id="municipio"
                      value={nuevoCliente.municipio}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, municipio: e.target.value })}
                      placeholder="Municipio"
                    />
                  </div>
                </div>
              </div>
            )}

            {esNuevoCliente === false && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="busqueda-cliente">Buscar Cliente</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="busqueda-cliente"
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      placeholder="Buscar por nombre o NIT (mín. 3 caracteres)"
                      className="pl-10"
                    />
                  </div>
                  
                  {clientesEncontrados.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto bg-background">
                      {clientesEncontrados.map((cliente) => (
                        <div 
                          key={cliente.codigo}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          onClick={() => seleccionarCliente(cliente)}
                        >
                          <div className="font-medium">{cliente.nombre}</div>
                          <div className="text-sm text-muted-foreground">
                            Código: {cliente.codigo} | NIT: {cliente.nit}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {clienteSeleccionado && (
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Cliente seleccionado: {clienteSeleccionado.codigo}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nombre-existente">Nombre *</Label>
                        <Input
                          id="nombre-existente"
                          value={datosClienteExistente.nombre}
                          onChange={(e) => setDatosClienteExistente({ ...datosClienteExistente, nombre: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="nit-existente">NIT *</Label>
                        <Input
                          id="nit-existente"
                          value={datosClienteExistente.nit}
                          onChange={(e) => setDatosClienteExistente({ ...datosClienteExistente, nit: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="correo-existente">Correo *</Label>
                        <Input
                          id="correo-existente"
                          type="email"
                          value={datosClienteExistente.correo}
                          onChange={(e) => setDatosClienteExistente({ ...datosClienteExistente, correo: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="tel1-existente">Teléfono Principal *</Label>
                        <Input
                          id="tel1-existente"
                          value={datosClienteExistente.telefono_principal}
                          onChange={(e) => setDatosClienteExistente({ ...datosClienteExistente, telefono_principal: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="tel2-existente">Teléfono Secundario</Label>
                        <Input
                          id="tel2-existente"
                          value={datosClienteExistente.telefono_secundario}
                          onChange={(e) => setDatosClienteExistente({ ...datosClienteExistente, telefono_secundario: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={() => {
                  if (validarPaso1()) setPaso(2);
                }}
              >
                Siguiente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 2: Incidente */}
      {paso === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Información del Incidente</CardTitle>
            <CardDescription>Datos del equipo y problema reportado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="sku">SKU de la Máquina *</Label>
              <Input
                id="sku"
                value={skuMaquina}
                onChange={(e) => setSkuMaquina(e.target.value)}
                placeholder="Ingrese código o clave del producto (mín. 3 caracteres)"
              />
              
              {productosEncontrados.length > 1 && (
                <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto bg-background">
                  {productosEncontrados.map((producto) => (
                    <div 
                      key={producto.codigo}
                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        setProductoSeleccionado(producto);
                        setSkuMaquina(producto.codigo);
                      }}
                    >
                      <div className="font-medium">{producto.descripcion}</div>
                      <div className="text-sm text-muted-foreground">
                        Código: {producto.codigo} | Clave: {producto.clave}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {productoSeleccionado && (
                <div className="mt-2 p-3 border rounded-lg bg-primary/5">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="font-medium">{productoSeleccionado.descripcion}</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción del Problema *</Label>
              <Textarea
                id="descripcion"
                value={descripcionProblema}
                onChange={(e) => setDescripcionProblema(e.target.value)}
                placeholder="Describa el problema reportado por el cliente"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="accesorios">Accesorios con los que ingresa</Label>
              <Input
                id="accesorios"
                value={accesorios}
                onChange={(e) => setAccesorios(e.target.value)}
                placeholder="Ej: Cable de poder, manual, estuche"
              />
            </div>

            <div>
              <Label htmlFor="centro">Centro de Servicio *</Label>
              <Select value={centroServicio} onValueChange={setCentroServicio}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un centro" />
                </SelectTrigger>
                <SelectContent>
                  {centrosServicio.map((centro) => (
                    <SelectItem key={centro} value={centro}>
                      {centro}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>¿Quiere envío o viene a recoger? *</Label>
              <RadioGroup value={quiereEnvio} onValueChange={setQuiereEnvio} className="flex gap-6 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="envio" id="envio" />
                  <Label htmlFor="envio" className="cursor-pointer">Quiere envío</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recoger" id="recoger" />
                  <Label htmlFor="recoger" className="cursor-pointer">Viene a recoger</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mostrador"
                checked={ingresadoMostrador}
                onCheckedChange={(checked) => setIngresadoMostrador(checked as boolean)}
              />
              <Label htmlFor="mostrador" className="cursor-pointer">
                Ingresado en mostrador
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="reingreso"
                checked={esReingreso}
                onCheckedChange={(checked) => setEsReingreso(checked as boolean)}
              />
              <Label htmlFor="reingreso" className="cursor-pointer">
                Es un reingreso
              </Label>
            </div>

            <div>
              <Label htmlFor="tipologia">Tipología *</Label>
              <Select value={tipologia} onValueChange={setTipologia}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione la tipología" />
                </SelectTrigger>
                <SelectContent>
                  {tipologias.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="log">Observaciones (LOG)</Label>
              <Textarea
                id="log"
                value={logObservaciones}
                onChange={(e) => setLogObservaciones(e.target.value)}
                placeholder="Cualquier observación adicional"
                rows={3}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setPaso(1)}>
                Atrás
              </Button>
              <Button onClick={guardarIncidente} disabled={guardando}>
                {guardando ? "Guardando..." : "Crear Incidente"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
