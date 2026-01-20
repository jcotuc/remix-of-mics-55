import { lazy } from "react";
import { Route } from "react-router-dom";

const IncidentesSAC = lazy(() => import("@/pages/sac/IncidentesSAC"));
const DetalleIncidenteSAC = lazy(() => import("@/pages/sac/DetalleIncidenteSAC"));
const ConsultaExistencias = lazy(() => import("@/pages/sac/ConsultaExistencias"));
const DashboardSupervisorSAC = lazy(() => import("@/pages/sac/DashboardSupervisorSAC"));

export const sacRoutes = [
  <Route key="sac-incidentes" path="/sac/incidentes" element={<IncidentesSAC />} />,
  <Route key="sac-detalle" path="/sac/incidentes/:id" element={<DetalleIncidenteSAC />} />,
  <Route key="sac-existencias" path="/sac/consulta-existencias" element={<ConsultaExistencias />} />,
  <Route key="sac-dashboard" path="/sac/dashboard-supervisor" element={<DashboardSupervisorSAC />} />,
];
