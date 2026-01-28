import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Search,
  User,
  Package,
  AlertCircle,
  UserCircle,
  ChevronRight,
  Printer,
  Copy,
  Edit3,
  PenTool,
} from "lucide-react";
import {
  listClientesApiV1ClientesGet,
  createClienteApiV1ClientesPost,
  updateClienteApiV1ClientesClienteIdPatch,
  getClienteApiV1ClientesClienteIdGet,
  searchProductosApiV1ProductosSearchGet,
  createIncidenteApiV1IncidentesPost,
  getAllAccesoriosApiV1AccesoriosGet,
  createAccesorioApiV1AccesoriosPost,
  getIncidentesApiV1IncidentesGet,
  getAllFamiliasProductoApiV1FamiliasProductoGet,
  getAllCentrosDeServicioApiV1CentrosDeServicioGet,
  // createIncidenteAccesorio, // Placeholder for linking accessory to incident
  // createDireccion, // Placeholder for creating an address
} from "@/generated_sdk";
import type {
  ClienteSchema,
  ProductoSchema,
  IncidenteSchema,
  AccesorioSchema,
  CentroDeServicioSchema,
  FamiliaProductoSchema,
  DireccionSchema,
} from "@/generated_sdk/types.gen";
import { SidebarMediaCapture, SidebarPhoto } from "@/components/features/media";
import { uploadMediaToStorage, saveIncidentePhotos } from "@/lib/uploadMedia";
import { MinimalStepper } from "@/components/ui/minimal-stepper";
import { OutlinedInput, OutlinedTextarea, OutlinedSelect } from "@/components/ui/outlined-input";
import { AccesorioSearchSelect } from "@/components/shared";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { IncidentePrintSheet } from "@/components/features/incidentes";
import { SignatureCanvasComponent, SignatureCanvasRef } from "@/components/shared/SignatureCanvas";

// Simplified local types for form state
type Cliente = ClienteSchema; 
type Producto = ProductoSchema;
const tipologias = ["Mantenimiento", "Reparación", "Daños por transporte", "Venta de repuestos"];

