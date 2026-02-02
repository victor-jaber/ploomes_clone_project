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
  FileText,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Advogado, Escritorio, Reclamante, InsertAdvogado, InsertEscritorio, InsertReclamante } from "@shared/schema";

type EntityType = "advogados" | "escritorios" | "reclamantes";

const entityConfig = {
  advogados: {
    label: "Advogados",
    labelSingular: "Advogado",
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
  const [activeTab, setActiveTab] = useState<EntityType>("advogados");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Advogado | Escritorio | Reclamante | null>(null);
  const [viewingEntity, setViewingEntity] = useState<Advogado | Escritorio | Reclamante | null>(null);

  const { data: advogados = [], isLoading: advogadosLoading } = useQuery<Advogado[]>({
    queryKey: ["/api/advogados"],
  });

  const { data: escritorios = [], isLoading: escritoriosLoading } = useQuery<Escritorio[]>({
    queryKey: ["/api/escritorios"],
  });

  const { data: reclamantes = [], isLoading: reclamantesLoading } = useQuery<Reclamante[]>({
    queryKey: ["/api/reclamantes"],
  });

  const createAdvogadoMutation = useMutation({
    mutationFn: async (data: InsertAdvogado) => apiRequest("POST", "/api/advogados", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advogados"] });
      setIsDialogOpen(false);
      setEditingEntity(null);
      toast({ title: "Sucesso", description: "Advogado criado com sucesso" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível criar o advogado", variant: "destructive" }),
  });

  const updateAdvogadoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertAdvogado> }) => 
      apiRequest("PATCH", `/api/advogados/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advogados"] });
      setIsDialogOpen(false);
      setEditingEntity(null);
      toast({ title: "Sucesso", description: "Advogado atualizado com sucesso" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar o advogado", variant: "destructive" }),
  });

  const deleteAdvogadoMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/advogados/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advogados"] });
      toast({ title: "Sucesso", description: "Advogado excluído com sucesso" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível excluir o advogado", variant: "destructive" }),
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
      case "advogados":
        return advogados.filter(a => 
          a.nome?.toLowerCase().includes(term) || 
          a.oab?.toLowerCase().includes(term) ||
          a.email?.toLowerCase().includes(term) ||
          a.numeroCaso?.toLowerCase().includes(term)
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

  const handleSubmitAdvogado = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: InsertAdvogado = {
      nome: formData.get("nome") as string,
      oab: formData.get("oab") as string,
      email: formData.get("email") as string || null,
      telefone: formData.get("telefone") as string || null,
      celular: formData.get("celular") as string || null,
      especialidade: formData.get("especialidade") as string || null,
      numeroCaso: formData.get("numeroCaso") as string || null,
      observacoes: formData.get("observacoes") as string || null,
      ownerId: "",
    };
    if (editingEntity) {
      updateAdvogadoMutation.mutate({ id: editingEntity.id, data });
    } else {
      createAdvogadoMutation.mutate(data);
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
      case "advogados":
        deleteAdvogadoMutation.mutate(id);
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

  const openEditDialog = (entity: Advogado | Escritorio | Reclamante) => {
    setEditingEntity(entity);
    setIsDialogOpen(true);
  };

  const config = entityConfig[activeTab];
  const Icon = config.icon;
  const filteredData = getFilteredData();
  const isLoading = activeTab === "advogados" ? advogadosLoading : 
                    activeTab === "escritorios" ? escritoriosLoading : reclamantesLoading;

  const isPending = createAdvogadoMutation.isPending || updateAdvogadoMutation.isPending ||
                    createEscritorioMutation.isPending || updateEscritorioMutation.isPending ||
                    createReclamanteMutation.isPending || updateReclamanteMutation.isPending;

  const renderAdvogadoForm = () => {
    const adv = editingEntity as Advogado | null;
    return (
      <form onSubmit={handleSubmitAdvogado} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" defaultValue={adv?.nome || ""} required data-testid="input-advogado-nome" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oab">OAB *</Label>
            <Input id="oab" name="oab" defaultValue={adv?.oab || ""} required data-testid="input-advogado-oab" />
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
            <Label htmlFor="especialidade">Especialidade</Label>
            <Input id="especialidade" name="especialidade" defaultValue={adv?.especialidade || ""} data-testid="input-advogado-especialidade" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="numeroCaso">Número do Caso</Label>
          <Input id="numeroCaso" name="numeroCaso" defaultValue={adv?.numeroCaso || ""} data-testid="input-advogado-caso" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" name="observacoes" defaultValue={adv?.observacoes || ""} data-testid="input-advogado-obs" />
        </div>
        <Button type="submit" className="w-full" disabled={isPending} data-testid="button-save-advogado">
          {isPending ? "Salvando..." : editingEntity ? "Atualizar Advogado" : "Criar Advogado"}
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

  const renderAdvogadosTable = () => {
    const data = filteredData as Advogado[];
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Advogado</TableHead>
            <TableHead>OAB</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Especialidade</TableHead>
            <TableHead>Nº Caso</TableHead>
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
                <Badge variant="outline">{adv.oab}</Badge>
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
                {adv.especialidade && <Badge variant="secondary">{adv.especialidade}</Badge>}
              </TableCell>
              <TableCell>
                {adv.numeroCaso && (
                  <div className="flex items-center gap-1 text-sm">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    {adv.numeroCaso}
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
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    {rec.processoNumero}
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
    
    if (activeTab === "advogados") {
      const adv = viewingEntity as Advogado;
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
              <Badge variant="outline">OAB: {adv.oab}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {adv.email && <div><p className="text-sm text-muted-foreground">E-mail</p><p className="font-medium">{adv.email}</p></div>}
            {adv.telefone && <div><p className="text-sm text-muted-foreground">Telefone</p><p className="font-medium">{adv.telefone}</p></div>}
            {adv.celular && <div><p className="text-sm text-muted-foreground">Celular</p><p className="font-medium">{adv.celular}</p></div>}
            {adv.especialidade && <div><p className="text-sm text-muted-foreground">Especialidade</p><p className="font-medium">{adv.especialidade}</p></div>}
            {adv.numeroCaso && <div><p className="text-sm text-muted-foreground">Nº Caso</p><p className="font-medium">{adv.numeroCaso}</p></div>}
          </div>
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
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="advogados" className="gap-2" data-testid="tab-advogados">
            <Scale className="h-4 w-4" />
            Advogados
            <Badge variant="secondary" className="ml-1">{advogados.length}</Badge>
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
                <TabsContent value="advogados" className="mt-0">
                  {renderAdvogadosTable()}
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
          {activeTab === "advogados" && renderAdvogadoForm()}
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
