import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getUser } from "@/lib/auth";
import { Plus, Users, Mail, Calendar, Trash2, Shield, UserPlus, UsersRound, Edit } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  papel: string;
  createdAt: string | null;
}

interface TeamMember {
  id: string;
  nome: string;
  email: string;
}

interface Team {
  id: string;
  nome: string;
  coordenadorId: string;
  coordenador: { id: string; nome: string } | null;
  membros: TeamMember[];
  criadoEm: string | null;
}

function getRoleBadge(papel: string) {
  switch (papel) {
    case "admin":
      return <Badge className="bg-purple-600 text-white border-transparent" data-testid={`badge-role-${papel}`}>Admin</Badge>;
    case "coordenador":
      return <Badge className="bg-blue-600 text-white border-transparent" data-testid={`badge-role-${papel}`}>Coordenador</Badge>;
    default:
      return <Badge variant="secondary" data-testid={`badge-role-${papel}`}>Funcionário</Badge>;
  }
}

export default function UsersPage() {
  const { toast } = useToast();
  const currentUser = getUser();
  const isAdmin = currentUser?.papel === "admin";

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ nome: "", email: "", senha: "" });

  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ nome: "", coordenadorId: "" });

  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [editTeamData, setEditTeamData] = useState({ nome: "", coordenadorId: "" });

  const [managingTeam, setManagingTeam] = useState<Team | null>(null);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: teams = [], isLoading: isTeamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { nome: string; email: string; senha: string }) => {
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      setNewUser({ nome: "", email: "", senha: "" });
      toast({ title: "Usuário criado com sucesso" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Verifique os dados e tente novamente",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário excluído" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir usuário", variant: "destructive" });
    },
  });

  const roleUpdateMutation = useMutation({
    mutationFn: async ({ id, papel }: { id: string; papel: string }) => {
      return apiRequest("PATCH", `/api/users/${id}/role`, { papel });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Papel atualizado com sucesso" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar papel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: { nome: string; coordenadorId: string }) => {
      return apiRequest("POST", "/api/teams", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setIsCreateTeamOpen(false);
      setNewTeam({ nome: "", coordenadorId: "" });
      toast({ title: "Equipe criada com sucesso" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar equipe",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editTeamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { nome: string; coordenadorId: string } }) => {
      return apiRequest("PATCH", `/api/teams/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setIsEditTeamOpen(false);
      setEditingTeam(null);
      toast({ title: "Equipe atualizada com sucesso" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar equipe",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/teams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Equipe excluída com sucesso" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir equipe",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ teamId, usuarioId }: { teamId: string; usuarioId: string }) => {
      return apiRequest("POST", `/api/teams/${teamId}/members`, { usuarioId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setAddMemberUserId("");
      toast({ title: "Membro adicionado com sucesso" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ teamId, usuarioId }: { teamId: string; usuarioId: string }) => {
      return apiRequest("DELETE", `/api/teams/${teamId}/members/${usuarioId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Membro removido com sucesso" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.nome.trim() || !newUser.email.trim() || !newUser.senha.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    createMutation.mutate(newUser);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.nome.trim() || !newTeam.coordenadorId) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    createTeamMutation.mutate(newTeam);
  };

  const handleEditTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !editTeamData.nome.trim() || !editTeamData.coordenadorId) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    editTeamMutation.mutate({ id: editingTeam.id, data: editTeamData });
  };

  const openEditTeam = (team: Team) => {
    setEditingTeam(team);
    setEditTeamData({ nome: team.nome, coordenadorId: team.coordenadorId });
    setIsEditTeamOpen(true);
  };

  const openManageMembers = (team: Team) => {
    setManagingTeam(team);
    setAddMemberUserId("");
    setIsMembersOpen(true);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const currentManagedTeam = managingTeam ? teams.find(t => t.id === managingTeam.id) || managingTeam : null;
  const availableUsersForTeam = currentManagedTeam
    ? users.filter(u => !currentManagedTeam.membros.some(m => m.id === u.id))
    : users;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Usuários & Equipes
          </h1>
          <p className="text-muted-foreground">Gerencie os usuários e equipes do sistema</p>
        </div>
      </div>

      <Tabs defaultValue="usuarios" data-testid="tabs-users-teams">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="usuarios" data-testid="tab-usuarios">
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="equipes" data-testid="tab-equipes">
            <UsersRound className="h-4 w-4 mr-2" />
            Equipes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          <div className="space-y-6">
            {isAdmin && (
            <div className="flex items-center justify-end">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-user">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Usuário</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome</Label>
                      <Input
                        id="nome"
                        placeholder="Nome completo"
                        value={newUser.nome}
                        onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                        data-testid="input-user-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@exemplo.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        data-testid="input-user-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senha">Senha</Label>
                      <Input
                        id="senha"
                        type="password"
                        placeholder="Senha"
                        value={newUser.senha}
                        onChange={(e) => setNewUser({ ...newUser, senha: e.target.value })}
                        data-testid="input-user-password"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel-user">
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-user">
                        {createMutation.isPending ? "Criando..." : "Criar Usuário"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="card-premium">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-users">{users.length}</div>
                </CardContent>
              </Card>
              <Card className="card-premium">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-admins">
                    {users.filter(u => u.papel === "admin").length}
                  </div>
                </CardContent>
              </Card>
              <Card className="card-premium">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Equipes</CardTitle>
                  <UsersRound className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-teams">{teams.length}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="card-premium">
              <CardHeader>
                <CardTitle>Lista de Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Papel</TableHead>
                        <TableHead>Criado em</TableHead>
                        {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Select
                                value={user.papel || "funcionario"}
                                onValueChange={(value) =>
                                  roleUpdateMutation.mutate({ id: user.id, papel: value })
                                }
                                data-testid={`select-role-${user.id}`}
                              >
                                <SelectTrigger className="w-[150px]" data-testid={`select-role-trigger-${user.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin" data-testid="select-role-option-admin">Admin</SelectItem>
                                  <SelectItem value="coordenador" data-testid="select-role-option-coordenador">Coordenador</SelectItem>
                                  <SelectItem value="funcionario" data-testid="select-role-option-funcionario">Funcionário</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              getRoleBadge(user.papel || "funcionario")
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {user.createdAt
                                ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                                : "-"}
                            </div>
                          </TableCell>
                          {isAdmin && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(user.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="equipes">
          <div className="space-y-6">
            {isAdmin && (
              <div className="flex items-center justify-end">
                <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-new-team">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Equipe
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Nova Equipe</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTeam} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="team-nome">Nome da Equipe</Label>
                        <Input
                          id="team-nome"
                          placeholder="Nome da equipe"
                          value={newTeam.nome}
                          onChange={(e) => setNewTeam({ ...newTeam, nome: e.target.value })}
                          data-testid="input-team-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team-coordenador">Coordenador</Label>
                        <Select
                          value={newTeam.coordenadorId}
                          onValueChange={(value) => setNewTeam({ ...newTeam, coordenadorId: value })}
                        >
                          <SelectTrigger data-testid="select-team-coordenador">
                            <SelectValue placeholder="Selecione o coordenador" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.filter((u) => u.papel === "coordenador" || u.papel === "admin").map((user) => (
                              <SelectItem key={user.id} value={user.id} data-testid={`select-coordenador-option-${user.id}`}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateTeamOpen(false)} data-testid="button-cancel-team">
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createTeamMutation.isPending} data-testid="button-save-team">
                          {createTeamMutation.isPending ? "Criando..." : "Criar Equipe"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {isTeamsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : teams.length === 0 ? (
              <Card className="card-premium">
                <CardContent className="py-12">
                  <div className="text-center">
                    <UsersRound className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhuma equipe cadastrada</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => (
                  <Card key={team.id} className="card-premium" data-testid={`card-team-${team.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{team.nome}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Coordenador: {team.coordenador?.nome || "N/A"}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditTeam(team)}
                            data-testid={`button-edit-team-${team.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTeamMutation.mutate(team.id)}
                            disabled={deleteTeamMutation.isPending}
                            data-testid={`button-delete-team-${team.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span data-testid={`text-member-count-${team.id}`}>
                          {team.membros.length} {team.membros.length === 1 ? "membro" : "membros"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap">
                        {team.membros.slice(0, 5).map((member) => (
                          <Avatar key={member.id} className="h-7 w-7" data-testid={`avatar-member-${member.id}`}>
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-[10px]">
                              {getInitials(member.nome)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {team.membros.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{team.membros.length - 5}
                          </Badge>
                        )}
                      </div>

                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => openManageMembers(team)}
                          data-testid={`button-manage-members-${team.id}`}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Gerenciar Membros
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditTeamOpen} onOpenChange={setIsEditTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Equipe</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTeam} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-team-nome">Nome da Equipe</Label>
              <Input
                id="edit-team-nome"
                placeholder="Nome da equipe"
                value={editTeamData.nome}
                onChange={(e) => setEditTeamData({ ...editTeamData, nome: e.target.value })}
                data-testid="input-edit-team-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-team-coordenador">Coordenador</Label>
              <Select
                value={editTeamData.coordenadorId}
                onValueChange={(value) => setEditTeamData({ ...editTeamData, coordenadorId: value })}
              >
                <SelectTrigger data-testid="select-edit-team-coordenador">
                  <SelectValue placeholder="Selecione o coordenador" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter((u) => u.papel === "coordenador" || u.papel === "admin").map((user) => (
                    <SelectItem key={user.id} value={user.id} data-testid={`select-edit-coordenador-option-${user.id}`}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditTeamOpen(false)} data-testid="button-cancel-edit-team">
                Cancelar
              </Button>
              <Button type="submit" disabled={editTeamMutation.isPending} data-testid="button-save-edit-team">
                {editTeamMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar Membros - {currentManagedTeam?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Membros Atuais</Label>
              {currentManagedTeam?.membros.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nenhum membro na equipe</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {currentManagedTeam?.membros.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                      data-testid={`member-row-${member.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-[10px]">
                            {getInitials(member.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{member.nome}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          removeMemberMutation.mutate({
                            teamId: currentManagedTeam!.id,
                            usuarioId: member.id,
                          })
                        }
                        disabled={removeMemberMutation.isPending}
                        data-testid={`button-remove-member-${member.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label>Adicionar Membro</Label>
              <div className="flex gap-2">
                <Select value={addMemberUserId} onValueChange={setAddMemberUserId}>
                  <SelectTrigger className="flex-1" data-testid="select-add-member">
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsersForTeam.map((user) => (
                      <SelectItem key={user.id} value={user.id} data-testid={`select-add-member-option-${user.id}`}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (addMemberUserId && currentManagedTeam) {
                      addMemberMutation.mutate({
                        teamId: currentManagedTeam.id,
                        usuarioId: addMemberUserId,
                      });
                    }
                  }}
                  disabled={!addMemberUserId || addMemberMutation.isPending}
                  data-testid="button-add-member"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
