import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Clientes from "./pages/Clientes";
import Productos from "./pages/Productos";
import Repuestos from "./pages/Repuestos";
import Incidentes from "./pages/Incidentes";
import NuevoIncidente from "./pages/NuevoIncidente";
import DetalleIncidente from "./pages/DetalleIncidente";
import DetalleCliente from "./pages/DetalleCliente";
import ConsultaPrecios from "./pages/mostrador/ConsultaPrecios";
import Embarques from "./pages/logistica/Embarques";
import Asignaciones from "./pages/taller/Asignaciones";
import Presupuestos from "./pages/taller/Presupuestos";
import Inventario from "./pages/bodega/Inventario";
import Solicitudes from "./pages/bodega/Solicitudes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/mostrador/clientes" element={<Clientes />} />
              <Route path="/mostrador/clientes/:codigo" element={<DetalleCliente />} />
              <Route path="/mostrador/consulta-precios" element={<ConsultaPrecios />} />
              <Route path="/mostrador/repuestos" element={<Repuestos />} />
              <Route path="/mostrador/productos" element={<Productos />} />
              <Route path="/incidentes" element={<Incidentes />} />
              <Route path="/incidentes/nuevo" element={<NuevoIncidente />} />
              <Route path="/incidentes/:id" element={<DetalleIncidente />} />
              <Route path="/logistica/embarques" element={<Embarques />} />
              <Route path="/taller/asignaciones" element={<Asignaciones />} />
              <Route path="/taller/presupuestos" element={<Presupuestos />} />
              <Route path="/bodega/inventario" element={<Inventario />} />
              <Route path="/bodega/solicitudes" element={<Solicitudes />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
