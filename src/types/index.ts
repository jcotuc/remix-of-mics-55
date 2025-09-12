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
  | "Reparado"
  | "Presupuesto"
  | "Canje"
  | "Nota de credito"
  | "Cambio por garantia";

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