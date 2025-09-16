import { Cliente, Producto, Repuesto, Tecnico, Incidente } from '@/types';

export const clientes: Cliente[] = [
  {
    codigo: "CLI001",
    nombre: "Juan Pérez",
    nit: "12345678-9",
    celular: "555-0101"
  },
  {
    codigo: "CLI002", 
    nombre: "María García",
    nit: "98765432-1",
    celular: "555-0102"
  },
  {
    codigo: "CLI003",
    nombre: "Carlos López",
    nit: "11223344-5",
    celular: "555-0103"
  }
];

export const productos: Producto[] = [
  {
    codigo: "PROD001",
    clave: "TALADRO-001",
    descripcion: "Taladro Eléctrico 500W",
    descontinuado: false,
    urlFoto: "/api/placeholder/200/200",
    categoria: "Electricas"
  },
  {
    codigo: "PROD002",
    clave: "SIERRA-002", 
    descripcion: "Sierra Circular 1200W",
    descontinuado: true,
    urlFoto: "/api/placeholder/200/200",
    categoria: "Electricas"
  },
  {
    codigo: "PROD003",
    clave: "LIJADORA-003",
    descripcion: "Lijadora Orbital 300W",
    descontinuado: false,
    urlFoto: "/api/placeholder/200/200",
    categoria: "Electricas"
  },
  {
    codigo: "15679",
    clave: "ROTOMARTILLO-001",
    descripcion: "Rotomartillo Neumático 700W",
    descontinuado: false,
    urlFoto: "/api/placeholder/200/200",
    categoria: "Neumaticas"
  },
  {
    codigo: "16441",
    clave: "ESMERIL-001",
    descripcion: "Esmeril Angular 900W",
    descontinuado: false,
    urlFoto: "/api/placeholder/200/200",
    categoria: "Electricas"
  }
];

export const repuestos: Repuesto[] = [
  {
    numero: "REP001",
    codigo: "MOTOR-001",
    clave: "MTR-TAL-500",
    descripcion: "Motor para Taladro 500W",
    urlFoto: "/api/placeholder/150/150",
    codigoProducto: "PROD001"
  },
  {
    numero: "REP002",
    codigo: "DISCO-001", 
    clave: "DSC-SRR-12",
    descripcion: "Disco Sierra 12 pulgadas",
    urlFoto: "/api/placeholder/150/150",
    codigoProducto: "PROD002"
  },
  {
    numero: "REP003",
    codigo: "LIJA-001",
    clave: "LJA-ORB-150",
    descripcion: "Base Lijadora 150mm",
    urlFoto: "/api/placeholder/150/150",
    codigoProducto: "PROD003"
  }
];

export const tecnicos: Tecnico[] = [
  {
    codigo: "TEC001",
    nombre: "Roberto",
    apellido: "Martínez",
    email: "roberto.martinez@servicio.com"
  },
  {
    codigo: "TEC002",
    nombre: "Ana",
    apellido: "Rodríguez", 
    email: "ana.rodriguez@servicio.com"
  },
  {
    codigo: "TEC003",
    nombre: "Luis",
    apellido: "González",
    email: "luis.gonzalez@servicio.com"
  }
];

