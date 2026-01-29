import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap, BarChart3, Users, FileText } from "lucide-react";

interface LoginPageProps {
  onLogin: (user: { id: string; name: string; email: string }, token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Falha ao fazer login");
      }

      onLogin(data.user, data.token);
      toast({ title: "Bem-vindo!", description: `Olá, ${data.user.name}!` });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Falha ao registrar");
      }

      onLogin(data.user, data.token);
      toast({ title: "Conta criada!", description: `Bem-vindo ao Hermes, ${data.user.name}!` });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a conta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur text-white font-bold text-2xl">
              H
            </div>
            <span className="font-bold text-3xl">Hermes</span>
          </div>

          <h1 className="text-4xl font-bold mb-6 leading-tight">
            Gerencie seu negócio<br />
            com inteligência
          </h1>
          
          <p className="text-lg text-white/80 mb-12 max-w-md">
            Plataforma completa de CRM para gestão de clientes, vendas e propostas comerciais da sua empresa.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Gestão de Clientes</h3>
                <p className="text-sm text-white/70">Organize todos os seus contatos em um só lugar</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Pipeline Visual</h3>
                <p className="text-sm text-white/70">Acompanhe suas oportunidades de forma visual</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Propostas Comerciais</h3>
                <p className="text-sm text-white/70">Crie e gerencie propostas profissionais</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Produtividade</h3>
                <p className="text-sm text-white/70">Automatize tarefas e economize tempo</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
              H
            </div>
            <span className="font-bold text-2xl">Hermes</span>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center">
                {activeTab === "login" ? "Entrar no sistema" : "Criar conta"}
              </CardTitle>
              <CardDescription className="text-center">
                {activeTab === "login" 
                  ? "Digite suas credenciais para acessar" 
                  : "Preencha os dados para criar sua conta"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" data-testid="tab-login">Entrar</TabsTrigger>
                  <TabsTrigger value="register" data-testid="tab-register">Registrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">E-mail</Label>
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        required
                        data-testid="input-login-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <Input
                        id="login-password"
                        name="password"
                        type="password"
                        placeholder="Sua senha"
                        required
                        data-testid="input-login-password"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg" 
                      disabled={isLoading}
                      data-testid="button-login"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Nome completo</Label>
                      <Input
                        id="register-name"
                        name="name"
                        type="text"
                        placeholder="Seu nome"
                        required
                        data-testid="input-register-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">E-mail</Label>
                      <Input
                        id="register-email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        required
                        data-testid="input-register-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Senha</Label>
                      <Input
                        id="register-password"
                        name="password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                        required
                        data-testid="input-register-password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-confirm">Confirmar senha</Label>
                      <Input
                        id="register-confirm"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirme sua senha"
                        required
                        data-testid="input-register-confirm"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg" 
                      disabled={isLoading}
                      data-testid="button-register"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        "Criar conta"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-center pb-6">
              <p className="text-sm text-muted-foreground">
                Sistema interno - Hermes CRM
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
