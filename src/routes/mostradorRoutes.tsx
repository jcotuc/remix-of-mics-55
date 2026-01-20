import { lazy } from "react";
import { Route } from "react-router-dom";

const ClientesUnificado = lazy(() => import("@/pages/ClientesUnificado"));
const ImportarClientes = lazy(() => import("@/pages/ImportarClientes"));
const ActualizarCodigos = lazy(() => import("@/pages/ActualizarCodigos"));
const ConsultaPrecios = lazy(() => import("@/pages/mostrador/ConsultaPrecios"));
const SeguimientoIncidente = lazy(() => import("@/pages/mostrador/SeguimientoIncidente"));
const IncidentesMostrador = lazy(() => import("@/pages/mostrador/Incidentes"));
const NuevoIncidente = lazy(() => import("@/pages/NuevoIncidente"));
const HerramientasManuales = lazy(() => import("@/pages/mostrador/HerramientasManuales"));
const EntregaMaquinas = lazy(() => import("@/pages/mostrador/EntregaMaquinas"));
const DetalleEntrega = lazy(() => import("@/pages/mostrador/DetalleEntrega"));
const Repuestos = lazy(() => import("@/pages/Repuestos"));
const Productos = lazy(() => import("@/pages/Productos"));
const DetalleCliente = lazy(() => import("@/pages/DetalleCliente"));

export const mostradorRoutes = [
  <Route key="mostrador-clientes" path="/mostrador/clientes" element={<ClientesUnificado defaultTab="mostrador" />} />,
  <Route key="mostrador-importar" path="/mostrador/importar-clientes" element={<ImportarClientes />} />,
  <Route key="mostrador-actualizar" path="/mostrador/actualizar-codigos" element={<ActualizarCodigos />} />,
  <Route key="mostrador-precios" path="/mostrador/consulta-precios" element={<ConsultaPrecios />} />,
  <Route key="mostrador-seguimiento" path="/mostrador/seguimiento/:id" element={<SeguimientoIncidente />} />,
  <Route key="mostrador-incidentes" path="/mostrador/incidentes" element={<IncidentesMostrador />} />,
  <Route key="mostrador-nuevo" path="/mostrador/incidentes/nuevo" element={<NuevoIncidente />} />,
  <Route key="mostrador-herramientas" path="/mostrador/herramientas-manuales" element={<HerramientasManuales />} />,
  <Route key="mostrador-entrega" path="/mostrador/entrega-maquinas" element={<EntregaMaquinas />} />,
  <Route key="mostrador-entrega-detalle" path="/mostrador/entrega-maquinas/:incidenteId" element={<DetalleEntrega />} />,
  <Route key="mostrador-repuestos" path="/mostrador/repuestos" element={<Repuestos />} />,
  <Route key="mostrador-productos" path="/mostrador/productos" element={<Productos />} />,
  <Route key="mostrador-cliente-detalle" path="/mostrador/clientes/:codigo" element={<DetalleCliente />} />,
];
