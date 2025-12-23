import { Users, Package, Wrench, FileText, Truck, LogOut, Home, ShoppingCart, DollarSign, ClipboardList, BarChart3, ClipboardCheck, FileSpreadsheet, LogIn, LogOut as LogOutIcon, Send, PackageCheck, AlertTriangle, AlertCircle, MapPin, Calendar, Settings, CheckCircle2, Network, RefreshCw, FolderTree, ListChecks, History, FileUp, Shield } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermisos, RUTAS_PERMISOS, MENU_PERMISOS } from "@/hooks/usePermisos";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type MenuItem = {
  title: string;
  url: string;
  icon: any;
};

// Menús organizados por área
const menuAreas = {
  home: [
    { title: "Dashboard", url: "/", icon: Home }
  ],
  mostrador: [
    { title: "Clientes", url: "/mostrador/clientes", icon: Users },
    { title: "Repuestos", url: "/mostrador/repuestos", icon: Wrench },
    { title: "Consulta Precios", url: "/mostrador/consulta-precios", icon: DollarSign },
    { title: "Incidentes", url: "/mostrador/incidentes", icon: FileText },
    { title: "Herramientas Manuales", url: "/mostrador/herramientas-manuales", icon: Settings },
    { title: "Entrega de Máquinas", url: "/mostrador/entrega-maquinas", icon: PackageCheck },
  ],
  logistica: [
    { title: "Clientes", url: "/logistica/clientes", icon: Users },
    { title: "Embarques", url: "/logistica/embarques", icon: Truck },
    { title: "Garantías Manuales", url: "/logistica/garantias-manuales", icon: Wrench },
    { title: "Guías", url: "/logistica/guias", icon: FileSpreadsheet },
    { title: "Ingreso de Máquinas", url: "/logistica/ingreso-maquinas", icon: LogIn },
    { title: "Salida de Máquinas", url: "/logistica/salida-maquinas", icon: Send },
    { title: "Faltante de Accesorios", url: "/logistica/faltante-accesorios", icon: AlertTriangle },
    { title: "Máquinas Nuevas RT", url: "/logistica/maquinas-nuevas-rt", icon: PackageCheck },
    { title: "Daños por Transporte", url: "/logistica/danos-transporte", icon: AlertCircle },
    { title: "Consulta de Precios", url: "/logistica/consulta-precios", icon: DollarSign },
    { title: "Consulta de Ubicaciones", url: "/logistica/consulta-ubicaciones", icon: MapPin },
  ],
  taller: [
    { title: "Cola de reparación", url: "/taller/asignaciones", icon: Wrench },
    { title: "Mis diagnósticos", url: "/taller/mis-asignaciones", icon: ClipboardList },
    { title: "Búsqueda Incidentes", url: "/taller/busqueda-incidentes", icon: FileText },
  ],
  jefeTaller: [
    { title: "Dashboard Jefe", url: "/taller/dashboard-jefe", icon: BarChart3 },
    { title: "Pendientes Repuestos", url: "/taller/pendientes-repuestos", icon: AlertTriangle },
    { title: "Asignación Técnicos", url: "/taller/asignacion-tecnicos", icon: Users },
    { title: "Config. Colas FIFO", url: "/taller/configuracion-colas", icon: Settings },
    { title: "Reasignaciones", url: "/taller/reasignaciones", icon: RefreshCw },
    { title: "Transferencias", url: "/taller/transferencias", icon: Truck },
  ],
  bodega: [
    { title: "Inventario", url: "/bodega/inventario", icon: ClipboardCheck },
    { title: "Reubicación", url: "/bodega/reubicacion-repuestos", icon: MapPin },
    { title: "Relaciones Repuestos", url: "/bodega/relaciones-repuestos", icon: Network },
    { title: "Inventario Cíclico", url: "/bodega/inventario-ciclico", icon: Calendar },
    { title: "Consulta Cardex", url: "/bodega/consulta-cardex", icon: FileText },
    { title: "Gestión Ubicaciones", url: "/bodega/ubicaciones", icon: MapPin },
    { title: "Docs Pendientes", url: "/bodega/documentos-pendientes", icon: AlertCircle },
    { title: "Docs Ubicación", url: "/bodega/documentos-ubicacion", icon: FileText },
    { title: "Ingresos", url: "/bodega/ingresos-inventario", icon: LogIn },
    { title: "Salidas", url: "/bodega/salidas-inventario", icon: LogOutIcon },
    { title: "Despieces", url: "/bodega/despieces", icon: Wrench },
    { title: "Solicitudes", url: "/bodega/solicitudes", icon: ShoppingCart },
    { title: "Despachos Dpto", url: "/bodega/despachos", icon: Truck },
    { title: "Importación", url: "/bodega/importacion", icon: Package },
    { title: "Análisis ABC-XYZ", url: "/bodega/analisis-abc-xyz", icon: BarChart3 },
  ],
  sac: [
    { title: "Incidentes", url: "/sac/incidentes", icon: FileText },
    { title: "Consulta Existencias", url: "/sac/consulta-existencias", icon: Package },
  ],
  calidad: [
    { title: "Dashboard", url: "/calidad", icon: BarChart3 },
    { title: "Reincidencias", url: "/calidad/reincidencias", icon: RefreshCw },
    { title: "Auditorías", url: "/calidad/auditorias", icon: ClipboardCheck },
    { title: "Análisis de Defectos", url: "/calidad/defectos", icon: AlertCircle },
  ],
  admin: [
    { title: "Gestión de Usuarios", url: "/admin/usuarios", icon: Settings },
    { title: "Gestión de Productos", url: "/admin/productos", icon: Package },
    { title: "Familias Productos", url: "/admin/familias-productos", icon: FolderTree },
    { title: "Fallas y Causas", url: "/admin/fallas-causas", icon: ListChecks },
    { title: "Sustitutos Repuestos", url: "/admin/sustitutos-repuestos", icon: Network },
    { title: "Importar Despieces", url: "/admin/importar-despieces", icon: FileUp },
    { title: "Inventario Admin", url: "/admin/inventario", icon: ClipboardCheck },
    { title: "Centros de Servicio", url: "/admin/centros-servicio", icon: MapPin },
    { title: "Recomendaciones", url: "/admin/recomendaciones-familias", icon: FileText },
    { title: "Gestión de Permisos", url: "/admin/permisos", icon: Shield },
    { title: "Historial de Cambios", url: "/admin/audit-logs", icon: History },
  ],
  asesor: [
    { title: "Mis Garantías", url: "/mis-garantias", icon: Wrench },
  ],
  gerencia: [
    { title: "Dashboard Gerente", url: "/gerencia/dashboard", icon: BarChart3 },
    { title: "Dashboard Regional", url: "/gerencia/regional", icon: BarChart3 },
    { title: "Aprobaciones Garantía", url: "/gerencia/aprobaciones-garantia", icon: CheckCircle2 },
  ],
  supervisores: [
    { title: "Supervisor SAC", url: "/sac/dashboard-supervisor", icon: BarChart3 },
    { title: "Jefe Taller", url: "/taller/dashboard-jefe", icon: BarChart3 },
    { title: "Jefe Logística", url: "/logistica/dashboard-jefe", icon: BarChart3 },
    { title: "Jefe Bodega", url: "/bodega/dashboard-jefe", icon: BarChart3 },
    { title: "Supervisor Bodega", url: "/bodega/dashboard-supervisor", icon: BarChart3 },
    { title: "Supervisor Calidad", url: "/calidad/dashboard-supervisor", icon: BarChart3 },
  ]
};

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed" && !isMobile;
  const { userRole, signOut } = useAuth();
  const { tienePermiso, tieneAlgunPermiso, loading: permisosLoading } = usePermisos();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium" 
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  // Filtrar items del menú según permisos
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    if (userRole === 'admin') return items;
    return items.filter(item => {
      const permisoRequerido = RUTAS_PERMISOS[item.url];
      if (!permisoRequerido) return true;
      return tienePermiso(permisoRequerido);
    });
  };

  // Verificar si el usuario tiene acceso a algún item del menú
  const tieneAccesoMenu = (menuKey: string): boolean => {
    if (userRole === 'admin') return true;
    const permisosMenu = MENU_PERMISOS[menuKey];
    if (!permisosMenu) return true;
    return tieneAlgunPermiso(permisosMenu);
  };

  const renderMenuSection = (title: string, items: MenuItem[], menuKey?: string) => {
    const filteredItems = filterMenuItems(items);
    if (filteredItems.length === 0) return null;
    
    return (
      <SidebarGroup key={title}>
        <SidebarGroupLabel className={`text-sidebar-foreground font-semibold text-xs ${isCollapsed ? "sr-only" : ""}`}>
          {title}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filteredItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={isCollapsed ? item.title : undefined}>
                  <NavLink 
                    to={item.url} 
                    className={getNavCls} 
                    end={item.url === "/"}
                    onClick={handleNavClick}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-card">
        {/* Logo y branding responsive */}
        <div className="p-3 sm:p-4 border-b border-border bg-gradient-to-r from-secondary to-secondary/90">
          {!isCollapsed ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary rounded-lg flex items-center justify-center shadow-lg shrink-0">
                  <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                </div>
                <h2 className="font-bold text-sm sm:text-base text-secondary-foreground truncate">
                  Centro de Servicio
                </h2>
              </div>
              {userRole && (
                <div className="ml-10 sm:ml-11">
                  <span className="text-[10px] sm:text-xs font-medium text-secondary-foreground/80 uppercase tracking-wider px-1.5 sm:px-2 py-0.5 sm:py-1 bg-secondary-foreground/10 rounded">
                    {userRole === 'mostrador' && 'Mostrador'}
                    {userRole === 'logistica' && 'Logística'}
                    {userRole === 'taller' && 'Taller'}
                    {userRole === 'bodega' && 'Bodega'}
                    {userRole === 'sac' && 'SAC'}
                    {userRole === 'control_calidad' && 'Control de Calidad'}
                    {userRole === 'asesor' && 'Asesor'}
                    {userRole === 'admin' && 'Administrador'}
                    {userRole === 'tecnico' && 'Técnico'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto shadow-lg">
              <Wrench className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>
        
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          {/* Home siempre visible */}
          {renderMenuSection("Home", menuAreas.home)}
          
          {/* Secciones filtradas por permisos */}
          {tieneAccesoMenu('mostrador') && renderMenuSection("Mostrador", menuAreas.mostrador, 'mostrador')}
          {tieneAccesoMenu('logistica') && renderMenuSection("Logística", menuAreas.logistica, 'logistica')}
          {tieneAccesoMenu('taller') && renderMenuSection("Taller", menuAreas.taller, 'taller')}
          {(userRole === "jefe_taller" || userRole === "admin" || tieneAccesoMenu('jefeTaller')) && 
            renderMenuSection("Jefe Taller", menuAreas.jefeTaller, 'jefeTaller')}
          {tieneAccesoMenu('bodega') && renderMenuSection("Bodega", menuAreas.bodega, 'bodega')}
          {tieneAccesoMenu('sac') && renderMenuSection("SAC", menuAreas.sac, 'sac')}
          {tieneAccesoMenu('calidad') && renderMenuSection("Calidad", menuAreas.calidad, 'calidad')}
          {userRole === "asesor" && renderMenuSection("Asesor", menuAreas.asesor)}
          {(userRole === "gerente_centro" || userRole === "supervisor_regional" || userRole === "admin" || tieneAccesoMenu('gerencia')) && 
            renderMenuSection("Gerencia", menuAreas.gerencia, 'gerencia')}
          {(["supervisor_sac", "jefe_taller", "jefe_logistica", "jefe_bodega", "supervisor_bodega", "supervisor_calidad"].includes(userRole || "") || userRole === "admin" || tieneAccesoMenu('supervisores')) && 
            renderMenuSection("Supervisores", menuAreas.supervisores, 'supervisores')}
          {userRole === "admin" && renderMenuSection("Administración", menuAreas.admin)}
        </div>

        <div className="mt-auto p-2 sm:p-3 border-t border-border bg-muted/50">
          <Button
            variant="ghost"
            className={`w-full gap-2 text-xs sm:text-sm hover:bg-destructive/10 hover:text-destructive ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
            onClick={() => {
              if (isMobile) setOpenMobile(false);
              signOut();
            }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}