import { lazy } from "react";
import { Route } from "react-router-dom";

const DashboardGerente = lazy(() => import("@/pages/gerencia/DashboardGerente"));
const DashboardSupervisorRegional = lazy(() => import("@/pages/gerencia/DashboardSupervisorRegional"));
const AprobacionesGarantia = lazy(() => import("@/pages/gerencia/AprobacionesGarantia"));
const MisGarantias = lazy(() => import("@/pages/asesor/MisGarantias"));

export const gerenciaRoutes = [
  <Route key="gerencia-dashboard" path="/gerencia/dashboard" element={<DashboardGerente />} />,
  <Route key="gerencia-regional" path="/gerencia/regional" element={<DashboardSupervisorRegional />} />,
  <Route key="gerencia-aprobaciones" path="/gerencia/aprobaciones-garantia" element={<AprobacionesGarantia />} />,
  <Route key="mis-garantias" path="/mis-garantias" element={<MisGarantias />} />,
];
