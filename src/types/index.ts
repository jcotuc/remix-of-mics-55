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
  | "Ingresado" 
  | "Diagnostico" 
  | "Repuestos solicitados" 
  | "Reparado" 
  | "Documentado" 
  | "Entregado";

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
}

export interface MediaFile {
  id: string;
  incidenteId: string;
  nombre: string;
  descripcion: string;
  url: string;
  tipo: 'foto' | 'video';
}