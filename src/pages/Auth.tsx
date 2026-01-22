import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { apiBackendAction } from "@/lib/api-backend";
import { isDevBypassEnabled } from "@/config/devBypassAuth";

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");

  useEffect(() => {
    let mounted = true;
    if (isDevBypassEnabled()) {
      navigate("/");
      return () => {
        mounted = false;
      };
    }
    
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      if (error) {
        await supabase.auth.signOut({ scope: "local" });
      }
      if (data.session) {
        navigate("/");
      }
    });
    
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          toast.error("Credenciales inválidas");
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Verificar que el usuario exista/mapee en la tabla interna `usuarios`
      // (la app depende de centro_de_servicio_id, permisos, etc.)
      if (data.user?.email) {
        const { result: usuario } = await apiBackendAction("usuarios.getByEmail", {
          email: data.user.email,
        });

        if (!usuario) {
          await supabase.auth.signOut();
          toast.error("Tu usuario no está habilitado en el sistema.");
          return;
        }
      }

      toast.success("¡Sesión iniciada!");
      navigate("/");
    } catch (error) {
      toast.error("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Por ahora: el alta de usuarios se gestiona desde administración.
      // (evita crear usuarios sin registro en la tabla `usuarios`)
      toast.info("El registro está deshabilitado. Solicita acceso a administración.");
    } catch (error) {
      toast.error("Error al crear cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-3 sm:p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center p-4 sm:p-6">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-full flex items-center justify-center">
              <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">Centro de Servicio</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Accede a tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="text-xs sm:text-sm">
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-xs sm:text-sm">
                Registrarse
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Iniciando..." : "Iniciar Sesión"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido">Apellido</Label>
                    <Input id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creando..." : "Crear Cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
