import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  CalendarCheck,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
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
} from "recharts";
import type { Client, Opportunity, Activity, Proposal } from "@shared/schema";

const COLORS = ["#3b82f6", "#8b5cf6", "#f97316", "#10b981", "#ef4444", "#6b7280"];

const pipelineData = [
  { name: "Lead", value: 0, color: "#3b82f6" },
  { name: "Qualificado", value: 0, color: "#8b5cf6" },
  { name: "Proposta", value: 0, color: "#f97316" },
  { name: "Negociação", value: 0, color: "#eab308" },
  { name: "Ganho", value: 0, color: "#10b981" },
  { name: "Perdido", value: 0, color: "#ef4444" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative";
  icon: React.ElementType;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {change && (
              <p className={`text-xs flex items-center gap-1 mt-1 ${
                changeType === "positive" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}>
                {changeType === "positive" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {change}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: opportunities = [], isLoading: opportunitiesLoading } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities"],
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: proposals = [], isLoading: proposalsLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
  });

  const isLoading = clientsLoading || opportunitiesLoading || activitiesLoading || proposalsLoading;

  const totalPipelineValue = opportunities
    .filter((o) => !["closed_won", "closed_lost"].includes(o.status || ""))
    .reduce((acc, o) => acc + Number(o.value || 0), 0);

  const wonValue = opportunities
    .filter((o) => o.status === "closed_won")
    .reduce((acc, o) => acc + Number(o.value || 0), 0);

  const pendingActivities = activities.filter((a) => a.status === "pending").length;

  const pipelineStats = pipelineData.map((stage) => {
    const statusMap: Record<string, string> = {
      "Lead": "lead",
      "Qualificado": "qualified",
      "Proposta": "proposal",
      "Negociação": "negotiation",
      "Ganho": "closed_won",
      "Perdido": "closed_lost",
    };
    const count = opportunities.filter((o) => o.status === statusMap[stage.name]).length;
    return { ...stage, value: count };
  });

  const monthlyData = [
    { name: "Jan", value: 45000 },
    { name: "Fev", value: 52000 },
    { name: "Mar", value: 48000 },
    { name: "Abr", value: 61000 },
    { name: "Mai", value: 55000 },
    { name: "Jun", value: 67000 },
  ];

  const recentOpportunities = opportunities
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  const upcomingActivities = activities
    .filter((a) => a.status === "pending" && a.dueDate)
    .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
    .slice(0, 5);

  const statusLabels: Record<string, string> = {
    lead: "Lead",
    qualified: "Qualificado",
    proposal: "Proposta",
    negotiation: "Negociação",
    closed_won: "Ganho",
    closed_lost: "Perdido",
  };

  const activityTypeLabels: Record<string, string> = {
    call: "Ligação",
    email: "E-mail",
    meeting: "Reunião",
    task: "Tarefa",
    note: "Nota",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu pipeline de vendas
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Clientes Ativos"
          value={clients.length}
          change="+12% este mês"
          changeType="positive"
          icon={Users}
          isLoading={clientsLoading}
        />
        <StatCard
          title="Oportunidades Abertas"
          value={opportunities.filter((o) => !["closed_won", "closed_lost"].includes(o.status || "")).length}
          change="+8% este mês"
          changeType="positive"
          icon={Target}
          isLoading={opportunitiesLoading}
        />
        <StatCard
          title="Valor em Pipeline"
          value={formatCurrency(totalPipelineValue)}
          change="+23% este mês"
          changeType="positive"
          icon={DollarSign}
          isLoading={opportunitiesLoading}
        />
        <StatCard
          title="Vendas Fechadas"
          value={formatCurrency(wonValue)}
          change="+15% este mês"
          changeType="positive"
          icon={TrendingUp}
          isLoading={opportunitiesLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Pipeline de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pipelineStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {pipelineStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v/1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Valor"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Oportunidades Recentes</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentOpportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma oportunidade cadastrada
              </p>
            ) : (
              <div className="space-y-4">
                {recentOpportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`opportunity-item-${opp.id}`}
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{opp.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {statusLabels[opp.status || "lead"]}
                      </p>
                    </div>
                    <p className="font-semibold text-sm">
                      {formatCurrency(Number(opp.value || 0))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Próximas Atividades</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : upcomingActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma atividade pendente
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`activity-item-${activity.id}`}
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activityTypeLabels[activity.type]}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activity.dueDate
                        ? new Date(activity.dueDate).toLocaleDateString("pt-BR")
                        : "-"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
