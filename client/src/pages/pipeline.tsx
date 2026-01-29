import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, GripVertical, Building2, DollarSign, Calendar } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Opportunity, Client, InsertOpportunity } from "@shared/schema";

const stages = [
  { id: "lead", label: "Lead", color: "bg-blue-500" },
  { id: "qualified", label: "Qualificado", color: "bg-purple-500" },
  { id: "proposal", label: "Proposta", color: "bg-orange-500" },
  { id: "negotiation", label: "Negociação", color: "bg-yellow-500" },
  { id: "closed_won", label: "Ganho", color: "bg-green-500" },
  { id: "closed_lost", label: "Perdido", color: "bg-red-500" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function OpportunityCard({
  opportunity,
  client,
  onDragStart,
}: {
  opportunity: Opportunity;
  client?: Client;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, opportunity.id)}
      className="cursor-grab active:cursor-grabbing hover-elevate transition-all"
      data-testid={`pipeline-card-${opportunity.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-1 flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{opportunity.title}</p>
            {client && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{client.companyName}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm font-semibold text-primary">
            <DollarSign className="h-3.5 w-3.5" />
            {formatCurrency(Number(opportunity.value || 0))}
          </div>
          {opportunity.probability !== null && opportunity.probability !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {opportunity.probability}%
            </Badge>
          )}
        </div>
        {opportunity.expectedCloseDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(opportunity.expectedCloseDate).toLocaleDateString("pt-BR")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PipelineColumn({
  stage,
  opportunities,
  clients,
  onDrop,
  onDragOver,
  onDragStart,
  isLoading,
}: {
  stage: { id: string; label: string; color: string };
  opportunities: Opportunity[];
  clients: Client[];
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  isLoading: boolean;
}) {
  const totalValue = opportunities.reduce((acc, o) => acc + Number(o.value || 0), 0);

  return (
    <div
      className="flex flex-col h-full min-w-[280px] w-[280px] flex-shrink-0"
      onDrop={(e) => onDrop(e, stage.id)}
      onDragOver={onDragOver}
    >
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-t-lg border border-b-0">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${stage.color}`} />
          <span className="font-medium text-sm">{stage.label}</span>
          <Badge variant="secondary" className="text-xs">
            {opportunities.length}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {formatCurrency(totalValue)}
        </span>
      </div>
      <div className="flex-1 bg-muted/20 border border-t-0 rounded-b-lg p-2 space-y-2 min-h-[200px]">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : opportunities.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
            Arraste oportunidades aqui
          </div>
        ) : (
          opportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              client={clients.find((c) => c.id === opp.clientId)}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data: opportunities = [], isLoading: oppLoading } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities"],
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const isLoading = oppLoading || clientsLoading;

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/opportunities/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a oportunidade",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertOpportunity) => {
      return apiRequest("POST", "/api/opportunities", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      setIsDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Oportunidade criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a oportunidade",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedId) {
      const opportunity = opportunities.find((o) => o.id === draggedId);
      if (opportunity && opportunity.status !== stageId) {
        updateMutation.mutate({ id: draggedId, status: stageId });
      }
    }
    setDraggedId(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: InsertOpportunity = {
      title: formData.get("title") as string,
      clientId: formData.get("clientId") as string,
      value: formData.get("value") as string,
      status: "lead",
      probability: parseInt(formData.get("probability") as string) || 0,
      description: formData.get("description") as string,
      ownerId: "",
    };
    createMutation.mutate(data);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie seu funil de vendas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-opportunity-pipeline">
              <Plus className="h-4 w-4 mr-2" />
              Nova Oportunidade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Oportunidade</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Ex: Proposta Sistema ERP"
                  required
                  data-testid="input-opportunity-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientId">Cliente</Label>
                <Select name="clientId" required>
                  <SelectTrigger data-testid="select-opportunity-client">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Valor (R$)</Label>
                  <Input
                    id="value"
                    name="value"
                    type="number"
                    placeholder="0,00"
                    data-testid="input-opportunity-value"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probability">Probabilidade (%)</Label>
                  <Input
                    id="probability"
                    name="probability"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="50"
                    data-testid="input-opportunity-probability"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Detalhes da oportunidade..."
                  data-testid="input-opportunity-description"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
                data-testid="button-save-opportunity"
              >
                {createMutation.isPending ? "Criando..." : "Criar Oportunidade"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1 w-full">
        <div className="flex gap-4 pb-4 h-[calc(100vh-220px)]">
          {stages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              opportunities={opportunities.filter((o) => o.status === stage.id)}
              clients={clients}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragStart={handleDragStart}
              isLoading={isLoading}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
