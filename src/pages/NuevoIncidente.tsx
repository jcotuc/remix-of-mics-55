import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Search, User, Package, AlertCircle, UserCircle, ChevronRight, Printer, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Producto } from "@/types";
import { MediaFile } from "@/components/WhatsAppStyleMediaCapture";
import { FloatingCameraWidget } from "@/components/FloatingCameraWidget";
import { uploadMediaToStorage, saveIncidentePhotos } from "@/lib/uploadMedia";
import { MinimalStepper } from "@/components/ui/minimal-stepper";
import { OutlinedInput, OutlinedTextarea, OutlinedSelect } from "@/components/ui/outlined-input";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import IncidentePrintSheet from "@/components/IncidentePrintSheet";
const tipologias = ['Mantenimiento', 'Reparación', 'Daños por transporte', 'Venta de repuestos'];
const DEPARTAMENTOS = ["Guatemala", "Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso", "Escuintla", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa", "Petén", "Quetzaltenango", "Quiché", "Retalhuleu", "Sacatepéquez", "San Marcos", "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán", "Zacapa"];
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
const stepperSteps = [{
  id: 1,
  title: "Cliente",
  description: "Datos del propietario",
  icon: <User className="w-5 h-5" />
}, {
  id: 2,
  title: "Máquina",
  description: "Información del equipo",
  icon: <Package className="w-5 h-5" />
}];
export default function NuevoIncidente() {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
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

  // Persona que entrega
  const [personaDejaMaquina, setPersonaDejaMaquina] = useState("");
  const [dpiPersonaDeja, setDpiPersonaDeja] = useState("");

  // Paso 2: Incidente
  const [skuMaquina, setSkuMaquina] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [productosEncontrados, setProductosEncontrados] = useState<Producto[]>([]);
  const [descripcionProblema, setDescripcionProblema] = useState("");
  const [accesoriosSeleccionados, setAccesoriosSeleccionados] = useState<string[]>([]);
  const [accesoriosDisponibles, setAccesoriosDisponibles] = useState<any[]>([]);
  const [nuevoAccesorioNombre, setNuevoAccesorioNombre] = useState("");
  const [agregandoAccesorio, setAgregandoAccesorio] = useState(false);
  const [centrosServicioList, setCentrosServicioList] = useState<{
    id: string;
    nombre: string;
  }[]>([]);
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

  // Media
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [incidenteCreado, setIncidenteCreado] = useState<{
    codigo: string;
    codigoCliente: string;
    nombreCliente: string;
    codigoProducto: string;
    descripcionProducto: string;
    skuMaquina: string;
    descripcionProblema: string;
    accesorios: string;
    fechaIngreso: Date;
    centroServicio: string;
    personaDejaMaquina: string;
    tipologia: string;
    esReingreso: boolean;
  } | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  useEffect(() => {
    if (nuevoCliente.departamento) {
      setMunicipiosDisponibles(MUNICIPIOS[nuevoCliente.departamento] || []);
      setNuevoCliente(prev => ({
        ...prev,
        municipio: ""
      }));
    }
  }, [nuevoCliente.departamento]);
  // Cargar accesorios de CDS_Accesorios filtrados por la familia del producto seleccionado
  useEffect(() => {
    const fetchAccesorios = async () => {
      if (!productoSeleccionado) {
        setAccesoriosDisponibles([]);
        return;
      }

      try {
        // Obtener el familia_padre_id del producto desde la BD
        const { data: productoData } = await supabase
          .from('productos')
          .select('familia_padre_id')
          .eq('codigo', productoSeleccionado.codigo)
          .single();

        if (!productoData?.familia_padre_id) {
          // Si no tiene familia, cargar todos los accesorios
          const { data, error } = await supabase
            .from('CDS_Accesorios')
            .select('id, nombre, familia_id')
            .order('nombre');
          if (error) throw error;
          setAccesoriosDisponibles(data || []);
          return;
        }

        const familiaProductoId = productoData.familia_padre_id;

        // Obtener la jerarquía de familias (padre y abuelo) para buscar accesorios
        const { data: familiaData } = await supabase
          .from('CDS_Familias')
          .select('id, Padre')
          .eq('id', familiaProductoId)
          .single();

        // Construir lista de IDs de familia a buscar (la familia del producto y su padre/abuelo)
        const familiaIds: number[] = [familiaProductoId];
        if (familiaData?.Padre) {
          familiaIds.push(familiaData.Padre);
        }

        // Buscar accesorios que pertenezcan a cualquiera de estas familias
        const { data: accesoriosData, error } = await supabase
          .from('CDS_Accesorios')
          .select('id, nombre, familia_id')
          .in('familia_id', familiaIds)
          .order('nombre');

        if (error) throw error;
        setAccesoriosDisponibles(accesoriosData || []);
      } catch (error) {
        console.error('Error fetching accesorios:', error);
        setAccesoriosDisponibles([]);
      }
    };
    fetchAccesorios();
  }, [productoSeleccionado]);

  // Cargar centros de servicio y establecer el predeterminado del usuario
  useEffect(() => {
    const fetchCentrosYUsuario = async () => {
      try {
        // Cargar todos los centros de servicio
        const {
          data: centros
        } = await supabase.from('centros_servicio').select('id, nombre').eq('activo', true).order('nombre');
        if (centros) {
          setCentrosServicioList(centros);
        }

        // Establecer centro del usuario actual
        if (user) {
          // 1) Buscar por user_id (ideal)
          const {
            data: profileById
          } = await supabase.from('profiles').select('centro_servicio_id').eq('user_id', user.id).maybeSingle();

          // 2) Fallback por email (para filas antiguas donde user_id no coincide con auth.uid())
          let profile = profileById;
          if (!profile && user.email) {
            const {
              data: profileByEmail
            } = await supabase.from('profiles').select('centro_servicio_id').eq('email', user.email).order('created_at', {
              ascending: false
            }).limit(1).maybeSingle();
            profile = profileByEmail;
          }
          if (profile?.centro_servicio_id) {
            setCentroServicio(profile.centro_servicio_id);
          }
        }
      } catch (error) {
        console.error('Error fetching centros:', error);
      }
    };
    fetchCentrosYUsuario();
  }, [user]);
  useEffect(() => {
    const fetchDirecciones = async () => {
      if (!clienteSeleccionado) return;
      try {
        const {
          data: direccionesData,
          error: direccionesError
        } = await supabase.from('direcciones_envio').select('*').eq('codigo_cliente', clienteSeleccionado.codigo).order('es_principal', {
          ascending: false
        });
        if (direccionesError) throw direccionesError;
        if (direccionesData && direccionesData.length > 0) {
          setDireccionesEnvio(direccionesData);
          const principal = direccionesData.find(d => d.es_principal);
          if (principal) {
            setDireccionSeleccionada(principal.id);
          }
        } else {
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
  useEffect(() => {
    if (busquedaCliente.length >= 2) {
      const fetchClientes = async () => {
        try {
          const {
            data,
            error
          } = await supabase.from('clientes').select('*').or(`nombre.ilike.%${busquedaCliente}%,nit.ilike.%${busquedaCliente}%,celular.ilike.%${busquedaCliente}%,codigo.ilike.%${busquedaCliente}%`).limit(10);
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
  useEffect(() => {
    if (skuMaquina.length >= 3) {
      const fetchProductos = async () => {
        try {
          const {
            data,
            error
          } = await supabase.from('productos').select('*').or(`codigo.ilike.%${skuMaquina}%,clave.ilike.%${skuMaquina}%`);
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
    setPaso(2);
  };

  // Función para agregar nuevo accesorio a CDS_Accesorios
  const handleAgregarNuevoAccesorio = async () => {
    if (!nuevoAccesorioNombre.trim() || !productoSeleccionado) return;

    setAgregandoAccesorio(true);
    try {
      // Obtener familia_padre_id del producto
      const { data: productoData } = await supabase
        .from('productos')
        .select('familia_padre_id')
        .eq('codigo', productoSeleccionado.codigo)
        .single();

      const familiaId = productoData?.familia_padre_id || null;

      // Insertar el nuevo accesorio
      const { data: nuevoAcc, error } = await supabase
        .from('CDS_Accesorios')
        .insert({
          nombre: nuevoAccesorioNombre.trim(),
          familia_id: familiaId
        })
        .select()
        .single();

      if (error) throw error;

      // Agregarlo a la lista de disponibles y seleccionarlo automáticamente
      setAccesoriosDisponibles(prev => [...prev, nuevoAcc]);
      setAccesoriosSeleccionados(prev => [...prev, nuevoAcc.nombre]);
      setNuevoAccesorioNombre("");

      toast({
        title: "Accesorio agregado",
        description: `"${nuevoAcc.nombre}" se agregó y seleccionó automáticamente.`
      });
    } catch (error) {
      console.error('Error agregando accesorio:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el accesorio",
        variant: "destructive"
      });
    } finally {
      setAgregandoAccesorio(false);
    }
  };

  const validarPaso1 = () => {
    if (mostrarFormNuevoCliente) {
      if (!nuevoCliente.nombre || !nuevoCliente.nit || !nuevoCliente.direccion || !nuevoCliente.telefono_principal || !nuevoCliente.nombre_facturacion || !nuevoCliente.departamento || !nuevoCliente.municipio) {
        toast({
          title: "Error",
          description: "Complete todos los campos obligatorios del cliente",
          variant: "destructive"
        });
        return false;
      }
    } else {
      if (!clienteSeleccionado) {
        toast({
          title: "Error",
          description: "Seleccione un cliente existente",
          variant: "destructive"
        });
        return false;
      }
      if (!datosClienteExistente.nombre || !datosClienteExistente.nit || !datosClienteExistente.telefono_principal) {
        toast({
          title: "Error",
          description: "Complete todos los campos obligatorios del cliente",
          variant: "destructive"
        });
        return false;
      }
    }
    if (!personaDejaMaquina.trim()) {
      toast({
        title: "Error",
        description: "Ingrese quién deja la máquina",
        variant: "destructive"
      });
      return false;
    }
    if (!dpiPersonaDeja.trim()) {
      toast({
        title: "Error",
        description: "Ingrese el DPI de quien deja la máquina",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };
  const validarPaso2 = () => {
    if (!productoSeleccionado) {
      toast({
        title: "Error",
        description: "Seleccione un producto (SKU de la máquina)",
        variant: "destructive"
      });
      return false;
    }
    if (!descripcionProblema.trim()) {
      toast({
        title: "Error",
        description: "Ingrese la descripción del problema",
        variant: "destructive"
      });
      return false;
    }
    if (!centroServicio) {
      toast({
        title: "Error",
        description: "Seleccione un centro de servicio",
        variant: "destructive"
      });
      return false;
    }
    if (!opcionEnvio) {
      toast({
        title: "Error",
        description: "Seleccione una opción de entrega",
        variant: "destructive"
      });
      return false;
    }
    if (opcionEnvio === 'directo' && !direccionSeleccionada && !nuevaDireccion.trim()) {
      toast({
        title: "Error",
        description: "Seleccione o agregue una dirección de envío",
        variant: "destructive"
      });
      return false;
    }
    if (!tipologia) {
      toast({
        title: "Error",
        description: "Seleccione la tipología",
        variant: "destructive"
      });
      return false;
    }
    // Fotos son opcionales por ahora
    return true;
  };
  const guardarIncidente = async () => {
    if (!validarPaso2()) return;
    setGuardando(true);
    try {
      let codigoCliente = clienteSeleccionado?.codigo;
      let direccionEnvioId: string | null = null;

      // Si hay una dirección seleccionada que no es temporal, usarla
      if (direccionSeleccionada && !direccionSeleccionada.startsWith('temp-')) {
        direccionEnvioId = direccionSeleccionada;
      }
      if (mostrarFormNuevoCliente) {
        const {
          data: codigoData,
          error: codigoError
        } = await supabase.rpc('generar_codigo_hpc');
        if (codigoError) throw codigoError;
        const nuevoCodigoHPC = codigoData;
        const {
          data: clienteData,
          error: clienteError
        } = await supabase.from('clientes').insert({
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
        }).select().single();
        if (clienteError) throw clienteError;
        codigoCliente = clienteData.codigo;
        if (nuevoCliente.direccion && nuevoCliente.direccion.trim()) {
          const {
            data: dirData,
            error: dirError
          } = await supabase.from('direcciones_envio').insert({
            codigo_cliente: nuevoCodigoHPC,
            direccion: nuevoCliente.direccion,
            nombre_referencia: 'Dirección Principal',
            es_principal: true
          }).select().single();
          if (dirError) {
            console.error('Error creando dirección principal:', dirError);
          } else {
            setDireccionesEnvio([dirData]);
            if (opcionEnvio !== 'recoger') {
              setDireccionSeleccionada(dirData.id);
              direccionEnvioId = dirData.id;
            }
          }
        }
        setClienteSeleccionado(clienteData);
        toast({
          title: "Cliente creado",
          description: `Código HPC: ${nuevoCodigoHPC}`
        });
      } else {
        const {
          error: updateError
        } = await supabase.from('clientes').update({
          nombre: datosClienteExistente.nombre,
          nit: datosClienteExistente.nit,
          correo: datosClienteExistente.correo,
          telefono_principal: datosClienteExistente.telefono_principal,
          telefono_secundario: datosClienteExistente.telefono_secundario,
          celular: datosClienteExistente.telefono_principal
        }).eq('codigo', clienteSeleccionado!.codigo);
        if (updateError) throw updateError;
      }
      // Si hay una nueva dirección escrita, crearla
      if (nuevaDireccion.trim() && opcionEnvio !== 'recoger') {
        const {
          data: dirData,
          error: dirError
        } = await supabase.from('direcciones_envio').insert({
          codigo_cliente: codigoCliente,
          direccion: nuevaDireccion,
          nombre_referencia: `Dirección ${new Date().toLocaleDateString()}`,
          es_principal: direccionesEnvio.length === 0
        }).select().single();
        if (dirError) throw dirError;
        direccionEnvioId = dirData.id;
      }
      // Si se seleccionó una dirección temporal (del cliente pero no guardada en direcciones_envio), crearla
      else if (direccionSeleccionada && direccionSeleccionada.startsWith('temp-') && opcionEnvio !== 'recoger') {
        const direccionTemp = direccionesEnvio.find(d => d.id === direccionSeleccionada);
        if (direccionTemp) {
          const {
            data: dirData,
            error: dirError
          } = await supabase.from('direcciones_envio').insert({
            codigo_cliente: codigoCliente,
            direccion: direccionTemp.direccion,
            nombre_referencia: 'Dirección Principal',
            es_principal: true
          }).select().single();
          if (dirError) throw dirError;
          direccionEnvioId = dirData.id;
        }
      }
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const {
        data: codigoIncidente,
        error: codigoError
      } = await supabase.rpc('generar_codigo_incidente');
      if (codigoError) throw codigoError;
      const {
        data: productoData,
        error: productoError
      } = await supabase.from('productos').select('familia_padre_id').eq('codigo', productoSeleccionado!.codigo).single();
      if (productoError) throw productoError;
      const {
        data: incidenteData,
        error: incidenteError
      } = await supabase.from('incidentes').insert({
        codigo: codigoIncidente,
        codigo_cliente: codigoCliente,
        codigo_producto: productoSeleccionado!.codigo,
        familia_padre_id: productoData?.familia_padre_id || null,
        sku_maquina: skuMaquina,
        descripcion_problema: descripcionProblema,
        persona_deja_maquina: personaDejaMaquina,
        accesorios: accesoriosSeleccionados.join(", ") || null,
        centro_servicio: centrosServicioList.find(c => c.id === centroServicio)?.nombre ?? centroServicio,
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
      }).select().single();
      if (incidenteError) throw incidenteError;
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

      // Guardar datos para impresión
      setIncidenteCreado({
        codigo: incidenteData.codigo,
        codigoCliente: codigoCliente!,
        nombreCliente: clienteSeleccionado?.nombre || nuevoCliente.nombre,
        codigoProducto: productoSeleccionado!.codigo,
        descripcionProducto: productoSeleccionado!.descripcion,
        skuMaquina: skuMaquina,
        descripcionProblema: descripcionProblema,
        accesorios: accesoriosSeleccionados.join(", ") || 'Ninguno',
        fechaIngreso: new Date(),
        centroServicio: centrosServicioList.find(c => c.id === centroServicio)?.nombre ?? centroServicio,
        personaDejaMaquina: personaDejaMaquina,
        tipologia: tipologia,
        esReingreso: esReingreso
      });
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
  return <div className="pb-24">
      {/* Header */}
      <div className="mb-6 px-4 pt-4">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/mostrador/incidentes")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Nuevo Incidente</h1>
            
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <MinimalStepper steps={stepperSteps} currentStep={paso} />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 max-w-3xl space-y-6">
        {/* Paso 1: Cliente */}
        {paso === 1 && <>
            {/* Card: Propietario */}
            <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Propietario</h2>
                    
                  </div>
                </div>
                {!clienteSeleccionado && !mostrarFormNuevoCliente && <Button variant="outline" size="sm" onClick={() => {
              setMostrarFormNuevoCliente(true);
              setBusquedaCliente("");
            }} className="gap-2">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Crear Nuevo</span>
                  </Button>}
              </div>

              <div className="p-6 space-y-6">
                {/* Búsqueda de cliente */}
                {!mostrarFormNuevoCliente && !clienteSeleccionado && <div className="space-y-4">
                    <OutlinedInput label="Buscar Cliente" value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)} icon={<Search className="w-4 h-4" />} />

                    {busquedaCliente.length >= 2 && <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                        {clientesEncontrados.length > 0 ? clientesEncontrados.map(cliente => <div key={cliente.codigo} onClick={() => seleccionarCliente(cliente)} className="p-4 hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground truncate">{cliente.nombre}</p>
                                <p className="text-sm text-muted-foreground">
                                  {cliente.codigo} • {cliente.celular}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                            </div>) : <div className="p-8 text-center">
                            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                            <p className="font-medium text-foreground">No se encontraron resultados</p>
                            <p className="text-sm text-muted-foreground mt-1">¿Desea crear un nuevo cliente?</p>
                            <Button onClick={() => {
                    setMostrarFormNuevoCliente(true);
                    setBusquedaCliente("");
                  }} className="mt-4" size="sm">
                              Crear Cliente
                            </Button>
                          </div>}
                      </div>}

                    {busquedaCliente.length < 2}
                  </div>}

                {/* Cliente seleccionado */}
                {clienteSeleccionado && !mostrarFormNuevoCliente && <div className="space-y-5">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <User className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{clienteSeleccionado.nombre}</p>
                          <p className="text-xs text-muted-foreground">Código: {clienteSeleccionado.codigo}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => {
                  setClienteSeleccionado(null);
                  setBusquedaCliente("");
                  setDireccionesEnvio([]);
                  setDireccionSeleccionada("");
                }}>
                        Cambiar
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <OutlinedInput label="Nombre Completo" value={datosClienteExistente.nombre} onChange={e => setDatosClienteExistente({
                  ...datosClienteExistente,
                  nombre: e.target.value
                })} required />
                      <OutlinedInput label="NIT" value={datosClienteExistente.nit} onChange={e => setDatosClienteExistente({
                  ...datosClienteExistente,
                  nit: e.target.value
                })} required />
                      <OutlinedInput label="Correo Electrónico" type="email" value={datosClienteExistente.correo} onChange={e => setDatosClienteExistente({
                  ...datosClienteExistente,
                  correo: e.target.value
                })} />
                      <OutlinedInput label="Teléfono Principal" value={datosClienteExistente.telefono_principal} onChange={e => setDatosClienteExistente({
                  ...datosClienteExistente,
                  telefono_principal: e.target.value
                })} required />
                      <OutlinedInput label="Teléfono Secundario" value={datosClienteExistente.telefono_secundario} onChange={e => setDatosClienteExistente({
                  ...datosClienteExistente,
                  telefono_secundario: e.target.value
                })} />
                    </div>
                  </div>}

                {/* Formulario nuevo cliente */}
                {mostrarFormNuevoCliente && <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Se generará automáticamente un código HPC
                      </p>
                      <Button size="sm" variant="ghost" onClick={() => {
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
                }}>
                        Cancelar
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Datos Personales</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <OutlinedInput label="Nombre Completo" value={nuevoCliente.nombre} onChange={e => setNuevoCliente({
                      ...nuevoCliente,
                      nombre: e.target.value
                    })} required />
                        </div>
                        <OutlinedInput label="Correo Electrónico" type="email" value={nuevoCliente.correo} onChange={e => setNuevoCliente({
                    ...nuevoCliente,
                    correo: e.target.value
                  })} />
                        <OutlinedInput label="Teléfono Principal" value={nuevoCliente.telefono_principal} onChange={e => setNuevoCliente({
                    ...nuevoCliente,
                    telefono_principal: e.target.value
                  })} required />
                        <OutlinedInput label="Teléfono Secundario" value={nuevoCliente.telefono_secundario} onChange={e => setNuevoCliente({
                    ...nuevoCliente,
                    telefono_secundario: e.target.value
                  })} />
                        <div className="sm:col-span-2">
                          <OutlinedInput label="Dirección" value={nuevoCliente.direccion} onChange={e => setNuevoCliente({
                      ...nuevoCliente,
                      direccion: e.target.value
                    })} required />
                        </div>
                        <OutlinedInput label="País" value={nuevoCliente.pais} onChange={e => setNuevoCliente({
                    ...nuevoCliente,
                    pais: e.target.value
                  })} required />
                        <OutlinedSelect label="Departamento" value={nuevoCliente.departamento} onValueChange={value => setNuevoCliente({
                    ...nuevoCliente,
                    departamento: value
                  })} options={DEPARTAMENTOS.map(d => ({
                    value: d,
                    label: d
                  }))} required />
                        <OutlinedSelect label="Municipio" value={nuevoCliente.municipio} onValueChange={value => setNuevoCliente({
                    ...nuevoCliente,
                    municipio: value
                  })} options={municipiosDisponibles.map(m => ({
                    value: m,
                    label: m
                  }))} disabled={!nuevoCliente.departamento} required />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Datos de Facturación</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <OutlinedInput label="NIT" value={nuevoCliente.nit} onChange={e => setNuevoCliente({
                    ...nuevoCliente,
                    nit: e.target.value
                  })} required />
                        <OutlinedInput label="Nombre de Facturación" value={nuevoCliente.nombre_facturacion} onChange={e => setNuevoCliente({
                    ...nuevoCliente,
                    nombre_facturacion: e.target.value
                  })} required />
                      </div>
                    </div>
                  </div>}
              </div>
            </div>

            {/* Card: Persona que Entrega */}
            <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Persona que Entrega</h2>
                  
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <OutlinedInput label="Nombre Completo" value={personaDejaMaquina} onChange={e => setPersonaDejaMaquina(e.target.value)} required />
                  <OutlinedInput label="DPI" value={dpiPersonaDeja} onChange={e => setDpiPersonaDeja(e.target.value)} maxLength={13} required />
                </div>
              </div>
            </div>

            {/* Botón Siguiente */}
            <div className="flex justify-end">
              <Button onClick={() => {
            if (validarPaso1()) setPaso(2);
          }} size="lg" className="gap-2 px-8">
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>}

        {/* Paso 2: Máquina */}
        {paso === 2 && <>
            {/* Card: Información de la Máquina */}
            <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Información de la Máquina</h2>
                  
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* SKU */}
                <div className="space-y-3">
                  {/* Producto seleccionado - mostrar tarjeta con botón cambiar */}
                  {productoSeleccionado ? <div className="p-4 rounded-lg bg-primary/5 border-2 border-primary/30 flex gap-4">
                      {productoSeleccionado.urlFoto && <img src={productoSeleccionado.urlFoto} alt="" className="w-20 h-20 object-cover rounded-lg border shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                Seleccionado
                              </span>
                              {productoSeleccionado.descontinuado ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">Descontinuado</span> : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600">Vigente</span>}
                            </div>
                            <h3 className="font-semibold text-foreground">{productoSeleccionado.descripcion}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{productoSeleccionado.codigo} • {productoSeleccionado.clave}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => {
                      setProductoSeleccionado(null);
                      setSkuMaquina("");
                      setProductosEncontrados([]);
                    }}>
                            Cambiar
                          </Button>
                        </div>
                      </div>
                    </div> : <>
                      {/* Búsqueda de producto */}
                      <OutlinedInput label="SKU de la Máquina" value={skuMaquina} onChange={e => {
                  setSkuMaquina(e.target.value);
                  if (!e.target.value) setProductoSeleccionado(null);
                }} icon={<Search className="w-4 h-4" />} required />

                      {/* Lista de productos encontrados */}
                      {productosEncontrados.length > 0 && <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                          {productosEncontrados.map(producto => <div key={producto.codigo} className="p-3 hover:bg-primary/5 cursor-pointer transition-colors flex items-center justify-between gap-3" onClick={() => {
                    setProductoSeleccionado(producto);
                    setSkuMaquina(producto.codigo);
                    setProductosEncontrados([]);
                  }}>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm">{producto.descripcion}</p>
                                <p className="text-xs text-muted-foreground">
                                  {producto.codigo} • {producto.clave}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            </div>)}
                        </div>}
                    </>}
                </div>

                {/* Descripción del problema */}
                <OutlinedTextarea label="Comentario del cliente (fallas de la máquina)" value={descripcionProblema} onChange={e => setDescripcionProblema(e.target.value)} required />

                {/* Accesorios */}
                <div className="space-y-3">
                  <MultiSelectDropdown label="Accesorios con los que ingresa" options={accesoriosDisponibles.map(acc => ({
                    value: acc.nombre,
                    label: acc.nombre
                  }))} selected={accesoriosSeleccionados} onSelectionChange={setAccesoriosSeleccionados} placeholder={productoSeleccionado ? "Seleccionar accesorios..." : "Primero seleccione un producto"} disabled={!productoSeleccionado} />
                  
                  {/* Agregar nuevo accesorio */}
                  {productoSeleccionado && (
                    <div className="flex items-center gap-2 pl-2 border-l-2 border-primary/20">
                      <Input
                        placeholder="¿No está en la lista? Escriba el nombre..."
                        value={nuevoAccesorioNombre}
                        onChange={(e) => setNuevoAccesorioNombre(e.target.value)}
                        className="flex-1 h-9 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAgregarNuevoAccesorio();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAgregarNuevoAccesorio}
                        disabled={!nuevoAccesorioNombre.trim() || agregandoAccesorio}
                        className="shrink-0"
                      >
                        {agregandoAccesorio ? (
                          <span className="animate-spin">...</span>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Centro de Servicio y Reingreso */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <OutlinedSelect label="Centro de Servicio" value={centroServicio} onValueChange={setCentroServicio} options={centrosServicioList.map(c => ({
                value: c.id,
                label: c.nombre
              }))} required />
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors h-[52px]">
                    <Checkbox id="reingreso" checked={esReingreso} onCheckedChange={checked => setEsReingreso(checked as boolean)} />
                    <Label htmlFor="reingreso" className="cursor-pointer font-normal flex-1">Es un reingreso</Label>
                  </div>
                </div>

                {/* Tipología */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Tipología *</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={tipologia === 'Mantenimiento' ? 'default' : 'outline'} className="w-full" onClick={() => setTipologia('Mantenimiento')}>
                      Mantenimiento
                    </Button>
                    <Button type="button" variant={tipologia === 'Reparación' ? 'default' : 'outline'} className="w-full" onClick={() => setTipologia('Reparación')}>
                      Reparación
                    </Button>
                  </div>
                </div>

                {/* Opciones de Entrega */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Opciones de Entrega *</p>
                  <RadioGroup value={opcionEnvio} onValueChange={value => {
                setOpcionEnvio(value);
                if (value === 'recoger') {
                  setDireccionSeleccionada("");
                  setNuevaDireccion("");
                  setMostrarNuevaDireccion(false);
                }
              }} className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <RadioGroupItem value="recoger" id="recoger" />
                      <Label htmlFor="recoger" className="cursor-pointer font-normal flex-1 text-sm">Recoger en centro</Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <RadioGroupItem value="directo" id="directo" />
                      <Label htmlFor="directo" className="cursor-pointer font-normal flex-1 text-sm">Envío directo</Label>
                    </div>
                  </RadioGroup>

                  {opcionEnvio !== 'recoger' && opcionEnvio && <div className="pl-4 border-l-2 border-primary/20 space-y-4 mt-4">
                      {mostrarFormNuevoCliente ? nuevoCliente.direccion ? <div className="p-3 rounded-lg bg-muted/30 border">
                            <p className="text-sm font-medium">Dirección del nuevo cliente:</p>
                            <p className="text-sm text-muted-foreground mt-1">{nuevoCliente.direccion}</p>
                          </div> : <p className="text-sm text-destructive">Complete la dirección del cliente en el paso anterior</p> : direccionesEnvio.length > 0 ? <OutlinedSelect label="Dirección de Envío" value={direccionSeleccionada} onValueChange={setDireccionSeleccionada} options={direccionesEnvio.map(dir => ({
                  value: dir.id,
                  label: `${dir.direccion}${dir.es_principal ? ' (Principal)' : ''}`
                }))} required /> : <p className="text-sm text-muted-foreground">No hay direcciones guardadas</p>}

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">¿Agregar nueva dirección?</p>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setMostrarNuevaDireccion(!mostrarNuevaDireccion)}>
                          {mostrarNuevaDireccion ? 'Cancelar' : 'Agregar'}
                        </Button>
                      </div>
                      {mostrarNuevaDireccion && <OutlinedTextarea label="Nueva Dirección" value={nuevaDireccion} onChange={e => setNuevaDireccion(e.target.value)} />}
                    </div>}
                </div>

                {/* Separador */}
                <Separator className="my-2" />

                {/* Opciones adicionales - Stock Cemaco */}
                

                {/* Observaciones */}
                <OutlinedTextarea label="Observaciones (LOG)" value={logObservaciones} onChange={e => setLogObservaciones(e.target.value)} />
              </div>
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <Button variant="outline" onClick={() => setPaso(1)} className="order-2 sm:order-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Atrás
              </Button>
              <Button onClick={guardarIncidente} disabled={guardando} size="lg" className="order-1 sm:order-2 px-8">
                {guardando ? "Guardando..." : "Crear Incidente"}
              </Button>
            </div>
          </>}
      </div>

      {/* Widget flotante de cámara */}
      <FloatingCameraWidget media={mediaFiles} onMediaChange={setMediaFiles} />

      {/* Dialog de éxito */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">¡Incidente creado exitosamente!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Código: <span className="font-bold text-foreground">{incidenteCreado?.codigo}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex justify-center my-4">
            <Button variant="outline" className="gap-2" onClick={() => {
            setShowSuccessDialog(false);
            setShowPrintDialog(true);
          }}>
              <Printer className="h-4 w-4" />
              Imprimir Incidente
            </Button>
          </div>
          
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => navigate("/mostrador/incidentes")}>
              Ir a Incidentes
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
            setShowSuccessDialog(false);
            setIncidenteCreado(null);
            resetForm();
          }}>
              Agregar otra máquina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de impresión */}
      <AlertDialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Vista previa de impresión</AlertDialogTitle>
            <AlertDialogDescription>
              Revisa la hoja y luego presiona “Imprimir” para generar el documento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {incidenteCreado && <div className="border rounded-lg overflow-auto max-h-[60vh] bg-white">
              <IncidentePrintSheet data={incidenteCreado} />
            </div>}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
            setShowPrintDialog(false);
            setShowSuccessDialog(true);
          }}>
              Volver
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
            // Pequeño delay para asegurar render antes de abrir el print preview
            setTimeout(() => window.print(), 50);
          }}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}