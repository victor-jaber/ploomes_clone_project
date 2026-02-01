import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  MoreHorizontal,
  Target,
  Pencil,
  Trash2,
  Eye,
  Building2,
  Calendar,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Opportunity, Client, InsertOpportunity } from "@shared/schema";

const statusOptions = [
  { value: "lead", label: "Lead", color: "bg-blue-500" },
  { value: "qualified", label: "Qualificado", color: "bg-purple-500" },
  { value: "proposal", label: "Proposta", color: "bg-orange-500" },
  { value: "negotiation", label: "Negociação", color: "bg-yellow-500" },
  { value: "closed_won", label: "Ganho", color: "bg-green-500" },
  { value: "closed_lost", label: "Perdido", color: "bg-red-500" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function OpportunitiesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [viewingOpportunity, setViewingOpportunity] = useState<Opportunity | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: opportunities = [], isLoading: oppLoading } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertOpportunity) => {
      return apiRequest("POST", "/api/opportunities", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      setIsDialogOpen(false);
      setEditingOpportunity(null);
      toast({ title: "Sucesso", description: "Oportunidade criada com sucesso" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a oportunidade",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertOpportunity> }) => {
      return apiRequest("PATCH", `/api/opportunities/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      setIsDialogOpen(false);
      setEditingOpportunity(null);
      toast({ title: "Sucesso", description: "Oportunidade atualizada com sucesso" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a oportunidade",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/opportunities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({ title: "Sucesso", description: "Oportunidade excluída com sucesso" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a oportunidade",
        variant: "destructive",
      });
    },
  });

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || opp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: InsertOpportunity = {
      title: formData.get("title") as string,
      clientId: formData.get("clientId") as string,
      value: formData.get("value") as string,
      status: (formData.get("status") as any) || "lead",
      probability: parseInt(formData.get("probability") as string) || 0,
      expectedCloseDate: formData.get("expectedCloseDate")
        ? new Date(formData.get("expectedCloseDate") as string)
        : null,
      description: formData.get("description") as string,
      lostReason: formData.get("lostReason") as string,
      ownerId: "",
    };

    if (editingOpportunity) {
      updateMutation.mutate({ id: editingOpportunity.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (opp: Opportunity) => {
    setEditingOpportunity(opp);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingOpportunity(null);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string | null) => {
    const option = statusOptions.find((o) => o.value === status);
    if (!option) return null;
    return (
      <Badge variant="secondary" className="flex items-center gap-1.5">
        <div className={`h-2 w-2 rounded-full ${option.color}`} />
        {option.label}
      </Badge>
    );
  };

  const getClientName = (clientId: string | null | undefined) => {
    if (!clientId) return "-";
    return clients.find((c) => c.id === clientId)?.companyName || "-";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Oportunidades</h1>
          <p className="text-muted-foreground">
            Gerencie suas oportunidades de negócio
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} data-testid="button-new-opportunity">
              <Plus className="h-4 w-4 mr-2" />
              Nova Oportunidade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingOpportunity ? "Editar Oportunidade" : "Nova Oportunidade"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editingOpportunity?.title}
                  required
                  data-testid="input-opp-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientId">Cliente *</Label>
                <Select
                  name="clientId"
                  defaultValue={editingOpportunity?.clientId || undefined}
                  required
                >
                  <SelectTrigger data-testid="select-opp-client">
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
                    step="0.01"
                    defaultValue={editingOpportunity?.value || ""}
                    data-testid="input-opp-value"
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
                    defaultValue={editingOpportunity?.probability || 0}
                    data-testid="input-opp-probability"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    name="status"
                    defaultValue={editingOpportunity?.status || "lead"}
                  >
                    <SelectTrigger data-testid="select-opp-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${option.color}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedCloseDate">Previsão de Fechamento</Label>
                  <Input
                    id="expectedCloseDate"
                    name="expectedCloseDate"
                    type="date"
                    defaultValue={
                      editingOpportunity?.expectedCloseDate
                        ? new Date(editingOpportunity.expectedCloseDate)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    data-testid="input-opp-close-date"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingOpportunity?.description || ""}
                  data-testid="input-opp-description"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-opp"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Salvando..."
                  : editingOpportunity
                  ? "Atualizar"
                  : "Criar Oportunidade"}
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
                placeholder="Buscar oportunidades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-opportunities"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${option.color}`} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {oppLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Nenhuma oportunidade encontrada</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm || statusFilter !== "all"
                  ? "Tente ajustar seus filtros"
                  : "Adicione sua primeira oportunidade"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Oportunidade</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOpportunities.map((opp) => (
                  <TableRow key={opp.id} data-testid={`opp-row-${opp.id}`}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{opp.title}</p>
                        {opp.probability !== null && (
                          <p className="text-xs text-muted-foreground">
                            {opp.probability}% probabilidade
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {getClientName(opp.clientId)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(Number(opp.value || 0))}
                    </TableCell>
                    <TableCell>{getStatusBadge(opp.status)}</TableCell>
                    <TableCell>
                      {opp.expectedCloseDate ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(opp.expectedCloseDate).toLocaleDateString("pt-BR")}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-opp-menu-${opp.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingOpportunity(opp)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(opp)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(opp.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewingOpportunity} onOpenChange={() => setViewingOpportunity(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewingOpportunity?.title}</DialogTitle>
          </DialogHeader>
          {viewingOpportunity && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(viewingOpportunity.status)}
                {viewingOpportunity.probability !== null && (
                  <Badge variant="outline">{viewingOpportunity.probability}%</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{getClientName(viewingOpportunity.clientId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-medium text-lg">
                    {formatCurrency(Number(viewingOpportunity.value || 0))}
                  </p>
                </div>
              </div>
              {viewingOpportunity.expectedCloseDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Previsão de Fechamento</p>
                  <p className="font-medium">
                    {new Date(viewingOpportunity.expectedCloseDate).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
              {viewingOpportunity.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p className="text-sm">{viewingOpportunity.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
