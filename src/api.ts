// src/api.ts
// Configure the mics-api client with centralized API URL
import { mycsapi } from "./mics-api";
import { API_BASE_URL } from "./config/api";

mycsapi.configure({ baseUrl: API_BASE_URL });
