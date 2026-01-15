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
  | "Ingresado"
  | "En ruta"
  | "Pendiente de diagnostico"
  | "En diagnostico" 
  | "Pendiente por repuestos"
  | "Presupuesto"
  | "Porcentaje"
  | "Reparado"
  | "Cambio por garantia"
  | "Nota de credito"
  | "Bodega pedido"
  | "Rechazado"
  | "Pendiente entrega"
  | "Logistica envio"
  | "Pendiente de aprobación NC"
  | "NC Autorizada"
  | "NC Emitida"
  | "Entregado";

export type CategoriaProducto = 
  | "Electricas"
  | "Neumaticas" 
  | "Hidraulicas"
  | "Compresores"
  | "Bombas"
  | "2 Tiempos"
  | "Estacionarias"
  | "Hidrolavadoras"
  | "Herramienta Manual";

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