import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import Clientes from "./pages/Clientes";
import Productos from "./pages/Productos";
import Repuestos from "./pages/Repuestos";
import Incidentes from "./pages/Incidentes";
import NuevoIncidente from "./pages/NuevoIncidente";
import DetalleIncidente from "./pages/DetalleIncidente";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/repuestos" element={<Repuestos />} />
            <Route path="/incidentes" element={<Incidentes />} />
            <Route path="/incidentes/nuevo" element={<NuevoIncidente />} />
            <Route path="/incidentes/:id" element={<DetalleIncidente />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
