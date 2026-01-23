import { Users, Package, Wrench, FileText, Truck, LogOut, Home, ShoppingCart, DollarSign, ClipboardList, BarChart3, ClipboardCheck, FileSpreadsheet, LogIn, Send, PackageCheck, AlertTriangle, AlertCircle, MapPin, Settings, CheckCircle2, RefreshCw } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
    { title: "Centro de Despacho", url: "/logistica/salida-maquinas", icon: Truck },
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
    { title: "Waterspider", url: "/taller/waterspider", icon: Truck },
  ],
  jefeTaller: [
    { title: "Pendientes Repuestos", url: "/taller/pendientes-repuestos", icon: AlertTriangle },
    { title: "Asignación Técnicos", url: "/taller/asignacion-tecnicos", icon: Users },
    { title: "Config. Colas FIFO", url: "/taller/configuracion-colas", icon: Settings },
    { title: "Reasignaciones", url: "/taller/reasignaciones", icon: RefreshCw },
    { title: "Transferencias", url: "/taller/transferencias", icon: Truck },
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
    { title: "Jefe Logística", url: "/logistica/dashboard-jefe", icon: BarChart3 },
    { title: "Supervisor Calidad", url: "/calidad/dashboard-supervisor", icon: BarChart3 },
  ]
};

export function AppSidebar() {
  const { state, isMobile, setOpenMobile, setOpen } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed" && !isMobile;
  const { user, userRole, signOut } = useAuth();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium" 
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  const renderMenuSection = (title: string, items: MenuItem[]) => {
    return (
      <SidebarGroup key={title}>
        <SidebarGroupLabel className={`text-sidebar-foreground font-semibold text-xs ${isCollapsed ? "sr-only" : ""}`}>
          {title}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
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
        <div className={`border-b border-border bg-gradient-to-r from-secondary to-secondary/90 ${isCollapsed ? 'p-2 flex justify-center' : 'p-3 sm:p-4'}`}>
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
                <div className="ml-10 sm:ml-11 flex flex-col gap-1">
                  <span className="text-[10px] sm:text-xs font-medium text-secondary-foreground/80 uppercase tracking-wider px-1.5 sm:px-2 py-0.5 bg-secondary-foreground/10 rounded w-fit">
                    {userRole === 'mostrador' && 'Mostrador'}
                    {userRole === 'logistica' && 'Logística'}
                    {userRole === 'taller' && 'Taller'}
                    {userRole === 'sac' && 'SAC'}
                    {userRole === 'control_calidad' && 'Control de Calidad'}
                    {userRole === 'asesor' && 'Asesor'}
                    {userRole === 'admin' && 'Administrador'}
                    {userRole === 'tecnico' && 'Técnico'}
                    {userRole === 'jefe_taller' && 'Jefe Taller'}
                    {userRole === 'jefe_logistica' && 'Jefe Logística'}
                    {userRole === 'supervisor_sac' && 'Supervisor SAC'}
                    {userRole === 'supervisor_calidad' && 'Supervisor Calidad'}
                    {userRole === 'gerente_centro' && 'Gerente Centro'}
                    {userRole === 'supervisor_regional' && 'Supervisor Regional'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg">
              <Wrench className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>
        
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          {/* Home siempre visible */}
          {renderMenuSection("Home", menuAreas.home)}
          
          {/* Show all sections for now - permissions removed temporarily */}
          {renderMenuSection("Mostrador", menuAreas.mostrador)}
          {renderMenuSection("Logística", menuAreas.logistica)}
          {renderMenuSection("Taller", menuAreas.taller)}
          {renderMenuSection("Jefe Taller", menuAreas.jefeTaller)}
          {renderMenuSection("SAC", menuAreas.sac)}
          {renderMenuSection("Calidad", menuAreas.calidad)}
          {userRole === "asesor" && renderMenuSection("Asesor", menuAreas.asesor)}
          {renderMenuSection("Gerencia", menuAreas.gerencia)}
          {renderMenuSection("Supervisores", menuAreas.supervisores)}
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
