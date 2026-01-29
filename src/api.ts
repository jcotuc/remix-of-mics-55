// src/api.ts
// Configure the generated SDK client with centralized API URL
import { client } from "./generated_sdk/client.gen";
import { API_BASE_URL } from "./config/api";

// Set the SDK client's base URL from centralized config
client.setConfig({ baseUrl: API_BASE_URL });


export interface IncidenteSchema {
  id: number;
  estado: string;
  codigo?: string;
  created_at?: string;
  updated_at?: string;
  producto?: { id: number; codigo?: string };
  // Add other relevant fields as needed for the application to function
}

export interface ProductoSchema {
  id: number;
  codigo: string;
  // Add other relevant fields as needed
}
