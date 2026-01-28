// src/api.ts
import { client } from './generated_sdk/client.gen';

client.setConfig({
  baseUrl: 'http://localhost:8000',
  credentials: 'include', // Crucial for Server Cookies
});