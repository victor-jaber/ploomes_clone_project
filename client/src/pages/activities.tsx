import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  MoreHorizontal,
  CalendarCheck,
  Phone,
  Mail,
  Users,
  FileText,
  CheckSquare,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Atividade, InsertAtividade, Lead } from "@shared/schema";

const activityTypes = [
  { value: "ligacao", label: "Ligação", icon: Phone },
  { value: "email", label: "E-mail", icon: Mail },
  { value: "reuniao", label: "Reunião", icon: Users },
  { value: "tarefa", label: "Tarefa", icon: CheckSquare },
  { value: "nota", label: "Nota", icon: FileText },
];

const activityStatuses = [
  { value: "pendente", label: "Pendente", color: "bg-yellow-500" },
  { value: "concluido", label: "Concluída", color: "bg-green-500" },
  { value: "cancelado", label: "Cancelada", color: "bg-gray-500" },
];

export default function ActivitiesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Atividade | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pendente");

  const { data: activities = [], isLoading } = useQuery<Atividade[]>({
    queryKey: ["/api/activities"],
  });

  const { data: clients = [] } = useQuery<Lead[]>({
    queryKey: ["/api/clients"],
  });

  const { data: opportunities = [] } = useQuery<Lead[]>({
    queryKey: ["/api/opportunities"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertAtividade) => {
      return apiRequest("POST", "/api/activities", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setIsDialogOpen(false);
      setEditingActivity(null);
      toast({ title: "Sucesso", description: "Atividade criada com sucesso" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a atividade",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertAtividade> }) => {
      return apiRequest("PATCH", `/api/activities/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setIsDialogOpen(false);
      setEditingActivity(null);
      toast({ title: "Sucesso", description: "Atividade atualizada com sucesso" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a atividade",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Sucesso", description: "Atividade excluída com sucesso" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a atividade",
        variant: "destructive",
      });
    },
  });

  const toggleComplete = (activity: Atividade) => {
    const newStatus = activity.status === "concluido" ? "pendente" : "concluido";
    updateMutation.mutate({
      id: activity.id,
      data: {
        status: newStatus,
        concluidoEm: newStatus === "concluido" ? new Date() : null,
      },
    });
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = activity.titulo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "pendente" && activity.status === "pendente") ||
      (activeTab === "concluido" && activity.status === "concluido");
    return matchesSearch && matchesTab;
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: InsertAtividade = {
      titulo: formData.get("title") as string,
      tipo: formData.get("type") as any,
      status: "pendente",
      descricao: formData.get("description") as string,
      dataVencimento: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : null,
      leadId: formData.get("leadId") as string || null,
    };

    if (editingActivity) {
      updateMutation.mutate({ id: editingActivity.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (activity: Atividade) => {
    setEditingActivity(activity);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingActivity(null);
    setIsDialogOpen(true);
  };

  const getTypeIcon = (type: string) => {
    const typeInfo = activityTypes.find((t) => t.value === type);
    return typeInfo?.icon || CalendarCheck;
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return null;
    return clients.find((c) => c.id === clientId)?.titulo;
  };

  const getOpportunityTitle = (oppId: string | null) => {
    if (!oppId) return null;
    return opportunities.find((o) => o.id === oppId)?.titulo;
  };

  const isOverdue = (activity: Atividade) => {
    if (activity.status !== "pendente" || !activity.dataVencimento) return false;
    return new Date(activity.dataVencimento) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Atividades</h1>
          <p className="text-muted-foreground">
            Gerencie suas tarefas e follow-ups
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} data-testid="button-new-activity">
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingActivity ? "Editar Atividade" : "Nova Atividade"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editingActivity?.titulo}
                  required
                  data-testid="input-activity-title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select name="type" defaultValue={editingActivity?.tipo || "tarefa"} required>
                    <SelectTrigger data-testid="select-activity-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activityTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Data de Vencimento</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="datetime-local"
                    defaultValue={
                      editingActivity?.dataVencimento
                        ? new Date(editingActivity.dataVencimento).toISOString().slice(0, 16)
                        : ""
                    }
                    data-testid="input-activity-due-date"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientId">Cliente (opcional)</Label>
                <Select name="leadId" defaultValue={editingActivity?.leadId || ""}>
                  <SelectTrigger data-testid="select-activity-client">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="opportunityId">Oportunidade (opcional)</Label>
                <Select name="leadId" defaultValue={editingActivity?.leadId || ""}>
                  <SelectTrigger data-testid="select-activity-opportunity">
                    <SelectValue placeholder="Selecione uma oportunidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {opportunities.map((opp) => (
                      <SelectItem key={opp.id} value={opp.id}>
                        {opp.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingActivity?.descricao || ""}
                  data-testid="input-activity-description"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-activity"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Salvando..."
                  : editingActivity
                  ? "Atualizar"
                  : "Criar Atividade"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar atividades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-activities"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pendente" data-testid="tab-pending">
                  <Clock className="h-4 w-4 mr-2" />
                  Pendentes
                </TabsTrigger>
                <TabsTrigger value="concluido" data-testid="tab-completed">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Concluídas
                </TabsTrigger>
                <TabsTrigger value="all" data-testid="tab-all">
                  Todas
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Nenhuma atividade encontrada</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm
                  ? "Tente ajustar sua busca"
                  : "Adicione sua primeira atividade"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const TypeIcon = getTypeIcon(activity.tipo);
                const overdue = isOverdue(activity);
                return (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      activity.status === "concluido"
                        ? "bg-muted/30"
                        : overdue
                        ? "border-destructive/50 bg-destructive/5"
                        : ""
                    }`}
                    data-testid={`activity-item-${activity.id}`}
                  >
                    <Checkbox
                      checked={activity.status === "concluido"}
                      onCheckedChange={() => toggleComplete(activity)}
                      className="mt-1"
                      data-testid={`checkbox-activity-${activity.id}`}
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <p
                          className={`font-medium ${
                            activity.status === "concluido"
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {activity.titulo}
                        </p>
                        {overdue && (
                          <Badge variant="destructive" className="text-xs">
                            Atrasada
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {activity.dataVencimento && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(activity.dataVencimento).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        {getClientName(activity.leadId) && (
                          <Badge variant="secondary" className="text-xs">
                            {getClientName(activity.leadId)}
                          </Badge>
                        )}
                        {getOpportunityTitle(activity.leadId) && (
                          <Badge variant="outline" className="text-xs">
                            {getOpportunityTitle(activity.leadId)}
                          </Badge>
                        )}
                      </div>
                      {activity.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {activity.descricao}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-activity-menu-${activity.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(activity)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteMutation.mutate(activity.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
