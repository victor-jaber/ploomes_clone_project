import { useState, useEffect, useRef } from "react";
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

function HermesIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  };

  const parallaxStyle = (depth: number) => ({
    transform: `translate(${(mousePos.x - 0.5) * depth * 40}px, ${(mousePos.y - 0.5) * depth * 40}px)`,
    transition: 'transform 0.3s ease-out',
  });

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
    >
      <style>{`
        @keyframes wingFloat {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes featherWave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 30px rgba(251,191,36,0.3)) drop-shadow(0 0 60px rgba(168,85,247,0.2)); }
          50% { filter: drop-shadow(0 0 50px rgba(251,191,36,0.5)) drop-shadow(0 0 80px rgba(168,85,247,0.3)); }
        }
        @keyframes shimmer {
          0% { opacity: 0.3; }
          50% { opacity: 0.8; }
          100% { opacity: 0.3; }
        }
        @keyframes particleRise {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.8; }
          100% { transform: translateY(-200px) translateX(30px) scale(0); opacity: 0; }
        }
      `}</style>

      <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-400/20 via-yellow-300/10 to-transparent blur-3xl" style={{ ...parallaxStyle(-0.3), top: '-10%', right: '-10%' }} />
      <div className="absolute w-96 h-96 rounded-full bg-purple-500/15 blur-3xl" style={{ ...parallaxStyle(-0.4), bottom: '5%', left: '5%' }} />
      <div className="absolute w-64 h-64 rounded-full bg-pink-500/10 blur-2xl" style={{ ...parallaxStyle(-0.2), top: '40%', left: '20%' }} />

      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-amber-300/60"
            style={{
              left: `${40 + Math.random() * 30}%`,
              bottom: `${10 + Math.random() * 30}%`,
              animation: `particleRise ${4 + Math.random() * 3}s ease-out infinite ${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div 
        className="relative z-10"
        style={{ 
          ...parallaxStyle(0.5),
          animation: 'wingFloat 5s ease-in-out infinite',
        }}
      >
        <svg 
          viewBox="0 0 500 400" 
          className="w-[420px] h-[340px] md:w-[500px] md:h-[400px]"
          style={{ animation: 'glowPulse 4s ease-in-out infinite' }}
        >
          <defs>
            <linearGradient id="wingBase" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="30%" stopColor="#fcd34d" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="wingHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#fef3c7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="wingEdge" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#78350f" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#451a03" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="featherGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="40%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <filter id="softShadow">
              <feDropShadow dx="5" dy="8" stdDeviation="8" floodColor="#78350f" floodOpacity="0.3"/>
            </filter>
            <filter id="innerGlow">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <g transform="translate(100, 200)" filter="url(#softShadow)">
            <path 
              d="M0,0 
                 C30,-20 80,-60 150,-90
                 C200,-110 280,-130 380,-120
                 C340,-100 300,-85 260,-75
                 C220,-65 180,-60 150,-50
                 C180,-45 230,-35 290,-20
                 C340,-8 380,5 400,20
                 C350,15 300,8 250,5
                 C200,2 160,5 130,15
                 C160,25 200,40 250,55
                 C290,68 330,80 360,95
                 C310,88 260,78 210,70
                 C160,62 120,60 90,65
                 C110,78 140,95 175,115
                 C205,132 235,148 260,165
                 C220,155 175,140 135,125
                 C95,110 60,100 35,95
                 C45,105 60,120 80,140
                 C95,155 110,170 120,185
                 C90,175 60,160 35,145
                 C15,132 0,120 -10,110
                 L0,0 Z"
              fill="url(#wingBase)"
            />

            <g style={{ animation: 'featherWave 3s ease-in-out infinite' }}>
              <path d="M150,-90 C200,-108 270,-125 370,-115" fill="none" stroke="url(#wingHighlight)" strokeWidth="12" strokeLinecap="round" opacity="0.7" />
            </g>
            <g style={{ animation: 'featherWave 3s ease-in-out infinite 0.3s' }}>
              <path d="M130,-50 C180,-42 240,-30 380,15" fill="none" stroke="url(#wingHighlight)" strokeWidth="10" strokeLinecap="round" opacity="0.6" />
            </g>
            <g style={{ animation: 'featherWave 3s ease-in-out infinite 0.6s' }}>
              <path d="M90,65 C140,72 200,82 350,92" fill="none" stroke="url(#wingHighlight)" strokeWidth="8" strokeLinecap="round" opacity="0.5" />
            </g>
            <g style={{ animation: 'featherWave 3s ease-in-out infinite 0.9s' }}>
              <path d="M35,95 C70,108 120,130 255,162" fill="none" stroke="url(#wingHighlight)" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
            </g>

            <path 
              d="M0,0 C30,-18 75,-55 145,-85"
              fill="none" stroke="url(#wingEdge)" strokeWidth="3"
            />
            <path 
              d="M0,0 C25,30 45,70 80,130"
              fill="none" stroke="url(#wingEdge)" strokeWidth="2" opacity="0.5"
            />

            {[...Array(8)].map((_, i) => (
              <ellipse
                key={i}
                cx={80 + i * 35}
                cy={-60 + i * 25 + Math.sin(i) * 10}
                rx="3"
                ry="2"
                fill="white"
                opacity="0.6"
                style={{ animation: `shimmer ${2 + i * 0.3}s ease-in-out infinite ${i * 0.2}s` }}
              />
            ))}

            <ellipse cx="0" cy="0" rx="25" ry="35" fill="url(#wingBase)" />
            <ellipse cx="-5" cy="-5" rx="12" ry="18" fill="url(#wingHighlight)" opacity="0.5" />
          </g>
        </svg>
      </div>

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center z-20" style={parallaxStyle(0.2)}>
        <h2 className="text-white text-2xl md:text-3xl font-extralight tracking-[0.3em] uppercase">
          Hermes
        </h2>
        <p className="text-white/50 text-sm mt-3 tracking-wider">
          Velocidade e conexão para seus negócios
        </p>
      </div>
    </div>
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
          <div className="flex items-center gap-2 mb-12">
            <HermesLogo size={48} className="text-primary" />
            <span className="font-bold text-2xl" data-testid="text-brand-name">Hermes</span>
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

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 items-center justify-center relative overflow-hidden">
        <HermesIllustration />
      </div>
    </div>
  );
}
