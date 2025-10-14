import { Users, Package, Wrench, FileText, Truck, LogOut, Home, ShoppingCart, DollarSign, ClipboardList, BarChart3, ClipboardCheck, FileSpreadsheet, LogIn, LogOut as LogOutIcon, Send } from "lucide-react";
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
  ],
  logistica: [
    { title: "Embarques", url: "/logistica/embarques", icon: Truck },
    { title: "Herramientas Manuales", url: "/logistica/herramientas-manuales", icon: Wrench },
    { title: "Guías", url: "/logistica/guias", icon: FileSpreadsheet },
    { title: "Ingreso de Máquinas", url: "/logistica/ingreso-maquinas", icon: LogIn },
    { title: "Salida de Máquinas", url: "/logistica/salida-maquinas", icon: Send },
  ],
  taller: [
    { title: "Asignaciones", url: "/taller/asignaciones", icon: Wrench },
    { title: "Mis Asignaciones", url: "/taller/mis-asignaciones", icon: ClipboardList },
    { title: "Búsqueda Incidentes", url: "/taller/busqueda-incidentes", icon: FileText },
  ],
  bodega: [
    { title: "Importación", url: "/bodega/importacion", icon: Package },
    { title: "Despachos Dpto", url: "/bodega/despachos", icon: Truck },
    { title: "Stock Dpto (ABC)", url: "/bodega/stock-departamento", icon: BarChart3 },
    { title: "Inventario", url: "/bodega/inventario", icon: ClipboardCheck },
    { title: "Solicitudes", url: "/bodega/solicitudes", icon: ShoppingCart },
  ],
  sac: [
    { title: "Incidentes", url: "/sac/incidentes", icon: FileText },
    { title: "Consulta Existencias", url: "/sac/consulta-existencias", icon: Package },
  ]
};

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const { userRole, signOut } = useAuth();

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium" 
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  const renderMenuSection = (title: string, items: MenuItem[]) => (
    <SidebarGroup key={title}>
      <SidebarGroupLabel className={`text-sidebar-foreground font-semibold ${isCollapsed ? "sr-only" : ""}`}>
        {title}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink to={item.url} className={getNavCls} end={item.url === "/"}>
                  <item.icon className="h-4 w-4" />
                  {!isCollapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-card border-r-2 border-border">
        {/* Logo y branding con colores corporativos */}
        <div className="p-4 border-b border-border bg-gradient-to-r from-secondary to-secondary/90">
          {!isCollapsed ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-lg">
                  <Wrench className="h-5 w-5 text-primary-foreground" />
                </div>
                <h2 className="font-bold text-base text-secondary-foreground">
                  Centro de Servicio
                </h2>
              </div>
              {userRole && (
                <div className="ml-11">
                  <span className="text-xs font-medium text-secondary-foreground/80 uppercase tracking-wider px-2 py-1 bg-secondary-foreground/10 rounded">
                    {userRole === 'mostrador' && 'Mostrador'}
                    {userRole === 'logistica' && 'Logística'}
                    {userRole === 'taller' && 'Taller'}
                    {userRole === 'bodega' && 'Bodega'}
                    {userRole === 'sac' && 'SAC'}
                    {userRole === 'admin' && 'Administrador'}
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
        
        {/* Mostrar todas las secciones para desarrollo */}
        {renderMenuSection("Home", menuAreas.home)}
        {renderMenuSection("Mostrador", menuAreas.mostrador)}
        {renderMenuSection("Logística", menuAreas.logistica)}
        {renderMenuSection("Taller", menuAreas.taller)}
        {renderMenuSection("Bodega", menuAreas.bodega)}
        {renderMenuSection("SAC", menuAreas.sac)}

        <div className="mt-auto p-4 border-t border-border bg-muted/50">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 hover:bg-destructive/10 hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}