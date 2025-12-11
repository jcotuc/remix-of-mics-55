import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Search, CheckCircle2, User, Package, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Producto } from "@/types";
import { WhatsAppStyleMediaCapture, MediaFile } from "@/components/WhatsAppStyleMediaCapture";
import { uploadMediaToStorage, saveIncidentePhotos } from "@/lib/uploadMedia";

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
  'Mantenimiento',
  'Reparación',
  'Daños por transporte',
  'Venta de repuestos'
];

// Departamentos de Guatemala
const DEPARTAMENTOS = [
  "Guatemala", "Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula",
  "El Progreso", "Escuintla", "Huehuetenango", "Izabal", "Jalapa",
  "Jutiapa", "Petén", "Quetzaltenango", "Quiché", "Retalhuleu",
  "Sacatepéquez", "San Marcos", "Santa Rosa", "Sololá", "Suchitepéquez",
  "Totonicapán", "Zacapa"
];

// Municipios por departamento
const MUNICIPIOS: Record<string, string[]> = {
  "Guatemala": ["Guatemala", "Santa Catarina Pinula", "San José Pinula", "San José del Golfo", "Palencia", "Chinautla", "San Pedro Ayampuc", "Mixco", "San Pedro Sacatepéquez", "San Juan Sacatepéquez", "San Raymundo", "Chuarrancho", "Fraijanes", "Amatitlán", "Villa Nueva", "Villa Canales", "San Miguel Petapa"],
  "Alta Verapaz": ["Cobán", "Santa Cruz Verapaz", "San Cristóbal Verapaz", "Tactic", "Tamahú", "Tucurú", "Panzós", "Senahú", "San Pedro Carchá", "San Juan Chamelco", "Lanquín", "Cahabón", "Chisec", "Chahal", "Fray Bartolomé de las Casas", "Santa Catarina La Tinta", "Raxruhá"],
  "Baja Verapaz": ["Salamá", "San Miguel Chicaj", "Rabinal", "Cubulco", "Granados", "Santa Cruz El Chol", "San Jerónimo", "Purulhá"],
  "Chimaltenango": ["Chimaltenango", "San José Poaquil", "San Martín Jilotepeque", "San Juan Comalapa", "Santa Apolonia", "Tecpán Guatemala", "Patzún", "San Miguel Pochuta", "Patzicía", "Santa Cruz Balanyá", "Acatenango", "San Pedro Yepocapa", "San Andrés Itzapa", "Parramos", "Zaragoza", "El Tejar"],
  "Chiquimula": ["Chiquimula", "San José La Arada", "San Juan Ermita", "Jocotán", "Camotán", "Olopa", "Esquipulas", "Concepción Las Minas", "Quezaltepeque", "San Jacinto", "Ipala"],
  "El Progreso": ["Guastatoya", "Morazán", "San Agustín Acasaguastlán", "San Cristóbal Acasaguastlán", "El Jícaro", "Sansare", "Sanarate", "San Antonio La Paz"],
  "Escuintla": ["Escuintla", "Santa Lucía Cotzumalguapa", "La Democracia", "Siquinalá", "Masagua", "Tiquisate", "La Gomera", "Guanagazapa", "San José", "Iztapa", "Palín", "San Vicente Pacaya", "Nueva Concepción", "Puerto San José"],
  "Huehuetenango": ["Huehuetenango", "Chiantla", "Malacatancito", "Cuilco", "Nentón", "San Pedro Necta", "Jacaltenango", "San Pedro Soloma", "San Ildefonso Ixtahuacán", "Santa Bárbara", "La Libertad", "La Democracia", "San Miguel Acatán", "San Rafael La Independencia", "Todos Santos Cuchumatán", "San Juan Atitán", "Santa Eulalia", "San Mateo Ixtatán", "Colotenango", "San Sebastián Huehuetenango", "Tectitán", "Concepción Huista", "San Juan Ixcoy", "San Antonio Huista", "Santa Cruz Barillas", "San Sebastián Coatán", "Aguacatán", "San Rafael Petzal", "San Gaspar Ixchil", "Santiago Chimaltenango", "Santa Ana Huista", "Unión Cantinil", "Petatán"],
  "Izabal": ["Puerto Barrios", "Livingston", "El Estor", "Morales", "Los Amates"],
  "Jalapa": ["Jalapa", "San Pedro Pinula", "San Luis Jilotepeque", "San Manuel Chaparrón", "San Carlos Alzatate", "Monjas", "Mataquescuintla"],
  "Jutiapa": ["Jutiapa", "El Progreso", "Santa Catarina Mita", "Agua Blanca", "Asunción Mita", "Yupiltepeque", "Atescatempa", "Jerez", "El Adelanto", "Zapotitlán", "Comapa", "Jalpatagua", "Conguaco", "Moyuta", "Pasaco", "Quesada", "San José Acatempa"],
  "Petén": ["Flores", "San José", "San Benito", "San Andrés", "La Libertad", "San Francisco", "Santa Ana", "Dolores", "San Luis", "Sayaxché", "Melchor de Mencos", "Poptún", "Las Cruces", "El Chal"],
  "Quetzaltenango": ["Quetzaltenango", "Salcajá", "Olintepeque", "San Carlos Sija", "Sibilia", "Cabricán", "Cajolá", "San Miguel Sigüilá", "San Juan Ostuncalco", "San Mateo", "Concepción Chiquirichapa", "San Martín Sacatepéquez", "Almolonga", "Cantel", "Huitán", "Zunil", "Colomba Costa Cuca", "San Francisco La Unión", "El Palmar", "Coatepeque", "Génova", "Flores Costa Cuca", "La Esperanza", "Palestina de Los Altos"],
  "Quiché": ["Santa Cruz del Quiché", "Chiché", "Chinique", "Zacualpa", "Chajul", "Santo Tomás Chichicastenango", "Patzité", "San Antonio Ilotenango", "San Pedro Jocopilas", "Cunén", "San Juan Cotzal", "Joyabaj", "Nebaj", "San Andrés Sajcabajá", "San Miguel Uspantán", "Sacapulas", "San Bartolomé Jocotenango", "Canillá", "Chicamán", "Ixcán", "Pachalum"],
  "Retalhuleu": ["Retalhuleu", "San Sebastián", "Santa Cruz Muluá", "San Martín Zapotitlán", "San Felipe", "San Andrés Villa Seca", "Champerico", "Nuevo San Carlos", "El Asintal"],
  "Sacatepéquez": ["Antigua Guatemala", "Jocotenango", "Pastores", "Sumpango", "Santo Domingo Xenacoj", "Santiago Sacatepéquez", "San Bartolomé Milpas Altas", "San Lucas Sacatepéquez", "Santa Lucía Milpas Altas", "Magdalena Milpas Altas", "Santa María de Jesús", "Ciudad Vieja", "San Miguel Dueñas", "Alotenango", "San Antonio Aguas Calientes", "Santa Catarina Barahona"],
  "San Marcos": ["San Marcos", "San Pedro Sacatepéquez", "San Antonio Sacatepéquez", "Comitancillo", "San Miguel Ixtahuacán", "Concepción Tutuapa", "Tacaná", "Sibinal", "Tajumulco", "Tejutla", "San Rafael Pie de la Cuesta", "Nuevo Progreso", "El Tumbador", "San José El Rodeo", "Malacatán", "Catarina", "Ayutla", "Ocós", "San Pablo", "El Quetzal", "La Reforma", "Pajapita", "Ixchiguán", "San José Ojetenam", "San Cristóbal Cucho", "Sipacapa", "Esquipulas Palo Gordo", "Río Blanco", "San Lorenzo"],
  "Santa Rosa": ["Cuilapa", "Barberena", "Santa Rosa de Lima", "Casillas", "San Rafael Las Flores", "Oratorio", "San Juan Tecuaco", "Chiquimulilla", "Taxisco", "Santa María Ixhuatán", "Guazacapán", "Santa Cruz Naranjo", "Pueblo Nuevo Viñas", "Nueva Santa Rosa"],
  "Sololá": ["Sololá", "San José Chacayá", "Santa María Visitación", "Santa Lucía Utatlán", "Nahualá", "Santa Catarina Ixtahuacán", "Santa Clara La Laguna", "Concepción", "San Andrés Semetabaj", "Panajachel", "Santa Catarina Palopó", "San Antonio Palopó", "San Lucas Tolimán", "Santa Cruz La Laguna", "San Pablo La Laguna", "San Marcos La Laguna", "San Juan La Laguna", "San Pedro La Laguna", "Santiago Atitlán"],
  "Suchitepéquez": ["Mazatenango", "Cuyotenango", "San Francisco Zapotitlán", "San Bernardino", "San José El Ídolo", "Santo Domingo Suchitepéquez", "San Lorenzo", "Samayac", "San Pablo Jocopilas", "San Antonio Suchitepéquez", "San Miguel Panán", "San Gabriel", "Chicacao", "Patulul", "Santa Bárbara", "San Juan Bautista", "Santo Tomás La Unión", "Zunilito", "Pueblo Nuevo", "Río Bravo"],
  "Totonicapán": ["Totonicapán", "San Cristóbal Totonicapán", "San Francisco El Alto", "San Andrés Xecul", "Momostenango", "Santa María Chiquimula", "Santa Lucía La Reforma", "San Bartolo"],
  "Zacapa": ["Zacapa", "Estanzuela", "Río Hondo", "Gualán", "Teculután", "Usumatlán", "Cabañas", "San Diego", "La Unión", "Huité", "San Jorge"]
};

