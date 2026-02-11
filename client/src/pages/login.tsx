import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";

const loginFormSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginPageProps {
  onLogin: (user: { id: string; name: string; email: string; papel: string }, token: string) => void;
}

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />
      <div className="login-orb login-orb-4" />
      <div className="login-orb login-orb-5" />

      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <div className="login-sparkle" style={{ top: '15%', left: '20%', animationDelay: '0s' }} />
      <div className="login-sparkle" style={{ top: '35%', right: '15%', animationDelay: '1.5s' }} />
      <div className="login-sparkle" style={{ bottom: '25%', left: '30%', animationDelay: '3s' }} />
      <div className="login-sparkle" style={{ top: '60%', right: '25%', animationDelay: '0.8s' }} />
      <div className="login-sparkle" style={{ top: '80%', left: '15%', animationDelay: '2.2s' }} />
      <div className="login-sparkle" style={{ top: '10%', right: '35%', animationDelay: '4s' }} />
    </div>
  );
}

function HermesIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="loginLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(263 70% 60%)" />
          <stop offset="100%" stopColor="hsl(300 70% 55%)" />
        </linearGradient>
      </defs>
      <g transform="translate(50, 50)">
        <path
          d="M-8 -8 L-25 -20 Q-30 -22 -28 -17 L-18 -5 Q-15 -2 -12 -4 Z"
          fill="url(#loginLogoGrad)" opacity="0.9"
        />
        <path
          d="M-10 -3 L-32 -8 Q-38 -9 -35 -4 L-18 3 Q-14 5 -12 2 Z"
          fill="url(#loginLogoGrad)" opacity="0.8"
        />
        <path
          d="M-10 5 L-30 8 Q-36 10 -32 14 L-15 10 Q-11 9 -10 5 Z"
          fill="url(#loginLogoGrad)" opacity="0.65"
        />
        <path
          d="M8 -8 L25 -20 Q30 -22 28 -17 L18 -5 Q15 -2 12 -4 Z"
          fill="url(#loginLogoGrad)" opacity="0.9"
        />
        <path
          d="M10 -3 L32 -8 Q38 -9 35 -4 L18 3 Q14 5 12 2 Z"
          fill="url(#loginLogoGrad)" opacity="0.8"
        />
        <path
          d="M10 5 L30 8 Q36 10 32 14 L15 10 Q11 9 10 5 Z"
          fill="url(#loginLogoGrad)" opacity="0.65"
        />
        <circle cx="0" cy="0" r="16" fill="url(#loginLogoGrad)" opacity="0.12" />
        <text
          x="0" y="7"
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
          fill="url(#loginLogoGrad)"
        >
          H
        </text>
      </g>
    </svg>
  );
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      senha: "",
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
    <div className="login-page-root">
      <FloatingOrbs />

      <div
        className={`login-card-wrapper ${mounted ? 'login-card-visible' : 'login-card-hidden'}`}
      >
        <div className="login-card">
          <div className="login-card-glow" />

          <div className="flex flex-col items-center mb-8">
            <div className="login-logo-ring mb-5">
              <HermesIcon />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight" data-testid="text-brand-name">
              Hermes
            </h1>
            <span className="text-xs tracking-[0.3em] uppercase text-white/40 mt-1">
              CRM
            </span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-lg font-semibold text-white/90 mb-1" data-testid="text-login-title">
              Bem-vindo de volta
            </h2>
            <p className="text-sm text-white/40" data-testid="text-login-description">
              Entre com suas credenciais para continuar
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="login-input-wrapper">
                        <Mail className="login-input-icon" />
                        <Input
                          placeholder="seu@email.com"
                          type="email"
                          autoComplete="email"
                          className="login-input"
                          data-testid="input-login-email"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs pl-1" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="login-input-wrapper">
                        <Lock className="login-input-icon" />
                        <Input
                          placeholder="Sua senha"
                          type="password"
                          autoComplete="current-password"
                          className="login-input"
                          data-testid="input-login-password"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs pl-1" />
                  </FormItem>
                )}
              />

              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="login-submit-btn w-full"
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <span>Entrar</span>
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>

          <p className="text-[11px] text-white/20 text-center mt-8" data-testid="text-footer">
            Sistema Interno Artemis &middot; Hermes CRM
          </p>
        </div>
      </div>
    </div>
  );
}
