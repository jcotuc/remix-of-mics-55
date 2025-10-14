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
import NuevoIncidente from "./pages/NuevoIncidente";
import DetalleCliente from "./pages/DetalleCliente";
import ConsultaPrecios from "./pages/mostrador/ConsultaPrecios";
import SeguimientoIncidente from "./pages/mostrador/SeguimientoIncidente";
import IncidentesMostrador from "./pages/mostrador/Incidentes";
import Embarques from "./pages/logistica/Embarques";
import Asignaciones from "./pages/taller/Asignaciones";
import MisAsignaciones from "./pages/taller/MisAsignaciones";
import BusquedaIncidentes from "./pages/taller/BusquedaIncidentes";
import Presupuestos from "./pages/taller/Presupuestos";
import DiagnosticoInicial from "./pages/taller/DiagnosticoInicial";
import InventarioNuevo from "./pages/bodega/InventarioNuevo";
import Importacion from "./pages/bodega/Importacion";
import DespachosDepartamentales from "./pages/bodega/DespachosDepartamentales";
import StockDepartamento from "./pages/bodega/StockDepartamento";
import Solicitudes from "./pages/bodega/Solicitudes";
import DetalleSolicitud from "./pages/bodega/DetalleSolicitud";
import IncidentesSAC from "./pages/sac/IncidentesSAC";
import DetalleIncidenteSAC from "./pages/sac/DetalleIncidenteSAC";
import ConsultaExistencias from "./pages/sac/ConsultaExistencias";
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
              <Route path="/mostrador/consulta-precios" element={<ConsultaPrecios />} />
              <Route path="/mostrador/seguimiento/:id" element={<SeguimientoIncidente />} />
              <Route path="/mostrador/incidentes" element={<IncidentesMostrador />} />
              <Route path="/mostrador/incidentes/nuevo" element={<NuevoIncidente />} />
              <Route path="/mostrador/repuestos" element={<Repuestos />} />
              <Route path="/mostrador/productos" element={<Productos />} />
              <Route path="/mostrador/clientes/:codigo" element={<DetalleCliente />} />
              <Route path="/logistica/embarques" element={<Embarques />} />
              <Route path="/taller/asignaciones" element={<Asignaciones />} />
              <Route path="/taller/mis-asignaciones" element={<MisAsignaciones />} />
              <Route path="/taller/busqueda-incidentes" element={<BusquedaIncidentes />} />
              <Route path="/taller/presupuestos" element={<Presupuestos />} />
              <Route path="/taller/diagnostico/:id" element={<DiagnosticoInicial />} />
              <Route path="/bodega/inventario" element={<InventarioNuevo />} />
              <Route path="/bodega/importacion" element={<Importacion />} />
              <Route path="/bodega/despachos" element={<DespachosDepartamentales />} />
              <Route path="/bodega/stock-departamento" element={<StockDepartamento />} />
              <Route path="/bodega/solicitudes" element={<Solicitudes />} />
              <Route path="/bodega/solicitudes/:id" element={<DetalleSolicitud />} />
              <Route path="/sac/incidentes" element={<IncidentesSAC />} />
              <Route path="/sac/incidentes/:id" element={<DetalleIncidenteSAC />} />
              <Route path="/sac/consulta-existencias" element={<ConsultaExistencias />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
