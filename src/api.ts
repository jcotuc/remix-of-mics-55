// src/api.ts

export interface IncidenteSchema {
  id: number;
  estado: string;
  producto?: { id: number; codigo?: string };
  // Add other relevant fields as needed for the application to function
}

export interface ProductoSchema {
  id: number;
  codigo: string;
  // Add other relevant fields as needed
}
