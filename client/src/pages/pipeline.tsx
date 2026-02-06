import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
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
import { WhatsAppLink } from "@/components/whatsapp-link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Plus, GripVertical, Building2, DollarSign, Trash2, Pencil,
  Phone, Mail, MessageSquare, ArrowRight, Clock, CheckCircle2,
  Send, Paperclip, FileText, Kanban, User, Scale, Users, FileSearch, Handshake, MapPin, RefreshCw,
  Minimize2, Maximize2, Filter, X
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Lead, TodosAdvogadosInfos, Escritorio, Reclamante, Activity, Interaction, InsertLead, Lawsuit, LeadFinancials, LeadCaseDetails, LeadChecklist, LeadAssignments } from "@shared/schema";
import { PIPELINE_STAGES, type PipelineType } from "@shared/schema";

// Tipo combinado para lead com detalhes normalizados
type LeadWithDetails = Lead & {
  financials?: LeadFinancials | null;
  caseDetails?: LeadCaseDetails | null;
  checklist?: LeadChecklist | null;
  assignments?: LeadAssignments | null;
};

type LawyerWithLawsuits = TodosAdvogadosInfos & { lawsuits: Lawsuit[] };
type ClaimantWithLawsuits = Reclamante & { lawsuits: Lawsuit[] };
type LawFirmWithLawsuits = Escritorio & { lawsuits: Lawsuit[] };

const PIPELINE_LABELS: Record<PipelineType, { label: string; icon: JSX.Element; description: string }> = {
  advogados: { label: "Advogados", icon: <Scale className="h-4 w-4" />, description: "Pipeline de advogados" },
  escritorios: { label: "Escritórios", icon: <Building2 className="h-4 w-4" />, description: "Pipeline de escritórios" },
  reclamantes: { label: "Reclamantes", icon: <Users className="h-4 w-4" />, description: "Pipeline de reclamantes" },
  triagem: { label: "Gestão de Casos", icon: <FileSearch className="h-4 w-4" />, description: "Pipeline de gestão de casos" },
};

const VISIBLE_PIPELINES: PipelineType[] = ["advogados", "escritorios", "reclamantes", "triagem"];