interface Cliente {
  codigo: string;
  nombre: string;
  nit: string;
  celular: string;
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
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [mostrarFormNuevoCliente, setMostrarFormNuevoCliente] = useState(false);
  
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

  const [municipiosDisponibles, setMunicipiosDisponibles] = useState<string[]>([]);

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
  const [personaDejaMaquina, setPersonaDejaMaquina] = useState("");
  const [dpiPersonaDeja, setDpiPersonaDeja] = useState("");
  const [accesoriosSeleccionados, setAccesoriosSeleccionados] = useState<string[]>([]);
  const [accesoriosDisponibles, setAccesoriosDisponibles] = useState<any[]>([]);
  const [centroServicio, setCentroServicio] = useState("");
  const [opcionEnvio, setOpcionEnvio] = useState<string>("");
  const [direccionesEnvio, setDireccionesEnvio] = useState<any[]>([]);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState<string>("");
  const [nuevaDireccion, setNuevaDireccion] = useState("");
  const [mostrarNuevaDireccion, setMostrarNuevaDireccion] = useState(false);
  const [ingresadoMostrador, setIngresadoMostrador] = useState(true);
  const [esReingreso, setEsReingreso] = useState(false);
  const [logObservaciones, setLogObservaciones] = useState("");
  const [tipologia, setTipologia] = useState("");
  const [esStockCemaco, setEsStockCemaco] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  // Media (fotos y videos)
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  
  // Dialog for adding another machine
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Actualizar municipios cuando cambia el departamento
  useEffect(() => {
    if (nuevoCliente.departamento) {
      setMunicipiosDisponibles(MUNICIPIOS[nuevoCliente.departamento] || []);
      setNuevoCliente(prev => ({ ...prev, municipio: "" }));
    }
  }, [nuevoCliente.departamento]);

