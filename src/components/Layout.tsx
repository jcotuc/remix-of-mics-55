import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header con azul oscuro corporativo */}
          <header className="h-16 border-b border-border bg-secondary flex items-center px-6 shadow-md">
            <SidebarTrigger className="mr-4 text-secondary-foreground hover:bg-secondary-foreground/10" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">CS</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-secondary-foreground">
                  Sistema de Gestión
                </h1>
                <p className="text-xs text-secondary-foreground/70">Centro de Servicio</p>
              </div>
            </div>
          </header>
          
          <main className="flex-1 p-6 bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}