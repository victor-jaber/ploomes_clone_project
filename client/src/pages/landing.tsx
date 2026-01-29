import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BarChart3,
  Users,
  Target,
  Zap,
  Shield,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Pipeline Visual",
    description: "Visualize todo seu funil de vendas com drag-and-drop intuitivo.",
  },
  {
    icon: Users,
    title: "Gestão de Clientes",
    description: "Centralize informações de clientes, contatos e histórico completo.",
  },
  {
    icon: BarChart3,
    title: "Relatórios Inteligentes",
    description: "Dashboards em tempo real com KPIs e métricas de performance.",
  },
  {
    icon: Zap,
    title: "Automação de Processos",
    description: "Automatize tarefas repetitivas e foque no que importa: vender.",
  },
  {
    icon: Shield,
    title: "Propostas Profissionais",
    description: "Crie propostas comerciais elegantes com cálculos automáticos.",
  },
  {
    icon: TrendingUp,
    title: "Previsão de Vendas",
    description: "Forecast inteligente baseado no histórico do seu pipeline.",
  },
];

const benefits = [
  "Sem limite de usuários no plano gratuito",
  "Suporte em português",
  "Sem necessidade de cartão de crédito",
  "Configuração em minutos",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                H
              </div>
              <span className="font-semibold text-xl">Hermes</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Funcionalidades
              </a>
              <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Benefícios
              </a>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <a href="/api/login">
                <Button variant="outline" data-testid="button-login">
                  Entrar
                </Button>
              </a>
              <a href="/api/login">
                <Button data-testid="button-get-started">
                  Começar Grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Zap className="h-3.5 w-3.5" />
                  CRM Inteligente para sua Empresa
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                  Gerencie suas vendas com{" "}
                  <span className="text-primary">inteligência</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl">
                  Hermes é a plataforma completa para gestão de vendas, pipeline comercial 
                  e relacionamento com clientes. Aumente suas conversões com automação inteligente.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="/api/login">
                  <Button size="lg" className="w-full sm:w-auto" data-testid="button-hero-cta">
                    Começar Gratuitamente
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <a href="#features">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Ver Demonstração
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap gap-4">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent rounded-3xl blur-3xl" />
              <Card className="relative border-2">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total em Pipeline</p>
                      <p className="text-3xl font-bold">R$ 2.450.000</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <TrendingUp className="h-4 w-4" />
                      +23% este mês
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-2xl font-semibold">156</p>
                      <p className="text-xs text-muted-foreground">Clientes Ativos</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-semibold">42</p>
                      <p className="text-xs text-muted-foreground">Oportunidades</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-semibold">78%</p>
                      <p className="text-xs text-muted-foreground">Taxa Conversão</p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Leads</span>
                      <span className="text-sm font-medium">12</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-1/4 bg-blue-500 rounded-full" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Qualificados</span>
                      <span className="text-sm font-medium">18</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-2/5 bg-purple-500 rounded-full" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Proposta</span>
                      <span className="text-sm font-medium">8</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-1/5 bg-orange-500 rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Tudo que você precisa para vender mais
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas para gerenciar todo o ciclo de vendas, 
              desde a prospecção até o fechamento.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate transition-all duration-300">
                <CardContent className="p-6 space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Pronto para transformar suas vendas?
          </h2>
          <p className="text-lg text-muted-foreground">
            Junte-se a milhares de empresas que já utilizam o Hermes para 
            gerenciar seus processos comerciais com eficiência.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/api/login">
              <Button size="lg" data-testid="button-cta-final">
                Criar Conta Gratuita
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              H
            </div>
            <span className="font-semibold">Hermes CRM</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Hermes CRM. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
