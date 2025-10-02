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
import Embarques from "./pages/logistica/Embarques";
import Asignaciones from "./pages/taller/Asignaciones";
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
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/productos" element={<Productos />} />
              <Route path="/repuestos" element={<Repuestos />} />
              <Route path="/incidentes" element={<Incidentes />} />
              <Route path="/incidentes/nuevo" element={<NuevoIncidente />} />
              <Route path="/incidentes/:id" element={<DetalleIncidente />} />
              <Route path="/logistica/embarques" element={<Embarques />} />
              <Route path="/taller/asignaciones" element={<Asignaciones />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
