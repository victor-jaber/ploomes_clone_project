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
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 4,
    }));
    setParticles(newParticles);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  };

  const parallaxStyle = (depth: number) => ({
    transform: `translate(${(mousePos.x - 0.5) * depth * 30}px, ${(mousePos.y - 0.5) * depth * 30}px)`,
    transition: 'transform 0.3s ease-out',
  });

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
    >
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(20px) rotate(-3deg); }
        }
        @keyframes wingFlap {
          0%, 100% { transform: scaleX(1) rotate(-5deg); }
          50% { transform: scaleX(1.1) rotate(5deg); }
        }
        @keyframes wingFlapRight {
          0%, 100% { transform: scaleX(-1) rotate(5deg); }
          50% { transform: scaleX(-1.1) rotate(-5deg); }
        }
        @keyframes glow {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.4)); }
          50% { filter: drop-shadow(0 0 40px rgba(168, 85, 247, 0.8)); }
        }
        @keyframes particleFloat {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes snakeMove {
          0%, 100% { d: path("M0,0 Q10,-15 0,-30 Q-10,-45 0,-60"); }
          50% { d: path("M0,0 Q-10,-15 0,-30 Q10,-45 0,-60"); }
        }
        @keyframes orbitSlow {
          from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
        }
        @keyframes orbitFast {
          from { transform: rotate(0deg) translateX(80px) rotate(0deg); }
          to { transform: rotate(-360deg) translateX(80px) rotate(360deg); }
        }
      `}</style>

      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-white/30"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            animation: `particleFloat ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
          }}
        />
      ))}

      <div 
        className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-3xl"
        style={{ 
          ...parallaxStyle(-0.5),
          animation: 'pulse 4s ease-in-out infinite',
        }}
      />
      <div 
        className="absolute w-48 h-48 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-2xl"
        style={{ 
          ...parallaxStyle(-0.3),
          animation: 'pulse 5s ease-in-out infinite 1s',
          left: '20%',
          top: '20%',
        }}
      />

      <div className="absolute" style={{ animation: 'orbitSlow 20s linear infinite' }}>
        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 shadow-lg shadow-yellow-400/50" />
      </div>
      <div className="absolute" style={{ animation: 'orbitFast 12s linear infinite' }}>
        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 shadow-lg shadow-purple-400/50" />
      </div>

      <div 
        className="relative z-10"
        style={{ 
          animation: 'float 6s ease-in-out infinite',
          ...parallaxStyle(0.5),
        }}
      >
        <svg 
          viewBox="0 0 300 400" 
          className="w-72 h-96"
          style={{ animation: 'glow 3s ease-in-out infinite' }}
        >
          <defs>
            <linearGradient id="helmetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="staffGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <g transform="translate(150, 100)">
            <ellipse cx="0" cy="20" rx="45" ry="35" fill="url(#helmetGradient)" />
            <ellipse cx="0" cy="10" rx="50" ry="25" fill="url(#helmetGradient)" />
            <path d="M-50,10 Q-50,-20 0,-30 Q50,-20 50,10" fill="url(#helmetGradient)" />
            
            <ellipse cx="0" cy="25" rx="35" ry="20" fill="rgba(0,0,0,0.3)" />
            
            <g style={{ transformOrigin: '-50px 0', animation: 'wingFlap 0.8s ease-in-out infinite' }}>
              <path 
                d="M-50,0 Q-80,-30 -120,-20 Q-100,-10 -80,-15 Q-90,0 -120,10 Q-90,5 -70,0 Q-80,15 -100,30 Q-70,15 -50,10 Z" 
                fill="url(#goldGradient)"
                filter="url(#glow)"
              />
              <path 
                d="M-55,0 Q-75,-20 -100,-15 Q-85,-5 -70,-10 Q-75,5 -90,15 Q-70,8 -55,5 Z" 
                fill="white" 
                opacity="0.4"
              />
            </g>
            
            <g style={{ transformOrigin: '50px 0', animation: 'wingFlapRight 0.8s ease-in-out infinite' }}>
              <path 
                d="M50,0 Q80,-30 120,-20 Q100,-10 80,-15 Q90,0 120,10 Q90,5 70,0 Q80,15 100,30 Q70,15 50,10 Z" 
                fill="url(#goldGradient)"
                filter="url(#glow)"
              />
              <path 
                d="M55,0 Q75,-20 100,-15 Q85,-5 70,-10 Q75,5 90,15 Q70,8 55,5 Z" 
                fill="white" 
                opacity="0.4"
              />
            </g>
            
            <circle cx="-15" cy="20" r="3" fill="white" opacity="0.6" />
            <ellipse cx="20" cy="5" rx="8" ry="4" fill="white" opacity="0.3" />
          </g>

          <g transform="translate(150, 330)">
            <rect x="-6" y="-180" width="12" height="180" rx="6" fill="url(#staffGradient)" />
            
            <circle cx="0" cy="-180" r="20" fill="url(#goldGradient)" filter="url(#glow)" />
            <circle cx="0" cy="-180" r="12" fill="white" opacity="0.3" />
            
            <g transform="translate(-8, -160)">
              <path 
                d="M0,0 C15,-20 -5,-40 10,-60 C-5,-50 5,-30 -5,-20 C5,-10 0,0 0,0" 
                fill="none" 
                stroke="url(#goldGradient)" 
                strokeWidth="4"
                strokeLinecap="round"
                style={{ animation: 'snakeMove 2s ease-in-out infinite' }}
              />
              <circle cx="10" cy="-60" r="4" fill="url(#goldGradient)" />
              <circle cx="12" cy="-62" r="1" fill="black" />
            </g>
            
            <g transform="translate(8, -160) scale(-1, 1)">
              <path 
                d="M0,0 C15,-20 -5,-40 10,-60 C-5,-50 5,-30 -5,-20 C5,-10 0,0 0,0" 
                fill="none" 
                stroke="url(#goldGradient)" 
                strokeWidth="4"
                strokeLinecap="round"
                style={{ animation: 'snakeMove 2s ease-in-out infinite 0.5s' }}
              />
              <circle cx="10" cy="-60" r="4" fill="url(#goldGradient)" />
              <circle cx="12" cy="-62" r="1" fill="black" />
            </g>
            
            <ellipse cx="0" cy="10" rx="30" ry="8" fill="rgba(0,0,0,0.2)" />
          </g>
        </svg>
      </div>

      <div 
        className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center"
        style={parallaxStyle(0.2)}
      >
        <p className="text-white/80 text-lg font-light tracking-widest uppercase">
          Mensageiro dos Negócios
        </p>
        <p className="text-white/50 text-sm mt-2">
          Velocidade e precisão em suas vendas
        </p>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute w-2 h-2 rounded-full bg-white/60"
          style={{ 
            left: '10%', 
            top: '30%',
            animation: 'pulse 2s ease-in-out infinite',
          }} 
        />
        <div 
          className="absolute w-3 h-3 rounded-full bg-purple-300/60"
          style={{ 
            right: '15%', 
            top: '25%',
            animation: 'pulse 2.5s ease-in-out infinite 0.5s',
          }} 
        />
        <div 
          className="absolute w-2 h-2 rounded-full bg-pink-300/60"
          style={{ 
            left: '20%', 
            bottom: '35%',
            animation: 'pulse 3s ease-in-out infinite 1s',
          }} 
        />
        <div 
          className="absolute w-4 h-4 rounded-full bg-yellow-300/40"
          style={{ 
            right: '25%', 
            bottom: '40%',
            animation: 'pulse 2.8s ease-in-out infinite 0.3s',
          }} 
        />
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
