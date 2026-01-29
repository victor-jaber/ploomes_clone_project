import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { HermesLogo } from "@/components/hermes-logo";

const loginFormSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginPageProps {
  onLogin: (user: { id: string; name: string; email: string }, token: string) => void;
}

function LoginIllustration() {
  return (
    <svg viewBox="0 0 500 400" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="380" cy="320" rx="100" ry="30" fill="white" fillOpacity="0.1" />
      
      <g opacity="0.3">
        <ellipse cx="100" cy="80" rx="60" ry="25" fill="white" />
        <ellipse cx="80" cy="75" rx="40" ry="18" fill="white" />
        <ellipse cx="130" cy="85" rx="35" ry="15" fill="white" />
      </g>
      <g opacity="0.25">
        <ellipse cx="420" cy="120" rx="55" ry="22" fill="white" />
        <ellipse cx="400" cy="115" rx="35" ry="15" fill="white" />
        <ellipse cx="450" cy="125" rx="30" ry="12" fill="white" />
      </g>
      <g opacity="0.2">
        <ellipse cx="80" cy="280" rx="50" ry="20" fill="white" />
        <ellipse cx="60" cy="275" rx="30" ry="12" fill="white" />
        <ellipse cx="110" cy="285" rx="25" ry="10" fill="white" />
      </g>
      
      <rect x="180" y="80" width="140" height="240" rx="20" fill="white" fillOpacity="0.95" />
      <rect x="190" y="100" width="120" height="200" rx="12" fill="url(#screenGradient)" />
      
      <circle cx="250" cy="200" r="45" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="3" />
      <circle cx="250" cy="200" r="30" fill="white" fillOpacity="0.1" />
      <path d="M235 200 L245 210 L265 190" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      
      <circle cx="250" cy="200" r="55" fill="none" stroke="white" strokeWidth="2" strokeDasharray="8 6" opacity="0.5">
        <animateTransform attributeName="transform" type="rotate" from="0 250 200" to="360 250 200" dur="20s" repeatCount="indefinite" />
      </circle>
      
      <g transform="translate(380, 180)">
        <rect x="-25" y="-25" width="50" height="50" rx="10" fill="white" fillOpacity="0.9" />
        <circle cx="0" cy="-5" r="8" fill="none" stroke="#6366f1" strokeWidth="2.5" />
        <rect x="-3" y="5" width="6" height="12" rx="2" fill="#6366f1" />
      </g>
      
      <g transform="translate(120, 160)">
        <circle cx="0" cy="0" r="25" fill="white" fillOpacity="0.9" />
        <path d="M-8 0 L-2 6 L10 -6" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      
      <circle cx="320" cy="100" r="8" fill="white" fillOpacity="0.6" />
      <circle cx="150" cy="220" r="6" fill="white" fillOpacity="0.5" />
      <circle cx="400" cy="260" r="10" fill="white" fillOpacity="0.4" />
      <circle cx="100" cy="140" r="5" fill="white" fillOpacity="0.5" />
      
      <defs>
        <linearGradient id="screenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
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
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-12 bg-background">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HermesLogo size={28} />
            </div>
            <span className="font-bold text-xl" data-testid="text-brand-name">Hermes</span>
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3" data-testid="text-login-title">
              Olá,<br />Bem-vindo de volta
            </h1>
            <p className="text-muted-foreground" data-testid="text-login-description">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">E-mail</FormLabel>
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
                    <FormLabel className="sr-only">Senha</FormLabel>
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

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="px-8" 
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
              </div>
            </form>
          </Form>

          <p className="text-sm text-muted-foreground mt-12" data-testid="text-footer">
            Sistema interno &middot; Hermes CRM
          </p>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-32 h-32 bg-white/20 rounded-full blur-xl" />
          <div className="absolute bottom-32 right-20 w-40 h-40 bg-white/15 rounded-full blur-2xl" />
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
        </div>
        
        <div className="relative w-full max-w-lg">
          <LoginIllustration />
        </div>
      </div>
    </div>
  );
}
