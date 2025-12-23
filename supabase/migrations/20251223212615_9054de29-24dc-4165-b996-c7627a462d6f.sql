-- Insertar permisos básicos por módulo si no existen
INSERT INTO permisos (codigo, nombre, modulo, descripcion) VALUES
-- Mostrador
('ver_clientes', 'Ver Clientes', 'mostrador', 'Permite ver la lista de clientes'),
('ver_repuestos', 'Ver Repuestos', 'mostrador', 'Permite ver catálogo de repuestos'),
('ver_precios', 'Ver Precios', 'mostrador', 'Permite consultar precios'),
('ver_incidentes', 'Ver Incidentes', 'mostrador', 'Permite ver incidentes'),
('ver_herramientas_manuales', 'Ver Herramientas Manuales', 'mostrador', 'Permite ver herramientas manuales'),
('ver_entregas', 'Ver Entregas', 'mostrador', 'Permite ver entregas de máquinas'),
-- Logística
('ver_embarques', 'Ver Embarques', 'logistica', 'Permite ver embarques'),
('ver_garantias_manuales', 'Ver Garantías Manuales', 'logistica', 'Permite ver garantías manuales'),
('ver_guias', 'Ver Guías', 'logistica', 'Permite ver guías de envío'),
('ver_ingresos_log', 'Ver Ingresos Logística', 'logistica', 'Permite ver ingresos de máquinas'),
('ver_salidas_log', 'Ver Salidas Logística', 'logistica', 'Permite ver salidas de máquinas'),
('ver_faltantes_acc', 'Ver Faltantes Accesorios', 'logistica', 'Permite ver faltantes de accesorios'),
('ver_maquinas_rt', 'Ver Máquinas RT', 'logistica', 'Permite ver máquinas nuevas RT'),
('ver_danos_transporte', 'Ver Daños Transporte', 'logistica', 'Permite ver daños por transporte'),
('ver_ubicaciones', 'Ver Ubicaciones', 'logistica', 'Permite consultar ubicaciones'),
-- Taller
('ver_asignaciones', 'Ver Cola de Reparación', 'taller', 'Permite ver cola de reparación'),
('ver_mis_asignaciones', 'Ver Mis Asignaciones', 'taller', 'Permite ver asignaciones propias'),
('ver_pendientes_rep', 'Ver Pendientes Repuestos', 'taller', 'Permite ver pendientes de repuestos'),
('asignar_tecnicos', 'Asignar Técnicos', 'taller', 'Permite asignar técnicos'),
('config_colas', 'Configurar Colas FIFO', 'taller', 'Permite configurar colas'),
('reasignar_incidentes', 'Reasignar Incidentes', 'taller', 'Permite reasignar incidentes'),
('transferir_maquinas', 'Transferir Máquinas', 'taller', 'Permite transferir máquinas'),
-- Bodega
('ver_inventario', 'Ver Inventario', 'bodega', 'Permite ver inventario'),
('reubicar_repuestos', 'Reubicar Repuestos', 'bodega', 'Permite reubicar repuestos'),
('ver_relaciones_rep', 'Ver Relaciones Repuestos', 'bodega', 'Permite ver relaciones de repuestos'),
('ver_inv_ciclico', 'Ver Inventario Cíclico', 'bodega', 'Permite ver inventario cíclico'),
('ver_cardex', 'Ver Cardex', 'bodega', 'Permite consultar cardex'),
('gestionar_ubicaciones', 'Gestionar Ubicaciones', 'bodega', 'Permite gestionar ubicaciones'),
('ver_docs_pendientes', 'Ver Docs Pendientes', 'bodega', 'Permite ver documentos pendientes'),
('ver_docs_ubicacion', 'Ver Docs Ubicación', 'bodega', 'Permite ver documentos por ubicación'),
('ingresar_inventario', 'Ingresar Inventario', 'bodega', 'Permite ingresar inventario'),
('salir_inventario', 'Salir Inventario', 'bodega', 'Permite registrar salidas'),
('ver_despieces', 'Ver Despieces', 'bodega', 'Permite ver despieces'),
('ver_solicitudes', 'Ver Solicitudes', 'bodega', 'Permite ver solicitudes'),
('ver_despachos', 'Ver Despachos', 'bodega', 'Permite ver despachos'),
('importar_productos', 'Importar Productos', 'bodega', 'Permite importar productos'),
('ver_analisis_abc', 'Ver Análisis ABC', 'bodega', 'Permite ver análisis ABC-XYZ'),
-- SAC
('ver_incidentes_sac', 'Ver Incidentes SAC', 'sac', 'Permite ver incidentes en SAC'),
('ver_existencias', 'Ver Existencias', 'sac', 'Permite consultar existencias'),
-- Calidad
('ver_calidad', 'Ver Dashboard Calidad', 'calidad', 'Permite ver dashboard de calidad'),
('ver_reincidencias', 'Ver Reincidencias', 'calidad', 'Permite ver reincidencias'),
('ver_auditorias', 'Ver Auditorías', 'calidad', 'Permite ver auditorías'),
('ver_defectos', 'Ver Defectos', 'calidad', 'Permite ver análisis de defectos'),
-- Gerencia/Supervisores
('ver_dashboard_gerencia', 'Ver Dashboard Gerencia', 'gerencia', 'Permite ver dashboard gerencia'),
('ver_dashboard_regional', 'Ver Dashboard Regional', 'gerencia', 'Permite ver dashboard regional'),
('aprobar_garantias', 'Aprobar Garantías', 'gerencia', 'Permite aprobar garantías'),
('ver_dashboard_taller', 'Ver Dashboard Taller', 'supervisores', 'Permite ver dashboard taller'),
('ver_dashboard_logistica', 'Ver Dashboard Logística', 'supervisores', 'Permite ver dashboard logística'),
('ver_dashboard_bodega', 'Ver Dashboard Bodega', 'supervisores', 'Permite ver dashboard bodega'),
('ver_dashboard_calidad', 'Ver Dashboard Calidad', 'supervisores', 'Permite ver dashboard calidad'),
('ver_dashboard_sac', 'Ver Dashboard SAC', 'supervisores', 'Permite ver dashboard SAC')
ON CONFLICT (codigo) DO NOTHING;