  // Cargar accesorios disponibles
  useEffect(() => {
    const fetchAccesorios = async () => {
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .eq('clave', 'ACC');
        
        if (error) throw error;
        setAccesoriosDisponibles(data || []);
      } catch (error) {
        console.error('Error fetching accesorios:', error);
      }
    };
    
    fetchAccesorios();
  }, []);

  // Cargar direcciones de envío cuando se selecciona un cliente
  useEffect(() => {
    const fetchDirecciones = async () => {
      if (!clienteSeleccionado) return;
      
      try {
        // Primero intentar cargar direcciones de envío guardadas
        const { data: direccionesData, error: direccionesError } = await supabase
          .from('direcciones_envio')
          .select('*')
          .eq('codigo_cliente', clienteSeleccionado.codigo)
          .order('es_principal', { ascending: false });
        
        if (direccionesError) throw direccionesError;
        
        // Si hay direcciones guardadas, usarlas
        if (direccionesData && direccionesData.length > 0) {
          setDireccionesEnvio(direccionesData);
          
          // Auto-seleccionar dirección principal si existe
          const principal = direccionesData.find(d => d.es_principal);
          if (principal) {
            setDireccionSeleccionada(principal.id);
          }
        } else {
          // Si no hay direcciones de envío, usar la dirección principal del cliente
          if (clienteSeleccionado.direccion) {
            const tempDireccion = {
              id: 'temp-' + clienteSeleccionado.codigo,
              codigo_cliente: clienteSeleccionado.codigo,
              direccion: clienteSeleccionado.direccion,
              es_principal: true,
              nombre_referencia: 'Dirección Principal',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            setDireccionesEnvio([tempDireccion]);
            setDireccionSeleccionada(tempDireccion.id);
          } else {
            setDireccionesEnvio([]);
          }
        }
      } catch (error) {
        console.error('Error fetching direcciones:', error);
        setDireccionesEnvio([]);
      }
    };
    
    fetchDirecciones();
  }, [clienteSeleccionado]);

  // Buscar clientes en tiempo real por múltiples campos
  useEffect(() => {
    if (busquedaCliente.length >= 2) {
      const fetchClientes = async () => {
        try {
          const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .or(`nombre.ilike.%${busquedaCliente}%,nit.ilike.%${busquedaCliente}%,celular.ilike.%${busquedaCliente}%,codigo.ilike.%${busquedaCliente}%`)
            .limit(10);
          
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
  }, [busquedaCliente]);

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

  const resetForm = () => {
    // Reset incident data
    setSkuMaquina("");
    setProductoSeleccionado(null);
    setProductosEncontrados([]);
    setDescripcionProblema("");
    setPersonaDejaMaquina("");
    setDpiPersonaDeja("");
    setAccesoriosSeleccionados([]);
    setCentroServicio("");
    setOpcionEnvio("");
    setDireccionSeleccionada("");
    setNuevaDireccion("");
    setMostrarNuevaDireccion(false);
    setEsReingreso(false);
    setLogObservaciones("");
    setTipologia("");
    setMediaFiles([]);
    
    // Go back to step 2 (keeping the same client)
    setPaso(2);
  };

  const validarPaso1 = () => {
    if (mostrarFormNuevoCliente) {
      if (!nuevoCliente.nombre || !nuevoCliente.nit || !nuevoCliente.direccion || 
          !nuevoCliente.telefono_principal || !nuevoCliente.nombre_facturacion ||
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
          !datosClienteExistente.telefono_principal) {
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
    if (!personaDejaMaquina.trim()) {
      toast({ title: "Error", description: "Ingrese quién deja la máquina", variant: "destructive" });
      return false;
    }
    if (!dpiPersonaDeja.trim()) {
      toast({ title: "Error", description: "Ingrese el DPI de quien deja la máquina", variant: "destructive" });
      return false;
    }
    if (!centroServicio) {
      toast({ title: "Error", description: "Seleccione un centro de servicio", variant: "destructive" });
      return false;
    }
    if (!opcionEnvio) {
      toast({ title: "Error", description: "Seleccione una opción de entrega", variant: "destructive" });
      return false;
    }
    if (opcionEnvio === 'directo' && !direccionSeleccionada && !nuevaDireccion.trim()) {
      toast({ title: "Error", description: "Seleccione o agregue una dirección de envío", variant: "destructive" });
      return false;
    }
    if (!tipologia) {
      toast({ title: "Error", description: "Seleccione la tipología", variant: "destructive" });
      return false;
    }
    if (mediaFiles.length === 0) {
      toast({ title: "Error", description: "Debe agregar al menos 1 foto del ingreso de la máquina", variant: "destructive" });
      return false;
    }
    return true;
  };

  const guardarIncidente = async () => {
    if (!validarPaso2()) return;

    setGuardando(true);
    try {
      let codigoCliente = clienteSeleccionado?.codigo;
      let direccionEnvioId = direccionSeleccionada;

      // Si es nuevo cliente, crearlo primero
      if (mostrarFormNuevoCliente) {
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
            celular: nuevoCliente.telefono_principal
          })
          .select()
          .single();

        if (clienteError) throw clienteError;
        codigoCliente = clienteData.codigo;
        
        // Crear dirección principal del nuevo cliente en la tabla direcciones_envio
        if (nuevoCliente.direccion && nuevoCliente.direccion.trim()) {
          const { data: dirData, error: dirError } = await supabase
            .from('direcciones_envio')
            .insert({
              codigo_cliente: nuevoCodigoHPC,
              direccion: nuevoCliente.direccion,
              nombre_referencia: 'Dirección Principal',
              es_principal: true
            })
            .select()
            .single();

          if (dirError) {
            console.error('Error creando dirección principal:', dirError);
          } else {
            // Actualizar el estado local de direcciones para que aparezca en el selector
            setDireccionesEnvio([dirData]);
            
            if (opcionEnvio !== 'recoger') {
              // Auto-seleccionar la dirección recién creada
              setDireccionSeleccionada(dirData.id);
              direccionEnvioId = dirData.id;
            }
          }
        }
        
        // Actualizar clienteSeleccionado para que el resto del flujo funcione
        setClienteSeleccionado(clienteData);
        
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

      // Si hay nueva dirección adicional, crearla
      if (nuevaDireccion.trim() && opcionEnvio !== 'recoger') {
        const { data: dirData, error: dirError } = await supabase
          .from('direcciones_envio')
          .insert({
            codigo_cliente: codigoCliente,
            direccion: nuevaDireccion,
            nombre_referencia: `Dirección ${new Date().toLocaleDateString()}`,
            es_principal: direccionesEnvio.length === 0
          })
          .select()
          .single();

        if (dirError) throw dirError;
        direccionEnvioId = dirData.id;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Generar código de incidente
      const { data: codigoIncidente, error: codigoError } = await supabase
        .rpc('generar_codigo_incidente');
      
      if (codigoError) throw codigoError;

      // Obtener la familia_padre_id del producto seleccionado
      const { data: productoData, error: productoError } = await supabase
        .from('productos')
        .select('familia_padre_id')
        .eq('codigo', productoSeleccionado!.codigo)
        .single();

      if (productoError) throw productoError;

      // Crear el incidente
      const { data: incidenteData, error: incidenteError } = await supabase
        .from('incidentes')
        .insert({
          codigo: codigoIncidente,
          codigo_cliente: codigoCliente,
          codigo_producto: productoSeleccionado!.codigo,
          familia_padre_id: productoData?.familia_padre_id || null,
          sku_maquina: skuMaquina,
          descripcion_problema: descripcionProblema,
          persona_deja_maquina: personaDejaMaquina,
          accesorios: accesoriosSeleccionados.join(", ") || null,
          centro_servicio: centroServicio,
          quiere_envio: opcionEnvio !== 'recoger',
          direccion_envio_id: direccionEnvioId || null,
          ingresado_en_mostrador: ingresadoMostrador,
          es_reingreso: esReingreso,
          es_stock_cemaco: esStockCemaco,
          log_observaciones: logObservaciones || null,
          tipologia: tipologia,
          status: ingresadoMostrador ? 'Ingresado' : 'En ruta',
          cobertura_garantia: false,
          producto_descontinuado: productoSeleccionado!.descontinuado,
          codigo_tecnico: 'TEC-001',
          created_by: user?.id || null
        })
        .select()
        .single();

      if (incidenteError) throw incidenteError;

      // Subir fotos/videos de ingreso
      if (mediaFiles.length > 0) {
        try {
          const uploadedMedia = await uploadMediaToStorage(mediaFiles, incidenteData.id);
          await saveIncidentePhotos(incidenteData.id, uploadedMedia, 'ingreso');
          
          toast({ 
            title: "Fotos subidas", 
            description: `${uploadedMedia.length} archivo(s) subido(s) correctamente` 
          });
        } catch (uploadError) {
          console.error('Error uploading media:', uploadError);
          toast({ 
            title: "Advertencia", 
            description: "El incidente se creó pero hubo un error al subir algunas fotos", 
            variant: "destructive" 
          });
        }
      }

      setShowSuccessDialog(true);
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
        <Button variant="ghost" onClick={() => navigate("/mostrador/incidentes")}>
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
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Cliente
            </CardTitle>
            <CardDescription>Busque un cliente existente o cree uno nuevo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Botón fijo para crear cliente */}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  setMostrarFormNuevoCliente(true);
                  setClienteSeleccionado(null);
                  setBusquedaCliente("");
                }}
                variant="default"
                className="gap-2"
              >
                <User className="w-4 h-4" />
                Crear Cliente Nuevo
              </Button>
            </div>

            {!mostrarFormNuevoCliente && !clienteSeleccionado && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="busqueda-cliente">Buscar Cliente</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="busqueda-cliente"
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      placeholder="Buscar por celular, código, NIT o nombre..."
                      className="pl-10"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ingrese al menos 2 caracteres para buscar
                  </p>
                </div>

                {/* Resultados de búsqueda en tiempo real */}
                {busquedaCliente.length >= 2 && (
                  <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                    {clientesEncontrados.length > 0 ? (
                      clientesEncontrados.map((cliente) => (
                        <div
                          key={cliente.codigo}
                          onClick={() => seleccionarCliente(cliente)}
                          className="p-3 sm:p-4 hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                            <div className="space-y-1 flex-1">
                              <p className="font-semibold text-sm sm:text-base text-foreground">{cliente.nombre}</p>
                              <div className="flex flex-col sm:flex-row sm:gap-4 gap-1 text-xs sm:text-sm text-muted-foreground">
                                <span>Código: {cliente.codigo}</span>
                                <span>Celular: {cliente.celular}</span>
                                <span className="hidden sm:inline">NIT: {cliente.nit}</span>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="self-start sm:self-auto text-xs">
                              Seleccionar
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center space-y-4">
                        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">Cliente no encontrado</p>
                          <p className="text-sm text-muted-foreground">
                            ¿Desea crear uno nuevo?
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            setMostrarFormNuevoCliente(true);
                            setBusquedaCliente("");
                          }}
                          variant="default"
                        >
                          Crear Cliente
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Cliente seleccionado */}
            {clienteSeleccionado && !mostrarFormNuevoCliente && (
              <div className="space-y-4 p-4 border rounded-lg bg-accent/50">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Cliente Seleccionado
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setClienteSeleccionado(null);
                      setBusquedaCliente("");
                      setDireccionesEnvio([]);
                      setDireccionSeleccionada("");
                    }}
                  >
                    Cambiar
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="nombre-existente">Nombre Completo *</Label>
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
                    <Label htmlFor="correo-existente">Correo Electrónico</Label>
                    <Input
                      id="correo-existente"
                      type="email"
                      value={datosClienteExistente.correo}
                      onChange={(e) => setDatosClienteExistente({ ...datosClienteExistente, correo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefono-principal-existente">Teléfono Principal *</Label>
                    <Input
                      id="telefono-principal-existente"
                      value={datosClienteExistente.telefono_principal}
                      onChange={(e) => setDatosClienteExistente({ ...datosClienteExistente, telefono_principal: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefono-secundario-existente">Teléfono Secundario</Label>
                    <Input
                      id="telefono-secundario-existente"
                      value={datosClienteExistente.telefono_secundario}
                      onChange={(e) => setDatosClienteExistente({ ...datosClienteExistente, telefono_secundario: e.target.value })}
                    />
                  </div>
                </div>
                
                {/* Mostrar dirección del cliente */}
                {clienteSeleccionado.direccion && (
                  <div className="mt-4 p-3 bg-background rounded-md border">
                    <Label className="text-sm font-medium">Dirección Registrada</Label>
                    <p className="text-sm text-muted-foreground mt-1">{clienteSeleccionado.direccion}</p>
                  </div>
                )}
                
                {/* Mostrar direcciones de envío cargadas */}
                {direccionesEnvio.length > 0 && (
                  <div className="mt-4 p-3 bg-background rounded-md border">
                    <Label className="text-sm font-medium">Direcciones de Envío Guardadas ({direccionesEnvio.length})</Label>
                    <div className="mt-2 space-y-2">
                      {direccionesEnvio.map((dir) => (
                        <p key={dir.id} className="text-sm text-muted-foreground">
                          • {dir.direccion} {dir.es_principal && <span className="text-primary font-medium">(Principal)</span>}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Formulario nuevo cliente */}
            {mostrarFormNuevoCliente && (
              <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 border rounded-lg bg-muted/30">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Se generará automáticamente un código HPC para este cliente</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMostrarFormNuevoCliente(false);
                      setNuevoCliente({
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
                    }}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                </div>
                
                {/* Datos Personales */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold border-b pb-2">Datos Personales</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="nombre">Nombre Completo *</Label>
                      <Input
                        id="nombre"
                        value={nuevoCliente.nombre}
                        onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                        placeholder="Nombre completo del cliente"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="correo">Correo Electrónico</Label>
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
                      <Select
                        value={nuevoCliente.departamento}
                        onValueChange={(value) => setNuevoCliente({ ...nuevoCliente, departamento: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTAMENTOS.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="municipio">Municipio *</Label>
                      <Select
                        value={nuevoCliente.municipio}
                        onValueChange={(value) => setNuevoCliente({ ...nuevoCliente, municipio: value })}
                        disabled={!nuevoCliente.departamento}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un municipio" />
                        </SelectTrigger>
                        <SelectContent>
                          {municipiosDisponibles.map((muni) => (
                            <SelectItem key={muni} value={muni}>
                              {muni}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Datos de Facturación */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold border-b pb-2">Datos de Facturación</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={() => {
                  if (validarPaso1()) setPaso(2);
                }}
                className="w-full sm:w-auto"
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
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Información del Incidente</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Datos del equipo y problema reportado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            <div>
              <Label htmlFor="sku">SKU de la Máquina *</Label>
              <Input
                id="sku"
                value={skuMaquina}
                onChange={(e) => {
                  setSkuMaquina(e.target.value);
                  if (!e.target.value) {
                    setProductoSeleccionado(null);
                  }
                }}
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
                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex gap-4">
                    {productoSeleccionado.urlFoto && (
                      <div className="flex-shrink-0">
                        <img 
                          src={productoSeleccionado.urlFoto} 
                          alt={productoSeleccionado.descripcion}
                          className="w-32 h-32 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-lg">{productoSeleccionado.descripcion}</h3>
                          <p className="text-sm text-muted-foreground mt-1">Código: {productoSeleccionado.codigo}</p>
                          <p className="text-sm text-muted-foreground">Clave: {productoSeleccionado.clave}</p>
                        </div>
                        {productoSeleccionado.descontinuado ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Descontinuado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Vigente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm sm:text-base">Reporte de Fallas</h4>
              <div>
                <Label htmlFor="descripcion">Comentario del cliente (o fallas de la máquina) *</Label>
                <Textarea
                  id="descripcion"
                  value={descripcionProblema}
                  onChange={(e) => setDescripcionProblema(e.target.value)}
                  placeholder="Describa las fallas o problema reportado por el cliente"
                  rows={4}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="persona-deja">Persona quien deja la máquina *</Label>
                  <Input
                    id="persona-deja"
                    value={personaDejaMaquina}
                    onChange={(e) => setPersonaDejaMaquina(e.target.value)}
                    placeholder="Nombre de quien entrega el equipo"
                  />
                </div>
                <div>
                  <Label htmlFor="dpi-persona">DPI *</Label>
                  <Input
                    id="dpi-persona"
                    value={dpiPersonaDeja}
                    onChange={(e) => setDpiPersonaDeja(e.target.value)}
                    placeholder="Número de DPI"
                    maxLength={13}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Accesorios con los que ingresa</Label>
              <div className="mt-2 border rounded-lg p-4 max-h-60 overflow-y-auto space-y-3">
                {accesoriosDisponibles.length > 0 ? (
                  accesoriosDisponibles.map((accesorio) => (
                    <div key={accesorio.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={accesorio.id}
                        checked={accesoriosSeleccionados.includes(accesorio.descripcion)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAccesoriosSeleccionados([...accesoriosSeleccionados, accesorio.descripcion]);
                          } else {
                            setAccesoriosSeleccionados(accesoriosSeleccionados.filter(a => a !== accesorio.descripcion));
                          }
                        }}
                      />
                      <Label
                        htmlFor={accesorio.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {accesorio.descripcion}
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No hay accesorios disponibles</p>
                )}
              </div>
              {accesoriosSeleccionados.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Seleccionados: {accesoriosSeleccionados.join(", ")}
                </p>
              )}
            </div>

            {/* Checkbox Stock Cemaco */}
            <div className="flex items-center space-x-2 p-4 border rounded-lg bg-accent/30">
              <Checkbox
                id="stock-cemaco"
                checked={esStockCemaco}
                onCheckedChange={(checked) => setEsStockCemaco(checked as boolean)}
              />
              <div className="flex flex-col gap-1">
                <Label
                  htmlFor="stock-cemaco"
                  className="font-medium cursor-pointer"
                >
                  ¿Es stock de Cemaco?
                </Label>
                {esStockCemaco && (
                  <p className="text-xs text-muted-foreground">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    Esta máquina seguirá un flujo de revisión simplificado sin reparación
                  </p>
                )}
              </div>
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

            <div className="space-y-4">
              <Label>Opciones de Entrega *</Label>
              <RadioGroup 
                value={opcionEnvio} 
                onValueChange={(value) => {
                  setOpcionEnvio(value);
                  if (value === 'recoger') {
                    setDireccionSeleccionada("");
                    setNuevaDireccion("");
                    setMostrarNuevaDireccion(false);
                  }
                }} 
                className="flex flex-col gap-3 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recoger" id="recoger" />
                  <Label htmlFor="recoger" className="cursor-pointer font-normal">
                    Viene a recoger al centro de servicio
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="directo" id="directo" />
                  <Label htmlFor="directo" className="cursor-pointer font-normal">
                    Envío directo
                  </Label>
                </div>
              </RadioGroup>

              {opcionEnvio !== 'recoger' && opcionEnvio && (
                <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                  <div>
                    <Label htmlFor="direccion-envio">
                      Dirección de Envío {opcionEnvio === 'directo' && '*'}
                    </Label>
                    
                    {/* Si es nuevo cliente, mostrar su dirección directamente */}
                    {mostrarFormNuevoCliente ? (
                      <div className="mt-2">
                        {nuevoCliente.direccion ? (
                          <div className="p-3 border rounded-md bg-accent/50">
                            <p className="text-sm font-medium">Dirección del nuevo cliente:</p>
                            <p className="text-sm text-muted-foreground mt-1">{nuevoCliente.direccion}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-destructive">
                            Complete la dirección del cliente en el paso anterior
                          </p>
                        )}
                      </div>
                    ) : direccionesEnvio.length > 0 ? (
                      <Select value={direccionSeleccionada} onValueChange={setDireccionSeleccionada}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una dirección" />
                        </SelectTrigger>
                        <SelectContent>
                          {direccionesEnvio.map((dir) => (
                            <SelectItem key={dir.id} value={dir.id}>
                              {dir.direccion} {dir.es_principal && '(Principal)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hay direcciones guardadas</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Agregar nueva dirección</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setMostrarNuevaDireccion(!mostrarNuevaDireccion)}
                      >
                        {mostrarNuevaDireccion ? 'Cancelar' : 'Agregar'}
                      </Button>
                    </div>
                    
                    {mostrarNuevaDireccion && (
                      <Textarea
                        value={nuevaDireccion}
                        onChange={(e) => setNuevaDireccion(e.target.value)}
                        placeholder="Ingrese la nueva dirección de envío"
                        rows={3}
                      />
                    )}
                  </div>

                  {direccionSeleccionada && !mostrarNuevaDireccion && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium">Dirección seleccionada:</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {direccionesEnvio.find(d => d.id === direccionSeleccionada)?.direccion}
                      </p>
                    </div>
                  )}
                </div>
              )}
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

            {/* Sección de fotos/videos estilo WhatsApp */}
            <div className="space-y-4 border-t pt-6">
              <Label>Fotos y Videos del Ingreso</Label>
              <WhatsAppStyleMediaCapture
                media={mediaFiles}
                onMediaChange={setMediaFiles}
                maxFiles={10}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setPaso(1)} className="w-full sm:w-auto order-2 sm:order-1">
                Atrás
              </Button>
              <Button onClick={guardarIncidente} disabled={guardando} className="w-full sm:w-auto order-1 sm:order-2">
                {guardando ? "Guardando..." : "Crear Incidente"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Dialog - Add Another Machine */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desea ingresar otra máquina?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desea ingresar otra máquina para este mismo cliente ({clienteSeleccionado?.nombre || nuevoCliente.nombre})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate("/mostrador/incidentes")}>
              No, Finalizar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowSuccessDialog(false);
              resetForm();
              toast({ title: "Listo para nuevo ingreso", description: "Complete los datos de la nueva máquina" });
            }}>
              Sí, Ingresar Otra Máquina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
