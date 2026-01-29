import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, BarChart3, FileText, TrendingUp, Shield, Zap } from "lucide-react";

const loginFormSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginPageProps {
  onLogin: (user: { id: string; name: string; email: string }, token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white rounded-full translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div>
            <div className="flex items-center gap-4 mb-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20 shadow-xl">
                <span className="font-bold text-3xl text-white">H</span>
              </div>
              <div>
                <span className="font-bold text-3xl tracking-tight">Hermes</span>
                <p className="text-white/70 text-sm">Customer Relationship Management</p>
              </div>
            </div>

            <div className="max-w-lg">
              <h1 className="text-5xl font-bold mb-6 leading-tight" data-testid="text-hero-title">
                Gerencie seu negócio com
                <span className="text-white/80"> inteligência</span>
              </h1>
              
              <p className="text-xl text-white/80 mb-12 leading-relaxed" data-testid="text-hero-description">
                Plataforma completa para gestão de clientes, vendas e propostas comerciais da sua empresa.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Gestão de Clientes</h3>
              <p className="text-sm text-white/70">Organize todos os seus contatos e empresas em um só lugar</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 mb-4">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Pipeline Visual</h3>
              <p className="text-sm text-white/70">Acompanhe suas oportunidades de forma visual e intuitiva</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Propostas Comerciais</h3>
              <p className="text-sm text-white/70">Crie e gerencie propostas profissionais com facilidade</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 mb-4">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Análise de Vendas</h3>
              <p className="text-sm text-white/70">Métricas e insights para tomar decisões estratégicas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-2/5 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <span className="font-bold text-2xl">H</span>
            </div>
            <div>
              <span className="font-bold text-2xl">Hermes</span>
              <p className="text-xs text-muted-foreground">CRM</p>
            </div>
          </div>

          <Card className="border-0 shadow-2xl">
            <CardHeader className="space-y-3 pb-8 pt-8 px-8">
              <div className="flex items-center justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Shield className="h-8 w-8" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center" data-testid="text-login-title">
                Bem-vindo de volta
              </CardTitle>
              <CardDescription className="text-center text-base" data-testid="text-login-description">
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="seu@email.com"
                            type="email"
                            data-testid="input-login-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Sua senha"
                            type="password"
                            data-testid="input-login-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar no sistema"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-8 pt-6 border-t">
                <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2" data-testid="badge-secure">
                    <Shield className="h-4 w-4" />
                    <span>Acesso Seguro</span>
                  </div>
                  <div className="flex items-center gap-2" data-testid="badge-performance">
                    <Zap className="h-4 w-4" />
                    <span>Alta Performance</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Sistema interno &middot; Hermes CRM
          </p>
        </div>
      </div>
    </div>
  );
}
