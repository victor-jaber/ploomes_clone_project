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
  onLogin: (user: { id: string; name: string; email: string }, token: string) => void;
}

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      <div className="login-sparkle" style={{ top: '20%', left: '25%', animationDelay: '0s' }} />
      <div className="login-sparkle" style={{ top: '40%', right: '20%', animationDelay: '2s' }} />
      <div className="login-sparkle" style={{ bottom: '30%', left: '35%', animationDelay: '4s' }} />
    </div>
  );
}

function HermesIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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

          <div className="flex items-center gap-3 mb-10">
            <div className="login-logo-ring">
              <HermesIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight" data-testid="text-brand-name">
                Hermes
              </h1>
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/35">
                C R M
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-[15px] font-medium text-white/80 mb-0.5" data-testid="text-login-title">
              Bem-vindo de volta
            </h2>
            <p className="text-xs text-white/35" data-testid="text-login-description">
              Entre com suas credenciais
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-3">
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

              <div className="pt-2">
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

          <p className="text-[10px] text-white/15 text-center mt-6" data-testid="text-footer">
            Sistema interno &middot; Hermes CRM
          </p>
        </div>
      </div>
    </div>
  );
}
