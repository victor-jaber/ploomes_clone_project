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
  FileText,
  Pencil,
  Trash2,
  Eye,
  Calendar,
  Target,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Proposta, Lead, InsertProposta } from "@shared/schema";

const proposalStatuses = [
  { value: "rascunho", label: "Rascunho", color: "bg-gray-500" },
  { value: "enviado", label: "Enviada", color: "bg-blue-500" },
  { value: "aceito", label: "Aceita", color: "bg-green-500" },
  { value: "rejeitado", label: "Rejeitada", color: "bg-red-500" },
  { value: "expirado", label: "Expirada", color: "bg-orange-500" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function ProposalsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposta | null>(null);
  const [viewingProposal, setViewingProposal] = useState<Proposta | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: proposals = [], isLoading } = useQuery<Proposta[]>({
    queryKey: ["/api/proposals"],
  });

  const { data: opportunities = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProposta) => {
      return apiRequest("POST", "/api/proposals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setIsDialogOpen(false);
      setEditingProposal(null);
      toast({ title: "Sucesso", description: "Proposta criada com sucesso" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a proposta",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProposta> }) => {
      return apiRequest("PATCH", `/api/proposals/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setIsDialogOpen(false);
      setEditingProposal(null);
      toast({ title: "Sucesso", description: "Proposta atualizada com sucesso" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a proposta",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/proposals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({ title: "Sucesso", description: "Proposta excluída com sucesso" });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a proposta",
        variant: "destructive",
      });
    },
  });

  const filteredProposals = proposals.filter((proposal) => {
    const matchesSearch = proposal.numero.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const generateProposalNumber = () => {
    const year = new Date().getFullYear();
    const count = proposals.length + 1;
    return `PROP-${year}-${count.toString().padStart(4, "0")}`;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: InsertProposta = {
      numero: formData.get("number") as string || generateProposalNumber(),
      leadId: formData.get("opportunityId") as string,
      status: (formData.get("status") as any) || "rascunho",
      validoAte: formData.get("validUntil")
        ? new Date(formData.get("validUntil") as string)
        : null,
      subtotal: formData.get("subtotal") as string || "0",
      desconto: formData.get("discount") as string || "0",
      total: formData.get("total") as string || "0",
      observacoes: formData.get("notes") as string,
      termos: formData.get("terms") as string,
    };

    if (editingProposal) {
      updateMutation.mutate({ id: editingProposal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (proposal: Proposta) => {
    setEditingProposal(proposal);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingProposal(null);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string | null) => {
    const option = proposalStatuses.find((o) => o.value === status);
    if (!option) return null;
    return (
      <Badge variant="secondary" className="flex items-center gap-1.5">
        <div className={`h-2 w-2 rounded-full ${option.color}`} />
        {option.label}
      </Badge>
    );
  };

  const getLeadTitle = (leadId: string) => {
    return opportunities.find((o) => o.id === leadId)?.titulo || "-";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Propostas</h1>
          <p className="text-muted-foreground">
            Gerencie suas propostas comerciais
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} data-testid="button-new-proposal">
              <Plus className="h-4 w-4 mr-2" />
              Nova Proposta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProposal ? "Editar Proposta" : "Nova Proposta"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    name="number"
                    defaultValue={editingProposal?.numero || generateProposalNumber()}
                    data-testid="input-proposal-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    name="status"
                    defaultValue={editingProposal?.status || "rascunho"}
                  >
                    <SelectTrigger data-testid="select-proposal-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {proposalStatuses.map((option) => (
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="opportunityId">Oportunidade *</Label>
                <Select
                  name="opportunityId"
                  defaultValue={editingProposal?.leadId}
                  required
                >
                  <SelectTrigger data-testid="select-proposal-opportunity">
                    <SelectValue placeholder="Selecione uma oportunidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {opportunities.map((opp) => (
                      <SelectItem key={opp.id} value={opp.id}>
                        {opp.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">Válida até</Label>
                <Input
                  id="validUntil"
                  name="validUntil"
                  type="date"
                  defaultValue={
                    editingProposal?.validoAte
                      ? new Date(editingProposal.validoAte).toISOString().split("T")[0]
                      : ""
                  }
                  data-testid="input-proposal-valid-until"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subtotal">Subtotal (R$)</Label>
                  <Input
                    id="subtotal"
                    name="subtotal"
                    type="number"
                    step="0.01"
                    defaultValue={editingProposal?.subtotal || "0"}
                    data-testid="input-proposal-subtotal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Desconto (R$)</Label>
                  <Input
                    id="discount"
                    name="discount"
                    type="number"
                    step="0.01"
                    defaultValue={editingProposal?.desconto || "0"}
                    data-testid="input-proposal-discount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total">Total (R$)</Label>
                  <Input
                    id="total"
                    name="total"
                    type="number"
                    step="0.01"
                    defaultValue={editingProposal?.total || "0"}
                    data-testid="input-proposal-total"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={editingProposal?.observacoes || ""}
                  data-testid="input-proposal-notes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms">Termos e Condições</Label>
                <Textarea
                  id="terms"
                  name="terms"
                  defaultValue={editingProposal?.termos || ""}
                  data-testid="input-proposal-terms"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-proposal"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Salvando..."
                  : editingProposal
                  ? "Atualizar"
                  : "Criar Proposta"}
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
                placeholder="Buscar propostas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-proposals"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-proposal-status">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {proposalStatuses.map((option) => (
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
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Nenhuma proposta encontrada</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm || statusFilter !== "all"
                  ? "Tente ajustar seus filtros"
                  : "Crie sua primeira proposta"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Oportunidade</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProposals.map((proposal) => (
                  <TableRow key={proposal.id} data-testid={`proposal-row-${proposal.id}`}>
                    <TableCell className="font-mono text-sm">
                      {proposal.numero}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        {getLeadTitle(proposal.leadId)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(Number(proposal.total || 0))}
                    </TableCell>
                    <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                    <TableCell>
                      {proposal.validoAte ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(proposal.validoAte).toLocaleDateString("pt-BR")}
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
                            data-testid={`button-proposal-menu-${proposal.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingProposal(proposal)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(proposal)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(proposal.id)}
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

      <Dialog open={!!viewingProposal} onOpenChange={() => setViewingProposal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Proposta {viewingProposal?.numero}</DialogTitle>
          </DialogHeader>
          {viewingProposal && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(viewingProposal.status)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Oportunidade</p>
                <p className="font-medium">{getLeadTitle(viewingProposal.leadId)}</p>
              </div>
              {viewingProposal.validoAte && (
                <div>
                  <p className="text-sm text-muted-foreground">Válida até</p>
                  <p className="font-medium">
                    {new Date(viewingProposal.validoAte).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="font-medium">{formatCurrency(Number(viewingProposal.subtotal || 0))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Desconto</p>
                  <p className="font-medium text-destructive">
                    -{formatCurrency(Number(viewingProposal.desconto || 0))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium text-lg text-primary">
                    {formatCurrency(Number(viewingProposal.total || 0))}
                  </p>
                </div>
              </div>
              {viewingProposal.observacoes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="text-sm">{viewingProposal.observacoes}</p>
                </div>
              )}
              {viewingProposal.termos && (
                <div>
                  <p className="text-sm text-muted-foreground">Termos e Condições</p>
                  <p className="text-sm">{viewingProposal.termos}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
