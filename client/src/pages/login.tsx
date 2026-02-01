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
    transform: `translate(${(mousePos.x - 0.5) * depth * 50}px, ${(mousePos.y - 0.5) * depth * 50}px)`,
    transition: 'transform 0.3s ease-out',
  });

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
    >
      <style>{`
        @keyframes hermesFly {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes wingFlutter {
          0%, 100% { transform: rotate(-5deg) scaleY(1); }
          25% { transform: rotate(10deg) scaleY(0.9); }
          50% { transform: rotate(-5deg) scaleY(1); }
          75% { transform: rotate(10deg) scaleY(0.9); }
        }
        @keyframes capeFlow {
          0%, 100% { d: path("M0,0 Q20,30 10,60 Q0,80 -15,100"); }
          50% { d: path("M0,0 Q30,25 15,55 Q5,85 -10,100"); }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(251,191,36,0.4)); }
          50% { filter: drop-shadow(0 0 40px rgba(251,191,36,0.8)); }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes trailFade {
          0% { opacity: 0.6; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-100px); }
        }
      `}</style>

      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `starTwinkle ${2 + Math.random() * 3}s ease-in-out infinite ${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-br from-amber-500/20 to-transparent blur-3xl" style={{ ...parallaxStyle(-0.5), top: '10%', right: '0%' }} />
      <div className="absolute w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" style={{ ...parallaxStyle(-0.3), bottom: '10%', left: '10%' }} />

      <div 
        className="relative z-10"
        style={{ 
          ...parallaxStyle(0.4),
          animation: 'hermesFly 4s ease-in-out infinite',
        }}
      >
        <svg viewBox="0 0 400 500" className="w-80 h-[400px] md:w-96 md:h-[480px]" style={{ animation: 'glowPulse 3s ease-in-out infinite' }}>
          <defs>
            <linearGradient id="skinGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="50%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="tunicWhite" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e5e7eb" />
            </linearGradient>
            <linearGradient id="capeRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="staffGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <g opacity="0.3">
            <ellipse cx="120" cy="200" rx="40" ry="15" fill="url(#skinGold)" style={{ animation: 'trailFade 1s ease-out infinite' }} />
            <ellipse cx="80" cy="220" rx="30" ry="10" fill="url(#skinGold)" style={{ animation: 'trailFade 1s ease-out infinite 0.2s' }} />
            <ellipse cx="50" cy="240" rx="20" ry="8" fill="url(#skinGold)" style={{ animation: 'trailFade 1s ease-out infinite 0.4s' }} />
          </g>

          <g transform="translate(80, 50)">
            <line x1="30" y1="40" x2="0" y2="0" stroke="url(#staffGold)" strokeWidth="6" strokeLinecap="round" filter="url(#glow)" />
            
            <g transform="translate(0, 0)">
              <circle cx="0" cy="-5" r="8" fill="url(#staffGold)" filter="url(#glow)" />
              <g style={{ transformOrigin: '0 -5px', animation: 'wingFlutter 0.6s ease-in-out infinite' }}>
                <path d="M-8,-5 C-20,-15 -30,-10 -35,0 C-25,-5 -15,-8 -8,-5" fill="url(#staffGold)" filter="url(#glow)" />
                <path d="M-8,-8 C-18,-20 -28,-18 -32,-10 C-22,-12 -15,-12 -8,-8" fill="url(#staffGold)" filter="url(#glow)" />
              </g>
              <g style={{ transformOrigin: '0 -5px', animation: 'wingFlutter 0.6s ease-in-out infinite' }}>
                <path d="M8,-5 C20,-15 30,-10 35,0 C25,-5 15,-8 8,-5" fill="url(#staffGold)" filter="url(#glow)" />
                <path d="M8,-8 C18,-20 28,-18 32,-10 C22,-12 15,-12 8,-8" fill="url(#staffGold)" filter="url(#glow)" />
              </g>
              <path d="M-3,5 Q-8,15 -5,25 Q0,20 5,25 Q8,15 3,5" fill="url(#staffGold)" strokeWidth="2" />
              <path d="M-5,25 Q-10,35 -6,45 Q0,38 6,45 Q10,35 5,25" fill="url(#staffGold)" strokeWidth="2" />
            </g>
          </g>

          <g transform="translate(200, 120)">
            <ellipse cx="0" cy="0" rx="28" ry="32" fill="url(#skinGold)" />
            <ellipse cx="-8" cy="-5" rx="4" ry="5" fill="#78350f" opacity="0.6" />
            <ellipse cx="8" cy="-5" rx="4" ry="5" fill="#78350f" opacity="0.6" />
            <path d="M-5,8 Q0,12 5,8" fill="none" stroke="#78350f" strokeWidth="2" opacity="0.5" />
            
            <path d="M-30,-20 Q-35,-40 -20,-50 Q0,-55 20,-50 Q35,-40 30,-20" fill="url(#skinGold)" />
            <path d="M-25,-35 Q-10,-45 0,-45 Q10,-45 25,-35" fill="#92400e" opacity="0.3" />
            
            <g style={{ transformOrigin: '-30px -30px', animation: 'wingFlutter 0.5s ease-in-out infinite' }}>
              <path d="M-28,-25 C-50,-40 -70,-35 -80,-20 C-65,-30 -50,-32 -35,-25" fill="url(#staffGold)" filter="url(#glow)" />
              <path d="M-30,-30 C-55,-50 -75,-45 -85,-30 C-70,-40 -52,-42 -35,-32" fill="url(#staffGold)" filter="url(#glow)" />
              <path d="M-32,-35 C-55,-58 -78,-55 -90,-42 C-73,-50 -55,-52 -38,-40" fill="url(#staffGold)" filter="url(#glow)" />
            </g>
            <g style={{ transformOrigin: '30px -30px', animation: 'wingFlutter 0.5s ease-in-out infinite 0.1s' }}>
              <path d="M28,-25 C50,-40 70,-35 80,-20 C65,-30 50,-32 35,-25" fill="url(#staffGold)" filter="url(#glow)" />
              <path d="M30,-30 C55,-50 75,-45 85,-30 C70,-40 52,-42 35,-32" fill="url(#staffGold)" filter="url(#glow)" />
              <path d="M32,-35 C55,-58 78,-55 90,-42 C73,-50 55,-52 38,-40" fill="url(#staffGold)" filter="url(#glow)" />
            </g>
          </g>

          <g transform="translate(200, 200)">
            <path d="M-25,0 L-30,60 L30,60 L25,0 Z" fill="url(#tunicWhite)" />
            <path d="M-30,60 L-35,90 L0,85 L35,90 L30,60 Z" fill="url(#tunicWhite)" />
            <path d="M-22,0 L-40,-10 L-60,30 L-45,35 L-30,10 Z" fill="url(#skinGold)" />
            <path d="M22,0 L50,20 L70,-20 L55,-30 L35,-5 Z" fill="url(#skinGold)" />
            
            <path d="M-35,90 Q-50,130 -40,150" fill="none" stroke="url(#capeRed)" strokeWidth="30" strokeLinecap="round" />
            
            <path d="M30,60 Q60,90 40,140 Q30,170 50,200" fill="none" stroke="url(#capeRed)" strokeWidth="35" strokeLinecap="round" opacity="0.9" />
          </g>

          <g transform="translate(160, 340)">
            <path d="M0,0 L-15,60 L-25,120" fill="none" stroke="url(#skinGold)" strokeWidth="20" strokeLinecap="round" />
            <ellipse cx="-30" cy="130" rx="18" ry="10" fill="url(#skinGold)" transform="rotate(-20, -30, 130)" />
            <g transform="translate(-45, 120) rotate(-30)" style={{ animation: 'wingFlutter 0.4s ease-in-out infinite' }}>
              <path d="M0,0 C-15,-8 -25,-5 -30,5 C-20,0 -10,-2 0,0" fill="url(#staffGold)" filter="url(#glow)" />
              <path d="M0,-3 C-12,-12 -22,-10 -28,0 C-18,-5 -10,-6 0,-3" fill="url(#staffGold)" filter="url(#glow)" />
            </g>
          </g>

          <g transform="translate(240, 300)">
            <path d="M0,0 L30,50 L50,110" fill="none" stroke="url(#skinGold)" strokeWidth="18" strokeLinecap="round" />
            <ellipse cx="55" cy="120" rx="16" ry="10" fill="url(#skinGold)" transform="rotate(30, 55, 120)" />
            <g transform="translate(70, 115) rotate(20)" style={{ animation: 'wingFlutter 0.4s ease-in-out infinite 0.2s' }}>
              <path d="M0,0 C15,-8 25,-5 30,5 C20,0 10,-2 0,0" fill="url(#staffGold)" filter="url(#glow)" />
              <path d="M0,-3 C12,-12 22,-10 28,0 C18,-5 10,-6 0,-3" fill="url(#staffGold)" filter="url(#glow)" />
            </g>
          </g>
        </svg>
      </div>

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center z-20" style={parallaxStyle(0.2)}>
        <h2 className="text-white text-xl md:text-2xl font-light tracking-widest uppercase">
          Mensageiro dos Deuses
        </h2>
        <p className="text-white/60 text-sm mt-2">
          Velocidade e precisão para seus negócios
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