function mapTipologiaToEnum(value: string): Database["public"]["Enums"]["tipoincidente"] {
  // En BD solo existen: MANTENIMIENTO | REPARACION
  // Mapeamos las opciones extendidas a la más cercana para evitar errores al insertar.
  switch ((value || "").toLowerCase()) {
    case "mantenimiento":
      return "MANTENIMIENTO";
    case "reparación":
    case "reparacion":
    case "daños por transporte":
    case "danos por transporte":
    case "venta de repuestos":
    default:
      return "REPARACION";
  }
}
const DEPARTAMENTOS = [
  "Guatemala",
  "Alta Verapaz",
  "Baja Verapaz",
  "Chimaltenango",
  "Chiquimula",
  "El Progreso",
  "Escuintla",
  "Huehuetenango",
  "Izabal",
  "Jalapa",
  "Jutiapa",
  "Petén",
  "Quetzaltenango",
  "Quiché",
  "Retalhuleu",
  "Sacatepéquez",
  "San Marcos",
  "Santa Rosa",
  "Sololá",
  "Suchitepéquez",
  "Totonicapán",
  "Zacapa",
];
const MUNICIPIOS: Record<string, string[]> = {
  Guatemala: [
    "Guatemala",
    "Santa Catarina Pinula",
    "San José Pinula",
    "San José del Golfo",
    "Palencia",
    "Chinautla",
    "San Pedro Ayampuc",
    "Mixco",
    "San Pedro Sacatepéquez",
    "San Juan Sacatepéquez",
    "San Raymundo",
    "Chuarrancho",
    "Fraijanes",
    "Amatitlán",
    "Villa Nueva",
    "Villa Canales",
    "San Miguel Petapa",
  ],
  "Alta Verapaz": [
    "Cobán",
    "Santa Cruz Verapaz",
    "San Cristóbal Verapaz",
    "Tactic",
    "Tamahú",
    "Tucurú",
    "Panzós",
    "Senahú",
    "San Pedro Carchá",
    "San Juan Chamelco",
    "Lanquín",
    "Cahabón",
    "Chisec",
    "Chahal",
    "Fray Bartolomé de las Casas",
    "Santa Catarina La Tinta",
    "Raxruhá",
  ],
  "Baja Verapaz": [
    "Salamá",
    "San Miguel Chicaj",
    "Rabinal",
    "Cubulco",
    "Granados",
    "Santa Cruz El Chol",
    "San Jerónimo",
    "Purulhá",
  ],
  Chimaltenango: [
    "Chimaltenango",
    "San José Poaquil",
    "San Martín Jilotepeque",
    "San Juan Comalapa",
    "Santa Apolonia",
    "Tecpán Guatemala",
    "Patzún",
    "San Miguel Pochuta",
    "Patzicía",
    "Santa Cruz Balanyá",
    "Acatenango",
    "San Pedro Yepocapa",
    "San Andrés Itzapa",
    "Parramos",
    "Zaragoza",
    "El Tejar",
  ],
  Chiquimula: [
    "Chiquimula",
    "San José La Arada",
    "San Juan Ermita",
    "Jocotán",
    "Camotán",
    "Olopa",
    "Esquipulas",
    "Concepción Las Minas",
    "Quezaltepeque",
    "San Jacinto",
    "Ipala",
  ],
  "El Progreso": [
    "Guastatoya",
    "Morazán",
    "San Agustín Acasaguastlán",
    "San Cristóbal Acasaguastlán",
    "El Jícaro",
    "Sansare",
    "Sanarate",
    "San Antonio La Paz",
  ],
  Escuintla: [
    "Escuintla",
    "Santa Lucía Cotzumalguapa",
    "La Democracia",
    "Siquinalá",
    "Masagua",
    "Tiquisate",
    "La Gomera",
    "Guanagazapa",
    "San José",
    "Iztapa",
    "Palín",
    "San Vicente Pacaya",
    "Nueva Concepción",
    "Puerto San José",
  ],
  Huehuetenango: [
    "Huehuetenango",
    "Chiantla",
    "Malacatancito",
    "Cuilco",
    "Nentón",
    "San Pedro Necta",
    "Jacaltenango",
    "San Pedro Soloma",
    "San Ildefonso Ixtahuacán",
    "Santa Bárbara",
    "La Libertad",
    "La Democracia",
    "San Miguel Acatán",
    "San Rafael La Independencia",
    "Todos Santos Cuchumatán",
    "San Juan Atitán",
    "Santa Eulalia",
    "San Mateo Ixtatán",
    "Colotenango",
    "San Sebastián Huehuetenango",
    "Tectitán",
    "Concepción Huista",
    "San Juan Ixcoy",
    "San Antonio Huista",
    "Santa Cruz Barillas",
    "San Sebastián Coatán",
    "Aguacatán",
    "San Rafael Petzal",
    "San Gaspar Ixchil",
    "Santiago Chimaltenango",
    "Santa Ana Huista",
    "Unión Cantinil",
    "Petatán",
  ],
  Izabal: ["Puerto Barrios", "Livingston", "El Estor", "Morales", "Los Amates"],
  Jalapa: [
    "Jalapa",
    "San Pedro Pinula",
    "San Luis Jilotepeque",
    "San Manuel Chaparrón",
    "San Carlos Alzatate",
    "Monjas",
    "Mataquescuintla",
  ],
  Jutiapa: [
    "Jutiapa",
    "El Progreso",
    "Santa Catarina Mita",
    "Agua Blanca",
    "Asunción Mita",
    "Yupiltepeque",
    "Atescatempa",
    "Jerez",
    "El Adelanto",
    "Zapotitlán",
    "Comapa",
    "Jalpatagua",
    "Conguaco",
    "Moyuta",
    "Pasaco",
    "Quesada",
    "San José Acatempa",
  ],
  Petén: [
    "Flores",
    "San José",
    "San Benito",
    "San Andrés",
    "La Libertad",
    "San Francisco",
    "Santa Ana",
    "Dolores",
    "San Luis",
    "Sayaxché",
    "Melchor de Mencos",
    "Poptún",
    "Las Cruces",
    "El Chal",
  ],
  Quetzaltenango: [
    "Quetzaltenango",
    "Salcajá",
    "Olintepeque",
    "San Carlos Sija",
    "Sibilia",
    "Cabricán",
    "Cajolá",
    "San Miguel Sigüilá",
    "San Juan Ostuncalco",
    "San Mateo",
    "Concepción Chiquirichapa",
    "San Martín Sacatepéquez",
    "Almolonga",
    "Cantel",
    "Huitán",
    "Zunil",
    "Colomba Costa Cuca",
    "San Francisco La Unión",
    "El Palmar",
    "Coatepeque",
    "Génova",
    "Flores Costa Cuca",
    "La Esperanza",
    "Palestina de Los Altos",
  ],
  Quiché: [
    "Santa Cruz del Quiché",
    "Chiché",
    "Chinique",
    "Zacualpa",
    "Chajul",
    "Santo Tomás Chichicastenango",
    "Patzité",
    "San Antonio Ilotenango",
    "San Pedro Jocopilas",
    "Cunén",
    "San Juan Cotzal",
    "Joyabaj",
    "Nebaj",
    "San Andrés Sajcabajá",
    "San Miguel Uspantán",
    "Sacapulas",
    "San Bartolomé Jocotenango",
    "Canillá",
    "Chicamán",
    "Ixcán",
    "Pachalum",
  ],
  Retalhuleu: [
    "Retalhuleu",
    "San Sebastián",
    "Santa Cruz Muluá",
    "San Martín Zapotitlán",
    "San Felipe",
    "San Andrés Villa Seca",
    "Champerico",
    "Nuevo San Carlos",
    "El Asintal",
  ],
  Sacatepéquez: [
    "Antigua Guatemala",
    "Jocotenango",
    "Pastores",
    "Sumpango",
    "Santo Domingo Xenacoj",
    "Santiago Sacatepéquez",
    "San Bartolomé Milpas Altas",
    "San Lucas Sacatepéquez",
    "Santa Lucía Milpas Altas",
    "Magdalena Milpas Altas",
    "Santa María de Jesús",
    "Ciudad Vieja",
    "San Miguel Dueñas",
    "Alotenango",
    "San Antonio Aguas Calientes",
    "Santa Catarina Barahona",
  ],
  "San Marcos": [
    "San Marcos",
    "San Pedro Sacatepéquez",
    "San Antonio Sacatepéquez",
    "Comitancillo",
    "San Miguel Ixtahuacán",
    "Concepción Tutuapa",
    "Tacaná",
    "Sibinal",
    "Tajumulco",
    "Tejutla",
    "San Rafael Pie de la Cuesta",
    "Nuevo Progreso",
    "El Tumbador",
    "San José El Rodeo",
    "Malacatán",
    "Catarina",
    "Ayutla",
    "Ocós",
    "San Pablo",
    "El Quetzal",
    "La Reforma",
    "Pajapita",
    "Ixchiguán",
    "San José Ojetenam",
    "San Cristóbal Cucho",
    "Sipacapa",
    "Esquipulas Palo Gordo",
    "Río Blanco",
    "San Lorenzo",
  ],
  "Santa Rosa": [
    "Cuilapa",
    "Barberena",
    "Santa Rosa de Lima",
    "Casillas",
    "San Rafael Las Flores",
    "Oratorio",
    "San Juan Tecuaco",
    "Chiquimulilla",
    "Taxisco",
    "Santa María Ixhuatán",
    "Guazacapán",
    "Santa Cruz Naranjo",
    "Pueblo Nuevo Viñas",
    "Nueva Santa Rosa",
  ],
  Sololá: [
    "Sololá",
    "San José Chacayá",
    "Santa María Visitación",
    "Santa Lucía Utatlán",
    "Nahualá",
    "Santa Catarina Ixtahuacán",
    "Santa Clara La Laguna",
    "Concepción",
    "San Andrés Semetabaj",
    "Panajachel",
    "Santa Catarina Palopó",
    "San Antonio Palopó",
    "San Lucas Tolimán",
    "Santa Cruz La Laguna",
    "San Pablo La Laguna",
    "San Marcos La Laguna",
    "San Juan La Laguna",
    "San Pedro La Laguna",
    "Santiago Atitlán",
  ],
  Suchitepéquez: [
    "Mazatenango",
    "Cuyotenango",
    "San Francisco Zapotitlán",
    "San Bernardino",
    "San José El Ídolo",
    "Santo Domingo Suchitepéquez",
    "San Lorenzo",
    "Samayac",
    "San Pablo Jocopilas",
    "San Antonio Suchitepéquez",
    "San Miguel Panán",
    "San Gabriel",
    "Chicacao",
    "Patulul",
    "Santa Bárbara",
    "San Juan Bautista",
    "Santo Tomás La Unión",
    "Zunilito",
    "Pueblo Nuevo",
    "Río Bravo",
  ],
  Totonicapán: [
    "Totonicapán",
    "San Cristóbal Totonicapán",
    "San Francisco El Alto",
    "San Andrés Xecul",
    "Momostenango",
    "Santa María Chiquimula",
    "Santa Lucía La Reforma",
    "San Bartolo",
  ],
  Zacapa: [
    "Zacapa",
    "Estanzuela",
    "Río Hondo",
    "Gualán",
    "Teculután",
    "Usumatlán",
    "Cabañas",
    "San Diego",
    "La Unión",
    "Huité",
    "San Jorge",
  ],
};
interface Cliente {
  id: number;
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
const stepperSteps = [
  {
    id: 1,
    title: "Cliente",
    description: "Datos del propietario",
    icon: <User className="w-5 h-5" />,
  },
  {
    id: 2,
    title: "Máquina",
    description: "Información del equipo",
    icon: <Package className="w-5 h-5" />,
  },
];
export default function NuevoIncidente() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    municipio: "",
  });
  const [municipiosDisponibles, setMunicipiosDisponibles] = useState<string[]>([]);

  // Datos del cliente existente
  const [datosClienteExistente, setDatosClienteExistente] = useState({
    nombre: "",
    nit: "",
    correo: "",
    telefono_principal: "",
    telefono_secundario: "",
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
  const [accesoriosDisponibles, setAccesoriosDisponibles] = useState<{ id: number; nombre: string }[]>([]);
  const [centrosServicioList, setCentrosServicioList] = useState<
    {
      id: number;
      nombre: string;
    }[]
  >([]);
  const [centroServicio, setCentroServicio] = useState<number | null>(null);
  const [opcionEnvio, setOpcionEnvio] = useState<string>("");
  const [direccionesEnvio, setDireccionesEnvio] = useState<any[]>([]);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState<string>("");
  const [nuevaDireccion, setNuevaDireccion] = useState("");
  const [tipoDireccionEnvio, setTipoDireccionEnvio] = useState<"existente" | "nueva">("existente");
  const [ingresadoMostrador, setIngresadoMostrador] = useState(true);
  const [esReingreso, setEsReingreso] = useState(false);
  const [incidentesAnteriores, setIncidentesAnteriores] = useState<any[]>([]);
  const [incidenteReingresoId, setIncidenteReingresoId] = useState<string | null>(null);
  const [logObservaciones, setLogObservaciones] = useState("");
  const [tipologia, setTipologia] = useState("");
  const [esStockCemaco, setEsStockCemaco] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Producto manual
  const [modoManualProducto, setModoManualProducto] = useState(false);
  const [productoManual, setProductoManual] = useState({ codigo: "", clave: "", descripcion: "" });

  // Teléfono envío
  const [telefonoEnvio, setTelefonoEnvio] = useState("");

  // Media
  const [mediaPhotos, setMediaPhotos] = useState<SidebarPhoto[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [incidenteCreado, setIncidenteCreado] = useState<{
    codigo: string;
    codigoCliente: string;
    nombreCliente: string;
    telefonoCliente?: string;
    direccionCliente?: string;
    tipoCliente?: string;
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
    firmaClienteDataUrl?: string;
  } | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const signatureRef = useRef<SignatureCanvasRef>(null);
  const [firmaCapturada, setFirmaCapturada] = useState<string | null>(null);
  useEffect(() => {
    if (nuevoCliente.departamento) {
      setMunicipiosDisponibles(MUNICIPIOS[nuevoCliente.departamento] || []);
      setNuevoCliente((prev) => ({
        ...prev,
        municipio: "",
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
        const { results: productosData } = await searchProductosApiV1ProductosSearchGet({ 
          query: { search: productoSeleccionado.codigo, limit: 1 },
          responseStyle: 'data',
        });
        const productoData = productosData?.[0] as any;

        if (!productoData?.familia_padre_id) {
          const { results: accesorios } = await getAllAccesoriosApiV1AccesoriosGet({ responseStyle: 'data' });
          setAccesoriosDisponibles((accesorios || []).map((a: any) => ({ id: a.id, nombre: a.nombre })));
          return;
        }

        const familiaProductoId = productoData.familia_padre_id;

        const { results: familiasData } = await getAllFamiliasProductoApiV1FamiliasProductoGet({ responseStyle: 'data' });
        const familiaData = familiasData?.find((f: any) => f.id === familiaProductoId);

        const familiaIds: number[] = [familiaProductoId];
        if (familiaData?.parent_id) {
          familiaIds.push(familiaData.parent_id);
        }

        const { results: allAccesorios } = await getAllAccesoriosApiV1AccesoriosGet({ responseStyle: 'data' });
        const accesoriosFiltrados = (allAccesorios || [])
          .filter((acc: any) => familiaIds.includes(acc.familia_id))
          .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));

        setAccesoriosDisponibles(accesoriosFiltrados.map((a: any) => ({ id: a.id, nombre: a.nombre })));
      } catch (error) {
        console.error("Error fetching accesorios:", error);
        setAccesoriosDisponibles([]);
      }
    };
    fetchAccesorios();
  }, [productoSeleccionado]);

  // Cargar centros de servicio y establecer el predeterminado del usuario
  useEffect(() => {
    const fetchCentrosYUsuario = async () => {
      try {
        const centrosRes = await getAllCentrosDeServicioApiV1CentrosDeServicioGet({ responseStyle: 'data' });
        const centros = centrosRes.results || [];
        if (centros) {
          const centrosActivos = centros.filter((c: any) => c.activo);
          setCentrosServicioList(centrosActivos.map((c: any) => ({ id: c.id, nombre: c.nombre })));
        }

        if (user) {
          const userProfile = await readUserMeApiV1AuthMeGet({ responseStyle: 'data' });
          if (userProfile?.centro_de_servicio_id) {
            setCentroServicio(userProfile.centro_de_servicio_id);
          }
        }
      } catch (error) {
        console.error("Error fetching centros:", error);
      }
    };
    fetchCentrosYUsuario();
  }, [user]);
  useEffect(() => {
    const fetchDirecciones = async () => {
      if (!clienteSeleccionado) return;
      // try {
      //   // Fetch direcciones using apiBackendAction - note: we need a direcciones.list handler
      //   // For now we'll use the clientes.get which includes direcciones
      //   const { result: clienteData } = await apiBackendAction("clientes.get", { id: clienteSeleccionado.id });
      //   const direccionesData = (clienteData as any)?.direcciones || [];
        
      //   if (direccionesData && direccionesData.length > 0) {
      //     setDireccionesEnvio(direccionesData);
      //     const principal = direccionesData.find((d: any) => d.es_principal);
      //     if (principal) {
      //       setDireccionSeleccionada(String(principal.id));
      //     }
      //   } else {
      //     if (clienteSeleccionado.direccion) {
      //       const tempDireccion = {
      //         id: "temp-" + clienteSeleccionado.codigo,
      //         cliente_id: clienteSeleccionado.id,
      //         direccion: clienteSeleccionado.direccion,
      //         es_principal: true,
      //         created_at: new Date().toISOString(),
      //         updated_at: new Date().toISOString(),
      //       };
      //       setDireccionesEnvio([tempDireccion]);
      //       setDireccionSeleccionada(tempDireccion.id);
      //     } else {
      //       setDireccionesEnvio([]);
      //     }
      //   }
      // } catch (error) {
      //   console.error("Error fetching direcciones:", error);
      //   setDireccionesEnvio([]);
      // }
    };
    fetchDirecciones();
  }, [clienteSeleccionado]);
  useEffect(() => {
    if (busquedaCliente.length >= 2) {
      const fetchClientes = async () => {
        try {
          const { results } = await listClientesApiV1ClientesGet({ 
            query: { search: busquedaCliente, limit: 10 },
            responseStyle: 'data',
          });
          setClientesEncontrados(results || []);
        } catch (error) {
          console.error("Error fetching clientes:", error);
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
          const { results } = await searchProductosApiV1ProductosSearchGet({ 
            query: { search: skuMaquina, limit: 20 },
            responseStyle: 'data',
          });
          const transformedData = (results || []).map((item: any) => ({
            ...item,
            url_foto: item.url_foto || "/api/placeholder/200/200",
          }));
          setProductosEncontrados(transformedData);
          if (transformedData.length === 1) {
            setProductoSeleccionado(transformedData[0]);
            setModoManualProducto(false);
          }
        } catch (error) {
          console.error("Error fetching productos:", error);
        }
      };
      fetchProductos();
    } else {
      setProductosEncontrados([]);
    }
  }, [skuMaquina]);

  // Cargar incidentes anteriores cuando es reingreso
  useEffect(() => {
    const fetchIncidentesAnteriores = async () => {
      // if (!esReingreso) {
      //   setIncidentesAnteriores([]);
      //   setIncidenteReingresoId(null);
      //   return;
      // }

      // const codigoCliente = clienteSeleccionado?.codigo || (mostrarFormNuevoCliente ? null : null);
      // if (!codigoCliente) {
      //   setIncidentesAnteriores([]);
      //   return;
      // }

      // try {
      //   // Use clientes.getByCodigo to get client ID, then filter incidentes
      //   const { result: clienteData } = await apiBackendAction("clientes.getByCodigo", { codigo: codigoCliente });
      //   if (!clienteData) {
      //     setIncidentesAnteriores([]);
      //     return;
      //   }
        
      //   const { results } = await apiBackendAction("incidentes.list", { limit: 100 });
      //   const incidentesDelCliente = (results || [])
      //     .filter((inc: any) => inc.cliente?.id === (clienteData as any).id)
      //     .slice(0, 20);
      //   setIncidentesAnteriores(incidentesDelCliente);
      // } catch (error) {
      //   console.error("Error fetching incidentes anteriores:", error);
      //   setIncidentesAnteriores([]);
      // }
    };

    fetchIncidentesAnteriores();
  }, [esReingreso, clienteSeleccionado, mostrarFormNuevoCliente]);
  const seleccionarCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setDatosClienteExistente({
      nombre: cliente.nombre,
      nit: cliente.nit,
      correo: cliente.correo || "",
      telefono_principal: cliente.telefono_principal || "",
      telefono_secundario: cliente.telefono_secundario || "",
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
    setCentroServicio(null);
    setOpcionEnvio("");
    setDireccionSeleccionada("");
    setNuevaDireccion("");
    setTipoDireccionEnvio("existente");
    setEsReingreso(false);
    setIncidenteReingresoId(null);
    setIncidentesAnteriores([]);
    setLogObservaciones("");
    setTipologia("");
    setMediaPhotos([]);
    setModoManualProducto(false);
    setProductoManual({ codigo: "", clave: "", descripcion: "" });
    setTelefonoEnvio("");
    setPaso(2);
  };

  const copiarTelefonoPrincipal = () => {
    const telefono = mostrarFormNuevoCliente
      ? nuevoCliente.telefono_principal
      : datosClienteExistente.telefono_principal ||
        clienteSeleccionado?.telefono_principal ||
        clienteSeleccionado?.celular;

    if (telefono) {
      setTelefonoEnvio(telefono);
      showSuccess("Se copió el teléfono principal del cliente", "Teléfono copiado");
    }
  };

  // Función para agregar nuevo accesorio a CDS_Accesorios
  const handleAgregarNuevoAccesorio = async (nombre: string) => {
    // if (!nombre.trim() || !productoSeleccionado) return;

    // try {
    //   // Obtener familia_padre_id del producto
    //   const { results: productosData } = await apiBackendAction("productos.search", { 
    //     search: productoSeleccionado.codigo, 
    //     limit: 1 
    //   });
    //   const productoData = productosData?.[0] as any;
    //   const familiaId = productoData?.familia_padre_id || null;

    //   // Insertar el nuevo accesorio usando apiBackendAction
    //   const nuevoAcc = await apiBackendAction("accesorios.create", {
    //     nombre: nombre.trim(),
    //     familia_id: familiaId,
    //   } as any);

    //   // Agregarlo a la lista de disponibles y seleccionarlo automáticamente
    //   setAccesoriosDisponibles((prev: any[]) => [...prev, { id: (nuevoAcc as any).id, nombre: (nuevoAcc as any).nombre }]);
    //   setAccesoriosSeleccionados((prev) => [...prev, (nuevoAcc as any).nombre]);

    //   showSuccess(`"${(nuevoAcc as any).nombre}" se agregó y seleccionó automáticamente.`, "Accesorio agregado");
    // } catch (error) {
    //   console.error("Error agregando accesorio:", error);
    //   showError("No se pudo agregar el accesorio");
    // }
  };

  const validarPaso1 = () => {
    if (mostrarFormNuevoCliente) {
      if (
        !nuevoCliente.nombre ||
        !nuevoCliente.nit ||
        !nuevoCliente.direccion ||
        !nuevoCliente.telefono_principal ||
        !nuevoCliente.nombre_facturacion ||
        !nuevoCliente.departamento ||
        !nuevoCliente.municipio
      ) {
        showError("Complete todos los campos obligatorios del cliente");
        return false;
      }
    } else {
      if (!clienteSeleccionado) {
        showError("Seleccione un cliente existente");
        return false;
      }
      if (!datosClienteExistente.nombre || !datosClienteExistente.nit || !datosClienteExistente.telefono_principal) {
        showError("Complete todos los campos obligatorios del cliente");
        return false;
      }
    }
    if (!personaDejaMaquina.trim()) {
      showError("Ingrese quién deja la máquina");
      return false;
    }
    if (!dpiPersonaDeja.trim()) {
      showError("Ingrese el DPI de quien deja la máquina");
      return false;
    }
    return true;
  };
  const validarPaso2 = () => {
    // Validar producto: seleccionado o manual
    if (!productoSeleccionado && !modoManualProducto) {
      showError("Seleccione un producto (SKU de la máquina)");
      return false;
    }
    if (modoManualProducto && (!productoManual.codigo.trim() || !productoManual.descripcion.trim())) {
      showError("Complete el código y descripción del producto manual");
      return false;
    }
    // Validar reingreso
    if (esReingreso && !incidenteReingresoId && incidentesAnteriores.length > 0) {
      showError("Seleccione el incidente anterior para el reingreso");
      return false;
    }
    if (!descripcionProblema.trim()) {
      showError("Ingrese la descripción del problema");
      return false;
    }
    if (!centroServicio) {
      showError("Seleccione un centro de servicio");
      return false;
    }
    if (!opcionEnvio) {
      showError("Seleccione una opción de entrega");
      return false;
    }
    if (
      opcionEnvio === "directo" &&
      tipoDireccionEnvio === "existente" &&
      !direccionSeleccionada &&
      !mostrarFormNuevoCliente
    ) {
      showError("Seleccione una dirección de envío");
      return false;
    }
    if (opcionEnvio === "directo" && tipoDireccionEnvio === "nueva" && !nuevaDireccion.trim()) {
      showError("Seleccione o agregue una dirección de envío");
      return false;
    }
    if (!tipologia) {
      showError("Seleccione la tipología");
      return false;
    }
    // Fotos son opcionales por ahora
    return true;
  };
  const guardarIncidente = async () => {
    // if (!validarPaso2()) return;
    // setGuardando(true);
    // try {
    //   let codigoCliente = clienteSeleccionado?.codigo;
    //   let clienteId: number | null = clienteSeleccionado?.id ?? null;
    //   let direccionEnvioId: string | null = null;

    //   // Si hay una dirección seleccionada que no es temporal, usarla
    //   if (direccionSeleccionada && !direccionSeleccionada.startsWith("temp-")) {
    //     direccionEnvioId = direccionSeleccionada;
    //   }
    //   if (mostrarFormNuevoCliente) {
    //     // Generar código HPC via apiBackendAction
    //     const { codigo: nuevoCodigoHPC } = await apiBackendAction("rpc.generarCodigoHPC", {});
        
    //     // Crear cliente via apiBackendAction
    //     const clienteData = await apiBackendAction("clientes.create", {
    //       codigo: nuevoCodigoHPC,
    //       nombre: nuevoCliente.nombre,
    //       nit: nuevoCliente.nit,
    //       direccion: nuevoCliente.direccion,
    //       correo: nuevoCliente.correo,
    //       telefono_principal: nuevoCliente.telefono_principal,
    //       telefono_secundario: nuevoCliente.telefono_secundario,
    //       nombre_facturacion: nuevoCliente.nombre_facturacion,
    //       pais: nuevoCliente.pais,
    //       departamento: nuevoCliente.departamento,
    //       municipio: nuevoCliente.municipio,
    //       celular: nuevoCliente.telefono_principal,
    //     } as any);
        
    //     codigoCliente = (clienteData as any).codigo;
    //     clienteId = (clienteData as any).id;
        
    //     if (nuevoCliente.direccion && nuevoCliente.direccion.trim()) {
    //       try {
    //         const dirData = await apiBackendAction("direcciones.create", {
    //           cliente_id: (clienteData as any).id,
    //           direccion: nuevoCliente.direccion,
    //           es_principal: true,
    //         } as any);
    //         setDireccionesEnvio([dirData]);
    //         if (opcionEnvio !== "recoger") {
    //           setDireccionSeleccionada(String((dirData as any).id));
    //           direccionEnvioId = String((dirData as any).id);
    //         }
    //       } catch (dirError) {
    //         console.error("Error creando dirección principal:", dirError);
    //       }
    //     }
    //     setClienteSeleccionado(clienteData as any);
    //     showSuccess(`Código HPC: ${nuevoCodigoHPC}`, "Cliente creado");
    //   } else {
    //     // Actualizar cliente existente via apiBackendAction
    //     await apiBackendAction("clientes.update", {
    //       id: clienteSeleccionado!.id,
    //       data: {
    //         nombre: datosClienteExistente.nombre,
    //         nit: datosClienteExistente.nit,
    //         correo: datosClienteExistente.correo,
    //         telefono_principal: datosClienteExistente.telefono_principal,
    //         telefono_secundario: datosClienteExistente.telefono_secundario,
    //         celular: datosClienteExistente.telefono_principal,
    //       }
    //     } as any);
    //   }

    //   if (!clienteId) {
    //     throw new Error("No se pudo determinar el cliente para crear el incidente");
    //   }

    //   // Si hay una nueva dirección escrita, crearla
    //   if (nuevaDireccion.trim() && opcionEnvio !== "recoger") {
    //     const dirData = await apiBackendAction("direcciones.create", {
    //       cliente_id: clienteId,
    //       direccion: nuevaDireccion,
    //       es_principal: direccionesEnvio.length === 0,
    //     } as any);
    //     direccionEnvioId = String((dirData as any).id);
    //   }
    //   // Si se seleccionó una dirección temporal (del cliente pero no guardada en direcciones_envio), crearla
    //   else if (direccionSeleccionada && direccionSeleccionada.startsWith("temp-") && opcionEnvio !== "recoger") {
    //     const direccionTemp = direccionesEnvio.find((d: any) => d.id === direccionSeleccionada);
    //     if (direccionTemp) {
    //       const dirData = await apiBackendAction("direcciones.create", {
    //         cliente_id: clienteId,
    //         direccion: direccionTemp.direccion,
    //         es_principal: true,
    //       } as any);
    //       direccionEnvioId = String((dirData as any).id);
    //     }
    //   }

    //   // Generar código de incidente via apiBackendAction
    //   const { codigo: codigoIncidente } = await apiBackendAction("rpc.generarCodigoIncidente", {});

    //   // Determinar producto según si es manual o seleccionado
    //   let codigoProductoFinal: string | null = null;
    //   let productoId: number | null = null;
    //   let skuMaquinaFinal = skuMaquina;
    //   let descripcionProductoFinal = "";
    //   let productoDescontinuado = false;

    //   if (modoManualProducto) {
    //     // Producto ingresado manualmente - no existe en la BD
    //     codigoProductoFinal = null;
    //     skuMaquinaFinal = productoManual.codigo;
    //     descripcionProductoFinal = productoManual.descripcion;
    //     productoDescontinuado = false;
    //   } else if (productoSeleccionado) {
    //     productoId = productoSeleccionado.id;
    //     codigoProductoFinal = productoSeleccionado.codigo;
    //     descripcionProductoFinal = productoSeleccionado.descripcion || "";
    //     productoDescontinuado = !!productoSeleccionado.descontinuado;
    //   }

    //   const tipologiaEnum = mapTipologiaToEnum(tipologia);
    //   const trackingToken = crypto.randomUUID();
    //   const direccionEntregaId =
    //     opcionEnvio !== "recoger" && direccionEnvioId && !Number.isNaN(parseInt(direccionEnvioId, 10))
    //       ? parseInt(direccionEnvioId, 10)
    //       : null;

    //   const observacionesCompuestas = [
    //     logObservaciones?.trim() ? logObservaciones.trim() : null,
    //     skuMaquinaFinal?.trim() ? `SKU: ${skuMaquinaFinal.trim()}` : null,
    //     personaDejaMaquina?.trim() ? `Entrega: ${personaDejaMaquina.trim()}` : null,
    //     dpiPersonaDeja?.trim() ? `DPI: ${dpiPersonaDeja.trim()}` : null,
    //     accesoriosSeleccionados.length ? `Accesorios: ${accesoriosSeleccionados.join(", ")}` : null,
    //     opcionEnvio !== "recoger" && telefonoEnvio?.trim() ? `Tel. envío: ${telefonoEnvio.trim()}` : null,
    //     modoManualProducto ? `Producto manual: ${productoManual.codigo} - ${productoManual.descripcion}` : null,
    //     !modoManualProducto && codigoProductoFinal ? `Producto: ${codigoProductoFinal}` : null,
    //   ]
    //     .filter(Boolean)
    //     .join(" | ");

    //   // Crear incidente via apiBackendAction
    //   const incidenteData = await apiBackendAction("incidentes.create", {
    //     codigo: codigoIncidente,
    //     cliente_id: clienteId,
    //     producto_id: productoId,
    //     centro_de_servicio_id: centroServicio as number,
    //     quiere_envio: opcionEnvio !== "recoger",
    //     direccion_entrega_id: direccionEntregaId,
    //     incidente_origen_id: esReingreso && incidenteReingresoId ? parseInt(String(incidenteReingresoId), 10) : null,
    //     descripcion_problema: descripcionProblema || null,
    //     observaciones: observacionesCompuestas || null,
    //     tipologia: tipologiaEnum,
    //     estado: ingresadoMostrador ? "REGISTRADO" : "EN_ENTREGA",
    //     aplica_garantia: false,
    //     tracking_token: trackingToken,
    //   } as any);

    //   // Insertar accesorios en incidente_accesorios
    //   if (accesoriosSeleccionados.length > 0) {
    //     // Buscar IDs de los accesorios seleccionados
    //     const { results: accesoriosData } = await apiBackendAction("accesorios.list", {});
    //     const accesoriosFiltrados = (accesoriosData || []).filter((acc: any) => 
    //       accesoriosSeleccionados.includes(acc.nombre)
    //     );

    //     if (accesoriosFiltrados.length > 0) {
    //       for (const acc of accesoriosFiltrados) {
    //         await apiBackendAction("incidente_accesorios.create", {
    //           incidente_id: (incidenteData as any).id,
    //           accesorio_id: acc.id,
    //         } as any);
    //       }
    //     }
    //   }

    //   if (mediaPhotos.length > 0) {
    //     try {
    //       // Convert SidebarPhoto to MediaFile format for upload
    //       const mediaFilesForUpload = mediaPhotos.map((p) => ({
    //         id: p.id,
    //         file: p.file,
    //         preview: p.preview,
    //         tipo: "foto" as const,
    //       }));
    //       const uploadedMedia = await uploadMediaToStorage(mediaFilesForUpload, String(incidenteData.id));
    //       // Add comments to uploaded media
    //       const uploadedWithComments = uploadedMedia.map((media, idx) => ({
    //         ...media,
    //         comment: mediaPhotos[idx]?.comment,
    //       }));
    //       await saveIncidentePhotos(String(incidenteData.id), uploadedWithComments, "ingreso");
    //       showSuccess(`${uploadedMedia.length} archivo(s) subido(s) correctamente`, "Fotos subidas");
    //     } catch (uploadError) {
    //       console.error("Error uploading media:", uploadError);
    //       showWarning("El incidente se creó pero hubo un error al subir algunas fotos");
    //     }
    //   }

    //   // Guardar datos para impresión
    //   setIncidenteCreado({
    //     codigo: incidenteData.codigo,
    //     codigoCliente: codigoCliente!,
    //     nombreCliente: clienteSeleccionado?.nombre || nuevoCliente.nombre,
    //     codigoProducto: codigoProductoFinal || skuMaquinaFinal,
    //     descripcionProducto: descripcionProductoFinal,
    //     skuMaquina: skuMaquinaFinal,
    //     descripcionProblema: descripcionProblema,
    //     accesorios: accesoriosSeleccionados.join(", ") || "Ninguno",
    //     fechaIngreso: new Date(),
    //     centroServicio: centrosServicioList.find((c) => c.id === centroServicio)?.nombre ?? String(centroServicio ?? ""),
    //     personaDejaMaquina: personaDejaMaquina,
    //     tipologia: tipologia,
    //     esReingreso: esReingreso,
    //   });
    //   setShowSuccessDialog(true);
    // } catch (error) {
    //   console.error("Error al guardar:", error);
    //   showError("No se pudo guardar el incidente. Intente nuevamente.");
    // } finally {
    //   setGuardando(false);
    // }
  };
  return (
    <div className="pb-24">
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
        {paso === 1 && (
          <>
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
                {!clienteSeleccionado && !mostrarFormNuevoCliente && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMostrarFormNuevoCliente(true);
                      setBusquedaCliente("");
                    }}
                    className="gap-2"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Crear Nuevo</span>
                  </Button>
                )}
              </div>

              <div className="p-6 space-y-6">
                {/* Búsqueda de cliente */}
                {!mostrarFormNuevoCliente && !clienteSeleccionado && (
                  <div className="space-y-4">
                    <OutlinedInput
                      label="Buscar Cliente"
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      icon={<Search className="w-4 h-4" />}
                    />

                    {busquedaCliente.length >= 2 && (
                      <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                        {clientesEncontrados.length > 0 ? (
                          clientesEncontrados.map((cliente) => (
                            <div
                              key={cliente.codigo}
                              onClick={() => seleccionarCliente(cliente)}
                              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between gap-4"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground truncate">{cliente.nombre}</p>
                                <p className="text-sm text-muted-foreground">
                                  {cliente.codigo} • {cliente.celular}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center">
                            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                            <p className="font-medium text-foreground">No se encontraron resultados</p>
                            <p className="text-sm text-muted-foreground mt-1">¿Desea crear un nuevo cliente?</p>
                            <Button
                              onClick={() => {
                                setMostrarFormNuevoCliente(true);
                                setBusquedaCliente("");
                              }}
                              className="mt-4"
                              size="sm"
                            >
                              Crear Cliente
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {busquedaCliente.length < 2}
                  </div>
                )}

                {/* Cliente seleccionado */}
                {clienteSeleccionado && !mostrarFormNuevoCliente && (
                  <div className="space-y-5">
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
                      <Button
                        size="sm"
                        variant="ghost"
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <OutlinedInput
                        label="Nombre Completo"
                        value={datosClienteExistente.nombre}
                        onChange={(e) =>
                          setDatosClienteExistente({
                            ...datosClienteExistente,
                            nombre: e.target.value,
                          })
                        }
                        required
                      />
                      <OutlinedInput
                        label="NIT"
                        value={datosClienteExistente.nit}
                        onChange={(e) =>
                          setDatosClienteExistente({
                            ...datosClienteExistente,
                            nit: e.target.value,
                          })
                        }
                        required
                      />
                      <OutlinedInput
                        label="Correo Electrónico"
                        type="email"
                        value={datosClienteExistente.correo}
                        onChange={(e) =>
                          setDatosClienteExistente({
                            ...datosClienteExistente,
                            correo: e.target.value,
                          })
                        }
                      />
                      <OutlinedInput
                        label="Teléfono Principal"
                        value={datosClienteExistente.telefono_principal}
                        onChange={(e) =>
                          setDatosClienteExistente({
                            ...datosClienteExistente,
                            telefono_principal: e.target.value,
                          })
                        }
                        required
                      />
                      <OutlinedInput
                        label="Teléfono Secundario"
                        value={datosClienteExistente.telefono_secundario}
                        onChange={(e) =>
                          setDatosClienteExistente({
                            ...datosClienteExistente,
                            telefono_secundario: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Formulario nuevo cliente */}
                {mostrarFormNuevoCliente && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Se generará automáticamente un código HPC
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
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
                            municipio: "",
                          });
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Datos Personales
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <OutlinedInput
                            label="Nombre Completo"
                            value={nuevoCliente.nombre}
                            onChange={(e) =>
                              setNuevoCliente({
                                ...nuevoCliente,
                                nombre: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <OutlinedInput
                          label="Correo Electrónico"
                          type="email"
                          value={nuevoCliente.correo}
                          onChange={(e) =>
                            setNuevoCliente({
                              ...nuevoCliente,
                              correo: e.target.value,
                            })
                          }
                        />
                        <OutlinedInput
                          label="Teléfono Principal"
                          value={nuevoCliente.telefono_principal}
                          onChange={(e) =>
                            setNuevoCliente({
                              ...nuevoCliente,
                              telefono_principal: e.target.value,
                            })
                          }
                          required
                        />
                        <OutlinedInput
                          label="Teléfono Secundario"
                          value={nuevoCliente.telefono_secundario}
                          onChange={(e) =>
                            setNuevoCliente({
                              ...nuevoCliente,
                              telefono_secundario: e.target.value,
                            })
                          }
                        />
                        <div className="sm:col-span-2">
                          <OutlinedInput
                            label="Dirección"
                            value={nuevoCliente.direccion}
                            onChange={(e) =>
                              setNuevoCliente({
                                ...nuevoCliente,
                                direccion: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <OutlinedInput
                          label="País"
                          value={nuevoCliente.pais}
                          onChange={(e) =>
                            setNuevoCliente({
                              ...nuevoCliente,
                              pais: e.target.value,
                            })
                          }
                          required
                        />
                        <OutlinedSelect
                          label="Departamento"
                          value={nuevoCliente.departamento}
                          onValueChange={(value) =>
                            setNuevoCliente({
                              ...nuevoCliente,
                              departamento: value,
                            })
                          }
                          options={DEPARTAMENTOS.map((d) => ({
                            value: d,
                            label: d,
                          }))}
                          required
                        />
                        <OutlinedSelect
                          label="Municipio"
                          value={nuevoCliente.municipio}
                          onValueChange={(value) =>
                            setNuevoCliente({
                              ...nuevoCliente,
                              municipio: value,
                            })
                          }
                          options={municipiosDisponibles.map((m) => ({
                            value: m,
                            label: m,
                          }))}
                          disabled={!nuevoCliente.departamento}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Datos de Facturación
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <OutlinedInput
                          label="NIT"
                          value={nuevoCliente.nit}
                          onChange={(e) =>
                            setNuevoCliente({
                              ...nuevoCliente,
                              nit: e.target.value,
                            })
                          }
                          required
                        />
                        <OutlinedInput
                          label="Nombre de Facturación"
                          value={nuevoCliente.nombre_facturacion}
                          onChange={(e) =>
                            setNuevoCliente({
                              ...nuevoCliente,
                              nombre_facturacion: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                  <div className="relative">
                    <OutlinedInput
                      label="Nombre Completo"
                      value={personaDejaMaquina}
                      onChange={(e) => setPersonaDejaMaquina(e.target.value)}
                      required
                    />
                    {/* Botón para copiar nombre del propietario */}
                    {(clienteSeleccionado || (mostrarFormNuevoCliente && nuevoCliente.nombre)) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-primary"
                        onClick={() => {
                          const nombrePropietario = mostrarFormNuevoCliente
                            ? nuevoCliente.nombre
                            : datosClienteExistente.nombre || clienteSeleccionado?.nombre || "";
                          if (nombrePropietario) {
                            setPersonaDejaMaquina(nombrePropietario);
                            showSuccess("Se copió el nombre del propietario", "Nombre copiado");
                          }
                        }}
                        title="Copiar nombre del propietario"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Propietario</span>
                      </Button>
                    )}
                  </div>
                  <OutlinedInput
                    label="DPI"
                    value={dpiPersonaDeja}
                    onChange={(e) => setDpiPersonaDeja(e.target.value)}
                    maxLength={13}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Botón Siguiente */}
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  if (validarPaso1()) setPaso(2);
                }}
                size="lg"
                className="gap-2 px-8"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {/* Paso 2: Máquina */}
        {paso === 2 && (
          <>
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
                  {productoSeleccionado ? (
                    <div className="p-4 rounded-lg bg-primary/5 border-2 border-primary/30 flex gap-4">
                      {productoSeleccionado.url_foto && (
                        <img
                          src={productoSeleccionado.url_foto}
                          alt=""
                          className="w-20 h-20 object-cover rounded-lg border shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                Seleccionado
                              </span>
                              {productoSeleccionado.descontinuado ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                                  Descontinuado
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
                                  Vigente
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-foreground">{productoSeleccionado.descripcion}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {productoSeleccionado.codigo} • {productoSeleccionado.clave}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setProductoSeleccionado(null);
                              setSkuMaquina("");
                              setProductosEncontrados([]);
                              setModoManualProducto(false);
                            }}
                          >
                            Cambiar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : modoManualProducto ? (
                    // Formulario de ingreso manual
                    <div className="p-4 rounded-lg border-2 border-dashed border-amber-500/50 bg-amber-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-700">Ingreso Manual de Producto</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setModoManualProducto(false);
                            setProductoManual({ codigo: "", clave: "", descripcion: "" });
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <OutlinedInput
                          label="Código/SKU *"
                          value={productoManual.codigo}
                          onChange={(e) => setProductoManual({ ...productoManual, codigo: e.target.value })}
                          required
                        />
                        <OutlinedInput
                          label="Clave"
                          value={productoManual.clave}
                          onChange={(e) => setProductoManual({ ...productoManual, clave: e.target.value })}
                        />
                        <div className="sm:col-span-2">
                          <OutlinedInput
                            label="Descripción del producto *"
                            value={productoManual.descripcion}
                            onChange={(e) => setProductoManual({ ...productoManual, descripcion: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Búsqueda de producto */}
                      <OutlinedInput
                        label="SKU de la Máquina (código, clave o descripción)"
                        value={skuMaquina}
                        onChange={(e) => {
                          setSkuMaquina(e.target.value);
                          if (!e.target.value) setProductoSeleccionado(null);
                        }}
                        icon={<Search className="w-4 h-4" />}
                        required
                      />

                      {/* Lista de productos encontrados */}
                      {productosEncontrados.length > 0 && (
                        <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                          {productosEncontrados.map((producto) => (
                            <div
                              key={producto.codigo}
                              className="p-3 hover:bg-primary/5 cursor-pointer transition-colors flex items-center justify-between gap-3"
                              onClick={() => {
                                setProductoSeleccionado(producto);
                                setSkuMaquina(producto.codigo);
                                setProductosEncontrados([]);
                              }}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm">{producto.descripcion}</p>
                                <p className="text-xs text-muted-foreground">
                                  {producto.codigo} • {producto.clave}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Botón para ingreso manual cuando no hay resultados */}
                      {skuMaquina.length >= 3 && productosEncontrados.length === 0 && (
                        <div className="p-4 rounded-lg bg-muted/30 border text-center">
                          <p className="text-sm text-muted-foreground mb-3">
                            No se encontraron productos con "{skuMaquina}"
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setModoManualProducto(true);
                              setProductoManual({ codigo: skuMaquina, clave: "", descripcion: "" });
                            }}
                            className="gap-2"
                          >
                            <Edit3 className="w-4 h-4" />
                            Ingresar manualmente
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Descripción del problema */}
                <OutlinedTextarea
                  label="Comentario del cliente (fallas de la máquina)"
                  value={descripcionProblema}
                  onChange={(e) => setDescripcionProblema(e.target.value)}
                  required
                />

                {/* Accesorios */}
                <AccesorioSearchSelect
                  label="Accesorios con los que ingresa"
                  accesorios={accesoriosDisponibles}
                  selected={accesoriosSeleccionados}
                  onSelectionChange={setAccesoriosSeleccionados}
                  onAddNew={handleAgregarNuevoAccesorio}
                  disabled={!productoSeleccionado && !modoManualProducto}
                />

                {/* Centro de Servicio y Reingreso */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <OutlinedSelect
                    label="Centro de Servicio"
                    value={centroServicio !== null ? String(centroServicio) : ""}
                    onValueChange={(val) => setCentroServicio(val ? Number(val) : null)}
                    options={centrosServicioList.map((c) => ({
                      value: String(c.id),
                      label: c.nombre,
                    }))}
                    required
                  />
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors h-[52px]">
                    <Checkbox
                      id="reingreso"
                      checked={esReingreso}
                      onCheckedChange={(checked) => setEsReingreso(checked as boolean)}
                    />
                    <Label htmlFor="reingreso" className="cursor-pointer font-normal flex-1">
                      Es un reingreso
                    </Label>
                  </div>
                </div>

                {/* Selector de incidente anterior para reingreso */}
                {esReingreso && clienteSeleccionado && (
                  <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-200 space-y-3">
                    <p className="text-sm font-medium text-amber-700">Seleccione el incidente anterior:</p>
                    {incidentesAnteriores.length > 0 ? (
                      <OutlinedSelect
                        label="Incidente Original"
                        value={incidenteReingresoId || ""}
                        onValueChange={setIncidenteReingresoId}
                        options={incidentesAnteriores.map((inc) => ({
                          value: inc.id,
                          label: `${inc.codigo} - ${inc.descripcion_problema?.substring(0, 40) || "Sin descripción"}... (${new Date(inc.created_at).toLocaleDateString()})`,
                        }))}
                        required
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No se encontraron incidentes anteriores para este cliente.
                      </p>
                    )}
                  </div>
                )}

                {/* Tipología */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Tipología *</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={tipologia === "Mantenimiento" ? "default" : "outline"}
                      className="w-full"
                      onClick={() => setTipologia("Mantenimiento")}
                    >
                      Mantenimiento
                    </Button>
                    <Button
                      type="button"
                      variant={tipologia === "Reparación" ? "default" : "outline"}
                      className="w-full"
                      onClick={() => setTipologia("Reparación")}
                    >
                      Reparación
                    </Button>
                  </div>
                </div>

                {/* Opciones de Entrega */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Opciones de Entrega *</p>
                  <RadioGroup
                    value={opcionEnvio}
                    onValueChange={(value) => {
                      setOpcionEnvio(value);
                      if (value === "recoger") {
                        setDireccionSeleccionada("");
                        setNuevaDireccion("");
                        setTipoDireccionEnvio("existente");
                      }
                    }}
                    className="grid grid-cols-2 gap-2"
                  >
                    <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <RadioGroupItem value="recoger" id="recoger" />
                      <Label htmlFor="recoger" className="cursor-pointer font-normal flex-1 text-sm">
                        Recoger en centro
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <RadioGroupItem value="directo" id="directo" />
                      <Label htmlFor="directo" className="cursor-pointer font-normal flex-1 text-sm">
                        Envío directo
                      </Label>
                    </div>
                  </RadioGroup>

                  {opcionEnvio === "directo" && (
                    <div className="pl-4 border-l-2 border-primary/20 space-y-3 mt-4">
                      <RadioGroup
                        value={tipoDireccionEnvio}
                        onValueChange={(value) => {
                          setTipoDireccionEnvio(value as "existente" | "nueva");
                          if (value === "existente") {
                            setNuevaDireccion("");
                          } else {
                            setDireccionSeleccionada("");
                          }
                        }}
                        className="space-y-3"
                      >
                        {/* Opción 1: Direcciones existentes */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                            <RadioGroupItem value="existente" id="dir-existente" />
                            <Label htmlFor="dir-existente" className="cursor-pointer font-normal flex-1 text-sm">
                              Usar dirección existente
                            </Label>
                          </div>

                          {tipoDireccionEnvio === "existente" && (
                            <div className="pl-8 space-y-3">
                              {mostrarFormNuevoCliente ? (
                                nuevoCliente.direccion ? (
                                  <div className="p-3 rounded-lg bg-muted/30 border">
                                    <p className="text-sm font-medium">Dirección del nuevo cliente:</p>
                                    <p className="text-sm text-muted-foreground mt-1">{nuevoCliente.direccion}</p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-destructive">
                                    Complete la dirección del cliente en el paso anterior
                                  </p>
                                )
                              ) : direccionesEnvio.length > 0 ? (
                                <OutlinedSelect
                                  label="Dirección de Envío"
                                  value={direccionSeleccionada}
                                  onValueChange={setDireccionSeleccionada}
                                  options={direccionesEnvio.map((dir) => ({
                                    value: dir.id,
                                    label: `${dir.direccion}${dir.es_principal ? " (Principal)" : ""}`,
                                  }))}
                                  required
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground">No hay direcciones guardadas</p>
                              )}

                              {/* Teléfono de contacto para envío */}
                              <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                  <OutlinedInput
                                    label="Teléfono de contacto para envío"
                                    value={telefonoEnvio}
                                    onChange={(e) => setTelefonoEnvio(e.target.value)}
                                    placeholder="Número para coordinación de entrega"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-[52px] gap-1 shrink-0 text-xs"
                                  onClick={copiarTelefonoPrincipal}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Copiar del cliente</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Opción 2: Nueva dirección */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                            <RadioGroupItem value="nueva" id="dir-nueva" />
                            <Label htmlFor="dir-nueva" className="cursor-pointer font-normal flex-1 text-sm">
                              Agregar nueva dirección
                            </Label>
                          </div>

                          {tipoDireccionEnvio === "nueva" && (
                            <div className="pl-8 space-y-3">
                              <OutlinedTextarea
                                label="Nueva Dirección"
                                value={nuevaDireccion}
                                onChange={(e) => setNuevaDireccion(e.target.value)}
                                required
                              />

                              {/* Teléfono de contacto para envío */}
                              <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                  <OutlinedInput
                                    label="Teléfono de contacto para envío"
                                    value={telefonoEnvio}
                                    onChange={(e) => setTelefonoEnvio(e.target.value)}
                                    placeholder="Número para coordinación de entrega"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-[52px] gap-1 shrink-0 text-xs"
                                  onClick={copiarTelefonoPrincipal}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Copiar del cliente</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>

                {/* Separador */}
                <Separator className="my-2" />

                {/* Opciones adicionales - Stock Cemaco */}

                {/* Observaciones */}
                <OutlinedTextarea
                  label="Observaciones (LOG)"
                  value={logObservaciones}
                  onChange={(e) => setLogObservaciones(e.target.value)}
                />
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
          </>
        )}
      </div>

      {/* Sidebar de cámara */}
      <SidebarMediaCapture
        photos={mediaPhotos}
        onPhotosChange={setMediaPhotos}
        tipo="ingreso"
        commentRequired={false}
      />

      {/* Dialog de éxito con firma */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">¡Incidente creado exitosamente!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Código: <span className="font-bold text-foreground">{incidenteCreado?.codigo}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Sección de firma digital */}
          <div className="my-4">
            <div className="flex items-center gap-2 mb-2">
              <PenTool className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Firma del cliente para confirmar entrega</span>
            </div>
            <SignatureCanvasComponent 
              ref={signatureRef}
              onEnd={() => {
                const dataUrl = signatureRef.current?.toDataURL();
                if (dataUrl) {
                  setFirmaCapturada(dataUrl);
                }
              }}
            />
          </div>

          <div className="flex justify-center my-4">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                // Capturar firma antes de ir a imprimir
                const firma = signatureRef.current?.toDataURL();
                if (incidenteCreado) {
                  setIncidenteCreado({
                    ...incidenteCreado,
                    firmaClienteDataUrl: firma || undefined
                  });
                }
                setShowSuccessDialog(false);
                setShowPrintDialog(true);
              }}
            >
              <Printer className="h-4 w-4" />
              Imprimir Incidente
            </Button>
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => navigate("/mostrador/incidentes")}>Ir a Incidentes</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowSuccessDialog(false);
                setIncidenteCreado(null);
                setFirmaCapturada(null);
                resetForm();
              }}
            >
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
          </AlertDialogHeader>

          {incidenteCreado && (
            <div className="border rounded-lg overflow-auto max-h-[60vh] bg-white">
              <IncidentePrintSheet data={incidenteCreado} />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowPrintDialog(false);
                setShowSuccessDialog(true);
              }}
            >
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Pequeño delay para asegurar render antes de abrir el print preview
                setTimeout(() => window.print(), 50);
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
