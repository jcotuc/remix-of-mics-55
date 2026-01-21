import { lazy } from "react";
import { Route } from "react-router-dom";
import { mostradorRoutes } from "./mostradorRoutes";
import { logisticaRoutes } from "./logisticaRoutes";
import { tallerRoutes } from "./tallerRoutes";
import { sacRoutes } from "./sacRoutes";
import { calidadRoutes } from "./calidadRoutes";
import { gerenciaRoutes } from "./gerenciaRoutes";

// Core pages that are always needed
const Index = lazy(() => import("@/pages/Index"));
const Auth = lazy(() => import("@/pages/Auth"));
const DetalleIncidente = lazy(() => import("@/pages/DetalleIncidente"));
const DetalleCliente = lazy(() => import("@/pages/DetalleCliente"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const TestActions = lazy(() => import("@/pages/TestActions"));

// Core routes
export const coreRoutes = [
  <Route key="home" path="/" element={<Index />} />,
  <Route key="auth" path="/auth" element={<Auth />} />,
  <Route key="test-actions" path="/test-actions" element={<TestActions />} />,
  <Route key="incidente-detalle" path="/incidentes/:id" element={<DetalleIncidente />} />,
  <Route key="cliente-detalle" path="/detalle-cliente/:codigo" element={<DetalleCliente />} />,
  <Route key="not-found" path="*" element={<NotFound />} />,
];

// All routes combined
export const allRoutes = [
  ...coreRoutes.slice(0, -1), // Exclude NotFound (must be last)
  ...mostradorRoutes,
  ...logisticaRoutes,
  ...tallerRoutes,
  ...sacRoutes,
  ...calidadRoutes,
  ...gerenciaRoutes,
  coreRoutes[coreRoutes.length - 1], // NotFound last
];

// Loading fallback component
export const RouteLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Export individual route groups for flexibility
export {
  mostradorRoutes,
  logisticaRoutes,
  tallerRoutes,
  sacRoutes,
  calidadRoutes,
  gerenciaRoutes,
};