export const incidentes: Incidente[] = [
  {
    id: "INC001",
    codigoProducto: "15679",
    codigoCliente: "CLI001",
    codigoTecnico: "TEC001",
    status: "Pendiente de diagnostico",
    coberturaGarantia: true,
    descripcionProblema: "El rotomartillo no enciende al presionar el gatillo",
    fechaIngreso: "2024-01-15",
    productoDescontinuado: false,
    lugarIngreso: "Mostrador"
  },
  {
    id: "INC008",
    codigoProducto: "PROD001",
    codigoCliente: "CLI002",
    codigoTecnico: "TEC001",
    status: "Pendiente de diagnostico",
    coberturaGarantia: true,
    descripcionProblema: "Taladro no gira al presionar el gatillo, posible problema en motor",
    fechaIngreso: "2024-01-18",
    productoDescontinuado: false,
    lugarIngreso: "Logistica"
  },
  {
    id: "INC009",
    codigoProducto: "PROD003",
    codigoCliente: "CLI003",
    codigoTecnico: "TEC002",
    status: "Pendiente de diagnostico",
    coberturaGarantia: false,
    descripcionProblema: "Lijadora orbital vibra excesivamente y no mantiene velocidad",
    fechaIngreso: "2024-01-17",
    productoDescontinuado: false,
    lugarIngreso: "Mostrador"
  },
  {
    id: "INC010",
    codigoProducto: "16441",
    codigoCliente: "CLI001",
    codigoTecnico: "TEC003",
    status: "Pendiente de diagnostico",
    coberturaGarantia: true,
    descripcionProblema: "Esmeril angular genera chispas y se calienta demasiado",
    fechaIngreso: "2024-01-19",
    productoDescontinuado: false,
    lugarIngreso: "Logistica"
  },
  {
    id: "INC011",
    codigoProducto: "15679",
    codigoCliente: "CLI002",
    codigoTecnico: "TEC001",
    status: "Pendiente de diagnostico",
    coberturaGarantia: false,
    descripcionProblema: "Rotomartillo pierde potencia y hace ruido extraño en el motor",
    fechaIngreso: "2024-01-16",
    productoDescontinuado: false,
    lugarIngreso: "Mostrador"
  },
  {
    id: "INC002",
    codigoProducto: "16441", 
    codigoCliente: "CLI002",
    codigoTecnico: "TEC002",
    status: "En diagnostico",
    coberturaGarantia: false,
    descripcionProblema: "El esmeril hace ruido extraño y vibra excesivamente",
    fechaIngreso: "2024-01-14",
    productoDescontinuado: false,
    diagnostico: {
      fecha: "2024-01-14",
      tecnicoCodigo: "TEC002",
      descripcion: "Se ha iniciado el diagnóstico del esmeril. Ruido detectado en rodamientos.",
      fallasEncontradas: ["Rodamientos desgastados", "Desbalance en el disco"],
      recomendaciones: "Reemplazar rodamientos y revisar disco",
      requiereRepuestos: true,
      tiempoEstimadoReparacion: "2-3 días hábiles",
      aplicaGarantia: false,
      lugarIngreso: "Mostrador",
      tecnicoAsignado: "TEC002"
    },
    historialEstados: [
      {
        fecha: "2024-01-14",
        estadoAnterior: "Pendiente de diagnostico",
        estadoNuevo: "En diagnostico",
        tecnicoCodigo: "TEC002",
        observaciones: "Iniciando diagnóstico completo"
      }
    ]
  },
  {
    id: "INC003",
    codigoProducto: "15679",
    codigoCliente: "CLI003", 
    codigoTecnico: "TEC003",
    status: "Reparado",
    coberturaGarantia: true,
    descripcionProblema: "Rotomartillo no mantiene velocidad constante",
    fechaIngreso: "2024-01-10",
    productoDescontinuado: false,
    diagnostico: {
      fecha: "2024-01-11",
      tecnicoCodigo: "TEC003",
      descripcion: "Escobillas del motor desgastadas. Motor en buen estado general.",
      fallasEncontradas: ["Escobillas desgastadas", "Carbones del motor deteriorados"],
      recomendaciones: "Reemplazar escobillas y carbones del motor",
      requiereRepuestos: true,
      tiempoEstimadoReparacion: "1 día hábil",
      costoEstimado: 0,
      aplicaGarantia: true,
      lugarIngreso: "Logistica",
      tecnicoAsignado: "TEC003"
    },
    repuestosSolicitados: [
      {
        repuestoCodigo: "ESC-ROT-15679",
        cantidad: 2,
        fechaSolicitud: "2024-01-11",
        estado: "recibido"
      },
      {
        repuestoCodigo: "CAR-MOT-15679", 
        cantidad: 2,
        fechaSolicitud: "2024-01-11",
        estado: "recibido"
      }
    ],
    historialEstados: [
      {
        fecha: "2024-01-10",
        estadoAnterior: "Pendiente de diagnostico",
        estadoNuevo: "En diagnostico",
        tecnicoCodigo: "TEC003",
        observaciones: "Iniciando diagnóstico"
      },
      {
        fecha: "2024-01-11",
        estadoAnterior: "En diagnostico",
        estadoNuevo: "Pendiente por repuestos",
        tecnicoCodigo: "TEC003",
        observaciones: "Solicitando escobillas y carbones"
      },
      {
        fecha: "2024-01-12",
        estadoAnterior: "Pendiente por repuestos",
        estadoNuevo: "Reparado",
        tecnicoCodigo: "TEC003",
        observaciones: "Reparación completada. Producto funcional."
      }
    ]
  },
  {
    id: "INC004",
    codigoProducto: "16441",
    codigoCliente: "CLI002",
    codigoTecnico: "TEC001",
    status: "Pendiente por repuestos",
    coberturaGarantia: true,
    descripcionProblema: "Motor quemado, necesita reemplazo completo del esmeril",
    fechaIngreso: "2024-01-12",
    productoDescontinuado: false,
    diagnostico: {
      fecha: "2024-01-13",
      tecnicoCodigo: "TEC001",
      descripcion: "Motor completamente quemado por sobrecarga. Bobinado irreparable.",
      fallasEncontradas: ["Motor quemado", "Bobinado dañado", "Escobillas fundidas"],
      recomendaciones: "Reemplazo completo del motor",
      requiereRepuestos: true,
      tiempoEstimadoReparacion: "3-5 días hábiles",
      costoEstimado: 0,
      aplicaGarantia: true,
      lugarIngreso: "Mostrador",
      tecnicoAsignado: "TEC001"
    },
    repuestosSolicitados: [
      {
        repuestoCodigo: "MOT-ESM-16441",
        cantidad: 1,
        fechaSolicitud: "2024-01-13",
        estado: "en-transito",
        bodegaOrigen: "Zona 4",
        fechaEstimadaLlegada: "2024-01-17"
      }
    ],
    historialEstados: [
      {
        fecha: "2024-01-12",
        estadoAnterior: "Pendiente de diagnostico",
        estadoNuevo: "En diagnostico",
        tecnicoCodigo: "TEC001"
      },
      {
        fecha: "2024-01-13",
        estadoAnterior: "En diagnostico",
        estadoNuevo: "Pendiente por repuestos",
        tecnicoCodigo: "TEC001",
        observaciones: "Motor en pedido desde Zona 4"
      }
    ]
  },
  {
    id: "INC005",
    codigoProducto: "15679",
    codigoCliente: "CLI001",
    codigoTecnico: "TEC002",
    status: "Presupuesto",
    coberturaGarantia: false,
    descripcionProblema: "Chuck dañado y problemas en el motor del rotomartillo",
    fechaIngreso: "2024-01-08",
    productoDescontinuado: false,
    diagnostico: {
      fecha: "2024-01-09",
      tecnicoCodigo: "TEC002",
      descripcion: "Chuck completamente dañado y motor presenta fallas menores. Sin garantía vigente.",
      fallasEncontradas: ["Chuck fracturado", "Escobillas desgastadas", "Rodamientos con juego"],
      recomendaciones: "Reemplazar chuck, escobillas y rodamientos",
      requiereRepuestos: true,
      tiempoEstimadoReparacion: "2-3 días hábiles",
      costoEstimado: 850.00,
      aplicaGarantia: false,
      lugarIngreso: "Mostrador",
      tecnicoAsignado: "TEC002"
    },
    repuestosSolicitados: [
      {
        repuestoCodigo: "CHK-ROT-15679",
        cantidad: 1,
        fechaSolicitud: "2024-01-09",
        estado: "pendiente"
      },
      {
        repuestoCodigo: "ESC-ROT-15679",
        cantidad: 2,
        fechaSolicitud: "2024-01-09", 
        estado: "pendiente"
      },
      {
        repuestoCodigo: "ROD-ROT-15679",
        cantidad: 2,
        fechaSolicitud: "2024-01-09",
        estado: "pendiente"
      }
    ],
    historialEstados: [
      {
        fecha: "2024-01-08",
        estadoAnterior: "Pendiente de diagnostico",
        estadoNuevo: "En diagnostico",
        tecnicoCodigo: "TEC002"
      },
      {
        fecha: "2024-01-09",
        estadoAnterior: "En diagnostico",
        estadoNuevo: "Presupuesto",
        tecnicoCodigo: "TEC002",
        observaciones: "Esperando aprobación del cliente para reparación Q850.00"
      }
    ]
  },
  {
    id: "INC006",
    codigoProducto: "16441",
    codigoCliente: "CLI003",
    codigoTecnico: "TEC003",
    status: "Pendiente de diagnostico",
    coberturaGarantia: false,
    descripcionProblema: "Vibración excesiva durante el uso del esmeril",
    fechaIngreso: "2024-01-16",
    productoDescontinuado: false
  },
  {
    id: "INC007",
    codigoProducto: "15679",
    codigoCliente: "CLI001",
    codigoTecnico: "TEC001",
    status: "Canje",
    coberturaGarantia: false,
    descripcionProblema: "Múltiples componentes del rotomartillo dañados por sobrecarga",
    fechaIngreso: "2024-01-05",
    productoDescontinuado: false,
    diagnostico: {
      fecha: "2024-01-06",
      tecnicoCodigo: "TEC001",
      descripcion: "Daños severos en múltiples componentes por uso inadecuado. Costo de reparación excede 70% del valor del producto.",
      fallasEncontradas: ["Motor quemado", "Chuck fracturado", "Carcasa agrietada", "Sistema eléctrico dañado"],
      recomendaciones: "Canje del producto debido a daños extensos",
      requiereRepuestos: false,
      tiempoEstimadoReparacion: "No aplica",
      costoEstimado: 1250.00,
      aplicaGarantia: false,
      lugarIngreso: "Logistica",
      tecnicoAsignado: "TEC001"
    },
    historialEstados: [
      {
        fecha: "2024-01-05",
        estadoAnterior: "Pendiente de diagnostico",
        estadoNuevo: "En diagnostico",
        tecnicoCodigo: "TEC001"
      },
      {
        fecha: "2024-01-06",
        estadoAnterior: "En diagnostico",
        estadoNuevo: "Canje",
        tecnicoCodigo: "TEC001",
        observaciones: "Daños exceden 70% del valor. Se procede a canje."
      }
    ]
  }
];