import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Plus, GripVertical, Building2, DollarSign, Calendar, Webhook, Trash2, Pencil, Settings2,
  Phone, Mail, User, MessageSquare, ChevronRight, Clock, CheckCircle2, Circle, ArrowRight,
  Send, Paperclip, FileText, X
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Opportunity, Client, InsertOpportunity, PipelineTrigger, InsertPipelineTrigger, Activity, Contact, Interaction } from "@shared/schema";

const stages = [
  { id: "novo_lead", label: "Novo Lead", color: "bg-blue-500" },
  { id: "falando_escritorio", label: "Falando com Escritório", color: "bg-purple-500" },
  { id: "sem_resposta", label: "Sem Resposta", color: "bg-orange-500" },
  { id: "em_atendimento", label: "Em Atendimento", color: "bg-yellow-500" },
  { id: "buscar_casos", label: "Buscar Casos no Sistema", color: "bg-cyan-500" },
  { id: "leads_quentes", label: "Leads Quentes", color: "bg-green-500" },
];

const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const triggerFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  fromStatus: z.string().default("any"),
  toStatus: z.string().min(1, "Estágio destino é obrigatório"),
  webhookUrl: z.string().url("URL inválida").min(1, "URL é obrigatória"),
  httpMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  headers: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true;
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "Headers deve ser um JSON válido" }),
  bodyTemplate: z.string().optional(),
  isActive: z.boolean().default(true),
});