-- Asignar permisos de mostrador al rol mostrador
INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'mostrador', id FROM permisos WHERE modulo = 'mostrador'
ON CONFLICT DO NOTHING;

-- Asignar permisos de logística al rol logistica
INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'logistica', id FROM permisos WHERE modulo = 'logistica'
ON CONFLICT DO NOTHING;

-- Asignar permisos de taller al rol taller (solo vista básica)
INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'taller', id FROM permisos WHERE codigo IN ('ver_asignaciones', 'ver_mis_asignaciones', 'ver_incidentes')
ON CONFLICT DO NOTHING;

-- Asignar permisos de taller completos al jefe_taller
INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'jefe_taller', id FROM permisos WHERE modulo = 'taller'
ON CONFLICT DO NOTHING;

-- Asignar permisos de bodega al rol bodega
INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'bodega', id FROM permisos WHERE modulo = 'bodega'
ON CONFLICT DO NOTHING;

-- Asignar permisos de SAC al rol sac
INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'sac', id FROM permisos WHERE modulo = 'sac'
ON CONFLICT DO NOTHING;

-- Asignar permisos de calidad al rol control_calidad
INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'control_calidad', id FROM permisos WHERE modulo = 'calidad'
ON CONFLICT DO NOTHING;

-- Asignar permisos de técnico (solo sus asignaciones)
INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'tecnico', id FROM permisos WHERE codigo IN ('ver_mis_asignaciones', 'ver_incidentes')
ON CONFLICT DO NOTHING;

-- Asignar permisos de supervisores
INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'supervisor_sac', id FROM permisos WHERE codigo IN ('ver_dashboard_sac', 'ver_incidentes_sac', 'ver_existencias')
ON CONFLICT DO NOTHING;

INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'jefe_logistica', id FROM permisos WHERE codigo IN ('ver_dashboard_logistica') OR modulo = 'logistica'
ON CONFLICT DO NOTHING;

INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'jefe_bodega', id FROM permisos WHERE codigo IN ('ver_dashboard_bodega') OR modulo = 'bodega'
ON CONFLICT DO NOTHING;

INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'supervisor_bodega', id FROM permisos WHERE codigo IN ('ver_dashboard_bodega') OR modulo = 'bodega'
ON CONFLICT DO NOTHING;

INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'supervisor_calidad', id FROM permisos WHERE codigo IN ('ver_dashboard_calidad') OR modulo = 'calidad'
ON CONFLICT DO NOTHING;

-- Asignar permisos de gerencia
INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'gerente_centro', id FROM permisos WHERE modulo = 'gerencia'
ON CONFLICT DO NOTHING;

INSERT INTO permisos_roles (rol, permiso_id)
SELECT 'supervisor_regional', id FROM permisos WHERE modulo = 'gerencia' OR modulo = 'supervisores'
ON CONFLICT DO NOTHING;