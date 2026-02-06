import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  Scale,
  Building2,
  User,
  Kanban,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  MessageSquare,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { Lead, Advogado, Escritorio, Reclamante, Atividade } from "@shared/schema";

const PIPELINE_COLORS = {
  advogados: "#8b5cf6",
  escritorios: "#3b82f6", 
  reclamantes: "#10b981",
  triagem: "#f97316",
};

const STAGE_COLORS = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#10b981"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyShort(value: number) {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return formatCurrency(value);
}

function StatCard({
  title,
  value,
  subtitle,
  change,
  changeType,
  icon: Icon,
  iconColor,
  isLoading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  iconColor?: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="card-premium overflow-hidden">
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
              {change && (
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  changeType === "positive" ? "text-green-600 dark:text-green-400" : 
                  changeType === "negative" ? "text-red-600 dark:text-red-400" : 
                  "text-muted-foreground"
                }`}>
                  {changeType === "positive" && <ArrowUpRight className="h-3 w-3" />}
                  {changeType === "negative" && <ArrowDownRight className="h-3 w-3" />}
                  {change}
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl ${iconColor || "bg-primary/10"}`}>
              <Icon className={`h-5 w-5 ${iconColor ? "text-white" : "text-primary"}`} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const PIPELINE_STAGES: Record<string, { id: string; label: string }[]> = {
  advogados: [
    { id: "novo_lead", label: "Novo Lead" },
    { id: "contato_inicial", label: "Contato Inicial" },
    { id: "negociando", label: "Negociando" },
    { id: "aguardando_docs", label: "Aguardando Docs" },
    { id: "qualificado", label: "Qualificado" },
  ],
  escritorios: [
    { id: "novo_lead", label: "Novo Lead" },
    { id: "contato_inicial", label: "Contato Inicial" },
    { id: "reuniao_agendada", label: "Reunião Agendada" },
    { id: "proposta_enviada", label: "Proposta Enviada" },
    { id: "qualificado", label: "Qualificado" },
  ],
  reclamantes: [
    { id: "novo_lead", label: "Novo Lead" },
    { id: "contato_inicial", label: "Contato Inicial" },
    { id: "coletando_dados", label: "Coletando Dados" },
    { id: "aguardando_docs", label: "Aguardando Docs" },
    { id: "qualificado", label: "Qualificado" },
  ],
  triagem: [
    { id: "novo_caso", label: "Novo Caso" },
    { id: "prioridade", label: "Prioridade" },
    { id: "triagem", label: "Triagem" },
    { id: "acompanhar", label: "Acompanhar" },
    { id: "qualificar", label: "Qualificar" },
  ],
};

export default function DashboardPage() {
  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: lawyers = [], isLoading: lawyersLoading } = useQuery<Advogado[]>({
    queryKey: ["/api/lawyers"],
  });

  const { data: lawFirms = [], isLoading: lawFirmsLoading } = useQuery<Escritorio[]>({
    queryKey: ["/api/law-firms"],
  });

  const { data: claimants = [], isLoading: claimantsLoading } = useQuery<Reclamante[]>({
    queryKey: ["/api/claimants"],
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Atividade[]>({
    queryKey: ["/api/activities"],
  });

  const isLoading = leadsLoading || lawyersLoading || lawFirmsLoading || claimantsLoading;

  const totalLeads = leads.length;
  const totalValue = leads.reduce((acc, l) => acc + Number(l.valor || 0), 0);
  
  const leadsByPipeline = {
    advogados: leads.filter(l => l.tipoPipeline === "advogados"),
    escritorios: leads.filter(l => l.tipoPipeline === "escritorios"),
    reclamantes: leads.filter(l => l.tipoPipeline === "reclamantes"),
    triagem: leads.filter(l => l.tipoPipeline === "triagem"),
  };

  const qualifiedLeads = leads.filter(l => 
    l.etapa === "qualificado" || l.etapa === "qualificar" || l.etapa === "fechado"
  ).length;

  const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  const pipelineDistribution = [
    { name: "Advogados", value: leadsByPipeline.advogados.length, color: PIPELINE_COLORS.advogados },
    { name: "Escritórios", value: leadsByPipeline.escritorios.length, color: PIPELINE_COLORS.escritorios },
    { name: "Reclamantes", value: leadsByPipeline.reclamantes.length, color: PIPELINE_COLORS.reclamantes },
    { name: "Gestão de Casos", value: leadsByPipeline.triagem.length, color: PIPELINE_COLORS.triagem },
  ].filter(p => p.value > 0);

  const getStageData = (pipelineType: string) => {
    const stages = PIPELINE_STAGES[pipelineType] || [];
    const pipelineLeads = leads.filter(l => l.tipoPipeline === pipelineType);
    return stages.map((stage, index) => ({
      name: stage.label,
      value: pipelineLeads.filter(l => l.etapa === stage.id).length,
      color: STAGE_COLORS[index % STAGE_COLORS.length],
    }));
  };

  const advogadosStageData = getStageData("advogados");

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime())
    .slice(0, 5);

  const pendingActivities = activities.filter(a => a.status === "pendente").length;
  const completedActivities = activities.filter(a => a.status === "concluido").length;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  const weeklyData = last7Days.map(date => {
    const dayLeads = leads.filter(l => {
      const leadDate = new Date(l.criadoEm || 0);
      return leadDate.toDateString() === date.toDateString();
    });
    return {
      name: date.toLocaleDateString("pt-BR", { weekday: "short" }),
      leads: dayLeads.length,
      valor: dayLeads.reduce((acc, l) => acc + Number(l.valor || 0), 0),
    };
  });

  const pipelineLabels: Record<string, string> = {
    advogados: "Advogados",
    escritorios: "Escritórios",
    reclamantes: "Reclamantes",
    triagem: "Gestão de Casos",
  };

  const getEntityName = (lead: Lead) => {
    if (lead.advogadoId) {
      const lawyer = lawyers.find(a => a.id === lead.advogadoId);
      return lawyer?.nome || "Advogado";
    }
    if (lead.escritorioId) {
      const lawFirm = lawFirms.find(e => e.id === lead.escritorioId);
      return lawFirm?.nome || "Escritório";
    }
    if (lead.reclamanteId) {
      const claimant = claimants.find(r => r.id === lead.reclamanteId);
      return claimant?.nome || "Reclamante";
    }
    return "-";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Carregando dados...
            </p>
          </div>
          <Skeleton className="h-6 w-32" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="card-premium">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="card-premium">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="card-premium lg:col-span-2">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
          <Card className="card-premium">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Visão geral do seu CRM de aquisição de casos
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Atualizado agora
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Leads"
          value={totalLeads}
          subtitle={`${qualifiedLeads} qualificados`}
          change={`${conversionRate}% taxa de conversão`}
          changeType={conversionRate >= 20 ? "positive" : conversionRate >= 10 ? "neutral" : "negative"}
          icon={Kanban}
          iconColor="bg-gradient-to-br from-purple-500 to-pink-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Valor em Pipeline"
          value={formatCurrencyShort(totalValue)}
          subtitle="Soma de todos os leads"
          icon={DollarSign}
          iconColor="bg-gradient-to-br from-green-500 to-emerald-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Advogados"
          value={lawyers.length}
          subtitle={`${leadsByPipeline.advogados.length} leads ativos`}
          icon={Scale}
          iconColor="bg-gradient-to-br from-violet-500 to-purple-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Escritórios"
          value={lawFirms.length}
          subtitle={`${leadsByPipeline.escritorios.length} leads ativos`}
          icon={Building2}
          iconColor="bg-gradient-to-br from-blue-500 to-cyan-500"
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Reclamantes"
          value={claimants.length}
          subtitle={`${leadsByPipeline.reclamantes.length} leads ativos`}
          icon={User}
          iconColor="bg-gradient-to-br from-teal-500 to-green-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Gestão de Casos"
          value={leadsByPipeline.triagem.length}
          subtitle="Casos em análise"
          icon={Target}
          iconColor="bg-gradient-to-br from-orange-500 to-amber-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Atividades"
          value={activities.length}
          subtitle={`${pendingActivities} pendentes`}
          change={completedActivities > 0 ? `${completedActivities} concluídas` : undefined}
          changeType="positive"
          icon={Activity}
          iconColor="bg-gradient-to-br from-indigo-500 to-blue-500"
          isLoading={activitiesLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="card-premium lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Leads por Dia</CardTitle>
                <CardDescription>Últimos 7 dias</CardDescription>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs" 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                  />
                  <YAxis 
                    className="text-xs" 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "leads" ? `${value} leads` : formatCurrency(value),
                      name === "leads" ? "Leads" : "Valor"
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLeads)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Distribuição</CardTitle>
                <CardDescription>Por tipo de pipeline</CardDescription>
              </div>
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : pipelineDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nenhum lead cadastrado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pipelineDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pipelineDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value} leads`, ""]}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-premium">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Funil de Advogados</CardTitle>
                <CardDescription>Leads por estágio</CardDescription>
              </div>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="space-y-4">
                {advogadosStageData.map((stage, index) => (
                  <div key={stage.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{stage.name}</span>
                      <span className="font-medium">{stage.value}</span>
                    </div>
                    <Progress 
                      value={leadsByPipeline.advogados.length > 0 
                        ? (stage.value / leadsByPipeline.advogados.length) * 100 
                        : 0
                      } 
                      className="h-2"
                    />
                  </div>
                ))}
                {advogadosStageData.every(s => s.value === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum lead de advogado
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Leads Recentes</CardTitle>
                <CardDescription>Últimos leads criados</CardDescription>
              </div>
              <Kanban className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Kanban className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhum lead cadastrado</p>
              </div>
            ) : (
              <ScrollArea className="h-[220px] pr-4">
                <div className="space-y-3">
                  {recentLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                            {lead.titulo?.charAt(0)?.toUpperCase() || "L"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{lead.titulo}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {getEntityName(lead)} • {pipelineLabels[lead.tipoPipeline || "advogados"]}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-sm text-green-600 dark:text-green-400">
                          {formatCurrency(Number(lead.valor || 0))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lead.criadoEm && new Date(lead.criadoEm).toLocaleDateString("pt-BR", { 
                            day: "2-digit", 
                            month: "short" 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="card-premium">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Métricas Rápidas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm">Qualificados</span>
              </div>
              <span className="font-bold text-green-600">{qualifiedLeads}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Em Andamento</span>
              </div>
              <span className="font-bold text-yellow-600">{totalLeads - qualifiedLeads}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Ticket Médio</span>
              </div>
              <span className="font-bold text-purple-600">
                {totalLeads > 0 ? formatCurrencyShort(totalValue / totalLeads) : "R$ 0"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Atividades Pendentes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : pendingActivities === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhuma atividade pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities
                  .filter(a => a.status === "pendente")
                  .slice(0, 4)
                  .map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                    >
                      <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.dataVencimento 
                            ? new Date(activity.dataVencimento).toLocaleDateString("pt-BR")
                            : "Sem prazo"}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Resumo</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10">
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {totalLeads}
              </p>
              <p className="text-sm text-muted-foreground">Leads no sistema</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-xl font-bold">{lawyers.length}</p>
                <p className="text-xs text-muted-foreground">Advogados</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-xl font-bold">{lawFirms.length}</p>
                <p className="text-xs text-muted-foreground">Escritórios</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-xl font-bold">{claimants.length}</p>
                <p className="text-xs text-muted-foreground">Reclamantes</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-xl font-bold">{activities.length}</p>
                <p className="text-xs text-muted-foreground">Atividades</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