type PipelineFilter = {
  type: "advogado" | "reclamante" | "cnj" | "escritorio";
  id?: number | string;
  value: string;
  label: string;
};

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
  type?: "text" | "number" | "currency" | "textarea" | "date";
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
    const inputType = type === "currency" ? "number" : type === "date" ? "date" : type;
    return (
      <Input
        autoFocus
        type={inputType}
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
    : type === "date" && value
    ? new Date(value).toLocaleDateString("pt-BR")
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

function getEntityName(lead: Lead, todosAdvogadosInfos: TodosAdvogadosInfos[], escritorios: Escritorio[], reclamantes: Reclamante[]): string {
  if (lead.lawyerId) {
    const adv = todosAdvogadosInfos.find(a => a.id === lead.lawyerId);
    return adv?.nome || "Advogado";
  }
  if (lead.lawFirmId) {
    const esc = escritorios.find(e => e.id === lead.lawFirmId);
    return esc?.nome || "Escritório";
  }
  if (lead.claimantId) {
    const rec = reclamantes.find(r => r.id === lead.claimantId);
    return rec?.nome || "Reclamante";
  }
  return "—";
}

function LeadDetailPanel({
  lead,
  todosAdvogadosInfos,
  escritorios,
  reclamantes,
  activities,
  pipelineType,
  onClose,
  onAdvanceStage,
  isPending,
  lawyersWithLawsuits,
  claimantsWithLawsuits,
  lawFirmsWithLawsuits,
  onNavigatePipeline,
}: {
  lead: Lead;
  todosAdvogadosInfos: TodosAdvogadosInfos[];
  escritorios: Escritorio[];
  reclamantes: Reclamante[];
  activities: Activity[];
  pipelineType: PipelineType;
  onClose: () => void;
  onAdvanceStage: () => void;
  isPending: boolean;
  lawyersWithLawsuits: LawyerWithLawsuits[];
  claimantsWithLawsuits: ClaimantWithLawsuits[];
  lawFirmsWithLawsuits: LawFirmWithLawsuits[];
  onNavigatePipeline: (type: PipelineType, filters: PipelineFilter[]) => void;
}) {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [showNewAdvogado, setShowNewAdvogado] = useState(false);
  const [showNewEscritorio, setShowNewEscritorio] = useState(false);
  const [showNewReclamante, setShowNewReclamante] = useState(false);
  const [newAdvogado, setNewAdvogado] = useState({ nome: "", cnj: "", cpf: "", telefone: "", email: "" });
  const [newEscritorio, setNewEscritorio] = useState({ nome: "", cnpj: "", telefone: "", email: "", numeroCaso: "" });
  const [newReclamante, setNewReclamante] = useState({ nome: "", cpf: "", cnj: "", telefone: "", email: "" });
  
  const stages = PIPELINE_STAGES[pipelineType];
  const currentStageIndex = stages.findIndex(s => s.id === lead.stage);
  const currentStage = stages[currentStageIndex];
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;
  const leadActivities = activities.filter(a => a.leadId === lead.id);

  const { data: interactionsList = [], isLoading: loadingInteractions } = useQuery<Interaction[]>({
    queryKey: [`/api/leads/${lead.id}/interactions`],
  });

  // Queries para dados normalizados
  const { data: financials } = useQuery<LeadFinancials>({
    queryKey: ["/api/leads", lead.id, "financials"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/leads/${lead.id}/financials`);
      return res.json();
    },
  });

  const { data: caseDetails } = useQuery<LeadCaseDetails>({
    queryKey: ["/api/leads", lead.id, "case-details"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/leads/${lead.id}/case-details`);
      return res.json();
    },
  });

  const { data: checklist } = useQuery<LeadChecklist>({
    queryKey: ["/api/leads", lead.id, "checklist"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/leads/${lead.id}/checklist`);
      return res.json();
    },
  });

  const { data: assignments } = useQuery<LeadAssignments>({
    queryKey: ["/api/leads", lead.id, "assignments"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/leads/${lead.id}/assignments`);
      return res.json();
    },
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

  // Mutations para dados normalizados
  const updateFinancialsMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("PUT", `/api/leads/${lead.id}/financials`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "financials"] });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar dados financeiros", variant: "destructive" });
    },
  });

  const updateCaseDetailsMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("PUT", `/api/leads/${lead.id}/case-details`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "case-details"] });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar detalhes do caso", variant: "destructive" });
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("PUT", `/api/leads/${lead.id}/checklist`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "checklist"] });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar checklist", variant: "destructive" });
    },
  });

  const updateAssignmentsMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("PUT", `/api/leads/${lead.id}/assignments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "assignments"] });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar responsáveis", variant: "destructive" });
    },
  });

  // Campos por tabela para roteamento
  const financialsFields = ["valorFechamento", "percentualComissao", "formaPagamento", "observacoesFinanceiras"];
  const caseDetailsFields = ["tribunal", "assuntoPrincipal", "assuntos", "orgaoJulgador", "cnj", "cliente", "abordagem", "origem"];
  const checklistFields = ["reclamante", "reclamado", "liquidacaoIndicada", "valorBruto", "valorLiquido", "valorControverso", "sucumbente", "fgts", "dataPlanilha", "valorOutros", "prazoCaso"];
  const assignmentsFields = ["comercialResponsavel", "advogadoResponsavel"];

  const handleUpdateField = (field: string, value: any) => {
    if (financialsFields.includes(field)) {
      updateFinancialsMutation.mutate({ [field]: value });
    } else if (caseDetailsFields.includes(field)) {
      updateCaseDetailsMutation.mutate({ [field]: value });
    } else if (checklistFields.includes(field)) {
      updateChecklistMutation.mutate({ [field]: value });
    } else if (assignmentsFields.includes(field)) {
      updateAssignmentsMutation.mutate({ [field]: value });
    } else {
      updateFieldMutation.mutate({ [field]: value });
    }
  };

  const createInteractionMutation = useMutation({
    mutationFn: async (data: { type: string; content: string }) => {
      return apiRequest("POST", `/api/leads/${lead.id}/interactions`, {
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
      return apiRequest("POST", "/api/todos-advogados-infos", data);
    },
    onSuccess: async (response) => {
      const created = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/todos-advogados-infos"] });
      handleUpdateField("lawyerId", created.id);
      setShowNewAdvogado(false);
      setNewAdvogado({ nome: "", cnj: "", cpf: "", telefone: "", email: "" });
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
      handleUpdateField("lawFirmId", created.id);
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
      handleUpdateField("claimantId", created.id);
      setShowNewReclamante(false);
      setNewReclamante({ nome: "", cpf: "", cnj: "", telefone: "", email: "" });
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

  const advogado = lead.lawyerId ? todosAdvogadosInfos.find(a => a.id === lead.lawyerId) : null;
  const escritorio = lead.lawFirmId ? escritorios.find(e => e.id === lead.lawFirmId) : null;
  const reclamante = lead.claimantId ? reclamantes.find(r => r.id === lead.claimantId) : null;

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
                {getEntityName(lead, todosAdvogadosInfos, escritorios, reclamantes)}
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
                  {lead.createdAt && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-muted-foreground">Criado em</span>
                      <span>{new Date(lead.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {pipelineType === "reclamantes" ? (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Advogados Relacionados
                </h3>
                <Card className="p-4">
                  {(() => {
                    const claimantLawsuits = lead.claimantId 
                      ? claimantsWithLawsuits.find(c => c.id === lead.claimantId)?.lawsuits || []
                      : [];
                    const cnjs = claimantLawsuits.map(l => l.cnj).filter(Boolean) as string[];
                    
                    if (cnjs.length === 0) {
                      return <p className="text-sm text-muted-foreground">Nenhum CNJ vinculado para buscar advogados</p>;
                    }
                    
                    return (
                      <Button 
                        variant="outline" 
                        className="w-full gap-2 justify-start"
                        onClick={() => {
                          onNavigatePipeline("advogados", cnjs.map(cnj => ({
                            type: "cnj" as const,
                            value: cnj,
                            label: `CNJ: ${cnj}`
                          })));
                        }}
                        data-testid="button-nav-advogados"
                      >
                        <Scale className="h-4 w-4" />
                        Ver Advogados ({cnjs.length} CNJs em comum)
                        <ArrowRight className="h-4 w-4 ml-auto" />
                      </Button>
                    );
                  })()}
                </Card>
              </div>
            ) : pipelineType === "triagem" ? (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Advogados Relacionados
                </h3>
                <Card className="p-4">
                  {(() => {
                    const cnj = caseDetails?.cnj || lead.titulo;
                    const cnjs = cnj ? [cnj] : [];
                    
                    if (cnjs.length === 0) {
                      return <p className="text-sm text-muted-foreground">Nenhum CNJ vinculado para buscar advogados</p>;
                    }
                    
                    return (
                      <Button 
                        variant="outline" 
                        className="w-full gap-2 justify-start"
                        onClick={() => {
                          onNavigatePipeline("advogados", cnjs.map(cnj => ({
                            type: "cnj" as const,
                            value: cnj,
                            label: `CNJ: ${cnj}`
                          })));
                        }}
                        data-testid="button-nav-advogados-from-triagem"
                      >
                        <Scale className="h-4 w-4" />
                        Ver Advogados (CNJ: {cnjs[0]?.substring(0, 15)}...)
                        <ArrowRight className="h-4 w-4 ml-auto" />
                      </Button>
                    );
                  })()}
                </Card>
              </div>
            ) : (
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
                        placeholder="CPF"
                        value={newAdvogado.cpf}
                        onChange={(e) => setNewAdvogado({...newAdvogado, cpf: e.target.value})}
                      />
                      <Input
                        placeholder="CNJ"
                        value={newAdvogado.cnj}
                        onChange={(e) => setNewAdvogado({...newAdvogado, cnj: e.target.value})}
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
                        value={lead.lawyerId?.toString() || "none"} 
                        onValueChange={(v) => handleUpdateField("lawyerId", v === "none" ? null : parseInt(v))}
                      >
                        <SelectTrigger data-testid="select-advogado">
                          <SelectValue placeholder="Selecione um advogado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {todosAdvogadosInfos.map((a) => (
                            <SelectItem key={a.id} value={a.id.toString()}>{a.nome}{a.cnj ? ` (${a.cnj})` : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {advogado && (
                        <div className="space-y-2 pt-2 border-t">
                          {advogado.cnj && (
                            <div className="text-xs text-muted-foreground">CNJ: {advogado.cnj}</div>
                          )}
                          {advogado.cpf && (
                            <div className="text-xs text-muted-foreground">CPF: {advogado.cpf}</div>
                          )}
                          {advogado.telefone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">{advogado.telefone}</span>
                              <WhatsAppLink phone={advogado.telefone} />
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
                      {pipelineType === "escritorios" && lead.lawFirmId && (
                        <div className="pt-2 border-t">
                          <Button 
                            variant="outline" 
                            className="w-full gap-2 justify-start"
                            onClick={() => {
                              onNavigatePipeline("advogados", [{
                                type: "escritorio" as const,
                                id: lead.lawFirmId!,
                                value: lead.lawFirmId!,
                                label: `Escritório: ${escritorio?.nome || ""}`,
                              }]);
                            }}
                            data-testid="button-nav-advogados-from-escritorio"
                          >
                            <Scale className="h-4 w-4" />
                            Ver no Pipeline de Advogados
                            <ArrowRight className="h-4 w-4 ml-auto" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </Card>
              </div>
            )}

            {pipelineType === "advogados" ? (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Escritórios Relacionados
                </h3>
                <Card className="p-4">
                  {lead.lawyerId ? (
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 justify-start"
                      onClick={() => {
                        onNavigatePipeline("escritorios", [{
                          type: "advogado" as const,
                          id: lead.lawyerId!,
                          value: String(lead.lawyerId),
                          label: `Advogado: ${advogado?.nome || ""}`,
                        }]);
                      }}
                      data-testid="button-nav-escritorios"
                    >
                      <Building2 className="h-4 w-4" />
                      Ver Escritórios
                      <ArrowRight className="h-4 w-4 ml-auto" />
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">Vincule um advogado para ver escritórios relacionados</p>
                  )}
                  {escritorio && (
                    <div className="space-y-2 pt-3 border-t mt-3">
                      {escritorio.cnpj && (
                        <div className="text-xs text-muted-foreground">CNPJ: {escritorio.cnpj}</div>
                      )}
                      {escritorio.telefone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{escritorio.telefone}</span>
                          <WhatsAppLink phone={escritorio.telefone} />
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            ) : pipelineType === "reclamantes" || pipelineType === "triagem" ? (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Escritórios Relacionados
                </h3>
                <Card className="p-4">
                  {(() => {
                    let cnjs: string[] = [];
                    if (pipelineType === "reclamantes") {
                      const claimantLawsuits = lead.claimantId 
                        ? claimantsWithLawsuits.find(c => c.id === lead.claimantId)?.lawsuits || []
                        : [];
                      cnjs = claimantLawsuits.map(l => l.cnj).filter(Boolean) as string[];
                    } else {
                      const cnj = caseDetails?.cnj || lead.titulo;
                      cnjs = cnj ? [cnj] : [];
                    }
                    
                    if (cnjs.length === 0) {
                      return <p className="text-sm text-muted-foreground">Nenhum CNJ vinculado para buscar escritórios</p>;
                    }
                    
                    return (
                      <Button 
                        variant="outline" 
                        className="w-full gap-2 justify-start"
                        onClick={() => {
                          onNavigatePipeline("escritorios", cnjs.map(cnj => ({
                            type: "cnj" as const,
                            value: cnj,
                            label: `CNJ: ${cnj}`
                          })));
                        }}
                        data-testid="button-nav-escritorios-from-reclamante"
                      >
                        <Building2 className="h-4 w-4" />
                        Ver Escritórios ({cnjs.length} CNJs em comum)
                        <ArrowRight className="h-4 w-4 ml-auto" />
                      </Button>
                    );
                  })()}
                </Card>
              </div>
            ) : (
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
                        value={lead.lawFirmId || "none"} 
                        onValueChange={(v) => handleUpdateField("lawFirmId", v === "none" ? null : v)}
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
                              <WhatsAppLink phone={escritorio.telefone} />
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
            )}

            {pipelineType === "advogados" ? (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Reclamantes Relacionados
                </h3>
                <Card className="p-4">
                  {(() => {
                    const lawyerLawsuits = lead.lawyerId 
                      ? lawyersWithLawsuits.find(a => a.id === lead.lawyerId)?.lawsuits || []
                      : [];
                    const cnjs = lawyerLawsuits.map(l => l.cnj).filter(Boolean) as string[];
                    
                    if (cnjs.length === 0) {
                      return <p className="text-sm text-muted-foreground">Nenhum CNJ vinculado para buscar reclamantes</p>;
                    }
                    
                    return (
                      <Button 
                        variant="outline" 
                        className="w-full gap-2 justify-start"
                        onClick={() => {
                          onNavigatePipeline("reclamantes", cnjs.map(cnj => ({
                            type: "cnj" as const,
                            value: cnj,
                            label: `CNJ: ${cnj}`
                          })));
                        }}
                        data-testid="button-nav-reclamantes"
                      >
                        <Users className="h-4 w-4" />
                        Ver Reclamantes ({cnjs.length} CNJs)
                        <ArrowRight className="h-4 w-4 ml-auto" />
                      </Button>
                    );
                  })()}
                </Card>
              </div>
            ) : pipelineType === "escritorios" || pipelineType === "triagem" ? (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Reclamantes Relacionados
                </h3>
                <Card className="p-4">
                  {(() => {
                    let cnjs: string[] = [];
                    if (pipelineType === "escritorios") {
                      const firmLawsuits = lead.lawFirmId 
                        ? lawFirmsWithLawsuits.find(f => f.id === lead.lawFirmId)?.lawsuits || []
                        : [];
                      cnjs = firmLawsuits.map(l => l.cnj).filter(Boolean) as string[];
                    } else {
                      const cnj = caseDetails?.cnj || lead.titulo;
                      cnjs = cnj ? [cnj] : [];
                    }
                    
                    if (cnjs.length === 0) {
                      return <p className="text-sm text-muted-foreground">Nenhum CNJ vinculado para buscar reclamantes</p>;
                    }
                    
                    return (
                      <Button 
                        variant="outline" 
                        className="w-full gap-2 justify-start"
                        onClick={() => {
                          onNavigatePipeline("reclamantes", cnjs.map(cnj => ({
                            type: "cnj" as const,
                            value: cnj,
                            label: `CNJ: ${cnj}`
                          })));
                        }}
                        data-testid="button-nav-reclamantes-from-escritorio"
                      >
                        <Users className="h-4 w-4" />
                        Ver Reclamantes ({cnjs.length} CNJs)
                        <ArrowRight className="h-4 w-4 ml-auto" />
                      </Button>
                    );
                  })()}
                </Card>
              </div>
            ) : (
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
                        placeholder="CNJ do Processo"
                        value={newReclamante.cnj}
                        onChange={(e) => setNewReclamante({...newReclamante, cnj: e.target.value})}
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
                        value={lead.claimantId || "none"} 
                        onValueChange={(v) => handleUpdateField("claimantId", v === "none" ? null : v)}
                      >
                        <SelectTrigger data-testid="select-reclamante">
                          <SelectValue placeholder="Selecione um reclamante" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {reclamantes.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.nome}{r.cnj ? ` (${r.cnj})` : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {reclamante && (
                        <div className="space-y-2 pt-2 border-t">
                          {reclamante.cpf && (
                            <div className="text-xs text-muted-foreground">CPF: {reclamante.cpf}</div>
                          )}
                          {reclamante.cnj && (
                            <div className="text-xs text-muted-foreground">CNJ: {reclamante.cnj}</div>
                          )}
                          {reclamante.telefone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">{reclamante.telefone}</span>
                              <WhatsAppLink phone={reclamante.telefone} />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </Card>
              </div>
            )}

            {(() => {
              const linkedLawsuits = (() => {
                if (pipelineType === "advogados" && lead.lawyerId) {
                  return lawyersWithLawsuits.find(a => a.id === lead.lawyerId)?.lawsuits || [];
                }
                if (pipelineType === "reclamantes" && lead.claimantId) {
                  return claimantsWithLawsuits.find(c => c.id === lead.claimantId)?.lawsuits || [];
                }
                if (pipelineType === "escritorios" && lead.lawFirmId) {
                  return lawFirmsWithLawsuits.find(l => l.id === lead.lawFirmId)?.lawsuits || [];
                }
                return [];
              })();
              
              if (linkedLawsuits.length === 0) return null;
              
              const totalValue = linkedLawsuits.reduce((acc, l) => acc + Number(l.valorCausa || 0), 0);
              
              return (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Processos Vinculados ({linkedLawsuits.length})
                  </h3>
                  <Card className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Total de Processos:</span>
                        <span>{linkedLawsuits.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Valor Total:</span>
                        <span className="text-green-600 font-semibold">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}
                        </span>
                      </div>
                      <div className="border-t pt-3">
                        <span className="text-xs font-medium text-muted-foreground mb-2 block">CNJs:</span>
                        <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                          {linkedLawsuits.map((lawsuit, idx) => (
                            <Badge key={lawsuit.id || idx} variant="secondary" className="text-xs">
                              {lawsuit.cnj || "Sem CNJ"}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })()}

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

            {(financials?.valorFechamento || financials?.percentualComissao || financials?.formaPagamento || financials?.observacoesFinanceiras) && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Informações Financeiras
                </h3>
                <Card className="p-4">
                  <div className="space-y-3 text-sm">
                    {financials?.valorFechamento && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Valor Fechamento</span>
                        <span className="font-bold text-green-600">{formatCurrency(Number(financials.valorFechamento))}</span>
                      </div>
                    )}
                    {financials?.percentualComissao && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Comissão</span>
                        <span>{financials.percentualComissao}%</span>
                      </div>
                    )}
                    {financials?.formaPagamento && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Forma de Pagamento</span>
                        <span>{financials.formaPagamento}</span>
                      </div>
                    )}
                    {financials?.observacoesFinanceiras && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground text-xs block mb-1">Observações</span>
                        <p className="text-sm whitespace-pre-wrap">{financials.observacoesFinanceiras}</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {pipelineType === "triagem" && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Checklist - Partes
              </h3>
              <Card className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-2">
                      <User className="h-3 w-3 text-green-500" />
                      Reclamante
                    </Label>
                    <InlineEditField
                      value={checklist?.reclamante || ""}
                      onSave={(val) => handleUpdateField("reclamante", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-red-500" />
                      Reclamado
                    </Label>
                    <InlineEditField
                      value={checklist?.reclamado || ""}
                      onSave={(val) => handleUpdateField("reclamado", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                </div>
              </Card>
            </div>
            )}

            {pipelineType === "triagem" && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Checklist - Valores
              </h3>
              <Card className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-2">
                      <DollarSign className="h-3 w-3 text-blue-500" />
                      Liquidação Indicada
                    </Label>
                    <InlineEditField
                      value={checklist?.liquidacaoIndicada || ""}
                      type="currency"
                      onSave={(val) => handleUpdateField("liquidacaoIndicada", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-2">
                      <DollarSign className="h-3 w-3 text-red-500" />
                      Valor Bruto
                    </Label>
                    <InlineEditField
                      value={checklist?.valorBruto || ""}
                      type="currency"
                      onSave={(val) => handleUpdateField("valorBruto", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-2">
                      <DollarSign className="h-3 w-3 text-green-500" />
                      Valor Líquido
                    </Label>
                    <InlineEditField
                      value={checklist?.valorLiquido || ""}
                      type="currency"
                      onSave={(val) => handleUpdateField("valorLiquido", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-2">
                      <DollarSign className="h-3 w-3 text-orange-500" />
                      Valor Controverso
                    </Label>
                    <InlineEditField
                      value={checklist?.valorControverso || ""}
                      type="currency"
                      onSave={(val) => handleUpdateField("valorControverso", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-2">
                      <Scale className="h-3 w-3 text-purple-500" />
                      Sucumbente
                    </Label>
                    <InlineEditField
                      value={checklist?.sucumbente || ""}
                      onSave={(val) => handleUpdateField("sucumbente", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-2">
                      <DollarSign className="h-3 w-3 text-cyan-500" />
                      FGTS
                    </Label>
                    <InlineEditField
                      value={checklist?.fgts || ""}
                      type="currency"
                      onSave={(val) => handleUpdateField("fgts", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-2">
                      <Clock className="h-3 w-3 text-amber-500" />
                      Data da Planilha
                    </Label>
                    <InlineEditField
                      value={checklist?.dataPlanilha ? new Date(checklist.dataPlanilha).toISOString().split('T')[0] : ""}
                      type="date"
                      onSave={(val) => handleUpdateField("dataPlanilha", val ? new Date(val) : null)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-2">
                      <DollarSign className="h-3 w-3 text-gray-500" />
                      Valor Outros
                    </Label>
                    <InlineEditField
                      value={checklist?.valorOutros || ""}
                      type="currency"
                      onSave={(val) => handleUpdateField("valorOutros", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-2">
                      <Clock className="h-3 w-3 text-red-500" />
                      Prazo do Caso
                    </Label>
                    <InlineEditField
                      value={checklist?.prazoCaso ? new Date(checklist.prazoCaso).toISOString().split('T')[0] : ""}
                      type="date"
                      onSave={(val) => handleUpdateField("prazoCaso", val ? new Date(val) : null)}
                      placeholder="Adicionar..."
                    />
                  </div>
                </div>
              </Card>
            </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Responsáveis
              </h3>
              <Card className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-2">
                      <User className="h-3 w-3 text-blue-500" />
                      Comercial Responsável
                    </Label>
                    <InlineEditField
                      value={assignments?.comercialResponsavel || ""}
                      onSave={(val) => handleUpdateField("comercialResponsavel", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs flex items-center gap-2">
                      <Scale className="h-3 w-3 text-purple-500" />
                      Advogado Responsável
                    </Label>
                    <InlineEditField
                      value={assignments?.advogadoResponsavel || ""}
                      onSave={(val) => handleUpdateField("advogadoResponsavel", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Dados Básicos Extras
              </h3>
              <Card className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Cliente</Label>
                    <InlineEditField
                      value={caseDetails?.cliente || ""}
                      onSave={(val) => handleUpdateField("cliente", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Abordagem</Label>
                    <InlineEditField
                      value={caseDetails?.abordagem || ""}
                      onSave={(val) => handleUpdateField("abordagem", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Origem</Label>
                    <InlineEditField
                      value={caseDetails?.origem || ""}
                      onSave={(val) => handleUpdateField("origem", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Dados do Caso
              </h3>
              <Card className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">CNJ</Label>
                    <InlineEditField
                      value={caseDetails?.cnj || ""}
                      onSave={(val) => handleUpdateField("cnj", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Tribunal</Label>
                    <InlineEditField
                      value={caseDetails?.tribunal || ""}
                      onSave={(val) => handleUpdateField("tribunal", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Assunto Principal</Label>
                    <InlineEditField
                      value={caseDetails?.assuntoPrincipal || ""}
                      onSave={(val) => handleUpdateField("assuntoPrincipal", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Assuntos</Label>
                    <InlineEditField
                      value={caseDetails?.assuntos || ""}
                      onSave={(val) => handleUpdateField("assuntos", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Órgão Julgador</Label>
                    <InlineEditField
                      value={caseDetails?.orgaoJulgador || ""}
                      onSave={(val) => handleUpdateField("orgaoJulgador", val)}
                      placeholder="Adicionar..."
                    />
                  </div>
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
              ) : interactionsList.length === 0 && leadActivities.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma interação registrada</p>
                  <p className="text-xs text-muted-foreground mt-1">Adicione um comentário abaixo</p>
                </div>
              ) : (
                <>
                  {interactionsList.map((interaction: any) => (
                    <div key={interaction.id} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {getInteractionIcon(interaction.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {interaction.vendedorName && (
                            <span className="text-xs font-semibold text-foreground">
                              {interaction.vendedorName}
                            </span>
                          )}
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
                placeholder="Digite um comentário... (Enter para enviar)"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
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
  todosAdvogadosInfos,
  escritorios,
  reclamantes,
  activities,
  lawyersWithLawsuits,
  claimantsWithLawsuits,
  lawFirmsWithLawsuits,
  pipelineType,
  onDragStart,
  onDragEnd,
  onUpdateStage,
  onDropOnLead,
  onSelect,
  onDelete,
  onFilter,
  isDragOver,
  isUpdating,
}: {
  lead: Lead;
  todosAdvogadosInfos: TodosAdvogadosInfos[];
  escritorios: Escritorio[];
  reclamantes: Reclamante[];
  activities: Activity[];
  lawyersWithLawsuits: LawyerWithLawsuits[];
  claimantsWithLawsuits: ClaimantWithLawsuits[];
  lawFirmsWithLawsuits: LawFirmWithLawsuits[];
  pipelineType: PipelineType;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onUpdateStage: (id: string, stage: string) => void;
  onDropOnLead: (e: React.DragEvent, leadId: string) => void;
  onSelect: (leadId: string) => void;
  onDelete: (id: string) => void;
  onFilter: (filter: PipelineFilter) => void;
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
  const entityName = getEntityName(lead, todosAdvogadosInfos, escritorios, reclamantes);
  const prevStage = currentStageIndex > 0 ? stages[currentStageIndex - 1] : null;
  const linkedAdvogado = lead.lawyerId 
    ? todosAdvogadosInfos.find(a => a.id === lead.lawyerId)
    : null;

  const lawyerWithLawsuits = lead.lawyerId 
    ? lawyersWithLawsuits.find(a => a.id === lead.lawyerId)
    : null;
  const claimantWithLawsuits = lead.claimantId 
    ? claimantsWithLawsuits.find(c => c.id === lead.claimantId)
    : null;
  const lawFirmWithLawsuits = lead.lawFirmId 
    ? lawFirmsWithLawsuits.find(l => l.id === lead.lawFirmId)
    : null;

  const linkedLawsuits = (() => {
    if (pipelineType === "advogados" && lawyerWithLawsuits) {
      return lawyerWithLawsuits.lawsuits || [];
    }
    if (pipelineType === "reclamantes" && claimantWithLawsuits) {
      return claimantWithLawsuits.lawsuits || [];
    }
    if (pipelineType === "escritorios" && lawFirmWithLawsuits) {
      return lawFirmWithLawsuits.lawsuits || [];
    }
    return [];
  })();
  const totalLawsuitsValue = linkedLawsuits.reduce((acc, l) => acc + Number(l.valorCausa || 0), 0);

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
                  </div>
                  <span className="truncate font-medium">{entityName}</span>
                </div>
              </div>
            </div>

            {pipelineType === "advogados" && linkedAdvogado && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {linkedAdvogado.email && (
                    <div className="flex items-center gap-1 min-w-0">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{linkedAdvogado.email}</span>
                    </div>
                  )}
                  {(linkedAdvogado.celular || linkedAdvogado.telefone) && (
                    <div className="flex items-center gap-1 min-w-0">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span className="truncate">{linkedAdvogado.celular || linkedAdvogado.telefone}</span>
                      <WhatsAppLink phone={linkedAdvogado.celular || linkedAdvogado.telefone} />
                    </div>
                  )}
                  {(linkedAdvogado.estado || linkedAdvogado.municipio) && (
                    <div className="flex items-center gap-1 min-w-0">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {linkedAdvogado.municipio && linkedAdvogado.estado 
                          ? `${linkedAdvogado.municipio}/${linkedAdvogado.estado}`
                          : linkedAdvogado.municipio || linkedAdvogado.estado}
                      </span>
                    </div>
                  )}
                </div>
                {linkedLawsuits.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                      <FileText className="h-3 w-3" />
                      <span>{linkedLawsuits.length} processo{linkedLawsuits.length > 1 ? "s" : ""}</span>
                      {totalLawsuitsValue > 0 && (
                        <span className="text-muted-foreground">({formatCurrencyShort(totalLawsuitsValue)})</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {linkedLawsuits.slice(0, 3).map((lawsuit, idx) => (
                        <Badge key={lawsuit.id || idx} variant="secondary" className="text-xs px-1.5 py-0">
                          {lawsuit.cnj?.replace(/(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})/, "$1-$2.$3.$4.$5.$6") || "Sem CNJ"}
                        </Badge>
                      ))}
                      {linkedLawsuits.length > 3 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          +{linkedLawsuits.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                {linkedLawsuits.length === 0 && linkedAdvogado.cnj && (
                  <div className="flex items-center gap-1 min-w-0 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">{linkedAdvogado.cnj}</span>
                  </div>
                )}
              </div>
            )}

            {lead.claimantId && (() => {
              const linkedReclamante = reclamantes.find(r => r.id === lead.claimantId);
              return linkedReclamante ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs">
                    <User className="h-3 w-3 text-purple-500 shrink-0" />
                    <span className="font-medium text-muted-foreground">Reclamante:</span>
                    <span className="truncate">{linkedReclamante.nome}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground pl-4">
                    {linkedReclamante.cpf && (
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="truncate">CPF: {linkedReclamante.cpf}</span>
                      </div>
                    )}
                    {linkedReclamante.telefone && (
                      <div className="flex items-center gap-1 min-w-0">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{linkedReclamante.telefone}</span>
                        <WhatsAppLink phone={linkedReclamante.telefone} />
                      </div>
                    )}
                    {linkedReclamante.email && (
                      <div className="flex items-center gap-1 min-w-0">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{linkedReclamante.email}</span>
                      </div>
                    )}
                  </div>
                  {pipelineType === "reclamantes" && linkedLawsuits.length > 0 && (
                    <div className="space-y-1 pl-4">
                      <div className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                        <FileText className="h-3 w-3" />
                        <span>{linkedLawsuits.length} processo{linkedLawsuits.length > 1 ? "s" : ""}</span>
                        {totalLawsuitsValue > 0 && (
                          <span className="text-muted-foreground">({formatCurrencyShort(totalLawsuitsValue)})</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {linkedLawsuits.slice(0, 3).map((lawsuit, idx) => (
                          <Badge key={lawsuit.id || idx} variant="secondary" className="text-xs px-1.5 py-0">
                            {lawsuit.cnj?.replace(/(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})/, "$1-$2.$3.$4.$5.$6") || "Sem CNJ"}
                          </Badge>
                        ))}
                        {linkedLawsuits.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            +{linkedLawsuits.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {pipelineType === "reclamantes" && linkedLawsuits.length === 0 && linkedReclamante.cnj && (
                    <div className="flex items-center gap-1 min-w-0 text-xs text-muted-foreground pl-4">
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">{linkedReclamante.cnj}</span>
                    </div>
                  )}
                </div>
              ) : null;
            })()}
            
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
      <ContextMenuContent className="w-56" data-testid={`context-menu-${lead.id}`}>
        <ContextMenuItem onClick={() => onSelect(lead.id)} data-testid="context-menu-view">
          <FileText className="h-4 w-4 mr-2" />
          Ver detalhes
        </ContextMenuItem>
        <ContextMenuSeparator />
        {linkedAdvogado && (
          <>
            <ContextMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onFilter({ type: "advogado", id: linkedAdvogado.id, value: String(linkedAdvogado.id), label: `Advogado: ${linkedAdvogado.nome}` });
              }} 
              data-testid="context-menu-filter-advogado"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrar por: {linkedAdvogado.nome}
            </ContextMenuItem>
            {linkedAdvogado.cnj && (
              <ContextMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onFilter({ type: "cnj", value: linkedAdvogado.cnj!, label: `CNJ: ${linkedAdvogado.cnj}` });
                }}
                data-testid="context-menu-filter-cnj"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtrar por CNJ: {linkedAdvogado.cnj}
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
          </>
        )}
        {lead.lawFirmId && (() => {
          const escritorio = escritorios.find(e => e.id === lead.lawFirmId);
          return escritorio ? (
            <>
              <ContextMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onFilter({ type: "escritorio", id: escritorio.id, value: escritorio.id, label: `Escritório: ${escritorio.nome}` });
                }}
                data-testid="context-menu-filter-escritorio"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtrar por: {escritorio.nome}
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          ) : null;
        })()}
        {lead.claimantId && (() => {
          const reclamante = reclamantes.find(r => r.id === lead.claimantId);
          return reclamante ? (
            <>
              <ContextMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onFilter({ type: "reclamante", id: reclamante.id, value: reclamante.id, label: `Reclamante: ${reclamante.nome}` });
                }}
                data-testid="context-menu-filter-reclamante"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtrar por: {reclamante.nome}
              </ContextMenuItem>
              {reclamante.cnj && (
                <ContextMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilter({ type: "cnj", value: reclamante.cnj!, label: `CNJ: ${reclamante.cnj}` });
                  }}
                  data-testid="context-menu-filter-reclamante-cnj"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrar por CNJ: {reclamante.cnj}
                </ContextMenuItem>
              )}
              <ContextMenuSeparator />
            </>
          ) : null;
        })()}
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
  todosAdvogadosInfos,
  escritorios,
  reclamantes,
  activities,
  lawyersWithLawsuits,
  claimantsWithLawsuits,
  lawFirmsWithLawsuits,
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
  onFilter,
  dragOverLeadId,
  isLoading,
  isDragOver,
  isUpdating,
  isMinimized,
  onToggleMinimize,
  cardsLimit,
  currentLimit,
  onLoadMore,
  onShowLess,
}: {
  stage: { id: string; label: string; color: string };
  leads: Lead[];
  todosAdvogadosInfos: TodosAdvogadosInfos[];
  escritorios: Escritorio[];
  reclamantes: Reclamante[];
  activities: Activity[];
  lawyersWithLawsuits: LawyerWithLawsuits[];
  claimantsWithLawsuits: ClaimantWithLawsuits[];
  lawFirmsWithLawsuits: LawFirmWithLawsuits[];
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
  onFilter: (filter: PipelineFilter) => void;
  dragOverLeadId: string | null;
  isLoading: boolean;
  isDragOver: boolean;
  isUpdating: boolean;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  cardsLimit: number;
  currentLimit: number;
  onLoadMore: () => void;
  onShowLess: () => void;
}) {
  const totalValue = leads.reduce((acc, l) => acc + Number(l.valor || 0), 0);
  
  // Sort leads by position
  const sortedLeads = [...leads].sort((a, b) => (a.position || 0) - (b.position || 0));

  if (isMinimized) {
    return (
      <div
        className={`flex flex-col w-14 shrink-0 rounded-xl ${
          isDragOver ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
        }`}
        onDrop={(e) => onDrop(e, stage.id)}
        onDragOver={(e) => onDragOver(e, stage.id)}
        onDragLeave={onDragLeave}
      >
        <div className={`rounded-t-xl px-2 py-3 ${stage.color} flex flex-col items-center gap-2`}>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={onToggleMinimize}
            data-testid={`button-expand-column-${stage.id}`}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
            {leads.length}
          </Badge>
        </div>
        <div className="flex-1 bg-muted/30 rounded-b-xl flex items-center justify-center py-4">
          <span 
            className="text-xs font-medium text-muted-foreground"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {stage.label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col w-96 shrink-0 rounded-xl ${
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
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={onToggleMinimize}
            data-testid={`button-minimize-column-${stage.id}`}
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
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
            <>
              {sortedLeads.slice(0, currentLimit).map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  todosAdvogadosInfos={todosAdvogadosInfos}
                  escritorios={escritorios}
                  reclamantes={reclamantes}
                  activities={activities}
                  lawyersWithLawsuits={lawyersWithLawsuits}
                  claimantsWithLawsuits={claimantsWithLawsuits}
                  lawFirmsWithLawsuits={lawFirmsWithLawsuits}
                  pipelineType={pipelineType}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onUpdateStage={onUpdateStage}
                  onDropOnLead={(e, leadId) => onDropOnLead(e, leadId, stage.id)}
                  onSelect={onSelectLead}
                  onDelete={onDeleteLead}
                  onFilter={onFilter}
                  isDragOver={dragOverLeadId === lead.id}
                  isUpdating={isUpdating}
                />
              ))}
              {sortedLeads.length > cardsLimit && (
                <div className="flex flex-col gap-1">
                  {currentLimit < sortedLeads.length && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={onLoadMore}
                      data-testid={`button-load-more-${stage.id}`}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Exibir mais {Math.min(cardsLimit, sortedLeads.length - currentLimit)} cards
                    </Button>
                  )}
                  {currentLimit > cardsLimit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={onShowLess}
                      data-testid={`button-show-less-${stage.id}`}
                    >
                      <Minimize2 className="h-3 w-3 mr-1" />
                      Mostrar menos
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
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
  const [minimizedColumns, setMinimizedColumns] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<PipelineFilter[]>([]);

  const addFilter = useCallback((filter: PipelineFilter) => {
    setActiveFilters(prev => {
      const exists = prev.some(f => f.type === filter.type && f.value === filter.value);
      if (exists) return prev;
      return [...prev, filter];
    });
    toast({ title: `Filtro aplicado: ${filter.label}` });
  }, [toast]);

  const removeFilter = useCallback((filter: PipelineFilter) => {
    setActiveFilters(prev => prev.filter(f => !(f.type === filter.type && f.value === filter.value)));
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);
  
  const toggleColumnMinimize = useCallback((stageId: string) => {
    setMinimizedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
      } else {
        newSet.add(stageId);
      }
      return newSet;
    });
  }, []);
  
  // Inline entity creation states
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [newEntityData, setNewEntityData] = useState({ nome: "", cnj: "", cnpj: "", cpf: "", telefone: "", email: "", numeroCaso: "", endereco: "", cidade: "", estado: "" });
  
  // Escritório inline creation - CNJs and Advogados
  const [inlineEscritorioCnjs, setInlineEscritorioCnjs] = useState<string[]>([]);
  const [inlineEscritorioAdvogados, setInlineEscritorioAdvogados] = useState<number[]>([]);
  const [inlineNewCnj, setInlineNewCnj] = useState("");
  const [inlineSelectedAdvogadoId, setInlineSelectedAdvogadoId] = useState<string>("");
  
  const urlParamsProcessed = useRef(false);
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

  const { data: todosAdvogadosInfos = [], isLoading: advogadosLoading } = useQuery<TodosAdvogadosInfos[]>({
    queryKey: ["/api/todos-advogados-infos"],
  });

  const { data: escritorios = [], isLoading: escritoriosLoading } = useQuery<Escritorio[]>({
    queryKey: ["/api/escritorios"],
  });

  const { data: reclamantes = [], isLoading: reclamantesLoading } = useQuery<Reclamante[]>({
    queryKey: ["/api/reclamantes"],
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: lawyersWithLawsuits = [], isLoading: lawyersLawsuitsLoading } = useQuery<LawyerWithLawsuits[]>({
    queryKey: ["/api/lawyers-with-lawsuits"],
  });

  const { data: claimantsWithLawsuits = [], isLoading: claimantsLawsuitsLoading } = useQuery<ClaimantWithLawsuits[]>({
    queryKey: ["/api/claimants-with-lawsuits"],
  });

  const { data: lawFirmsWithLawsuits = [], isLoading: lawFirmsLawsuitsLoading } = useQuery<LawFirmWithLawsuits[]>({
    queryKey: ["/api/law-firms-with-lawsuits"],
  });

  const isLoading = leadsLoading || advogadosLoading || escritoriosLoading || reclamantesLoading || lawyersLawsuitsLoading || claimantsLawsuitsLoading || lawFirmsLawsuitsLoading;

  useEffect(() => {
    if (urlParamsProcessed.current) return;
    if (isLoading) return;
    
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const cnjs = params.get("cnj");
    const escritorioId = params.get("escritorioId");
    const advogadoId = params.get("advogadoId");
    
    if (!type && !cnjs && !escritorioId && !advogadoId) return;
    
    urlParamsProcessed.current = true;
    
    if (type && VISIBLE_PIPELINES.includes(type as PipelineType)) {
      setSelectedPipeline(type as PipelineType);
    }
    
    const newFilters: PipelineFilter[] = [];
    
    if (cnjs) {
      cnjs.split(",").forEach(cnj => {
        newFilters.push({ type: "cnj", value: cnj.trim(), label: `CNJ: ${cnj.trim()}` });
      });
    }
    
    if (escritorioId) {
      const esc = escritorios.find(e => e.id === escritorioId);
      if (esc) {
        newFilters.push({ type: "escritorio", id: escritorioId, value: escritorioId, label: `Escritório: ${esc.nome}` });
      }
    }
    
    if (advogadoId) {
      const adv = todosAdvogadosInfos.find(a => String(a.id) === advogadoId);
      if (adv) {
        newFilters.push({ type: "advogado", id: adv.id, value: String(adv.id), label: `Advogado: ${adv.nome}` });
      }
    }
    
    if (newFilters.length > 0) {
      setActiveFilters(newFilters);
    }
  }, [isLoading, escritorios, todosAdvogadosInfos]);

  // Estado para controlar limite de cards por coluna (key = stage.id, value = limite atual)
  const [columnLimits, setColumnLimits] = useState<Record<string, number>>({});
  const CARDS_LIMIT = 20; // Limite inicial e incremento

  // Check if there's a CNJ filter active - if so, show leads from ALL pipelines
  const hasCnjFilter = activeFilters.some(f => f.type === "cnj");
  
  // Apply pipeline type filter first (skip if CNJ filter is active)
  const pipelineFilteredLeads = hasCnjFilter 
    ? leads 
    : leads.filter(l => l.pipelineType === selectedPipeline);
  
  // Apply active filters
  const filteredLeads = pipelineFilteredLeads.filter(lead => {
    if (activeFilters.length === 0) return true;
    
    return activeFilters.every(filter => {
      switch (filter.type) {
        case "advogado":
          return lead.lawyerId === filter.id;
        
        case "reclamante":
          return lead.claimantId === filter.id;
        
        case "escritorio":
          return lead.lawFirmId === filter.id;
        
        case "cnj":
          // Check CNJ on linked lawsuits via junction tables
          const lawyerLawsuits = lead.lawyerId 
            ? lawyersWithLawsuits.find(a => a.id === lead.lawyerId)?.lawsuits || []
            : [];
          const claimantLawsuits = lead.claimantId 
            ? claimantsWithLawsuits.find(c => c.id === lead.claimantId)?.lawsuits || []
            : [];
          const lawFirmLawsuits = lead.lawFirmId 
            ? lawFirmsWithLawsuits.find(l => l.id === lead.lawFirmId)?.lawsuits || []
            : [];
          const allLawsuits = [...lawyerLawsuits, ...claimantLawsuits, ...lawFirmLawsuits];
          return allLawsuits.some(lawsuit => lawsuit.cnj === filter.value);
        
        default:
          return true;
      }
    });
  });
  
  // Get unique pipeline types from filtered leads when CNJ filter is active
  const uniquePipelineTypes = hasCnjFilter 
    ? [...new Set(filteredLeads.map(l => l.pipelineType))] as (keyof typeof PIPELINE_STAGES)[]
    : [selectedPipeline];
  
  // Combine all stages from active pipelines (removing duplicates by id)
  const stages = hasCnjFilter
    ? uniquePipelineTypes.flatMap(pt => PIPELINE_STAGES[pt]).filter((stage, index, self) => 
        self.findIndex(s => s.id === stage.id) === index
      )
    : PIPELINE_STAGES[selectedPipeline];

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
      setNewEntityData({ nome: "", cnj: "", cnpj: "", cpf: "", telefone: "", email: "", numeroCaso: "", endereco: "", cidade: "", estado: "" });
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

  const syncAdvogadosMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sync-advogados-to-leads");
      return response.json();
    },
    onSuccess: (data: { synced: number; skipped: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/todos-advogados-infos"] });
      toast({
        title: "Sincronização concluída",
        description: `${data.synced} advogados sincronizados para o pipeline`,
      });
    },
    onError: () => {
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os advogados",
        variant: "destructive",
      });
    },
  });

  const syncReclamantesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sync-reclamantes-to-leads");
      return response.json();
    },
    onSuccess: (data: { synced: number; skipped: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reclamantes"] });
      toast({
        title: "Sincronização concluída",
        description: `${data.synced} reclamantes sincronizados para o pipeline`,
      });
    },
    onError: () => {
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os reclamantes",
        variant: "destructive",
      });
    },
  });

  const createInlineAdvogadoMutation = useMutation({
    mutationFn: async (data: { nome: string; cnj: string; cpf: string; telefone: string; email: string }) => {
      const response = await apiRequest("POST", "/api/todos-advogados-infos", data);
      return response.json();
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos-advogados-infos"] });
      setSelectedEntityId(created.id.toString());
      setShowInlineCreate(false);
      setNewEntityData({ nome: "", cnj: "", cnpj: "", cpf: "", telefone: "", email: "", numeroCaso: "", endereco: "", cidade: "", estado: "" });
      toast({ title: "Advogado criado" });
    },
    onError: () => {
      toast({ title: "Erro ao criar advogado", variant: "destructive" });
    },
  });

  const createInlineEscritorioMutation = useMutation({
    mutationFn: async (data: { nome: string; cnpj: string; telefone: string; email: string; endereco: string; cidade: string; estado: string; cnjs: string[]; advogadoIds: number[] }) => {
      const response = await apiRequest("POST", "/api/escritorios", {
        nome: data.nome,
        cnpj: data.cnpj,
        telefone: data.telefone,
        email: data.email,
        endereco: data.endereco,
        cidade: data.cidade,
        estado: data.estado,
        cnjs: data.cnjs,
      });
      const created = await response.json();
      // Add lawyers to the law firm
      if (data.advogadoIds.length > 0) {
        for (const advId of data.advogadoIds) {
          await apiRequest("POST", `/api/law-firms/${created.id}/lawyers`, { lawyerId: advId });
        }
      }
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/escritorios"] });
      setSelectedEntityId(created.id);
      setShowInlineCreate(false);
      setNewEntityData({ nome: "", cnj: "", cnpj: "", cpf: "", telefone: "", email: "", numeroCaso: "", endereco: "", cidade: "", estado: "" });
      setInlineEscritorioCnjs([]);
      setInlineEscritorioAdvogados([]);
      setInlineNewCnj("");
      setInlineSelectedAdvogadoId("");
      toast({ title: "Escritório criado" });
    },
    onError: () => {
      toast({ title: "Erro ao criar escritório", variant: "destructive" });
    },
  });

  const createInlineReclamanteMutation = useMutation({
    mutationFn: async (data: { nome: string; cpf: string; cnj: string; telefone: string; email: string }) => {
      const response = await apiRequest("POST", "/api/reclamantes", data);
      return response.json();
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reclamantes"] });
      setSelectedEntityId(created.id);
      setShowInlineCreate(false);
      setNewEntityData({ nome: "", cnj: "", cnpj: "", cpf: "", telefone: "", email: "", numeroCaso: "", endereco: "", cidade: "", estado: "" });
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
        cnj: newEntityData.cnj,
        cpf: newEntityData.cpf,
        telefone: newEntityData.telefone,
        email: newEntityData.email,
      });
    } else if (selectedPipeline === "escritorios") {
      createInlineEscritorioMutation.mutate({
        nome: newEntityData.nome,
        cnpj: newEntityData.cnpj,
        telefone: newEntityData.telefone,
        email: newEntityData.email,
        endereco: newEntityData.endereco,
        cidade: newEntityData.cidade,
        estado: newEntityData.estado,
        cnjs: inlineEscritorioCnjs,
        advogadoIds: inlineEscritorioAdvogados,
      });
    } else if (selectedPipeline === "reclamantes") {
      createInlineReclamanteMutation.mutate({
        nome: newEntityData.nome,
        cpf: newEntityData.cpf,
        cnj: newEntityData.cnj,
        telefone: newEntityData.telefone,
        email: newEntityData.email,
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
        data.lawyerId = parseInt(selectedEntityId);
      } else if (selectedPipeline === "escritorios") {
        data.lawFirmId = selectedEntityId;
      } else if (selectedPipeline === "reclamantes") {
        data.claimantId = selectedEntityId;
      }
    }

    createMutation.mutate(data);
  };

  const totalValue = filteredLeads.reduce((acc, l) => acc + Number(l.valor || 0), 0);
  const totalLeads = filteredLeads.length;

  const getEntityOptions = () => {
    if (selectedPipeline === "advogados") {
      return todosAdvogadosInfos.map(a => ({ id: a.id.toString(), name: a.nome }));
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

  // Loading global - aguarda todos os dados carregarem
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6">
        <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-purple-500/25 animate-pulse">
          <Kanban className="h-8 w-8 text-white" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Carregando Pipeline
          </h2>
          <p className="text-sm text-muted-foreground">
            Aguarde enquanto carregamos seus dados...
          </p>
        </div>
        <div className="flex gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="h-2 w-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

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
          
          {selectedPipeline === "advogados" && (
            <Button
              variant="outline"
              onClick={() => syncAdvogadosMutation.mutate()}
              disabled={syncAdvogadosMutation.isPending}
              data-testid="button-sync-advogados"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncAdvogadosMutation.isPending ? "animate-spin" : ""}`} />
              {syncAdvogadosMutation.isPending ? "Sincronizando..." : "Sincronizar Advogados"}
            </Button>
          )}

          {selectedPipeline === "reclamantes" && (
            <Button
              variant="outline"
              onClick={() => syncReclamantesMutation.mutate()}
              disabled={syncReclamantesMutation.isPending}
              data-testid="button-sync-reclamantes"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncReclamantesMutation.isPending ? "animate-spin" : ""}`} />
              {syncReclamantesMutation.isPending ? "Sincronizando..." : "Sincronizar Reclamantes"}
            </Button>
          )}
          
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
                {(selectedPipeline === "escritorios" || selectedPipeline === "reclamantes") && (
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
                        {selectedPipeline === "escritorios" && (
                          <>
                            <Input
                              placeholder="CNPJ"
                              value={newEntityData.cnpj}
                              onChange={(e) => setNewEntityData({ ...newEntityData, cnpj: e.target.value })}
                              data-testid="input-inline-cnpj"
                            />
                            <Input
                              placeholder="Endereço"
                              value={newEntityData.endereco}
                              onChange={(e) => setNewEntityData({ ...newEntityData, endereco: e.target.value })}
                              data-testid="input-inline-endereco"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Cidade"
                                value={newEntityData.cidade}
                                onChange={(e) => setNewEntityData({ ...newEntityData, cidade: e.target.value })}
                                data-testid="input-inline-cidade"
                              />
                              <Input
                                placeholder="Estado"
                                maxLength={2}
                                value={newEntityData.estado}
                                onChange={(e) => setNewEntityData({ ...newEntityData, estado: e.target.value })}
                                data-testid="input-inline-estado"
                              />
                            </div>
                            
                            {/* CNJs Section */}
                            <div className="space-y-2">
                              <Label className="text-sm flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Números de Processo (CNJs)
                              </Label>
                              <div className="flex gap-2">
                                <Input 
                                  value={inlineNewCnj}
                                  onChange={(e) => setInlineNewCnj(e.target.value)}
                                  placeholder="0000000-00.0000.0.00.0000"
                                  data-testid="input-inline-cnj-new"
                                />
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => {
                                    if (inlineNewCnj.trim() && !inlineEscritorioCnjs.includes(inlineNewCnj.trim())) {
                                      setInlineEscritorioCnjs([...inlineEscritorioCnjs, inlineNewCnj.trim()]);
                                      setInlineNewCnj("");
                                    }
                                  }} 
                                  data-testid="button-inline-add-cnj"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              {inlineEscritorioCnjs.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {inlineEscritorioCnjs.map((cnj, idx) => (
                                    <Badge key={idx} variant="secondary" className="flex items-center gap-1 text-xs py-0.5">
                                      <FileText className="h-3 w-3" />
                                      {cnj}
                                      <button 
                                        type="button" 
                                        onClick={() => setInlineEscritorioCnjs(inlineEscritorioCnjs.filter(c => c !== cnj))}
                                        className="ml-1 hover:text-destructive"
                                        data-testid={`button-inline-remove-cnj-${idx}`}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Advogados Section */}
                            <div className="space-y-2">
                              <Label className="text-sm flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Advogados Vinculados
                              </Label>
                              <div className="flex gap-2">
                                <Select value={inlineSelectedAdvogadoId} onValueChange={setInlineSelectedAdvogadoId}>
                                  <SelectTrigger data-testid="select-inline-advogado">
                                    <SelectValue placeholder="Selecione um advogado" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(todosAdvogadosInfos || [])
                                      .filter((a: any) => !inlineEscritorioAdvogados.includes(a.id))
                                      .map((adv: any) => (
                                        <SelectItem key={adv.id} value={String(adv.id)}>
                                          {adv.nome}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => {
                                    if (inlineSelectedAdvogadoId) {
                                      setInlineEscritorioAdvogados([...inlineEscritorioAdvogados, parseInt(inlineSelectedAdvogadoId)]);
                                      setInlineSelectedAdvogadoId("");
                                    }
                                  }} 
                                  data-testid="button-inline-add-advogado"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              {inlineEscritorioAdvogados.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {inlineEscritorioAdvogados.map((advId, idx) => {
                                    const adv = (todosAdvogadosInfos || []).find((a: any) => a.id === advId);
                                    return (
                                      <Badge key={idx} variant="outline" className="flex items-center gap-1 text-xs py-0.5">
                                        <User className="h-3 w-3" />
                                        {adv?.nome || `ID: ${advId}`}
                                        <button 
                                          type="button" 
                                          onClick={() => setInlineEscritorioAdvogados(inlineEscritorioAdvogados.filter(id => id !== advId))}
                                          className="ml-1 hover:text-destructive"
                                          data-testid={`button-inline-remove-advogado-${idx}`}
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
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
                              placeholder="CNJ do Processo"
                              value={newEntityData.cnj}
                              onChange={(e) => setNewEntityData({ ...newEntityData, cnj: e.target.value })}
                              data-testid="input-inline-cnj"
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

        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Select value={selectedPipeline} onValueChange={(v) => setSelectedPipeline(v as PipelineType)}>
          <SelectTrigger className="w-64" data-testid="select-pipeline-type">
            <SelectValue placeholder="Selecione o pipeline" />
          </SelectTrigger>
          <SelectContent>
            {VISIBLE_PIPELINES.map((key) => {
              const { label, icon } = PIPELINE_LABELS[key];
              return (
                <SelectItem key={key} value={key} data-testid={`option-pipeline-${key}`}>
                  <div className="flex items-center gap-2">
                    {icon}
                    <span>{label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="button-open-filters">
              <Filter className="h-4 w-4" />
              Filtros
              {activeFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-96">
            <SheetHeader>
              <SheetTitle>Filtrar Pipeline</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Filtrar por Advogado</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const advogado = todosAdvogadosInfos.find(a => String(a.id) === value);
                    if (advogado) {
                      addFilter({
                        type: "advogado",
                        id: advogado.id,
                        value: String(advogado.id),
                        label: `Advogado: ${advogado.nome}`
                      });
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-filter-advogado">
                    <SelectValue placeholder="Selecione um advogado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {todosAdvogadosInfos.map((advogado) => (
                      <SelectItem key={advogado.id} value={String(advogado.id)} data-testid={`select-item-filter-advogado-${advogado.id}`}>
                        {advogado.nome} {advogado.cnj ? `(${advogado.cnj})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Filtrar por Reclamante</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const reclamante = reclamantes.find(r => r.id === value);
                    if (reclamante) {
                      addFilter({
                        type: "reclamante",
                        id: reclamante.id,
                        value: reclamante.id,
                        label: `Reclamante: ${reclamante.nome}`
                      });
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-filter-reclamante">
                    <SelectValue placeholder="Selecione um reclamante..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reclamantes.map((reclamante) => (
                      <SelectItem key={reclamante.id} value={reclamante.id} data-testid={`select-item-filter-reclamante-${reclamante.id}`}>
                        {reclamante.nome} {reclamante.cnj ? `(${reclamante.cnj})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Filtrar por Escritório</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    const escritorio = escritorios.find(e => e.id === value);
                    if (escritorio) {
                      addFilter({
                        type: "escritorio",
                        id: escritorio.id,
                        value: escritorio.id,
                        label: `Escritório: ${escritorio.nome}`
                      });
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-filter-escritorio">
                    <SelectValue placeholder="Selecione um escritório..." />
                  </SelectTrigger>
                  <SelectContent>
                    {escritorios.map((escritorio) => (
                      <SelectItem key={escritorio.id} value={escritorio.id} data-testid={`select-item-filter-escritorio-${escritorio.id}`}>
                        {escritorio.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Filtrar por CNJ</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite o número CNJ..."
                    data-testid="input-filter-cnj"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (value) {
                          addFilter({
                            type: "cnj",
                            value: value,
                            label: `CNJ: ${value}`
                          });
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Busca em advogados e reclamantes</p>
              </div>

              {activeFilters.length > 0 && (
                <div className="pt-4 border-t space-y-2">
                  <Label className="text-sm font-medium">Filtros Ativos</Label>
                  <div className="flex flex-wrap gap-2">
                    {activeFilters.map((filter, index) => (
                      <Badge 
                        key={`${filter.type}-${filter.value}-${index}`} 
                        variant="secondary" 
                        className="flex items-center gap-1 pl-2 pr-1 py-1"
                      >
                        <span className="text-xs">{filter.label}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-4 w-4 hover:bg-destructive/20"
                          onClick={() => removeFilter(filter)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={clearAllFilters}
                  >
                    Limpar todos os filtros
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtros:</span>
            {activeFilters.map((filter, index) => (
              <Badge 
                key={`${filter.type}-${filter.value}-${index}`} 
                variant="secondary" 
                className="flex items-center gap-1 pl-2 pr-1 py-1"
                data-testid={`filter-badge-${filter.type}-${index}`}
              >
                <span className="text-xs">{filter.label}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 hover:bg-destructive/20"
                  onClick={() => removeFilter(filter)}
                  data-testid={`button-remove-filter-${filter.type}-${index}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={clearAllFilters}
              data-testid="button-clear-all-filters"
            >
              Limpar todos
            </Button>
          </div>
        )}
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
              todosAdvogadosInfos={todosAdvogadosInfos}
              escritorios={escritorios}
              reclamantes={reclamantes}
              activities={activities}
              lawyersWithLawsuits={lawyersWithLawsuits}
              claimantsWithLawsuits={claimantsWithLawsuits}
              lawFirmsWithLawsuits={lawFirmsWithLawsuits}
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
              onFilter={addFilter}
              dragOverLeadId={dragOverLeadId}
              isLoading={isLoading}
              isDragOver={dragOverStage === stage.id}
              isUpdating={updateMutation.isPending}
              isMinimized={minimizedColumns.has(stage.id)}
              onToggleMinimize={() => toggleColumnMinimize(stage.id)}
              cardsLimit={CARDS_LIMIT}
              currentLimit={columnLimits[stage.id] || CARDS_LIMIT}
              onLoadMore={() => setColumnLimits(prev => ({ 
                ...prev, 
                [stage.id]: (prev[stage.id] || CARDS_LIMIT) + CARDS_LIMIT 
              }))}
              onShowLess={() => setColumnLimits(prev => ({ ...prev, [stage.id]: CARDS_LIMIT }))}
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
                todosAdvogadosInfos={todosAdvogadosInfos}
                escritorios={escritorios}
                reclamantes={reclamantes}
                activities={activities}
                pipelineType={pipelineType}
                onClose={() => setSelectedLeadId(null)}
                onAdvanceStage={handleAdvanceStage}
                isPending={updateMutation.isPending}
                lawyersWithLawsuits={lawyersWithLawsuits}
                claimantsWithLawsuits={claimantsWithLawsuits}
                lawFirmsWithLawsuits={lawFirmsWithLawsuits}
                onNavigatePipeline={(type, filters) => {
                  setSelectedLeadId(null);
                  setSelectedPipeline(type);
                  setActiveFilters(filters);
                }}
              />
            </SheetContent>
          </Sheet>
        );
      })()}
    </div>
  );
}