type TriggerFormData = z.infer<typeof triggerFormSchema>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrencyShort(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function OpportunityDetailPanel({
  opportunity,
  client,
  contacts,
  activities,
  onClose,
  onAdvanceStage,
  isPending,
}: {
  opportunity: Opportunity;
  client?: Client;
  contacts: Contact[];
  activities: Activity[];
  onClose: () => void;
  onAdvanceStage: () => void;
  isPending: boolean;
}) {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  
  const currentStageIndex = stages.findIndex(s => s.id === opportunity.status);
  const currentStage = stages[currentStageIndex];
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;
  const opportunityActivities = activities.filter(a => a.opportunityId === opportunity.id);
  const clientContacts = contacts.filter(c => c.clientId === opportunity.clientId);

  const { data: interactionsList = [], isLoading: loadingInteractions } = useQuery<Interaction[]>({
    queryKey: ["/api/opportunities", opportunity.id, "interactions"],
  });

  const createInteractionMutation = useMutation({
    mutationFn: async (data: { type: string; content: string }) => {
      return apiRequest("POST", "/api/interactions", {
        opportunityId: opportunity.id,
        type: data.type,
        content: data.content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", opportunity.id, "interactions"] });
      setCommentText("");
      toast({ title: "Comentário adicionado" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar comentário", variant: "destructive" });
    },
  });

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    createInteractionMutation.mutate({ type: "comment", content: commentText });
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "comment": return <MessageSquare className="h-4 w-4" />;
      case "file": return <FileText className="h-4 w-4" />;
      case "status_change": return <ArrowRight className="h-4 w-4" />;
      case "call_log": return <Phone className="h-4 w-4" />;
      case "email_log": return <Mail className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getInteractionLabel = (type: string) => {
    switch (type) {
      case "comment": return "Comentário";
      case "file": return "Arquivo";
      case "status_change": return "Mudança de Status";
      case "call_log": return "Registro de Ligação";
      case "email_log": return "Registro de E-mail";
      default: return "Interação";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {(client?.companyName || opportunity.title).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-xl truncate">{opportunity.title}</h2>
              <p className="text-muted-foreground truncate">{client?.companyName || "Cliente não informado"}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-primary">{formatCurrency(Number(opportunity.value || 0))}</div>
            {currentStage && (
              <Badge className={`${currentStage.color} text-white mt-1`}>
                {currentStage.label}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-1 mb-2">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className={`flex-1 h-2 rounded-full transition-colors ${index <= currentStageIndex ? stage.color : "bg-muted"}`}
              title={stage.label}
            />
          ))}
        </div>
        
        {nextStage && (
          <div className="flex justify-end mt-4">
            <Button 
              onClick={onAdvanceStage} 
              disabled={isPending}
              data-testid="button-advance-stage"
            >
              Avançar para {nextStage.label}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r bg-muted/10 overflow-y-auto">
          <div className="p-4 space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Informações do Cliente
              </h3>
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{client?.companyName || "—"}</span>
                  </div>
                  {client?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{client.phone}</span>
                    </div>
                  )}
                  {client?.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground truncate">{client.email}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {clientContacts.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Contatos ({clientContacts.length})
                </h3>
                <div className="space-y-2">
                  {clientContacts.map((contact) => (
                    <Card key={contact.id} className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {contact.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{contact.name}</div>
                          {contact.position && (
                            <div className="text-xs text-muted-foreground truncate">{contact.position}</div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 pl-11 space-y-1">
                        {contact.phone && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </div>
                        )}
                        {contact.email && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Detalhes da Oportunidade
              </h3>
              <Card className="p-4">
                <div className="space-y-3 text-sm">
                  {opportunity.probability !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Probabilidade</span>
                      <Badge variant="secondary">{opportunity.probability}%</Badge>
                    </div>
                  )}
                  {opportunity.expectedCloseDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Previsão</span>
                      <span className="font-medium">{new Date(opportunity.expectedCloseDate).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                  {opportunity.description && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground text-xs block mb-1">Descrição</span>
                      <p className="text-sm whitespace-pre-wrap">{opportunity.description}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Histórico de Interações
            </h3>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {loadingInteractions ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : interactionsList.length === 0 && opportunityActivities.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma interação registrada</p>
                  <p className="text-xs text-muted-foreground mt-1">Adicione um comentário abaixo</p>
                </div>
              ) : (
                <>
                  {interactionsList.map((interaction) => (
                    <div key={interaction.id} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {getInteractionIcon(interaction.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {getInteractionLabel(interaction.type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {interaction.createdAt && new Date(interaction.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {interaction.content && (
                          <p className="text-sm bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">{interaction.content}</p>
                        )}
                        {interaction.fileName && (
                          <div className="flex items-center gap-2 text-sm text-primary mt-1">
                            <Paperclip className="h-3 w-3" />
                            {interaction.fileName}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {opportunityActivities.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Atividades
                      </h4>
                      {opportunityActivities.map((activity) => (
                        <div key={activity.id} className="flex gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                            activity.status === "completed" ? "bg-green-500/10 text-green-500" : "bg-muted"
                          }`}>
                            {activity.status === "completed" ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm">{activity.title}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {activity.createdAt && new Date(activity.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                            )}
                            <Badge variant="outline" className="mt-2 text-xs">
                              {activity.type === "call" ? "Ligação" :
                               activity.type === "email" ? "E-mail" :
                               activity.type === "meeting" ? "Reunião" :
                               activity.type === "task" ? "Tarefa" : "Nota"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-muted/20">
            <div className="flex gap-2">
              <Textarea
                placeholder="Digite um comentário..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[80px] resize-none"
                data-testid="input-comment"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                disabled
                title="Em breve"
              >
                <Paperclip className="h-4 w-4 mr-1" />
                Anexar
              </Button>
              <Button
                size="sm"
                onClick={handleSendComment}
                disabled={!commentText.trim() || createInteractionMutation.isPending}
                data-testid="button-send-comment"
              >
                <Send className="h-4 w-4 mr-1" />
                Enviar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  client,
  contacts,
  activities,
  onDragStart,
  onDragEnd,
  onUpdateStatus,
  isUpdating,
}: {
  opportunity: Opportunity;
  client?: Client;
  contacts: Contact[];
  activities: Activity[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  isUpdating: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const currentStageIndex = stages.findIndex(s => s.id === opportunity.status);
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

  const handleAdvanceStage = () => {
    if (nextStage) {
      onUpdateStatus(opportunity.id, nextStage.id);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      <Card
        draggable
        onDragStart={(e) => onDragStart(e, opportunity.id)}
        onDragEnd={onDragEnd}
        onClick={handleCardClick}
        className="cursor-pointer hover-elevate transition-all select-none"
        data-testid={`pipeline-card-${opportunity.id}`}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <div data-drag-handle className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            </div>
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
              {formatCurrencyShort(Number(opportunity.value || 0))}
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

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Detalhes da Oportunidade</SheetTitle>
          </SheetHeader>
          <OpportunityDetailPanel
            opportunity={opportunity}
            client={client}
            contacts={contacts}
            activities={activities}
            onClose={() => setIsOpen(false)}
            onAdvanceStage={handleAdvanceStage}
            isPending={isUpdating}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function PipelineColumn({
  stage,
  opportunities,
  clients,
  contacts,
  activities,
  onDrop,
  onDragOver,
  onDragLeave,
  onDragStart,
  onDragEnd,
  onUpdateStatus,
  isLoading,
  isDragOver,
  isUpdating,
}: {
  stage: { id: string; label: string; color: string };
  opportunities: Opportunity[];
  clients: Client[];
  contacts: Contact[];
  activities: Activity[];
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDragLeave: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  isLoading: boolean;
  isDragOver: boolean;
  isUpdating: boolean;
}) {
  const totalValue = opportunities.reduce((acc, o) => acc + Number(o.value || 0), 0);

  return (
    <div
      className="flex flex-col h-full min-w-[280px] w-[280px] flex-shrink-0"
      onDrop={(e) => onDrop(e, stage.id)}
      onDragOver={(e) => onDragOver(e, stage.id)}
      onDragLeave={onDragLeave}
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
          {formatCurrencyShort(totalValue)}
        </span>
      </div>
      <div className={`flex-1 border border-t-0 rounded-b-lg p-2 space-y-2 min-h-[200px] transition-colors duration-150 ${isDragOver ? "bg-primary/10 border-primary/50" : "bg-muted/20"}`}>
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : opportunities.length === 0 ? (
          <div className={`flex items-center justify-center h-24 text-sm transition-colors ${isDragOver ? "text-primary" : "text-muted-foreground"}`}>
            {isDragOver ? "Solte aqui" : "Arraste oportunidades aqui"}
          </div>
        ) : (
          opportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              client={clients.find((c) => c.id === opp.clientId)}
              contacts={contacts}
              activities={activities}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onUpdateStatus={onUpdateStatus}
              isUpdating={isUpdating}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TriggerForm({
  trigger,
  onSave,
  onCancel,
  isPending,
}: {
  trigger?: PipelineTrigger;
  onSave: (data: Partial<InsertPipelineTrigger>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const form = useForm<TriggerFormData>({
    resolver: zodResolver(triggerFormSchema),
    defaultValues: {
      name: trigger?.name || "",
      fromStatus: trigger?.fromStatus || "any",
      toStatus: trigger?.toStatus || "",
      webhookUrl: trigger?.webhookUrl || "",
      httpMethod: (trigger?.httpMethod as any) || "POST",
      headers: trigger?.headers || "",
      bodyTemplate: trigger?.bodyTemplate || "",
      isActive: trigger?.isActive ?? true,
    },
  });

  const handleSubmit = (data: TriggerFormData) => {
    onSave({
      name: data.name,
      fromStatus: data.fromStatus === "any" ? null : data.fromStatus as any,
      toStatus: data.toStatus as any,
      webhookUrl: data.webhookUrl,
      httpMethod: data.httpMethod as any,
      headers: data.headers || null,
      bodyTemplate: data.bodyTemplate || null,
      isActive: data.isActive,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Trigger</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Ex: Notificar quando ganho"
                  data-testid="input-trigger-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fromStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>De (Estágio Origem)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-trigger-from-status">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="any">Qualquer estágio</SelectItem>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="toStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Para (Estágio Destino)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-trigger-to-status">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="httpMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método HTTP</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-trigger-method">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {httpMethods.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="webhookUrl"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>URL do Webhook</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="https://api.exemplo.com/webhook"
                    data-testid="input-trigger-url"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="headers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Headers (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder='{"Authorization": "Bearer token123"}'
                  className="font-mono text-sm"
                  data-testid="input-trigger-headers"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bodyTemplate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template do Body (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={'{\n  "oportunidade": "{{opportunity.title}}",\n  "valor": "{{opportunity.value}}",\n  "cliente": "{{client.companyName}}",\n  "novoStatus": "{{toStatus}}"\n}'}
                  className="font-mono text-sm min-h-[120px]"
                  data-testid="input-trigger-body"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis: {"{{opportunity.id}}"}, {"{{opportunity.title}}"}, {"{{opportunity.value}}"}, {"{{opportunity.status}}"}, {"{{opportunity.probability}}"}, {"{{fromStatus}}"}, {"{{toStatus}}"}, {"{{client.id}}"}, {"{{client.companyName}}"}, {"{{client.email}}"}, {"{{client.phone}}"}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-trigger-active"
                />
              </FormControl>
              <FormLabel className="!mt-0">Trigger ativo</FormLabel>
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-save-trigger">
            {isPending ? "Salvando..." : trigger ? "Atualizar" : "Criar Trigger"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function TriggersTab() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<PipelineTrigger | null>(null);

  const { data: triggers = [], isLoading } = useQuery<PipelineTrigger[]>({
    queryKey: ["/api/pipeline-triggers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertPipelineTrigger>) => {
      return apiRequest("POST", "/api/pipeline-triggers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-triggers"] });
      setIsDialogOpen(false);
      toast({ title: "Sucesso", description: "Trigger criado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao criar trigger", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPipelineTrigger> }) => {
      return apiRequest("PATCH", `/api/pipeline-triggers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-triggers"] });
      setIsDialogOpen(false);
      setEditingTrigger(null);
      toast({ title: "Sucesso", description: "Trigger atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao atualizar trigger", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/pipeline-triggers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-triggers"] });
      toast({ title: "Sucesso", description: "Trigger removido com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao remover trigger", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/pipeline-triggers/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-triggers"] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao atualizar trigger", variant: "destructive" });
    },
  });

  const handleSave = (data: Partial<InsertPipelineTrigger>) => {
    if (editingTrigger) {
      updateMutation.mutate({ id: editingTrigger.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (trigger: PipelineTrigger) => {
    setEditingTrigger(trigger);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTrigger(null);
  };

  const getStageLabel = (id: string | null) => {
    if (!id) return "Qualquer";
    return stages.find((s) => s.id === id)?.label || id;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Triggers de Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Configure webhooks que disparam quando cards mudam de estágio
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) handleCloseDialog();
          else setIsDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-trigger">
              <Plus className="h-4 w-4 mr-2" />
              Novo Trigger
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTrigger ? "Editar Trigger" : "Novo Trigger"}
              </DialogTitle>
            </DialogHeader>
            <TriggerForm
              trigger={editingTrigger || undefined}
              onSave={handleSave}
              onCancel={handleCloseDialog}
              isPending={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : triggers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-1">Nenhum trigger configurado</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Crie triggers para enviar notificações automáticas para APIs externas quando oportunidades mudarem de estágio no pipeline.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ativo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>De</TableHead>
                <TableHead>Para</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {triggers.map((trigger) => (
                <TableRow key={trigger.id} data-testid={`trigger-row-${trigger.id}`}>
                  <TableCell>
                    <Switch
                      checked={trigger.isActive ?? true}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: trigger.id, isActive: checked })}
                      data-testid={`switch-trigger-${trigger.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{trigger.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getStageLabel(trigger.fromStatus)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getStageLabel(trigger.toStatus)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{trigger.httpMethod}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {trigger.webhookUrl}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(trigger)}
                        data-testid={`button-edit-trigger-${trigger.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(trigger.id)}
                        data-testid={`button-delete-trigger-${trigger.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

export default function PipelinePage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const { data: opportunities = [], isLoading: oppLoading } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities"],
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const isLoading = oppLoading || clientsLoading;

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/opportunities/${id}`, { status });
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/opportunities"] });
      const previousOpportunities = queryClient.getQueryData<Opportunity[]>(["/api/opportunities"]);
      queryClient.setQueryData<Opportunity[]>(["/api/opportunities"], (old) =>
        old?.map((opp) => (opp.id === id ? { ...opp, status: status as any } : opp)) ?? []
      );
      return { previousOpportunities };
    },
    onError: (err, variables, context) => {
      if (context?.previousOpportunities) {
        queryClient.setQueryData(["/api/opportunities"], context.previousOpportunities);
      }
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a oportunidade",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
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
    if (e.dataTransfer.setDragImage) {
      const target = e.currentTarget as HTMLElement;
      e.dataTransfer.setDragImage(target, target.offsetWidth / 2, 20);
    }
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverStage(null);
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
    setDragOverStage(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: InsertOpportunity = {
      title: formData.get("title") as string,
      clientId: formData.get("clientId") as string,
      value: formData.get("value") as string,
      status: "novo_lead",
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
        <div className="flex items-center gap-2">
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

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-pipeline-settings">
                <Settings2 className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader className="mb-6">
                <SheetTitle>Automações do Pipeline</SheetTitle>
              </SheetHeader>
              <TriggersTab />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <ScrollArea className="flex-1 w-full">
        <div className="flex gap-4 pb-4 h-[calc(100vh-180px)]">
          {stages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              opportunities={opportunities.filter((o) => o.status === stage.id)}
              clients={clients}
              contacts={contacts}
              activities={activities}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onUpdateStatus={(id, status) => updateMutation.mutate({ id, status })}
              isLoading={isLoading}
              isDragOver={dragOverStage === stage.id}
              isUpdating={updateMutation.isPending}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
