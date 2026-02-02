import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Plus, GripVertical, Building2, DollarSign, Webhook, Trash2, Pencil, Settings2,
  Phone, Mail, MessageSquare, ArrowRight, Clock, CheckCircle2,
  Send, Paperclip, FileText, Kanban, User, Scale, Users, FileSearch, Handshake
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Lead, Advogado, Escritorio, Reclamante, PipelineTrigger, Activity, Interaction, InsertLead } from "@shared/schema";
import { PIPELINE_STAGES, type PipelineType } from "@shared/schema";

const PIPELINE_LABELS: Record<PipelineType, { label: string; icon: JSX.Element; description: string }> = {
  advogados: { label: "Advogados", icon: <Scale className="h-4 w-4" />, description: "Pipeline de advogados" },
  escritorios: { label: "Escritórios", icon: <Building2 className="h-4 w-4" />, description: "Pipeline de escritórios" },
  reclamantes: { label: "Reclamantes", icon: <Users className="h-4 w-4" />, description: "Pipeline de reclamantes" },
  triagem: { label: "Triagem", icon: <FileSearch className="h-4 w-4" />, description: "Pipeline de triagem" },
  fechamento: { label: "Fechamento", icon: <Handshake className="h-4 w-4" />, description: "Pipeline de fechamento" },
};

const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const triggerFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  pipelineType: z.enum(["advogados", "escritorios", "reclamantes", "triagem", "fechamento"]),
  fromStage: z.string().optional(),
  toStage: z.string().min(1, "Estágio destino é obrigatório"),
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

function getStageColor(stageId: string, pipelineType: PipelineType) {
  const stages = PIPELINE_STAGES[pipelineType];
  const stage = stages.find(s => s.id === stageId);
  return stage?.color || "bg-gray-500";
}

function InlineEditField({ 
  value, 
  onSave, 
  type = "text",
  className = "",
  placeholder = ""
}: { 
  value: string; 
  onSave: (val: string) => void;
  type?: "text" | "number" | "currency" | "textarea";
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    if (!editing) {
      setTempValue(value);
    }
  }, [value, editing]);

  const handleBlur = () => {
    setEditing(false);
    if (tempValue !== value) {
      onSave(tempValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "textarea") {
      handleBlur();
    }
    if (e.key === "Escape") {
      setTempValue(value);
      setEditing(false);
    }
  };

  if (editing) {
    if (type === "textarea") {
      return (
        <Textarea
          autoFocus
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`min-h-[60px] ${className}`}
        />
      );
    }
    return (
      <Input
        autoFocus
        type={type === "currency" ? "number" : type}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`h-8 ${className}`}
        step={type === "currency" ? "0.01" : undefined}
        placeholder={placeholder}
      />
    );
  }

  const displayValue = type === "currency" 
    ? formatCurrency(Number(value) || 0)
    : value || placeholder || "—";

  return (
    <span 
      onClick={() => {
        setTempValue(value);
        setEditing(true);
      }}
      className={`cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors inline-block min-w-[60px] ${className}`}
    >
      {displayValue}
    </span>
  );
}

function getEntityName(lead: Lead, advogados: Advogado[], escritorios: Escritorio[], reclamantes: Reclamante[]): string {
  if (lead.advogadoId) {
    const adv = advogados.find(a => a.id === lead.advogadoId);
    return adv?.nome || "Advogado";
  }
  if (lead.escritorioId) {
    const esc = escritorios.find(e => e.id === lead.escritorioId);
    return esc?.nome || "Escritório";
  }
  if (lead.reclamanteId) {
    const rec = reclamantes.find(r => r.id === lead.reclamanteId);
    return rec?.nome || "Reclamante";
  }
  return "—";
}

