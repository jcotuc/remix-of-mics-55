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
    urlFoto: "/api/placeholder/200/200"
  },
  {
    codigo: "PROD002",
    clave: "SIERRA-002", 
    descripcion: "Sierra Circular 1200W",
    descontinuado: true,
    urlFoto: "/api/placeholder/200/200"
  },
  {
    codigo: "PROD003",
    clave: "LIJADORA-003",
    descripcion: "Lijadora Orbital 300W",
    descontinuado: false,
    urlFoto: "/api/placeholder/200/200"
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
    codigoProducto: "PROD001",
    codigoCliente: "CLI001",
    codigoTecnico: "TEC001",
    status: "Pendiente de diagnostico",
    coberturaGarantia: true,
    descripcionProblema: "El taladro no enciende al presionar el gatillo",
    fechaIngreso: "2024-01-15",
    productoDescontinuado: false
  },
  {
    id: "INC002",
    codigoProducto: "PROD002", 
    codigoCliente: "CLI002",
    codigoTecnico: "TEC002",
    status: "En diagnostico",
    coberturaGarantia: false,
    descripcionProblema: "La sierra hace ruido extraño y vibra excesivamente",
    fechaIngreso: "2024-01-14",
    productoDescontinuado: true
  },
  {
    id: "INC003",
    codigoProducto: "PROD003",
    codigoCliente: "CLI003", 
    codigoTecnico: "TEC003",
    status: "Reparado",
    coberturaGarantia: true,
    descripcionProblema: "Lijadora no mantiene velocidad constante",
    fechaIngreso: "2024-01-10",
    productoDescontinuado: false
  },
  {
    id: "INC004",
    codigoProducto: "PROD001",
    codigoCliente: "CLI002",
    codigoTecnico: "TEC001",
    status: "Pendiente por repuestos",
    coberturaGarantia: true,
    descripcionProblema: "Motor quemado, necesita reemplazo completo",
    fechaIngreso: "2024-01-12",
    productoDescontinuado: false
  },
  {
    id: "INC005",
    codigoProducto: "PROD002",
    codigoCliente: "CLI001",
    codigoTecnico: "TEC002",
    status: "Presupuesto",
    coberturaGarantia: false,
    descripcionProblema: "Disco dañado y problemas en el motor",
    fechaIngreso: "2024-01-08",
    productoDescontinuado: true
  },
  {
    id: "INC006",
    codigoProducto: "PROD003",
    codigoCliente: "CLI003",
    codigoTecnico: "TEC003",
    status: "Pendiente de diagnostico",
    coberturaGarantia: false,
    descripcionProblema: "Vibración excesiva durante el uso",
    fechaIngreso: "2024-01-16",
    productoDescontinuado: false
  },
  {
    id: "INC007",
    codigoProducto: "PROD001",
    codigoCliente: "CLI001",
    codigoTecnico: "TEC001",
    status: "Canje",
    coberturaGarantia: false,
    descripcionProblema: "Múltiples componentes dañados por sobrecarga",
    fechaIngreso: "2024-01-05",
    productoDescontinuado: false
  }
];