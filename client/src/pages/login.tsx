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
    transition: 'transform 0.4s ease-out',
  });

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
    >
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes wingFloat {
          0%, 100% { transform: rotate(-3deg) translateY(0); }
          50% { transform: rotate(3deg) translateY(-8px); }
        }
        @keyframes wingFloatRight {
          0%, 100% { transform: scaleX(-1) rotate(3deg) translateY(0); }
          50% { transform: scaleX(-1) rotate(-3deg) translateY(-8px); }
        }
        @keyframes dash {
          to { stroke-dashoffset: -1000; }
        }
        @keyframes nodeGlow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(255,255,255,0.3)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 20px rgba(255,255,255,0.6)); transform: scale(1.1); }
        }
        @keyframes drawLine {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      <div className="absolute w-96 h-96 rounded-full bg-white/5 blur-3xl" style={parallaxStyle(-0.3)} />
      <div className="absolute w-64 h-64 rounded-full bg-purple-300/10 blur-2xl" style={{ ...parallaxStyle(-0.5), left: '10%', top: '20%' }} />
      <div className="absolute w-48 h-48 rounded-full bg-pink-300/10 blur-2xl" style={{ ...parallaxStyle(-0.4), right: '15%', bottom: '25%' }} />

      <div className="relative z-10 flex flex-col items-center" style={parallaxStyle(0.3)}>
        <div className="relative" style={{ animation: 'float 4s ease-in-out infinite' }}>
          <svg viewBox="0 0 200 200" className="w-48 h-48 md:w-64 md:h-64">
            <defs>
              <linearGradient id="wingGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="50%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="helmetPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e9d5ff" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#9333ea" />
              </linearGradient>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <g style={{ transformOrigin: '40px 100px', animation: 'wingFloat 2s ease-in-out infinite' }}>
              <path 
                d="M50,100 C30,85 15,70 5,55 C15,60 25,58 35,55 C25,50 10,40 0,25 C15,35 30,38 45,35 C35,28 25,15 20,0 C35,15 50,25 65,30 C55,40 50,60 50,80 Z" 
                fill="url(#wingGold)"
                filter="url(#softGlow)"
              />
              <path 
                d="M50,95 C35,85 25,72 18,60 C25,62 32,60 38,58 C30,55 20,48 15,38 C25,45 35,47 45,45 C38,40 32,32 28,22 C38,32 48,38 55,42" 
                fill="none"
                stroke="white"
                strokeWidth="1"
                opacity="0.4"
              />
            </g>

            <g style={{ transformOrigin: '160px 100px', animation: 'wingFloatRight 2s ease-in-out infinite' }}>
              <path 
                d="M150,100 C170,85 185,70 195,55 C185,60 175,58 165,55 C175,50 190,40 200,25 C185,35 170,38 155,35 C165,28 175,15 180,0 C165,15 150,25 135,30 C145,40 150,60 150,80 Z" 
                fill="url(#wingGold)"
                filter="url(#softGlow)"
              />
              <path 
                d="M150,95 C165,85 175,72 182,60 C175,62 168,60 162,58 C170,55 180,48 185,38 C175,45 165,47 155,45 C162,40 168,32 172,22 C162,32 152,38 145,42" 
                fill="none"
                stroke="white"
                strokeWidth="1"
                opacity="0.4"
              />
            </g>

            <ellipse cx="100" cy="120" rx="55" ry="45" fill="url(#helmetPurple)" />
            <ellipse cx="100" cy="105" rx="60" ry="35" fill="url(#helmetPurple)" />
            <path d="M40,105 Q40,60 100,50 Q160,60 160,105" fill="url(#helmetPurple)" />
            
            <ellipse cx="100" cy="130" rx="40" ry="25" fill="rgba(0,0,0,0.4)" />
            
            <path d="M60,95 Q80,85 100,85 Q120,85 140,95" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />
            <circle cx="70" cy="100" r="4" fill="white" opacity="0.4" />
            <ellipse cx="115" cy="90" rx="15" ry="6" fill="white" opacity="0.2" />
          </svg>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-20 h-20 rounded-full border-2 border-white/20" style={{ animation: 'pulseRing 2s ease-out infinite' }} />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-20 h-20 rounded-full border-2 border-white/20" style={{ animation: 'pulseRing 2s ease-out infinite 0.5s' }} />
          </div>
        </div>

        <div className="mt-8 relative w-80" style={{ animation: 'fadeInUp 1s ease-out' }}>
          <svg viewBox="0 0 320 100" className="w-full">
            <circle cx="40" cy="50" r="8" fill="white" opacity="0.9" style={{ animation: 'nodeGlow 2s ease-in-out infinite' }} />
            <circle cx="160" cy="30" r="10" fill="white" opacity="0.9" style={{ animation: 'nodeGlow 2s ease-in-out infinite 0.3s' }} />
            <circle cx="280" cy="50" r="8" fill="white" opacity="0.9" style={{ animation: 'nodeGlow 2s ease-in-out infinite 0.6s' }} />
            <circle cx="100" cy="70" r="6" fill="white" opacity="0.7" style={{ animation: 'nodeGlow 2s ease-in-out infinite 0.9s' }} />
            <circle cx="220" cy="70" r="6" fill="white" opacity="0.7" style={{ animation: 'nodeGlow 2s ease-in-out infinite 1.2s' }} />

            <path 
              d="M48,50 Q100,40 152,32" 
              fill="none" 
              stroke="white" 
              strokeWidth="1.5" 
              opacity="0.4"
              strokeDasharray="4 4"
              style={{ animation: 'dash 20s linear infinite' }}
            />
            <path 
              d="M168,32 Q220,40 272,50" 
              fill="none" 
              stroke="white" 
              strokeWidth="1.5" 
              opacity="0.4"
              strokeDasharray="4 4"
              style={{ animation: 'dash 20s linear infinite' }}
            />
            <path 
              d="M48,54 Q70,70 94,70" 
              fill="none" 
              stroke="white" 
              strokeWidth="1.5" 
              opacity="0.3"
              strokeDasharray="4 4"
              style={{ animation: 'dash 25s linear infinite' }}
            />
            <path 
              d="M106,70 Q160,55 214,70" 
              fill="none" 
              stroke="white" 
              strokeWidth="1.5" 
              opacity="0.3"
              strokeDasharray="4 4"
              style={{ animation: 'dash 25s linear infinite' }}
            />
            <path 
              d="M226,70 Q250,55 272,54" 
              fill="none" 
              stroke="white" 
              strokeWidth="1.5" 
              opacity="0.3"
              strokeDasharray="4 4"
              style={{ animation: 'dash 25s linear infinite' }}
            />
          </svg>
        </div>

        <div className="mt-12 text-center" style={{ animation: 'fadeInUp 1s ease-out 0.3s backwards' }}>
          <h2 className="text-white text-2xl md:text-3xl font-light tracking-wide">
            Conecte. Comunique. <span className="font-semibold">Conquiste.</span>
          </h2>
          <p className="text-white/60 text-sm md:text-base mt-3 max-w-xs mx-auto">
            O mensageiro moderno para seus negócios
          </p>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/40"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite ${i * 0.3}s`,
            }}
          />
        ))}
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
