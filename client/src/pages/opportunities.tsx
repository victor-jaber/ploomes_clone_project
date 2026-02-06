import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Target,
  Briefcase,
  Building2,
  User,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Lead, Advogado, Escritorio, Reclamante } from "@shared/schema";
import { PIPELINE_STAGES } from "@shared/schema";

const PIPELINE_LABELS: Record<string, { label: string; icon: any }> = {
  advogados: { label: "Advogados", icon: Briefcase },
  escritorios: { label: "Escritórios", icon: Building2 },
  reclamantes: { label: "Reclamantes", icon: User },
  triagem: { label: "Gestão de Casos", icon: Target },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function InlineEditInput({ 
  value, 
  onSave, 
  type = "text",
  className = ""
}: { 
  value: string; 
  onSave: (val: string) => void;
  type?: "text" | "number" | "currency";
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleBlur = () => {
    setEditing(false);
    if (tempValue !== value) {
      onSave(tempValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    }
    if (e.key === "Escape") {
      setTempValue(value);
      setEditing(false);
    }
  };

  if (editing) {
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
      />
    );
  }

  return (
    <span 
      onClick={() => {
        setTempValue(value);
        setEditing(true);
      }}
      className={`cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors ${className}`}
    >
      {type === "currency" ? formatCurrency(Number(value) || 0) : value || "-"}
    </span>
  );
}

function InlineEditSelect({
  value,
  options,
  onSave,
  placeholder = "Selecione"
}: {
  value: string;
  options: { value: string; label: string; color?: string }[];
  onSave: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onSave}>
      <SelectTrigger className="h-8 w-auto min-w-[120px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.color ? (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                {opt.label}
              </div>
            ) : (
              opt.label
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function OpportunitiesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [pipelineFilter, setPipelineFilter] = useState<string>("all");

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: lawyers = [] } = useQuery<Advogado[]>({
    queryKey: ["/api/lawyers"],
  });

  const { data: lawFirms = [] } = useQuery<Escritorio[]>({
    queryKey: ["/api/law-firms"],
  });

  const { data: claimants = [] } = useQuery<Reclamante[]>({
    queryKey: ["/api/claimants"],
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) => {
      return apiRequest("PATCH", `/api/leads/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    },
  });

  const getEntityName = (lead: Lead) => {
    if (lead.advogadoId) {
      return lawyers.find(a => a.id === lead.advogadoId)?.nome || "-";
    }
    if (lead.escritorioId) {
      return lawFirms.find(e => e.id === lead.escritorioId)?.nome || "-";
    }
    if (lead.reclamanteId) {
      return claimants.find(r => r.id === lead.reclamanteId)?.nome || "-";
    }
    return "-";
  };

  const getStageInfo = (lead: Lead) => {
    const stages = PIPELINE_STAGES[lead.tipoPipeline as keyof typeof PIPELINE_STAGES] || [];
    return stages.find(s => s.id === lead.etapa) || { label: lead.etapa, color: "bg-gray-500" };
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getEntityName(lead).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPipeline = pipelineFilter === "all" || lead.tipoPipeline === pipelineFilter;
    return matchesSearch && matchesPipeline;
  });

  const totalValue = filteredLeads.reduce((sum, lead) => sum + Number(lead.valor || 0), 0);

  const handleUpdateField = (leadId: string, field: string, value: string | number | null) => {
    updateLeadMutation.mutate({ id: leadId, data: { [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Oportunidades</h1>
            <p className="text-sm text-muted-foreground">
              Todos os leads dos pipelines
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Total de Leads</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{filteredLeads.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Valor Total</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Probabilidade Média</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {filteredLeads.length > 0
                ? Math.round(
                    filteredLeads.reduce((sum, l) => sum + (l.probabilidade || 0), 0) /
                      filteredLeads.length
                  )
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou entidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-opportunities"
              />
            </div>
            <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-pipeline-filter">
                <SelectValue placeholder="Filtrar por pipeline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Pipelines</SelectItem>
                {Object.entries(PIPELINE_LABELS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma oportunidade encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Probabilidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const stageInfo = getStageInfo(lead);
                    const stageOptions = (PIPELINE_STAGES[lead.tipoPipeline as keyof typeof PIPELINE_STAGES] || []).map(s => ({
                      value: s.id,
                      label: s.label,
                      color: s.color
                    }));

                    return (
                      <TableRow key={lead.id} data-testid={`row-opportunity-${lead.id}`}>
                        <TableCell>
                          <InlineEditInput
                            value={lead.titulo}
                            onSave={(val) => handleUpdateField(lead.id, "titulo", val)}
                            className="font-medium"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {PIPELINE_LABELS[lead.tipoPipeline]?.label || lead.tipoPipeline}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <InlineEditSelect
                            value={lead.etapa}
                            options={stageOptions}
                            onSave={(val) => handleUpdateField(lead.id, "etapa", val)}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {getEntityName(lead)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <InlineEditInput
                            value={lead.valor || "0"}
                            type="currency"
                            onSave={(val) => handleUpdateField(lead.id, "valor", val)}
                            className="font-medium text-green-600"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <InlineEditInput
                              value={(lead.probabilidade || 0).toString()}
                              type="number"
                              onSave={(val) => handleUpdateField(lead.id, "probabilidade", parseInt(val) || 0)}
                              className="w-16"
                            />
                            <span className="text-muted-foreground">%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
