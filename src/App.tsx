import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ActiveIncidentsProvider } from "./contexts/ActiveIncidentsContext";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ClientesUnificado from "./pages/ClientesUnificado";
import ImportarClientes from "./pages/ImportarClientes";
import ActualizarCodigos from "./pages/ActualizarCodigos";
import Productos from "./pages/Productos";
import Repuestos from "./pages/Repuestos";
import NuevoIncidente from "./pages/NuevoIncidente";
import DetalleIncidente from "./pages/DetalleIncidente";
import DetalleCliente from "./pages/DetalleCliente";
import ConsultaPrecios from "./pages/mostrador/ConsultaPrecios";
import SeguimientoIncidente from "./pages/mostrador/SeguimientoIncidente";
import IncidentesMostrador from "./pages/mostrador/Incidentes";
import HerramientasManuales from "./pages/mostrador/HerramientasManuales";
import EntregaMaquinas from "./pages/mostrador/EntregaMaquinas";
import DetalleEntrega from "./pages/mostrador/DetalleEntrega";
import Embarques from "./pages/logistica/Embarques";
import GarantiasManuales from "./pages/logistica/GarantiasManuales";
import Guias from "./pages/logistica/Guias";
import IngresoMaquinas from "./pages/logistica/IngresoMaquinas";

import SalidaMaquinas from "./pages/logistica/SalidaMaquinas";
import FaltanteAccesorios from "./pages/logistica/FaltanteAccesorios";
import MaquinasNuevasRT from "./pages/logistica/MaquinasNuevasRT";
import DanosTransporte from "./pages/logistica/DanosTransporte";
import ConsultaPreciosLogistica from "./pages/logistica/ConsultaPreciosLogistica";
import ConsultaUbicaciones from "./pages/logistica/ConsultaUbicaciones";
import Asignaciones from "./pages/taller/Asignaciones";
import MisAsignaciones from "./pages/taller/MisAsignaciones";
import BusquedaIncidentes from "./pages/taller/BusquedaIncidentes";
import WaterspiderPendientes from "./pages/taller/WaterspiderPendientes";
import WaterspiderEntrega from "./pages/taller/WaterspiderEntrega";
import PendientesRepuestos from "./pages/taller/PendientesRepuestos";
import DetallePendienteRepuesto from "./pages/taller/DetallePendienteRepuesto";
import PedidosBodegaCentral from "./pages/taller/PedidosBodegaCentral";
import AsignacionTecnicos from "./pages/taller/AsignacionTecnicos";
import ConfiguracionColas from "./pages/taller/ConfiguracionColas";
import Transferencias from "./pages/taller/Transferencias";
import Reasignaciones from "./pages/taller/Reasignaciones";
import AprobacionesGarantia from "./pages/gerencia/AprobacionesGarantia";
import MaquinasPendientesEnvio from "./pages/logistica/MaquinasPendientesEnvio";

import DiagnosticoInicial from "./pages/taller/DiagnosticoInicial";
import CambioGarantia from "./pages/taller/CambioGarantia";
import Inventario from "./pages/bodega/Inventario";
import InventarioCiclico from "./pages/bodega/InventarioCiclico";
import Importacion from "./pages/bodega/Importacion";
import RecepcionImportacion from "./pages/bodega/RecepcionImportacion";
import DespachosDepartamentales from "./pages/bodega/DespachosDepartamentales";
import AnalisisABCXYZ from "./pages/bodega/AnalisisABCXYZ";
import Solicitudes from "./pages/bodega/Solicitudes";
import DetalleSolicitud from "./pages/bodega/DetalleSolicitud";
import ConsultaCardex from "./pages/bodega/ConsultaCardex";
import ControlCalidadDashboard from "./pages/calidad/ControlCalidadDashboard";
import AuditoriasCalidad from "./pages/calidad/AuditoriasCalidad";
import AnalisisDefectos from "./pages/calidad/AnalisisDefectos";
import VerificacionReincidencias from "./pages/calidad/VerificacionReincidencias";
import GestionUbicaciones from "./pages/bodega/GestionUbicaciones";
import DocumentosPendientes from "./pages/bodega/DocumentosPendientes";
import DocumentosUbicacion from "./pages/bodega/DocumentosUbicacion";
import MovimientosInventario from "./pages/bodega/MovimientosInventario";
import Despieces from "./pages/bodega/Despieces";
import IncidentesSAC from "./pages/sac/IncidentesSAC";
import DetalleIncidenteSAC from "./pages/sac/DetalleIncidenteSAC";
import ConsultaExistencias from "./pages/sac/ConsultaExistencias";
import Usuarios from "./pages/admin/Usuarios";
import FamiliasProductos from "./pages/admin/FamiliasProductos";
import FallasCausas from "./pages/admin/FallasCausas";
import SustitutosRepuestos from "./pages/admin/SustitutosRepuestos";
import AuditLogs from "./pages/admin/AuditLogs";
import InventarioAdmin from "./pages/admin/InventarioAdmin";
import CentrosServicio from "./pages/admin/CentrosServicio";
import RecomendacionesFamilias from "./pages/admin/RecomendacionesFamilias";
import ImportarDespieces from "./pages/admin/ImportarDespieces";
import GestionPermisos from "./pages/admin/GestionPermisos";
import AccesoriosFamilias from "./pages/admin/AccesoriosFamilias";
import RevisionStockCemaco from "./pages/taller/RevisionStockCemaco";
import AprobacionesStockCemaco from "./pages/taller/AprobacionesStockCemaco";
import MisGarantias from "./pages/asesor/MisGarantias";
import ReubicacionRepuestos from "./pages/bodega/ReubicacionRepuestos";
import GestionRelacionesRepuestos from "./pages/bodega/GestionRelacionesRepuestos";
import DashboardGerente from "./pages/gerencia/DashboardGerente";
import DashboardSupervisorRegional from "./pages/gerencia/DashboardSupervisorRegional";
import DashboardJefeTaller from "./pages/taller/DashboardJefeTaller";
import DashboardJefeLogistica from "./pages/logistica/DashboardJefeLogistica";
import DashboardJefeBodega from "./pages/bodega/DashboardJefeBodega";
import DashboardSupervisorBodega from "./pages/bodega/DashboardSupervisorBodega";
import DashboardSupervisorCalidad from "./pages/calidad/DashboardSupervisorCalidad";
import DashboardSupervisorSAC from "./pages/sac/DashboardSupervisorSAC";
import NotFound from "./pages/NotFound";

