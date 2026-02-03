import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Scale,
  Building2,
  User,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Eye,
  MapPin,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { TodosAdvogadosInfos, Escritorio, Reclamante, InsertTodosAdvogadosInfos, InsertEscritorio, InsertReclamante } from "@shared/schema";

type EntityType = "todosAdvogadosInfos" | "escritorios" | "reclamantes";

const entityConfig = {
  todosAdvogadosInfos: {
    label: "Todos Advogados Infos",
    labelSingular: "Advogado Info",
    icon: Scale,
    color: "from-purple-500 to-violet-500",
  },
  escritorios: {
    label: "Escritórios",
    labelSingular: "Escritório",
    icon: Building2,
    color: "from-blue-500 to-cyan-500",
  },
  reclamantes: {
    label: "Reclamantes",
    labelSingular: "Reclamante",
    icon: User,
    color: "from-green-500 to-emerald-500",
  },
};

export default function ClientsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<EntityType>("todosAdvogadosInfos");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<TodosAdvogadosInfos | Escritorio | Reclamante | null>(null);
  const [viewingEntity, setViewingEntity] = useState<TodosAdvogadosInfos | Escritorio | Reclamante | null>(null);

  const { data: todosAdvogadosInfos = [], isLoading: todosAdvogadosInfosLoading } = useQuery<TodosAdvogadosInfos[]>({
    queryKey: ["/api/todos-advogados-infos"],
  });

  const { data: escritorios = [], isLoading: escritoriosLoading } = useQuery<Escritorio[]>({
    queryKey: ["/api/escritorios"],
  });

  const { data: reclamantes = [], isLoading: reclamantesLoading } = useQuery<Reclamante[]>({
    queryKey: ["/api/reclamantes"],
  });

  const createTodosAdvogadosInfosMutation = useMutation({
    mutationFn: async (data: InsertTodosAdvogadosInfos) => apiRequest("POST", "/api/todos-advogados-infos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos-advogados-infos"] });
      setIsDialogOpen(false);
      setEditingEntity(null);
      toast({ title: "Sucesso", description: "Advogado Info criado com sucesso" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível criar o advogado info", variant: "destructive" }),
  });

  const updateTodosAdvogadosInfosMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertTodosAdvogadosInfos> }) => 
      apiRequest("PATCH", `/api/todos-advogados-infos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos-advogados-infos"] });
      setIsDialogOpen(false);
      setEditingEntity(null);
      toast({ title: "Sucesso", description: "Advogado Info atualizado com sucesso" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar o advogado info", variant: "destructive" }),
  });

  const deleteTodosAdvogadosInfosMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/todos-advogados-infos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos-advogados-infos"] });
      toast({ title: "Sucesso", description: "Advogado Info excluído com sucesso" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível excluir o advogado info", variant: "destructive" }),
  });

  const createEscritorioMutation = useMutation({
    mutationFn: async (data: InsertEscritorio) => apiRequest("POST", "/api/escritorios", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/escritorios"] });
      setIsDialogOpen(false);
      setEditingEntity(null);
      toast({ title: "Sucesso", description: "Escritório criado com sucesso" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível criar o escritório", variant: "destructive" }),
  });

  const updateEscritorioMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEscritorio> }) => 
      apiRequest("PATCH", `/api/escritorios/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/escritorios"] });
      setIsDialogOpen(false);
      setEditingEntity(null);
      toast({ title: "Sucesso", description: "Escritório atualizado com sucesso" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar o escritório", variant: "destructive" }),
  });

  const deleteEscritorioMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/escritorios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/escritorios"] });
      toast({ title: "Sucesso", description: "Escritório excluído com sucesso" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível excluir o escritório", variant: "destructive" }),
  });

  const createReclamanteMutation = useMutation({
    mutationFn: async (data: InsertReclamante) => apiRequest("POST", "/api/reclamantes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reclamantes"] });
      setIsDialogOpen(false);
      setEditingEntity(null);
      toast({ title: "Sucesso", description: "Reclamante criado com sucesso" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível criar o reclamante", variant: "destructive" }),
  });

  const updateReclamanteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertReclamante> }) => 
      apiRequest("PATCH", `/api/reclamantes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reclamantes"] });
      setIsDialogOpen(false);
      setEditingEntity(null);
      toast({ title: "Sucesso", description: "Reclamante atualizado com sucesso" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar o reclamante", variant: "destructive" }),
  });

  const deleteReclamanteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/reclamantes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reclamantes"] });
      toast({ title: "Sucesso", description: "Reclamante excluído com sucesso" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível excluir o reclamante", variant: "destructive" }),
  });

  const getFilteredData = () => {
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case "todosAdvogadosInfos":
        return todosAdvogadosInfos.filter(a => 
          a.nome?.toLowerCase().includes(term) || 
          a.cpf?.toLowerCase().includes(term) ||
          a.cnj?.toLowerCase().includes(term) ||
          a.email?.toLowerCase().includes(term) ||
          a.municipio?.toLowerCase().includes(term)
        );
      case "escritorios":
        return escritorios.filter(e => 
          e.nome?.toLowerCase().includes(term) || 
          e.cnpj?.toLowerCase().includes(term) ||
          e.email?.toLowerCase().includes(term)
        );
      case "reclamantes":
        return reclamantes.filter(r => 
          r.nome?.toLowerCase().includes(term) || 
          r.cpf?.toLowerCase().includes(term) ||
          r.email?.toLowerCase().includes(term) ||
          r.processoNumero?.toLowerCase().includes(term)
        );
      default:
        return [];
    }
  };

  const handleSubmitTodosAdvogadosInfos = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: InsertTodosAdvogadosInfos = {
      nome: formData.get("nome") as string,
      cpf: formData.get("cpf") as string || null,
      cnj: formData.get("cnj") as string || null,
      valorCausa: formData.get("valorCausa") as string || null,
      email: formData.get("email") as string || null,
      telefone: formData.get("telefone") as string || null,
      celular: formData.get("celular") as string || null,
      cep: formData.get("cep") as string || null,
      estado: formData.get("estado") as string || null,
      municipio: formData.get("municipio") as string || null,
      bairro: formData.get("bairro") as string || null,
      logradouro: formData.get("logradouro") as string || null,
      numero: formData.get("numero") as string || null,
      complemento: formData.get("complemento") as string || null,
      observacoes: formData.get("observacoes") as string || null,
      ownerId: "",
    };
    if (editingEntity) {
      updateTodosAdvogadosInfosMutation.mutate({ id: editingEntity.id, data });
    } else {
      createTodosAdvogadosInfosMutation.mutate(data);
    }
  };

  const handleSubmitEscritorio = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: InsertEscritorio = {
      nome: formData.get("nome") as string,
      cnpj: formData.get("cnpj") as string || null,
      email: formData.get("email") as string || null,
      telefone: formData.get("telefone") as string || null,
      endereco: formData.get("endereco") as string || null,
      cidade: formData.get("cidade") as string || null,
      estado: formData.get("estado") as string || null,
      observacoes: formData.get("observacoes") as string || null,
      ownerId: "",
    };
    if (editingEntity) {
      updateEscritorioMutation.mutate({ id: editingEntity.id, data });
    } else {
      createEscritorioMutation.mutate(data);
    }
  };

  const handleSubmitReclamante = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: InsertReclamante = {
      nome: formData.get("nome") as string,
      cpf: formData.get("cpf") as string || null,
      email: formData.get("email") as string || null,
      telefone: formData.get("telefone") as string || null,
      processoNumero: formData.get("processoNumero") as string || null,
      valorCausa: formData.get("valorCausa") as string || null,
      observacoes: formData.get("observacoes") as string || null,
      ownerId: "",
    };
    if (editingEntity) {
      updateReclamanteMutation.mutate({ id: editingEntity.id, data });
    } else {
      createReclamanteMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    switch (activeTab) {
      case "todosAdvogadosInfos":
        deleteTodosAdvogadosInfosMutation.mutate(id);
        break;
      case "escritorios":
        deleteEscritorioMutation.mutate(id);
        break;
      case "reclamantes":
        deleteReclamanteMutation.mutate(id);
        break;
    }
  };

  const openNewDialog = () => {
    setEditingEntity(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (entity: TodosAdvogadosInfos | Escritorio | Reclamante) => {
    setEditingEntity(entity);
    setIsDialogOpen(true);
  };

  const config = entityConfig[activeTab];
  const Icon = config.icon;
  const filteredData = getFilteredData();
  const isLoading = activeTab === "todosAdvogadosInfos" ? todosAdvogadosInfosLoading : 
                    activeTab === "escritorios" ? escritoriosLoading : reclamantesLoading;

  const isPending = createTodosAdvogadosInfosMutation.isPending || updateTodosAdvogadosInfosMutation.isPending ||
                    createEscritorioMutation.isPending || updateEscritorioMutation.isPending ||
                    createReclamanteMutation.isPending || updateReclamanteMutation.isPending;

  const renderTodosAdvogadosInfosForm = () => {
    const adv = editingEntity as TodosAdvogadosInfos | null;
    return (
      <form onSubmit={handleSubmitTodosAdvogadosInfos} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={adv?.nome || ""} required data-testid="input-advogado-nome" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" name="cpf" defaultValue={adv?.cpf || ""} placeholder="000.000.000-00" data-testid="input-advogado-cpf" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cnj">CNJ</Label>
            <Input id="cnj" name="cnj" defaultValue={adv?.cnj || ""} data-testid="input-advogado-cnj" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valorCausa">Valor da Causa</Label>
            <Input id="valorCausa" name="valorCausa" type="number" step="0.01" defaultValue={adv?.valorCausa || ""} data-testid="input-advogado-valor" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={adv?.email || ""} data-testid="input-advogado-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" defaultValue={adv?.telefone || ""} data-testid="input-advogado-telefone" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="celular">Celular</Label>
            <Input id="celular" name="celular" defaultValue={adv?.celular || ""} data-testid="input-advogado-celular" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" name="cep" defaultValue={adv?.cep || ""} placeholder="00000-000" data-testid="input-advogado-cep" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Input id="estado" name="estado" maxLength={2} defaultValue={adv?.estado || ""} placeholder="SP" data-testid="input-advogado-estado" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="municipio">Município</Label>
            <Input id="municipio" name="municipio" defaultValue={adv?.municipio || ""} data-testid="input-advogado-municipio" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" name="bairro" defaultValue={adv?.bairro || ""} data-testid="input-advogado-bairro" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logradouro">Logradouro</Label>
            <Input id="logradouro" name="logradouro" defaultValue={adv?.logradouro || ""} data-testid="input-advogado-logradouro" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" name="numero" defaultValue={adv?.numero || ""} data-testid="input-advogado-numero" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="complemento">Complemento</Label>
            <Input id="complemento" name="complemento" defaultValue={adv?.complemento || ""} data-testid="input-advogado-complemento" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" name="observacoes" defaultValue={adv?.observacoes || ""} data-testid="input-advogado-obs" />
        </div>
        <Button type="submit" className="w-full" disabled={isPending} data-testid="button-save-advogado">
          {isPending ? "Salvando..." : editingEntity ? "Atualizar Advogado Info" : "Criar Advogado Info"}
        </Button>
      </form>
    );
  };

  const renderEscritorioForm = () => {
    const esc = editingEntity as Escritorio | null;
    return (
      <form onSubmit={handleSubmitEscritorio} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={esc?.nome || ""} required data-testid="input-escritorio-nome" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" name="cnpj" defaultValue={esc?.cnpj || ""} placeholder="00.000.000/0000-00" data-testid="input-escritorio-cnpj" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={esc?.email || ""} data-testid="input-escritorio-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" defaultValue={esc?.telefone || ""} data-testid="input-escritorio-telefone" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" name="endereco" defaultValue={esc?.endereco || ""} data-testid="input-escritorio-endereco" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" name="cidade" defaultValue={esc?.cidade || ""} data-testid="input-escritorio-cidade" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Input id="estado" name="estado" maxLength={2} defaultValue={esc?.estado || ""} placeholder="SP" data-testid="input-escritorio-estado" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" name="observacoes" defaultValue={esc?.observacoes || ""} data-testid="input-escritorio-obs" />
        </div>
        <Button type="submit" className="w-full" disabled={isPending} data-testid="button-save-escritorio">
          {isPending ? "Salvando..." : editingEntity ? "Atualizar Escritório" : "Criar Escritório"}
        </Button>
      </form>
    );
  };

  const renderReclamanteForm = () => {
    const rec = editingEntity as Reclamante | null;
    return (
      <form onSubmit={handleSubmitReclamante} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={rec?.nome || ""} required data-testid="input-reclamante-nome" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" name="cpf" defaultValue={rec?.cpf || ""} placeholder="000.000.000-00" data-testid="input-reclamante-cpf" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={rec?.email || ""} data-testid="input-reclamante-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" defaultValue={rec?.telefone || ""} data-testid="input-reclamante-telefone" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="processoNumero">Número do Processo</Label>
            <Input id="processoNumero" name="processoNumero" defaultValue={rec?.processoNumero || ""} data-testid="input-reclamante-processo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valorCausa">Valor da Causa</Label>
            <Input id="valorCausa" name="valorCausa" type="number" step="0.01" defaultValue={rec?.valorCausa || ""} data-testid="input-reclamante-valor" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" name="observacoes" defaultValue={rec?.observacoes || ""} data-testid="input-reclamante-obs" />
        </div>
        <Button type="submit" className="w-full" disabled={isPending} data-testid="button-save-reclamante">
          {isPending ? "Salvando..." : editingEntity ? "Atualizar Reclamante" : "Criar Reclamante"}
        </Button>
      </form>
    );
  };

  const renderTodosAdvogadosInfosTable = () => {
    const data = filteredData as TodosAdvogadosInfos[];
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CPF</TableHead>
            <TableHead>CNJ</TableHead>
            <TableHead>Valor da Causa</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Endereço</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((adv) => (
            <TableRow key={adv.id} data-testid={`advogado-row-${adv.id}`}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-500 text-white text-xs">
                      {adv.nome?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{adv.nome}</span>
                </div>
              </TableCell>
              <TableCell>
                {adv.cpf && <Badge variant="outline">{adv.cpf}</Badge>}
              </TableCell>
              <TableCell>
                {adv.cnj && <Badge variant="secondary">{adv.cnj}</Badge>}
              </TableCell>
              <TableCell>
                {adv.valorCausa && (
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(adv.valorCausa))}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="space-y-1 text-sm">
                  {adv.email && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-3 w-3" /> {adv.email}
                    </div>
                  )}
                  {adv.telefone && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" /> {adv.telefone}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {adv.municipio && adv.estado && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {adv.municipio}/{adv.estado}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-advogado-menu-${adv.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewingEntity(adv)}>
                      <Eye className="h-4 w-4 mr-2" /> Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(adv)}>
                      <Pencil className="h-4 w-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(adv.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderEscritoriosTable = () => {
    const data = filteredData as Escritorio[];
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Escritório</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Localização</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((esc) => (
            <TableRow key={esc.id} data-testid={`escritorio-row-${esc.id}`}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs">
                      {esc.nome?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{esc.nome}</span>
                </div>
              </TableCell>
              <TableCell>
                {esc.cnpj && <Badge variant="outline">{esc.cnpj}</Badge>}
              </TableCell>
              <TableCell>
                <div className="space-y-1 text-sm">
                  {esc.email && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-3 w-3" /> {esc.email}
                    </div>
                  )}
                  {esc.telefone && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" /> {esc.telefone}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {esc.cidade && esc.estado && (
                  <span className="text-sm text-muted-foreground">{esc.cidade}/{esc.estado}</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-escritorio-menu-${esc.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewingEntity(esc)}>
                      <Eye className="h-4 w-4 mr-2" /> Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(esc)}>
                      <Pencil className="h-4 w-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(esc.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderReclamantesTable = () => {
    const data = filteredData as Reclamante[];
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reclamante</TableHead>
            <TableHead>CPF</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Nº Processo</TableHead>
            <TableHead>Valor da Causa</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((rec) => (
            <TableRow key={rec.id} data-testid={`reclamante-row-${rec.id}`}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white text-xs">
                      {rec.nome?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{rec.nome}</span>
                </div>
              </TableCell>
              <TableCell>
                {rec.cpf && <Badge variant="outline">{rec.cpf}</Badge>}
              </TableCell>
              <TableCell>
                <div className="space-y-1 text-sm">
                  {rec.email && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-3 w-3" /> {rec.email}
                    </div>
                  )}
                  {rec.telefone && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" /> {rec.telefone}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {rec.processoNumero && (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground">{rec.processoNumero}</span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                {rec.valorCausa && (
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(rec.valorCausa))}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-reclamante-menu-${rec.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewingEntity(rec)}>
                      <Eye className="h-4 w-4 mr-2" /> Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(rec)}>
                      <Pencil className="h-4 w-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(rec.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderViewDialog = () => {
    if (!viewingEntity) return null;
    
    if (activeTab === "todosAdvogadosInfos") {
      const adv = viewingEntity as TodosAdvogadosInfos;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-500 text-white text-lg">
                {adv.nome?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{adv.nome}</h3>
              {adv.cpf && <Badge variant="outline">CPF: {adv.cpf}</Badge>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {adv.cnj && <div><p className="text-sm text-muted-foreground">CNJ</p><p className="font-medium">{adv.cnj}</p></div>}
            {adv.valorCausa && <div><p className="text-sm text-muted-foreground">Valor da Causa</p><p className="font-semibold text-green-600 dark:text-green-400">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(adv.valorCausa))}</p></div>}
            {adv.email && <div><p className="text-sm text-muted-foreground">E-mail</p><p className="font-medium">{adv.email}</p></div>}
            {adv.telefone && <div><p className="text-sm text-muted-foreground">Telefone</p><p className="font-medium">{adv.telefone}</p></div>}
            {adv.celular && <div><p className="text-sm text-muted-foreground">Celular</p><p className="font-medium">{adv.celular}</p></div>}
            {adv.cep && <div><p className="text-sm text-muted-foreground">CEP</p><p className="font-medium">{adv.cep}</p></div>}
          </div>
          {(adv.logradouro || adv.municipio) && (
            <div>
              <p className="text-sm text-muted-foreground">Endereço</p>
              <p className="font-medium">
                {adv.logradouro}{adv.numero && `, ${adv.numero}`}
                {adv.complemento && ` - ${adv.complemento}`}
                {adv.bairro && `, ${adv.bairro}`}
                {adv.municipio && `, ${adv.municipio}`}
                {adv.estado && ` - ${adv.estado}`}
              </p>
            </div>
          )}
          {adv.observacoes && <div><p className="text-sm text-muted-foreground">Observações</p><p className="text-sm">{adv.observacoes}</p></div>}
        </div>
      );
    }

    if (activeTab === "escritorios") {
      const esc = viewingEntity as Escritorio;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-lg">
                {esc.nome?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{esc.nome}</h3>
              {esc.cnpj && <Badge variant="outline">CNPJ: {esc.cnpj}</Badge>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {esc.email && <div><p className="text-sm text-muted-foreground">E-mail</p><p className="font-medium">{esc.email}</p></div>}
            {esc.telefone && <div><p className="text-sm text-muted-foreground">Telefone</p><p className="font-medium">{esc.telefone}</p></div>}
            {esc.endereco && <div className="col-span-2"><p className="text-sm text-muted-foreground">Endereço</p><p className="font-medium">{esc.endereco}{esc.cidade && `, ${esc.cidade}`}{esc.estado && ` - ${esc.estado}`}</p></div>}
          </div>
          {esc.observacoes && <div><p className="text-sm text-muted-foreground">Observações</p><p className="text-sm">{esc.observacoes}</p></div>}
        </div>
      );
    }

    if (activeTab === "reclamantes") {
      const rec = viewingEntity as Reclamante;
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white text-lg">
                {rec.nome?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{rec.nome}</h3>
              {rec.cpf && <Badge variant="outline">CPF: {rec.cpf}</Badge>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {rec.email && <div><p className="text-sm text-muted-foreground">E-mail</p><p className="font-medium">{rec.email}</p></div>}
            {rec.telefone && <div><p className="text-sm text-muted-foreground">Telefone</p><p className="font-medium">{rec.telefone}</p></div>}
            {rec.processoNumero && <div><p className="text-sm text-muted-foreground">Nº Processo</p><p className="font-medium">{rec.processoNumero}</p></div>}
            {rec.valorCausa && <div><p className="text-sm text-muted-foreground">Valor da Causa</p><p className="font-semibold text-green-600 dark:text-green-400">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(rec.valorCausa))}</p></div>}
          </div>
          {rec.observacoes && <div><p className="text-sm text-muted-foreground">Observações</p><p className="text-sm">{rec.observacoes}</p></div>}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Clientes
          </h1>
          <p className="text-muted-foreground">
            Gerencie advogados, escritórios e reclamantes
          </p>
        </div>
        <Button onClick={openNewDialog} data-testid="button-new-entity">
          <Plus className="h-4 w-4 mr-2" />
          Novo {config.labelSingular}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as EntityType); setSearchTerm(""); setEditingEntity(null); setViewingEntity(null); setIsDialogOpen(false); }}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="todosAdvogadosInfos" className="gap-2" data-testid="tab-advogados">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Advogados Infos</span>
            <Badge variant="secondary" className="ml-1">{todosAdvogadosInfos.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="escritorios" className="gap-2" data-testid="tab-escritorios">
            <Building2 className="h-4 w-4" />
            Escritórios
            <Badge variant="secondary" className="ml-1">{escritorios.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="reclamantes" className="gap-2" data-testid="tab-reclamantes">
            <User className="h-4 w-4" />
            Reclamantes
            <Badge variant="secondary" className="ml-1">{reclamantes.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Buscar ${config.label.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-entities"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12">
                <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Nenhum {config.labelSingular.toLowerCase()} encontrado</h3>
                <p className="text-muted-foreground mt-1">
                  {searchTerm ? "Tente ajustar sua busca" : `Adicione seu primeiro ${config.labelSingular.toLowerCase()} para começar`}
                </p>
              </div>
            ) : (
              <>
                <TabsContent value="todosAdvogadosInfos" className="mt-0">
                  {renderTodosAdvogadosInfosTable()}
                </TabsContent>
                <TabsContent value="escritorios" className="mt-0">
                  {renderEscritoriosTable()}
                </TabsContent>
                <TabsContent value="reclamantes" className="mt-0">
                  {renderReclamantesTable()}
                </TabsContent>
              </>
            )}
          </CardContent>
        </Card>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntity ? `Editar ${config.labelSingular}` : `Novo ${config.labelSingular}`}
            </DialogTitle>
          </DialogHeader>
          {activeTab === "todosAdvogadosInfos" && renderTodosAdvogadosInfosForm()}
          {activeTab === "escritorios" && renderEscritorioForm()}
          {activeTab === "reclamantes" && renderReclamanteForm()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingEntity} onOpenChange={() => setViewingEntity(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do {config.labelSingular}</DialogTitle>
          </DialogHeader>
          {renderViewDialog()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
