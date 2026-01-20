import { lazy } from "react";
import { Route } from "react-router-dom";

const Inventario = lazy(() => import("@/pages/bodega/Inventario"));
const InventarioCiclico = lazy(() => import("@/pages/bodega/InventarioCiclico"));
const ConsultaCardex = lazy(() => import("@/pages/bodega/ConsultaCardex"));
const GestionUbicaciones = lazy(() => import("@/pages/bodega/GestionUbicaciones"));
const DocumentosPendientes = lazy(() => import("@/pages/bodega/DocumentosPendientes"));
const DocumentosUbicacion = lazy(() => import("@/pages/bodega/DocumentosUbicacion"));
const MovimientosInventario = lazy(() => import("@/pages/bodega/MovimientosInventario"));
const Despieces = lazy(() => import("@/pages/bodega/Despieces"));
const Importacion = lazy(() => import("@/pages/bodega/Importacion"));
const RecepcionImportacion = lazy(() => import("@/pages/bodega/RecepcionImportacion"));
const DespachosDepartamentales = lazy(() => import("@/pages/bodega/DespachosDepartamentales"));
const AnalisisYAbastecimiento = lazy(() => import("@/pages/bodega/AnalisisYAbastecimiento"));
const ListadoPicking = lazy(() => import("@/pages/bodega/ListadoPicking"));
const Solicitudes = lazy(() => import("@/pages/bodega/Solicitudes"));
const DetalleSolicitud = lazy(() => import("@/pages/bodega/DetalleSolicitud"));
const ReubicacionRepuestos = lazy(() => import("@/pages/bodega/ReubicacionRepuestos"));
const GestionRelacionesRepuestos = lazy(() => import("@/pages/bodega/GestionRelacionesRepuestos"));
const DashboardJefeBodega = lazy(() => import("@/pages/bodega/DashboardJefeBodega"));
const DashboardSupervisorBodega = lazy(() => import("@/pages/bodega/DashboardSupervisorBodega"));

export const bodegaRoutes = [
  <Route key="bodega-inventario" path="/bodega/inventario" element={<Inventario />} />,
  <Route key="bodega-ciclico" path="/bodega/inventario-ciclico" element={<InventarioCiclico />} />,
  <Route key="bodega-cardex" path="/bodega/consulta-cardex" element={<ConsultaCardex />} />,
  <Route key="bodega-ubicaciones" path="/bodega/ubicaciones" element={<GestionUbicaciones />} />,
  <Route key="bodega-docs-pendientes" path="/bodega/documentos-pendientes" element={<DocumentosPendientes />} />,
  <Route key="bodega-docs-ubicacion" path="/bodega/documentos-ubicacion" element={<DocumentosUbicacion />} />,
  <Route key="bodega-movimientos" path="/bodega/movimientos" element={<MovimientosInventario />} />,
  <Route key="bodega-despieces" path="/bodega/despieces" element={<Despieces />} />,
  <Route key="bodega-importacion" path="/bodega/importacion" element={<Importacion />} />,
  <Route key="bodega-recepcion" path="/bodega/recepcion/:id" element={<RecepcionImportacion />} />,
  <Route key="bodega-despachos" path="/bodega/despachos" element={<DespachosDepartamentales />} />,
  <Route key="bodega-abastecimiento" path="/bodega/abastecimiento" element={<AnalisisYAbastecimiento />} />,
  <Route key="bodega-picking" path="/bodega/picking/:id" element={<ListadoPicking />} />,
  <Route key="bodega-solicitudes" path="/bodega/solicitudes" element={<Solicitudes />} />,
  <Route key="bodega-solicitud-detalle" path="/bodega/solicitudes/:id" element={<DetalleSolicitud />} />,
  <Route key="bodega-reubicacion" path="/bodega/reubicacion-repuestos" element={<ReubicacionRepuestos />} />,
  <Route key="bodega-relaciones" path="/bodega/relaciones-repuestos" element={<GestionRelacionesRepuestos />} />,
  <Route key="bodega-dashboard-jefe" path="/bodega/dashboard-jefe" element={<DashboardJefeBodega />} />,
  <Route key="bodega-dashboard-supervisor" path="/bodega/dashboard-supervisor" element={<DashboardSupervisorBodega />} />,
];
