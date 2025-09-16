export interface Cliente {
  codigo: string;
  nombre: string;
  nit: string;
  celular: string;
}

export interface Producto {
  codigo: string;
  clave: string;
  descripcion: string;
  descontinuado: boolean;
  urlFoto: string;
  categoria: CategoriaProducto;
}

export interface Repuesto {
  numero: string;
  codigo: string;
  clave: string;
  descripcion: string;
  urlFoto: string;
  codigoProducto: string;
}

export interface Tecnico {
  codigo: string;
  nombre: string;
  apellido: string;
  email: string;
}

export type StatusIncidente = 
  | "Pendiente de diagnostico"
  | "En diagnostico" 
  | "Pendiente por repuestos"
  | "Reparacion en garantia"
  | "Mantenimiento"
  | "Reparado"
  | "Presupuesto"
  | "Canje"
  | "Nota de credito"
  | "Cambio por garantia";

export type CategoriaProducto = 
  | "Electricas"
  | "Neumaticas" 
  | "Hidraulicas"
  | "4 tiempos"
  | "2 tiempos"
  | "Estacionarias";

export type LugarIngreso = "Mostrador" | "Logistica";

export interface Incidente {
  id: string;
  codigoProducto: string;
  codigoCliente: string;
  codigoTecnico: string;
  status: StatusIncidente;
  coberturaGarantia: boolean;
  descripcionProblema: string;
  fechaIngreso: string;
  productoDescontinuado?: boolean;
  diagnostico?: Diagnostico;
  repuestosSolicitados?: RepuestoSolicitado[];
  historialEstados?: HistorialEstado[];
  lugarIngreso?: LugarIngreso;
  tecnicoAsignado?: string;
  incidentesAnteriores?: string[];
  fotosIngreso?: string[];
  fotosDiagnostico?: string[];
  fotosSalida?: string[];
  porcentajeDescuento?: 10 | 40;
  codigoReemplazo?: string;
}

export interface Diagnostico {
  fecha: string;
  tecnicoCodigo: string;
  descripcion: string;
  fallasEncontradas: string[];
  recomendaciones: string;
  requiereRepuestos: boolean;
  tiempoEstimadoReparacion: string;
  costoEstimado?: number;
  aplicaGarantia: boolean;
  lugarIngreso: LugarIngreso;
  tecnicoAsignado: string;
}

export interface RepuestoSolicitado {
  repuestoCodigo: string;
  cantidad: number;
  fechaSolicitud: string;
  estado: 'pendiente' | 'en-transito' | 'recibido';
  bodegaOrigen?: string;
  fechaEstimadaLlegada?: string;
}

export interface HistorialEstado {
  fecha: string;
  estadoAnterior: StatusIncidente;
  estadoNuevo: StatusIncidente;
  tecnicoCodigo: string;
  observaciones?: string;
}

export interface MediaFile {
  id: string;
  incidenteId: string;
  nombre: string;
  descripcion: string;
  url: string;
  tipo: 'foto' | 'video';
}