function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ActiveIncidentsProvider>
              <Layout>
                <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/mostrador/clientes" element={<ClientesUnificado defaultTab="mostrador" />} />
                <Route path="/mostrador/importar-clientes" element={<ImportarClientes />} />
                <Route path="/mostrador/actualizar-codigos" element={<ActualizarCodigos />} />
                <Route path="/mostrador/consulta-precios" element={<ConsultaPrecios />} />
                <Route path="/mostrador/seguimiento/:id" element={<SeguimientoIncidente />} />
                <Route path="/mostrador/incidentes" element={<IncidentesMostrador />} />
                <Route path="/mostrador/incidentes/nuevo" element={<NuevoIncidente />} />
                <Route path="/mostrador/herramientas-manuales" element={<HerramientasManuales />} />
                <Route path="/mostrador/entrega-maquinas" element={<EntregaMaquinas />} />
                <Route path="/mostrador/entrega-maquinas/:incidenteId" element={<DetalleEntrega />} />
                <Route path="/mostrador/repuestos" element={<Repuestos />} />
                <Route path="/mostrador/productos" element={<Productos />} />
                <Route path="/mostrador/clientes/:codigo" element={<DetalleCliente />} />
                <Route path="/incidentes/:id" element={<DetalleIncidente />} />
                <Route path="/detalle-cliente/:codigo" element={<DetalleCliente />} />
                <Route path="/logistica/embarques" element={<Embarques />} />
                <Route path="/logistica/garantias-manuales" element={<GarantiasManuales />} />
                <Route path="/logistica/guias" element={<Guias />} />
                <Route path="/logistica/ingreso-maquinas" element={<IngresoMaquinas />} />
                <Route path="/logistica/salida-maquinas" element={<SalidaMaquinas />} />
                <Route path="/logistica/faltante-accesorios" element={<FaltanteAccesorios />} />
                <Route path="/logistica/maquinas-nuevas-rt" element={<MaquinasNuevasRT />} />
                <Route path="/logistica/danos-transporte" element={<DanosTransporte />} />
                <Route path="/logistica/consulta-precios" element={<ConsultaPreciosLogistica />} />
                <Route path="/logistica/consulta-ubicaciones" element={<ConsultaUbicaciones />} />
                <Route path="/logistica/clientes" element={<ClientesUnificado defaultTab="logistica" />} />
                <Route path="/logistica/pendientes-envio" element={<MaquinasPendientesEnvio />} />
                <Route path="/taller/asignaciones" element={<Asignaciones />} />
                <Route path="/taller/mis-asignaciones" element={<MisAsignaciones />} />
                <Route path="/taller/busqueda-incidentes" element={<BusquedaIncidentes />} />
                <Route path="/taller/waterspider" element={<WaterspiderPendientes />} />
                <Route path="/taller/waterspider/:incidenteId" element={<WaterspiderEntrega />} />
                <Route path="/taller/revision-stock-cemaco" element={<RevisionStockCemaco />} />
                <Route path="/taller/aprobaciones-stock-cemaco" element={<AprobacionesStockCemaco />} />
                <Route path="/taller/pendientes-repuestos" element={<PendientesRepuestos />} />
                <Route path="/taller/pendientes-repuestos/:id" element={<DetallePendienteRepuesto />} />
                <Route path="/taller/pedidos-bodega" element={<PedidosBodegaCentral />} />
                <Route path="/taller/asignacion-tecnicos" element={<AsignacionTecnicos />} />
                <Route path="/taller/configuracion-colas" element={<ConfiguracionColas />} />
                <Route path="/taller/transferencias" element={<Transferencias />} />
                <Route path="/taller/reasignaciones" element={<Reasignaciones />} />
                
                <Route path="/taller/diagnostico/:id" element={<DiagnosticoInicial />} />
                <Route path="/taller/cambio-garantia/:id" element={<CambioGarantia />} />
                <Route path="/bodega/inventario" element={<Inventario />} />
                <Route path="/bodega/inventario-ciclico" element={<InventarioCiclico />} />
                <Route path="/bodega/consulta-cardex" element={<ConsultaCardex />} />
                <Route path="/bodega/ubicaciones" element={<GestionUbicaciones />} />
                <Route path="/bodega/documentos-pendientes" element={<DocumentosPendientes />} />
                <Route path="/bodega/documentos-ubicacion" element={<DocumentosUbicacion />} />
                <Route path="/bodega/movimientos" element={<MovimientosInventario />} />
                <Route path="/bodega/despieces" element={<Despieces />} />
                <Route path="/bodega/importacion" element={<Importacion />} />
                <Route path="/bodega/recepcion/:id" element={<RecepcionImportacion />} />
                <Route path="/bodega/despachos" element={<DespachosDepartamentales />} />
                <Route path="/bodega/analisis-abc-xyz" element={<AnalisisABCXYZ />} />
                <Route path="/bodega/solicitudes" element={<Solicitudes />} />
                <Route path="/bodega/solicitudes/:id" element={<DetalleSolicitud />} />
                <Route path="/bodega/reubicacion-repuestos" element={<ReubicacionRepuestos />} />
                <Route path="/bodega/relaciones-repuestos" element={<GestionRelacionesRepuestos />} />
                <Route path="/sac/incidentes" element={<IncidentesSAC />} />
                <Route path="/sac/incidentes/:id" element={<DetalleIncidenteSAC />} />
                <Route path="/sac/consulta-existencias" element={<ConsultaExistencias />} />
                
                {/* Calidad Routes */}
                <Route path="/calidad" element={<ControlCalidadDashboard />} />
                <Route path="/calidad/reincidencias" element={<VerificacionReincidencias />} />
                <Route path="/calidad/auditorias" element={<AuditoriasCalidad />} />
                <Route path="/calidad/defectos" element={<AnalisisDefectos />} />
                
                {/* Admin Routes */}
                <Route path="/admin/usuarios" element={<Usuarios />} />
                <Route path="/admin/productos" element={<Productos />} />
                <Route path="/admin/fallas-causas" element={<FallasCausas />} />
                <Route path="/admin/familias-productos" element={<FamiliasProductos />} />
                <Route path="/admin/sustitutos-repuestos" element={<SustitutosRepuestos />} />
                <Route path="/admin/audit-logs" element={<AuditLogs />} />
                <Route path="/admin/inventario" element={<InventarioAdmin />} />
                <Route path="/admin/centros-servicio" element={<CentrosServicio />} />
                <Route path="/admin/recomendaciones-familias" element={<RecomendacionesFamilias />} />
                <Route path="/admin/importar-despieces" element={<ImportarDespieces />} />
                <Route path="/admin/permisos" element={<GestionPermisos />} />
                <Route path="/admin/accesorios-familias" element={<AccesoriosFamilias />} />
                
                {/* Asesor Routes */}
                <Route path="/mis-garantias" element={<MisGarantias />} />
                
                {/* Gerencia Routes */}
                <Route path="/gerencia/dashboard" element={<DashboardGerente />} />
                <Route path="/gerencia/regional" element={<DashboardSupervisorRegional />} />
                <Route path="/gerencia/aprobaciones-garantia" element={<AprobacionesGarantia />} />
                
                {/* Supervisor Routes */}
                <Route path="/taller/dashboard-jefe" element={<DashboardJefeTaller />} />
                <Route path="/logistica/dashboard-jefe" element={<DashboardJefeLogistica />} />
                <Route path="/bodega/dashboard-jefe" element={<DashboardJefeBodega />} />
                <Route path="/bodega/dashboard-supervisor" element={<DashboardSupervisorBodega />} />
                <Route path="/calidad/dashboard-supervisor" element={<DashboardSupervisorCalidad />} />
                <Route path="/sac/dashboard-supervisor" element={<DashboardSupervisorSAC />} />
                
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </ActiveIncidentsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
