// src/api.ts
import { client } from './generated_sdk/client.gen';

client.setConfig({
  baseUrl: 'http://localhost:8000',
  credentials: 'include', // Crucial for Server Cookies
});

// // Use interceptors to inject tokens if you aren't using cookies
// client.interceptors.request.use((request) => {
//   const token = localStorage.getItem('token');
//   if (token) {
//     request.headers.set('Authorization', `Bearer ${token}`);
//   }
//   return request;
// });