function LeadDetailPanel({
  lead,
  advogados,
  escritorios,
  reclamantes,
  activities,
  pipelineType,
  onClose,
  onAdvanceStage,
  isPending,
}: {
  lead: Lead;
  advogados: Advogado[];
  escritorios: Escritorio[];
  reclamantes: Reclamante[];
  activities: Activity[];
  pipelineType: PipelineType;
  onClose: () => void;
  onAdvanceStage: () => void;
  isPending: boolean;
}) {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [showNewAdvogado, setShowNewAdvogado] = useState(false);
  const [showNewEscritorio, setShowNewEscritorio] = useState(false);
  const [showNewReclamante, setShowNewReclamante] = useState(false);
  const [newAdvogado, setNewAdvogado] = useState({ nome: "", oab: "", telefone: "", email: "", numeroCaso: "" });
  const [newEscritorio, setNewEscritorio] = useState({ nome: "", cnpj: "", telefone: "", email: "", numeroCaso: "" });
  const [newReclamante, setNewReclamante] = useState({ nome: "", cpf: "", telefone: "", email: "", processoNumero: "" });
  
  const stages = PIPELINE_STAGES[pipelineType];
  const currentStageIndex = stages.findIndex(s => s.id === lead.stage);
  const currentStage = stages[currentStageIndex];
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;
  const leadActivities = activities.filter(a => a.leadId === lead.id);

  const { data: interactionsList = [], isLoading: loadingInteractions } = useQuery<Interaction[]>({
    queryKey: [`/api/leads/${lead.id}/interactions`],
  });

  const updateFieldMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("PATCH", `/api/leads/${lead.id}`, data);
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["/api/leads"] });
      const previousLeads = queryClient.getQueryData<Lead[]>(["/api/leads"]);
      queryClient.setQueryData<Lead[]>(["/api/leads"], (old) =>
        old?.map((l) => (l.id === lead.id ? { ...l, ...data } : l)) ?? []
      );
      return { previousLeads };
    },
    onError: (err, variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(["/api/leads"], context.previousLeads);
      }
      toast({ title: "Erro ao atualizar lead", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const handleUpdateField = (field: string, value: any) => {
    updateFieldMutation.mutate({ [field]: value });
  };

  const createInteractionMutation = useMutation({
    mutationFn: async (data: { type: string; content: string }) => {
      return apiRequest("POST", "/api/interactions", {
        leadId: lead.id,
        type: data.type,
        content: data.content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${lead.id}/interactions`] });
      setCommentText("");
      toast({ title: "Comentário adicionado" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar comentário", variant: "destructive" });
    },
  });

  const createAdvogadoMutation = useMutation({
    mutationFn: async (data: typeof newAdvogado) => {
      return apiRequest("POST", "/api/advogados", data);
    },
    onSuccess: async (response) => {
      const created = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/advogados"] });
      handleUpdateField("advogadoId", created.id);
      setShowNewAdvogado(false);
      setNewAdvogado({ nome: "", oab: "", telefone: "", email: "", numeroCaso: "" });
      toast({ title: "Advogado criado e vinculado" });
    },
    onError: () => {
      toast({ title: "Erro ao criar advogado", variant: "destructive" });
    },
  });

  const createEscritorioMutation = useMutation({
    mutationFn: async (data: typeof newEscritorio) => {
      return apiRequest("POST", "/api/escritorios", data);
    },
    onSuccess: async (response) => {
      const created = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/escritorios"] });
      handleUpdateField("escritorioId", created.id);
      setShowNewEscritorio(false);
      setNewEscritorio({ nome: "", cnpj: "", telefone: "", email: "", numeroCaso: "" });
      toast({ title: "Escritório criado e vinculado" });
    },
    onError: () => {
      toast({ title: "Erro ao criar escritório", variant: "destructive" });
    },
  });

  const createReclamanteMutation = useMutation({
    mutationFn: async (data: typeof newReclamante) => {
      return apiRequest("POST", "/api/reclamantes", data);
    },
    onSuccess: async (response) => {
      const created = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/reclamantes"] });
      handleUpdateField("reclamanteId", created.id);
      setShowNewReclamante(false);
      setNewReclamante({ nome: "", cpf: "", telefone: "", email: "", processoNumero: "" });
      toast({ title: "Reclamante criado e vinculado" });
    },
    onError: () => {
      toast({ title: "Erro ao criar reclamante", variant: "destructive" });
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

  const advogado = lead.advogadoId ? advogados.find(a => a.id === lead.advogadoId) : null;
  const escritorio = lead.escritorioId ? escritorios.find(e => e.id === lead.escritorioId) : null;
  const reclamante = lead.reclamanteId ? reclamantes.find(r => r.id === lead.reclamanteId) : null;

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {lead.titulo.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-xl truncate">{lead.titulo}</h2>
              <p className="text-muted-foreground truncate">
                {getEntityName(lead, advogados, escritorios, reclamantes)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-primary">{formatCurrency(Number(lead.valor || 0))}</div>
              {currentStage && (
                <Badge className={`${currentStage.color} text-white mt-1`}>
                  {currentStage.label}
                </Badge>
              )}
            </div>
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
                Dados Básicos
              </h3>
              <Card className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Título</Label>
                    <InlineEditField
                      value={lead.titulo}
                      onSave={(val) => handleUpdateField("titulo", val)}
                      className="font-medium block"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Valor (R$)</Label>
                    <InlineEditField
                      value={lead.valor || "0"}
                      type="currency"
                      onSave={(val) => handleUpdateField("valor", val)}
                      className="font-bold text-green-600 block"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Probabilidade (%)</Label>
                    <InlineEditField
                      value={(lead.probabilidade || 0).toString()}
                      type="number"
                      onSave={(val) => handleUpdateField("probabilidade", parseInt(val) || 0)}
                      placeholder="0-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Descrição</Label>
                    <InlineEditField
                      value={lead.descricao || ""}
                      type="textarea"
                      onSave={(val) => handleUpdateField("descricao", val)}
                      placeholder="Clique para adicionar..."
                      className="text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-1 pt-2 border-t">
                    <Label className="text-muted-foreground text-xs">Pipeline</Label>
                    <Select 
                      value={lead.pipelineType} 
                      onValueChange={(v) => {
                        const newPipeline = v as PipelineType;
                        const newStages = PIPELINE_STAGES[newPipeline];
                        handleUpdateField("pipelineType", newPipeline);
                        handleUpdateField("stage", newStages[0].id);
                      }}
                    >
                      <SelectTrigger data-testid="select-pipeline">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PIPELINE_LABELS).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Estágio</Label>
                    <Select 
                      value={lead.stage} 
                      onValueChange={(v) => handleUpdateField("stage", v)}
                    >
                      <SelectTrigger data-testid="select-stage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {lead.createdAt && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-muted-foreground">Criado em</span>
                      <span>{new Date(lead.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Advogado
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setShowNewAdvogado(!showNewAdvogado)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Novo
                </Button>
              </div>
              <Card className="p-4 space-y-3">
                {showNewAdvogado ? (
                  <div className="space-y-3">
                    <Input
                      placeholder="Nome *"
                      value={newAdvogado.nome}
                      onChange={(e) => setNewAdvogado({...newAdvogado, nome: e.target.value})}
                    />
                    <Input
                      placeholder="OAB"
                      value={newAdvogado.oab}
                      onChange={(e) => setNewAdvogado({...newAdvogado, oab: e.target.value})}
                    />
                    <Input
                      placeholder="Telefone"
                      value={newAdvogado.telefone}
                      onChange={(e) => setNewAdvogado({...newAdvogado, telefone: e.target.value})}
                    />
                    <Input
                      placeholder="Email"
                      value={newAdvogado.email}
                      onChange={(e) => setNewAdvogado({...newAdvogado, email: e.target.value})}
                    />
                    <Input
                      placeholder="Número do Caso"
                      value={newAdvogado.numeroCaso}
                      onChange={(e) => setNewAdvogado({...newAdvogado, numeroCaso: e.target.value})}
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => createAdvogadoMutation.mutate(newAdvogado)}
                        disabled={!newAdvogado.nome || createAdvogadoMutation.isPending}
                      >
                        {createAdvogadoMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowNewAdvogado(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Select 
                      value={lead.advogadoId || "none"} 
                      onValueChange={(v) => handleUpdateField("advogadoId", v === "none" ? null : v)}
                    >
                      <SelectTrigger data-testid="select-advogado">
                        <SelectValue placeholder="Selecione um advogado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {advogados.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.nome}{a.numeroCaso ? ` (${a.numeroCaso})` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {advogado && (
                      <div className="space-y-2 pt-2 border-t">
                        {advogado.oab && (
                          <div className="text-xs text-muted-foreground">OAB: {advogado.oab}</div>
                        )}
                        {(advogado as any).numeroCaso && (
                          <div className="text-xs text-muted-foreground">Caso: {(advogado as any).numeroCaso}</div>
                        )}
                        {advogado.telefone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">{advogado.telefone}</span>
                          </div>
                        )}
                        {advogado.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground truncate">{advogado.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Escritório
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setShowNewEscritorio(!showNewEscritorio)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Novo
                </Button>
              </div>
              <Card className="p-4 space-y-3">
                {showNewEscritorio ? (
                  <div className="space-y-3">
                    <Input
                      placeholder="Nome *"
                      value={newEscritorio.nome}
                      onChange={(e) => setNewEscritorio({...newEscritorio, nome: e.target.value})}
                    />
                    <Input
                      placeholder="CNPJ"
                      value={newEscritorio.cnpj}
                      onChange={(e) => setNewEscritorio({...newEscritorio, cnpj: e.target.value})}
                    />
                    <Input
                      placeholder="Telefone"
                      value={newEscritorio.telefone}
                      onChange={(e) => setNewEscritorio({...newEscritorio, telefone: e.target.value})}
                    />
                    <Input
                      placeholder="Email"
                      value={newEscritorio.email}
                      onChange={(e) => setNewEscritorio({...newEscritorio, email: e.target.value})}
                    />
                    <Input
                      placeholder="Número do Caso"
                      value={newEscritorio.numeroCaso}
                      onChange={(e) => setNewEscritorio({...newEscritorio, numeroCaso: e.target.value})}
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => createEscritorioMutation.mutate(newEscritorio)}
                        disabled={!newEscritorio.nome || createEscritorioMutation.isPending}
                      >
                        {createEscritorioMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowNewEscritorio(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Select 
                      value={lead.escritorioId || "none"} 
                      onValueChange={(v) => handleUpdateField("escritorioId", v === "none" ? null : v)}
                    >
                      <SelectTrigger data-testid="select-escritorio">
                        <SelectValue placeholder="Selecione um escritório" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {escritorios.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.nome}{(e as any).numeroCaso ? ` (${(e as any).numeroCaso})` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {escritorio && (
                      <div className="space-y-2 pt-2 border-t">
                        {escritorio.cnpj && (
                          <div className="text-xs text-muted-foreground">CNPJ: {escritorio.cnpj}</div>
                        )}
                        {(escritorio as any).numeroCaso && (
                          <div className="text-xs text-muted-foreground">Caso: {(escritorio as any).numeroCaso}</div>
                        )}
                        {escritorio.telefone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">{escritorio.telefone}</span>
                          </div>
                        )}
                        {escritorio.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground truncate">{escritorio.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Reclamante
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setShowNewReclamante(!showNewReclamante)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Novo
                </Button>
              </div>
              <Card className="p-4 space-y-3">
                {showNewReclamante ? (
                  <div className="space-y-3">
                    <Input
                      placeholder="Nome *"
                      value={newReclamante.nome}
                      onChange={(e) => setNewReclamante({...newReclamante, nome: e.target.value})}
                    />
                    <Input
                      placeholder="CPF"
                      value={newReclamante.cpf}
                      onChange={(e) => setNewReclamante({...newReclamante, cpf: e.target.value})}
                    />
                    <Input
                      placeholder="Telefone"
                      value={newReclamante.telefone}
                      onChange={(e) => setNewReclamante({...newReclamante, telefone: e.target.value})}
                    />
                    <Input
                      placeholder="Email"
                      value={newReclamante.email}
                      onChange={(e) => setNewReclamante({...newReclamante, email: e.target.value})}
                    />
                    <Input
                      placeholder="Número do Processo/Caso"
                      value={newReclamante.processoNumero}
                      onChange={(e) => setNewReclamante({...newReclamante, processoNumero: e.target.value})}
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => createReclamanteMutation.mutate(newReclamante)}
                        disabled={!newReclamante.nome || createReclamanteMutation.isPending}
                      >
                        {createReclamanteMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowNewReclamante(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Select 
                      value={lead.reclamanteId || "none"} 
                      onValueChange={(v) => handleUpdateField("reclamanteId", v === "none" ? null : v)}
                    >
                      <SelectTrigger data-testid="select-reclamante">
                        <SelectValue placeholder="Selecione um reclamante" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {reclamantes.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.nome}{r.processoNumero ? ` (${r.processoNumero})` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {reclamante && (
                      <div className="space-y-2 pt-2 border-t">
                        {reclamante.cpf && (
                          <div className="text-xs text-muted-foreground">CPF: {reclamante.cpf}</div>
                        )}
                        {reclamante.processoNumero && (
                          <div className="text-xs text-muted-foreground">Processo: {reclamante.processoNumero}</div>
                        )}
                        {reclamante.telefone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">{reclamante.telefone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>

            {lead.descricao && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Descrição
                </h3>
                <Card className="p-4">
                  <p className="text-sm whitespace-pre-wrap">{lead.descricao}</p>
                </Card>
              </div>
            )}

            {(lead.valorFechamento || lead.percentualComissao || lead.formaPagamento || lead.observacoesFinanceiras) && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Informações Financeiras
                </h3>
                <Card className="p-4">
                  <div className="space-y-3 text-sm">
                    {lead.valorFechamento && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Valor Fechamento</span>
                        <span className="font-bold text-green-600">{formatCurrency(Number(lead.valorFechamento))}</span>
                      </div>
                    )}
                    {lead.percentualComissao && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Comissão</span>
                        <span>{lead.percentualComissao}%</span>
                      </div>
                    )}
                    {lead.formaPagamento && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Forma de Pagamento</span>
                        <span>{lead.formaPagamento}</span>
                      </div>
                    )}
                    {lead.observacoesFinanceiras && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground text-xs block mb-1">Observações</span>
                        <p className="text-sm whitespace-pre-wrap">{lead.observacoesFinanceiras}</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
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
              ) : interactionsList.length === 0 && leadActivities.length === 0 ? (
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
                  
                  {leadActivities.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Atividades
                      </h4>
                      {leadActivities.map((activity) => (
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

function LeadCard({
  lead,
  advogados,
  escritorios,
  reclamantes,
  activities,
  pipelineType,
  onDragStart,
  onDragEnd,
  onUpdateStage,
  onDropOnLead,
  onSelect,
  onDelete,
  isDragOver,
  isUpdating,
}: {
  lead: Lead;
  advogados: Advogado[];
  escritorios: Escritorio[];
  reclamantes: Reclamante[];
  activities: Activity[];
  pipelineType: PipelineType;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onUpdateStage: (id: string, stage: string) => void;
  onDropOnLead: (e: React.DragEvent, leadId: string) => void;
  onSelect: (leadId: string) => void;
  onDelete: (id: string) => void;
  isDragOver: boolean;
  isUpdating: boolean;
}) {
  const stages = PIPELINE_STAGES[pipelineType];
  const currentStageIndex = stages.findIndex(s => s.id === lead.stage);
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

  const handleAdvanceStage = () => {
    if (nextStage) {
      onUpdateStage(lead.id, nextStage.id);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      return;
    }
    onSelect(lead.id);
  };

  const handleDragOverCard = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const currentStage = stages[currentStageIndex];
  const entityName = getEntityName(lead, advogados, escritorios, reclamantes);
  const prevStage = currentStageIndex > 0 ? stages[currentStageIndex - 1] : null;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          draggable
          onDragStart={(e) => onDragStart(e, lead.id)}
          onDragEnd={onDragEnd}
          onDragOver={handleDragOverCard}
          onDrop={(e) => onDropOnLead(e, lead.id)}
          onClick={handleCardClick}
          className={`cursor-pointer card-premium select-none group border-0 transition-all ${isDragOver ? "ring-2 ring-primary ring-offset-1" : ""}`}
          data-testid={`pipeline-card-${lead.id}`}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div data-drag-handle className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm leading-tight">{lead.titulo}</p>
                  {lead.probabilidade !== null && lead.probabilidade !== undefined && (
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${currentStage?.color} text-white`}>
                      {lead.probabilidade}%
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    {pipelineType === "advogados" && <Scale className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
                    {pipelineType === "escritorios" && <Building2 className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
                    {pipelineType === "reclamantes" && <User className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
                    {pipelineType === "triagem" && <FileSearch className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
                    {pipelineType === "fechamento" && <Handshake className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
                  </div>
                  <span className="truncate font-medium">{entityName}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-dashed">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <DollarSign className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  {formatCurrencyShort(Number(lead.valor || 0))}
                </span>
              </div>
              {lead.previsaoFechamento && (
                <Badge variant="outline" className="text-xs">
                  {new Date(lead.previsaoFechamento).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48" data-testid={`context-menu-${lead.id}`}>
        <ContextMenuItem onClick={() => onSelect(lead.id)} data-testid="context-menu-view">
          <FileText className="h-4 w-4 mr-2" />
          Ver detalhes
        </ContextMenuItem>
        <ContextMenuSeparator />
        {prevStage && (
          <ContextMenuItem onClick={() => onUpdateStage(lead.id, prevStage.id)} data-testid="context-menu-prev-stage">
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Voltar para {prevStage.label}
          </ContextMenuItem>
        )}
        {nextStage && (
          <ContextMenuItem onClick={handleAdvanceStage} data-testid="context-menu-next-stage">
            <ArrowRight className="h-4 w-4 mr-2" />
            Avançar para {nextStage.label}
          </ContextMenuItem>
        )}
        {(prevStage || nextStage) && <ContextMenuSeparator />}
        <ContextMenuItem 
          onClick={() => onDelete(lead.id)} 
          className="text-destructive focus:text-destructive"
          data-testid="context-menu-delete"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir lead
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function PipelineColumn({
  stage,
  leads,
  advogados,
  escritorios,
  reclamantes,
  activities,
  pipelineType,
  onDrop,
  onDragOver,
  onDragLeave,
  onDragStart,
  onDragEnd,
  onUpdateStage,
  onDropOnLead,
  onSelectLead,
  onDeleteLead,
  dragOverLeadId,
  isLoading,
  isDragOver,
  isUpdating,
}: {
  stage: { id: string; label: string; color: string };
  leads: Lead[];
  advogados: Advogado[];
  escritorios: Escritorio[];
  reclamantes: Reclamante[];
  activities: Activity[];
  pipelineType: PipelineType;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDragLeave: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onUpdateStage: (id: string, stage: string) => void;
  onDropOnLead: (e: React.DragEvent, leadId: string, stageId: string) => void;
  onSelectLead: (leadId: string) => void;
  onDeleteLead: (id: string) => void;
  dragOverLeadId: string | null;
  isLoading: boolean;
  isDragOver: boolean;
  isUpdating: boolean;
}) {
  const totalValue = leads.reduce((acc, l) => acc + Number(l.valor || 0), 0);
  
  // Sort leads by position
  const sortedLeads = [...leads].sort((a, b) => (a.position || 0) - (b.position || 0));

  return (
    <div
      className={`flex flex-col w-80 shrink-0 rounded-xl transition-all duration-200 ${
        isDragOver ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      }`}
      onDrop={(e) => onDrop(e, stage.id)}
      onDragOver={(e) => onDragOver(e, stage.id)}
      onDragLeave={onDragLeave}
    >
      <div className={`rounded-t-xl px-4 py-3 ${stage.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-sm">{stage.label}</h3>
            <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
              {leads.length}
            </Badge>
          </div>
        </div>
        <div className="text-white/80 text-xs mt-1">
          {formatCurrencyShort(totalValue)}
        </div>
      </div>

      <ScrollArea className="flex-1 bg-muted/30 rounded-b-xl">
        <div className="p-3 space-y-3 min-h-[200px]">
          {isLoading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : sortedLeads.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Nenhum lead
            </div>
          ) : (
            sortedLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                advogados={advogados}
                escritorios={escritorios}
                reclamantes={reclamantes}
                activities={activities}
                pipelineType={pipelineType}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onUpdateStage={onUpdateStage}
                onDropOnLead={(e, leadId) => onDropOnLead(e, leadId, stage.id)}
                onSelect={onSelectLead}
                onDelete={onDeleteLead}
                isDragOver={dragOverLeadId === lead.id}
                isUpdating={isUpdating}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function TriggerForm({
  trigger,
  onSave,
  onCancel,
  isPending,
  selectedPipelineType,
}: {
  trigger?: PipelineTrigger;
  onSave: (data: TriggerFormData) => void;
  onCancel: () => void;
  isPending: boolean;
  selectedPipelineType: PipelineType;
}) {
  const form = useForm<TriggerFormData>({
    resolver: zodResolver(triggerFormSchema),
    defaultValues: {
      name: trigger?.name || "",
      pipelineType: (trigger?.pipelineType as PipelineType) || selectedPipelineType,
      fromStage: trigger?.fromStage || "",
      toStage: trigger?.toStage || "",
      webhookUrl: trigger?.webhookUrl || "",
      httpMethod: (trigger?.httpMethod as TriggerFormData["httpMethod"]) || "POST",
      headers: trigger?.headers || "",
      bodyTemplate: trigger?.bodyTemplate || "",
      isActive: trigger?.isActive ?? true,
    },
  });

  const watchedPipelineType = form.watch("pipelineType") as PipelineType;
  const stages = PIPELINE_STAGES[watchedPipelineType] || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Trigger</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Notificar Slack ao qualificar" {...field} data-testid="input-trigger-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pipelineType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pipeline</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-trigger-pipeline">
                    <SelectValue placeholder="Selecione o pipeline" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(PIPELINE_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fromStage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>De (estágio origem)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-trigger-from">
                      <SelectValue placeholder="Qualquer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">Qualquer</SelectItem>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="toStage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Para (estágio destino)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-trigger-to">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
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
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="col-span-2">
            <FormField
              control={form.control}
              name="webhookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Webhook</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} data-testid="input-trigger-url" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="headers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Headers (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{"Authorization": "Bearer token"}'
                  className="font-mono text-sm"
                  {...field}
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
                  placeholder='{"leadId": "{{lead.id}}", "stage": "{{lead.stage}}"}'
                  className="font-mono text-sm"
                  {...field}
                  data-testid="input-trigger-body"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel>Ativo</FormLabel>
                <p className="text-xs text-muted-foreground">Trigger será executado quando condições forem atendidas</p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-trigger-active" />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-save-trigger">
            {isPending ? "Salvando..." : trigger ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function TriggersTab({ pipelineType }: { pipelineType: PipelineType }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<PipelineTrigger | null>(null);

  const { data: triggers = [], isLoading } = useQuery<PipelineTrigger[]>({
    queryKey: ["/api/pipeline-triggers"],
  });

  const filteredTriggers = triggers.filter(t => t.pipelineType === pipelineType);
  const stages = PIPELINE_STAGES[pipelineType];

  const createMutation = useMutation({
    mutationFn: async (data: TriggerFormData) => {
      return apiRequest("POST", "/api/pipeline-triggers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-triggers"] });
      setIsDialogOpen(false);
      toast({ title: "Trigger criado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao criar trigger", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TriggerFormData> }) => {
      return apiRequest("PATCH", `/api/pipeline-triggers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-triggers"] });
      setIsDialogOpen(false);
      setEditingTrigger(null);
      toast({ title: "Trigger atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar trigger", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/pipeline-triggers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-triggers"] });
      toast({ title: "Trigger excluído" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir trigger", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/pipeline-triggers/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-triggers"] });
    },
  });

  const handleSave = (data: TriggerFormData) => {
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

  const getStageLabel = (stageId: string | null | undefined) => {
    if (!stageId) return "Qualquer";
    const stage = stages.find(s => s.id === stageId);
    return stage?.label || stageId;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Triggers do Pipeline</h3>
          <p className="text-sm text-muted-foreground">Webhooks automáticos quando leads mudam de estágio</p>
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
              selectedPipelineType={pipelineType}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredTriggers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-1">Nenhum trigger configurado</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Crie triggers para enviar notificações automáticas quando leads mudarem de estágio.
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
              {filteredTriggers.map((trigger) => (
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
                    <Badge variant="outline">{getStageLabel(trigger.fromStage)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getStageLabel(trigger.toStage)}</Badge>
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
  const [dragOverLeadId, setDragOverLeadId] = useState<string | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineType>("advogados");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  
  // Inline entity creation states
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [newEntityData, setNewEntityData] = useState({ nome: "", oab: "", cnpj: "", cpf: "", telefone: "", email: "", numeroCaso: "", processoNumero: "" });
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    if ((e.target as HTMLElement).closest('[draggable="true"]')) return;
    
    setIsDraggingScroll(true);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeft(container.scrollLeft);
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingScroll) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
  }, [isDraggingScroll, startX, scrollLeft]);

  const handleMouseUp = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.style.cursor = 'grab';
      container.style.userSelect = '';
    }
    setIsDraggingScroll(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDraggingScroll) {
      handleMouseUp();
    }
  }, [isDraggingScroll, handleMouseUp]);

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: advogados = [] } = useQuery<Advogado[]>({
    queryKey: ["/api/advogados"],
  });

  const { data: escritorios = [] } = useQuery<Escritorio[]>({
    queryKey: ["/api/escritorios"],
  });

  const { data: reclamantes = [] } = useQuery<Reclamante[]>({
    queryKey: ["/api/reclamantes"],
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const isLoading = leadsLoading;

  const filteredLeads = leads.filter(l => l.pipelineType === selectedPipeline);
  const stages = PIPELINE_STAGES[selectedPipeline];

  const updateMutation = useMutation({
    mutationFn: async ({ id, stage, position }: { id: string; stage?: string; position?: number }) => {
      const data: { stage?: string; position?: number } = {};
      if (stage !== undefined) data.stage = stage;
      if (position !== undefined) data.position = position;
      return apiRequest("PATCH", `/api/leads/${id}`, data);
    },
    onMutate: async ({ id, stage, position }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/leads"] });
      const previousLeads = queryClient.getQueryData<Lead[]>(["/api/leads"]);
      queryClient.setQueryData<Lead[]>(["/api/leads"], (old) =>
        old?.map((lead) => {
          if (lead.id !== id) return lead;
          const updates: Partial<Lead> = {};
          if (stage !== undefined) updates.stage = stage;
          if (position !== undefined) updates.position = position;
          return { ...lead, ...updates };
        }) ?? []
      );
      return { previousLeads };
    },
    onError: (err, variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(["/api/leads"], context.previousLeads);
      }
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o lead",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertLead>) => {
      return apiRequest("POST", "/api/leads", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsDialogOpen(false);
      setSelectedEntityId("");
      setShowInlineCreate(false);
      setNewEntityData({ nome: "", oab: "", cnpj: "", cpf: "", telefone: "", email: "", numeroCaso: "", processoNumero: "" });
      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o lead",
        variant: "destructive",
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelectedLeadId(null);
      toast({ title: "Lead excluído com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir lead", variant: "destructive" });
    },
  });

  const createInlineAdvogadoMutation = useMutation({
    mutationFn: async (data: { nome: string; oab: string; telefone: string; email: string; numeroCaso: string }) => {
      const response = await apiRequest("POST", "/api/advogados", data);
      return response.json();
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/advogados"] });
      setSelectedEntityId(created.id);
      setShowInlineCreate(false);
      setNewEntityData({ nome: "", oab: "", cnpj: "", cpf: "", telefone: "", email: "", numeroCaso: "", processoNumero: "" });
      toast({ title: "Advogado criado" });
    },
    onError: () => {
      toast({ title: "Erro ao criar advogado", variant: "destructive" });
    },
  });

  const createInlineEscritorioMutation = useMutation({
    mutationFn: async (data: { nome: string; cnpj: string; telefone: string; email: string; numeroCaso: string }) => {
      const response = await apiRequest("POST", "/api/escritorios", data);
      return response.json();
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/escritorios"] });
      setSelectedEntityId(created.id);
      setShowInlineCreate(false);
      setNewEntityData({ nome: "", oab: "", cnpj: "", cpf: "", telefone: "", email: "", numeroCaso: "", processoNumero: "" });
      toast({ title: "Escritório criado" });
    },
    onError: () => {
      toast({ title: "Erro ao criar escritório", variant: "destructive" });
    },
  });

  const createInlineReclamanteMutation = useMutation({
    mutationFn: async (data: { nome: string; cpf: string; telefone: string; email: string; processoNumero: string }) => {
      const response = await apiRequest("POST", "/api/reclamantes", data);
      return response.json();
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reclamantes"] });
      setSelectedEntityId(created.id);
      setShowInlineCreate(false);
      setNewEntityData({ nome: "", oab: "", cnpj: "", cpf: "", telefone: "", email: "", numeroCaso: "", processoNumero: "" });
      toast({ title: "Reclamante criado" });
    },
    onError: () => {
      toast({ title: "Erro ao criar reclamante", variant: "destructive" });
    },
  });

  const handleCreateInlineEntity = () => {
    if (selectedPipeline === "advogados") {
      createInlineAdvogadoMutation.mutate({
        nome: newEntityData.nome,
        oab: newEntityData.oab,
        telefone: newEntityData.telefone,
        email: newEntityData.email,
        numeroCaso: newEntityData.numeroCaso,
      });
    } else if (selectedPipeline === "escritorios") {
      createInlineEscritorioMutation.mutate({
        nome: newEntityData.nome,
        cnpj: newEntityData.cnpj,
        telefone: newEntityData.telefone,
        email: newEntityData.email,
        numeroCaso: newEntityData.numeroCaso,
      });
    } else if (selectedPipeline === "reclamantes") {
      createInlineReclamanteMutation.mutate({
        nome: newEntityData.nome,
        cpf: newEntityData.cpf,
        telefone: newEntityData.telefone,
        email: newEntityData.email,
        processoNumero: newEntityData.processoNumero,
      });
    }
  };

  const isCreatingEntity = createInlineAdvogadoMutation.isPending || createInlineEscritorioMutation.isPending || createInlineReclamanteMutation.isPending;

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
    setDragOverLeadId(null);
  };

  const handleDropOnLead = (e: React.DragEvent, targetLeadId: string, stageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedId || draggedId === targetLeadId) {
      setDraggedId(null);
      setDragOverStage(null);
      setDragOverLeadId(null);
      return;
    }
    
    const stageLeads = filteredLeads
      .filter(l => l.stage === stageId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    
    const targetIndex = stageLeads.findIndex(l => l.id === targetLeadId);
    const draggedLead = filteredLeads.find(l => l.id === draggedId);
    
    if (targetIndex === -1 || !draggedLead) {
      setDraggedId(null);
      setDragOverStage(null);
      setDragOverLeadId(null);
      return;
    }
    
    // Calculate new position (insert above target)
    const targetPosition = stageLeads[targetIndex].position || 0;
    const prevPosition = targetIndex > 0 ? (stageLeads[targetIndex - 1].position || 0) : targetPosition - 1000;
    const newPosition = Math.floor((prevPosition + targetPosition) / 2);
    
    // If same stage, just update position
    if (draggedLead.stage === stageId) {
      updateMutation.mutate({ id: draggedId, position: newPosition });
    } else {
      // Different stage - update stage and position
      updateMutation.mutate({ id: draggedId, stage: stageId, position: newPosition });
    }
    
    setDraggedId(null);
    setDragOverStage(null);
    setDragOverLeadId(null);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedId) {
      const lead = filteredLeads.find((l) => l.id === draggedId);
      if (lead) {
        // Get max position in the target stage and put at the end
        const stageLeads = filteredLeads.filter(l => l.stage === stageId);
        const maxPosition = stageLeads.reduce((max, l) => Math.max(max, l.position || 0), 0);
        const newPosition = maxPosition + 1000;
        
        if (lead.stage !== stageId) {
          updateMutation.mutate({ id: draggedId, stage: stageId, position: newPosition });
        }
      }
    }
    setDraggedId(null);
    setDragOverStage(null);
    setDragOverLeadId(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: Partial<InsertLead> = {
      titulo: formData.get("titulo") as string,
      pipelineType: selectedPipeline,
      stage: stages[0].id,
      valor: formData.get("valor") as string || "0",
      probabilidade: parseInt(formData.get("probabilidade") as string) || 0,
      descricao: formData.get("descricao") as string || "",
    };

    // Only set entity ID if a valid ID was selected (using controlled state)
    if (selectedEntityId && selectedEntityId.trim()) {
      if (selectedPipeline === "advogados") {
        data.advogadoId = selectedEntityId;
      } else if (selectedPipeline === "escritorios") {
        data.escritorioId = selectedEntityId;
      } else if (selectedPipeline === "reclamantes") {
        data.reclamanteId = selectedEntityId;
      }
    }

    createMutation.mutate(data);
  };

  const totalValue = filteredLeads.reduce((acc, l) => acc + Number(l.valor || 0), 0);
  const totalLeads = filteredLeads.length;

  const getEntityOptions = () => {
    if (selectedPipeline === "advogados") {
      return advogados.map(a => ({ id: a.id, name: a.nome }));
    }
    if (selectedPipeline === "escritorios") {
      return escritorios.map(e => ({ id: e.id, name: e.nome }));
    }
    if (selectedPipeline === "reclamantes") {
      return reclamantes.map(r => ({ id: r.id, name: r.nome }));
    }
    return [];
  };

  const entityOptions = getEntityOptions();
  const pipelineInfo = PIPELINE_LABELS[selectedPipeline];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Kanban className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Pipeline de Vendas
              </h1>
              <p className="text-sm text-muted-foreground">
                Arraste e solte para gerenciar seu funil
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 mr-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total em Pipeline</p>
              <p className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Leads</p>
              <p className="text-lg font-bold text-foreground">{totalLeads}</p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary border-0 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300" data-testid="button-new-lead-pipeline">
                <Plus className="h-4 w-4 mr-2" />
                Novo Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Lead - {pipelineInfo.label}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    name="titulo"
                    placeholder="Ex: Caso Trabalhista - João Silva"
                    required
                    data-testid="input-lead-titulo"
                  />
                </div>
                {(selectedPipeline === "advogados" || selectedPipeline === "escritorios" || selectedPipeline === "reclamantes") && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{pipelineInfo.label.slice(0, -1)}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowInlineCreate(!showInlineCreate)}
                        data-testid="button-toggle-inline-create"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {showInlineCreate ? "Cancelar" : `Novo ${pipelineInfo.label.slice(0, -1)}`}
                      </Button>
                    </div>
                    
                    {showInlineCreate ? (
                      <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                        <Input
                          placeholder="Nome"
                          value={newEntityData.nome}
                          onChange={(e) => setNewEntityData({ ...newEntityData, nome: e.target.value })}
                          data-testid="input-inline-nome"
                        />
                        {selectedPipeline === "advogados" && (
                          <>
                            <Input
                              placeholder="OAB"
                              value={newEntityData.oab}
                              onChange={(e) => setNewEntityData({ ...newEntityData, oab: e.target.value })}
                              data-testid="input-inline-oab"
                            />
                            <Input
                              placeholder="Nº do Caso"
                              value={newEntityData.numeroCaso}
                              onChange={(e) => setNewEntityData({ ...newEntityData, numeroCaso: e.target.value })}
                              data-testid="input-inline-numero-caso"
                            />
                          </>
                        )}
                        {selectedPipeline === "escritorios" && (
                          <>
                            <Input
                              placeholder="CNPJ"
                              value={newEntityData.cnpj}
                              onChange={(e) => setNewEntityData({ ...newEntityData, cnpj: e.target.value })}
                              data-testid="input-inline-cnpj"
                            />
                            <Input
                              placeholder="Nº do Caso"
                              value={newEntityData.numeroCaso}
                              onChange={(e) => setNewEntityData({ ...newEntityData, numeroCaso: e.target.value })}
                              data-testid="input-inline-numero-caso"
                            />
                          </>
                        )}
                        {selectedPipeline === "reclamantes" && (
                          <>
                            <Input
                              placeholder="CPF"
                              value={newEntityData.cpf}
                              onChange={(e) => setNewEntityData({ ...newEntityData, cpf: e.target.value })}
                              data-testid="input-inline-cpf"
                            />
                            <Input
                              placeholder="Nº do Processo"
                              value={newEntityData.processoNumero}
                              onChange={(e) => setNewEntityData({ ...newEntityData, processoNumero: e.target.value })}
                              data-testid="input-inline-processo"
                            />
                          </>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Telefone"
                            value={newEntityData.telefone}
                            onChange={(e) => setNewEntityData({ ...newEntityData, telefone: e.target.value })}
                            data-testid="input-inline-telefone"
                          />
                          <Input
                            placeholder="Email"
                            type="email"
                            value={newEntityData.email}
                            onChange={(e) => setNewEntityData({ ...newEntityData, email: e.target.value })}
                            data-testid="input-inline-email"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full"
                          onClick={handleCreateInlineEntity}
                          disabled={!newEntityData.nome || isCreatingEntity}
                          data-testid="button-save-inline-entity"
                        >
                          {isCreatingEntity ? "Criando..." : `Criar ${pipelineInfo.label.slice(0, -1)}`}
                        </Button>
                      </div>
                    ) : (
                      <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                        <SelectTrigger data-testid="select-lead-entity">
                          <SelectValue placeholder={`Selecione um ${pipelineInfo.label.slice(0, -1).toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {entityOptions.map((entity) => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor (R$)</Label>
                    <Input
                      id="valor"
                      name="valor"
                      type="number"
                      placeholder="0,00"
                      data-testid="input-lead-valor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="probabilidade">Probabilidade (%)</Label>
                    <Input
                      id="probabilidade"
                      name="probabilidade"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="50"
                      data-testid="input-lead-probabilidade"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    name="descricao"
                    placeholder="Detalhes do lead..."
                    data-testid="input-lead-descricao"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                  data-testid="button-save-lead"
                >
                  {createMutation.isPending ? "Criando..." : "Criar Lead"}
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
              <TriggersTab pipelineType={selectedPipeline} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="mb-4">
        <Select value={selectedPipeline} onValueChange={(v) => setSelectedPipeline(v as PipelineType)}>
          <SelectTrigger className="w-64" data-testid="select-pipeline-type">
            <SelectValue placeholder="Selecione o pipeline" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PIPELINE_LABELS).map(([key, { label, icon }]) => (
              <SelectItem key={key} value={key} data-testid={`option-pipeline-${key}`}>
                <div className="flex items-center gap-2">
                  {icon}
                  <span>{label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 w-full overflow-x-auto overflow-y-hidden cursor-grab scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ scrollBehavior: isDraggingScroll ? 'auto' : 'smooth' }}
      >
        <div className="flex gap-4 pb-4 h-[calc(100vh-280px)] min-w-max">
          {stages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              leads={filteredLeads.filter((l) => l.stage === stage.id)}
              advogados={advogados}
              escritorios={escritorios}
              reclamantes={reclamantes}
              activities={activities}
              pipelineType={selectedPipeline}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onUpdateStage={(id, stage) => updateMutation.mutate({ id, stage })}
              onDropOnLead={handleDropOnLead}
              onSelectLead={setSelectedLeadId}
              onDeleteLead={(id) => deleteLeadMutation.mutate(id)}
              dragOverLeadId={dragOverLeadId}
              isLoading={isLoading}
              isDragOver={dragOverStage === stage.id}
              isUpdating={updateMutation.isPending}
            />
          ))}
        </div>
      </div>

      {/* Lead Detail Sheet - rendered at page level to prevent closure on updates */}
      {selectedLeadId && (() => {
        const selectedLead = leads.find(l => l.id === selectedLeadId);
        if (!selectedLead) return null;
        
        const pipelineType = selectedLead.pipelineType as PipelineType;
        const stages = PIPELINE_STAGES[pipelineType];
        const currentStageIndex = stages.findIndex(s => s.id === selectedLead.stage);
        const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;
        
        const handleAdvanceStage = () => {
          if (nextStage) {
            updateMutation.mutate({ id: selectedLeadId, stage: nextStage.id });
          }
        };
        
        return (
          <Sheet open={true} onOpenChange={(open) => !open && setSelectedLeadId(null)}>
            <SheetContent className="w-full sm:max-w-3xl p-0 overflow-hidden">
              <LeadDetailPanel
                lead={selectedLead}
                advogados={advogados}
                escritorios={escritorios}
                reclamantes={reclamantes}
                activities={activities}
                pipelineType={pipelineType}
                onClose={() => setSelectedLeadId(null)}
                onAdvanceStage={handleAdvanceStage}
                isPending={updateMutation.isPending}
              />
            </SheetContent>
          </Sheet>
        );
      })()}
    </div>
  );
}
