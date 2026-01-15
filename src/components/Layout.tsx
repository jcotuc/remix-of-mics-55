import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NotificationBadge } from "./NotificationBadge";
import { FloatingIncidentsWidget } from "./FloatingIncidentsWidget";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: LayoutProps) {
  const { isMobile, toggleSidebar, state, setOpen } = useSidebar();
  const isOpen = state === "expanded";

  const handleMainClick = () => {
    if (isOpen && !isMobile) {
      setOpen(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full min-w-0" onClick={handleMainClick}>
      {/* Header responsive con mejor UX móvil */}
      <header 
        className="h-12 sm:h-14 md:h-16 border-b border-border bg-secondary flex items-center px-2 sm:px-4 md:px-6 shadow-md sticky top-0 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de menú móvil más prominente */}
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2 h-9 w-9 text-secondary-foreground hover:bg-secondary-foreground/10"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        ) : (
          <SidebarTrigger className="mr-2 sm:mr-4 text-secondary-foreground hover:bg-secondary-foreground/10" />
        )}
        
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-xs sm:text-sm">CS</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-secondary-foreground truncate">
              Sistema de Gestión
            </h1>
            <p className="text-[10px] sm:text-xs text-secondary-foreground/70 hidden sm:block">
              Centro de Servicio
            </p>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="ml-auto text-secondary-foreground">
          <NotificationBadge />
        </div>
      </header>
      
      <main className="flex-1 p-2 sm:p-4 md:p-6 bg-muted/30 overflow-x-hidden">
        {children}
      </main>
      
      {/* Widget flotante de incidentes activos para técnicos */}
      <FloatingIncidentsWidget />
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <LayoutContent>{children}</LayoutContent>
      </div>
    </SidebarProvider>
  );
}