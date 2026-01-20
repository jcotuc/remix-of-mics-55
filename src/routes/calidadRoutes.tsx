import { lazy } from "react";
import { Route } from "react-router-dom";

const ControlCalidadDashboard = lazy(() => import("@/pages/calidad/ControlCalidadDashboard"));
const VerificacionReincidencias = lazy(() => import("@/pages/calidad/VerificacionReincidencias"));
const AuditoriasCalidad = lazy(() => import("@/pages/calidad/AuditoriasCalidad"));
const AnalisisDefectos = lazy(() => import("@/pages/calidad/AnalisisDefectos"));
const DashboardSupervisorCalidad = lazy(() => import("@/pages/calidad/DashboardSupervisorCalidad"));

export const calidadRoutes = [
  <Route key="calidad-dashboard" path="/calidad" element={<ControlCalidadDashboard />} />,
  <Route key="calidad-reincidencias" path="/calidad/reincidencias" element={<VerificacionReincidencias />} />,
  <Route key="calidad-auditorias" path="/calidad/auditorias" element={<AuditoriasCalidad />} />,
  <Route key="calidad-defectos" path="/calidad/defectos" element={<AnalisisDefectos />} />,
  <Route key="calidad-supervisor" path="/calidad/dashboard-supervisor" element={<DashboardSupervisorCalidad />} />,
];
