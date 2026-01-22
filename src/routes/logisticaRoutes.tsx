import { lazy } from "react";
import { Route } from "react-router-dom";

const Embarques = lazy(() => import("@/pages/logistica/Embarques"));
const GarantiasManuales = lazy(() => import("@/pages/logistica/GarantiasManuales"));
const Guias = lazy(() => import("@/pages/logistica/Guias"));
const IngresoMaquinas = lazy(() => import("@/pages/logistica/IngresoMaquinas"));
const SalidaMaquinas = lazy(() => import("@/pages/logistica/SalidaMaquinas"));
const FaltanteAccesorios = lazy(() => import("@/pages/logistica/FaltanteAccesorios"));
const MaquinasNuevasRT = lazy(() => import("@/pages/logistica/MaquinasNuevasRT"));
const DanosTransporte = lazy(() => import("@/pages/logistica/DanosTransporte"));
const ConsultaPreciosLogistica = lazy(() => import("@/pages/logistica/ConsultaPreciosLogistica"));
const ConsultaUbicaciones = lazy(() => import("@/pages/logistica/ConsultaUbicaciones"));
const ClientesUnificado = lazy(() => import("@/pages/ClientesUnificado"));
const DashboardJefeLogistica = lazy(() => import("@/pages/logistica/DashboardJefeLogistica"));

export const logisticaRoutes = [
  <Route key="logistica-embarques" path="/logistica/embarques" element={<Embarques />} />,
  <Route key="logistica-garantias" path="/logistica/garantias-manuales" element={<GarantiasManuales />} />,
  <Route key="logistica-guias" path="/logistica/guias" element={<Guias />} />,
  <Route key="logistica-ingreso" path="/logistica/ingreso-maquinas" element={<IngresoMaquinas />} />,
  <Route key="logistica-salida" path="/logistica/salida-maquinas" element={<SalidaMaquinas />} />,
  <Route key="logistica-faltante" path="/logistica/faltante-accesorios" element={<FaltanteAccesorios />} />,
  <Route key="logistica-maquinas-rt" path="/logistica/maquinas-nuevas-rt" element={<MaquinasNuevasRT />} />,
  <Route key="logistica-danos" path="/logistica/danos-transporte" element={<DanosTransporte />} />,
  <Route key="logistica-precios" path="/logistica/consulta-precios" element={<ConsultaPreciosLogistica />} />,
  <Route key="logistica-ubicaciones" path="/logistica/consulta-ubicaciones" element={<ConsultaUbicaciones />} />,
  <Route key="logistica-clientes" path="/logistica/clientes" element={<ClientesUnificado defaultTab="logistica" />} />,
  <Route key="logistica-dashboard" path="/logistica/dashboard-jefe" element={<DashboardJefeLogistica />} />,
];
