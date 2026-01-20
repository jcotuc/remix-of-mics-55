import { lazy } from "react";
import { Route } from "react-router-dom";

const Usuarios = lazy(() => import("@/pages/admin/Usuarios"));
const Productos = lazy(() => import("@/pages/Productos"));
const FallasCausas = lazy(() => import("@/pages/admin/FallasCausas"));
const FamiliasProductos = lazy(() => import("@/pages/admin/FamiliasProductos"));
const SustitutosRepuestos = lazy(() => import("@/pages/admin/SustitutosRepuestos"));
const AuditLogs = lazy(() => import("@/pages/admin/AuditLogs"));
const InventarioAdmin = lazy(() => import("@/pages/admin/InventarioAdmin"));
const CentrosServicio = lazy(() => import("@/pages/admin/CentrosServicio"));
const RecomendacionesFamilias = lazy(() => import("@/pages/admin/RecomendacionesFamilias"));
const ImportarDespieces = lazy(() => import("@/pages/admin/ImportarDespieces"));
const GestionPermisos = lazy(() => import("@/pages/admin/GestionPermisos"));
const AccesoriosFamilias = lazy(() => import("@/pages/admin/AccesoriosFamilias"));

export const adminRoutes = [
  <Route key="admin-usuarios" path="/admin/usuarios" element={<Usuarios />} />,
  <Route key="admin-productos" path="/admin/productos" element={<Productos />} />,
  <Route key="admin-fallas" path="/admin/fallas-causas" element={<FallasCausas />} />,
  <Route key="admin-familias" path="/admin/familias-productos" element={<FamiliasProductos />} />,
  <Route key="admin-sustitutos" path="/admin/sustitutos-repuestos" element={<SustitutosRepuestos />} />,
  <Route key="admin-audit" path="/admin/audit-logs" element={<AuditLogs />} />,
  <Route key="admin-inventario" path="/admin/inventario" element={<InventarioAdmin />} />,
  <Route key="admin-centros" path="/admin/centros-servicio" element={<CentrosServicio />} />,
  <Route key="admin-recomendaciones" path="/admin/recomendaciones-familias" element={<RecomendacionesFamilias />} />,
  <Route key="admin-despieces" path="/admin/importar-despieces" element={<ImportarDespieces />} />,
  <Route key="admin-permisos" path="/admin/permisos" element={<GestionPermisos />} />,
  <Route key="admin-accesorios" path="/admin/accesorios-familias" element={<AccesoriosFamilias />} />,
];
