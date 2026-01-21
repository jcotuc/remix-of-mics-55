import { lazy } from "react";
import { Route } from "react-router-dom";

const Asignaciones = lazy(() => import("@/pages/taller/Asignaciones"));
const MisAsignaciones = lazy(() => import("@/pages/taller/MisAsignaciones"));
const BusquedaIncidentes = lazy(() => import("@/pages/taller/BusquedaIncidentes"));
const WaterspiderPendientes = lazy(() => import("@/pages/taller/WaterspiderPendientes"));
const WaterspiderEntrega = lazy(() => import("@/pages/taller/WaterspiderEntrega"));
const RevisionStockCemaco = lazy(() => import("@/pages/taller/RevisionStockCemaco"));
const AprobacionesStockCemaco = lazy(() => import("@/pages/taller/AprobacionesStockCemaco"));
const PendientesRepuestos = lazy(() => import("@/pages/taller/PendientesRepuestos"));
const DetallePendienteRepuesto = lazy(() => import("@/pages/taller/DetallePendienteRepuesto"));
const PedidosBodegaCentral = lazy(() => import("@/pages/taller/PedidosBodegaCentral"));
const AsignacionTecnicos = lazy(() => import("@/pages/taller/AsignacionTecnicos"));
const ConfiguracionColas = lazy(() => import("@/pages/taller/ConfiguracionColas"));
const Transferencias = lazy(() => import("@/pages/taller/Transferencias"));
const Reasignaciones = lazy(() => import("@/pages/taller/Reasignaciones"));
const DiagnosticoInicial = lazy(() => import("@/pages/taller/DiagnosticoInicial"));
const CambioGarantia = lazy(() => import("@/pages/taller/CambioGarantia"));
const DashboardJefeTaller = lazy(() => import("@/pages/taller/DashboardJefeTaller"));
const SolicitudesTaller = lazy(() => import("@/pages/taller/Solicitudes"));

export const tallerRoutes = [
  <Route key="taller-asignaciones" path="/taller/asignaciones" element={<Asignaciones />} />,
  <Route key="taller-mis-asignaciones" path="/taller/mis-asignaciones" element={<MisAsignaciones />} />,
  <Route key="taller-busqueda" path="/taller/busqueda-incidentes" element={<BusquedaIncidentes />} />,
  <Route key="taller-waterspider" path="/taller/waterspider" element={<WaterspiderPendientes />} />,
  <Route key="taller-waterspider-entrega" path="/taller/waterspider/:incidenteId" element={<WaterspiderEntrega />} />,
  <Route key="taller-revision-stock" path="/taller/revision-stock-cemaco" element={<RevisionStockCemaco />} />,
  <Route key="taller-aprobaciones-stock" path="/taller/aprobaciones-stock-cemaco" element={<AprobacionesStockCemaco />} />,
  <Route key="taller-pendientes" path="/taller/pendientes-repuestos" element={<PendientesRepuestos />} />,
  <Route key="taller-pendientes-detalle" path="/taller/pendientes-repuestos/:id" element={<DetallePendienteRepuesto />} />,
  <Route key="taller-pedidos" path="/taller/pedidos-bodega" element={<PedidosBodegaCentral />} />,
  <Route key="taller-asignacion" path="/taller/asignacion-tecnicos" element={<AsignacionTecnicos />} />,
  <Route key="taller-colas" path="/taller/configuracion-colas" element={<ConfiguracionColas />} />,
  <Route key="taller-transferencias" path="/taller/transferencias" element={<Transferencias />} />,
  <Route key="taller-reasignaciones" path="/taller/reasignaciones" element={<Reasignaciones />} />,
  <Route key="taller-diagnostico" path="/taller/diagnostico/:id" element={<DiagnosticoInicial />} />,
  <Route key="taller-cambio-garantia" path="/taller/cambio-garantia/:id" element={<CambioGarantia />} />,
  <Route key="taller-solicitudes" path="/taller/solicitudes" element={<SolicitudesTaller />} />,
  <Route key="taller-dashboard" path="/taller/dashboard-jefe" element={<DashboardJefeTaller />} />,
];
