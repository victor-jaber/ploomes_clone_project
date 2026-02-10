import {
  advogados,
  escritorios,
  reclamantes,
  escritorioAdvogados,
  processos,
  processoAdvogados,
  processoReclamantes,
  leads,
  leadFinanceiros,
  leadDetalhesCaso,
  leadChecklist,
  leadResponsaveis,
  atividades,
  propostas,
  propostaItens,
  interacoes,
  produtos,
  usuarios,
  enderecos,
  contatos,
  advogadoContatos,
  escritorioContatos,
  reclamanteContatos,
  equipes,
  equipeMembros,
  type Advogado,
  type InsertAdvogado,
  type Escritorio,
  type InsertEscritorio,
  type Reclamante,
  type InsertReclamante,
  type EscritorioAdvogado,
  type InsertEscritorioAdvogado,
  type Processo,
  type InsertProcesso,
  type ProcessoAdvogado,
  type ProcessoReclamante,
  type Lead,
  type InsertLead,
  type LeadFinanceiro,
  type InsertLeadFinanceiro,
  type LeadDetalhesCaso,
  type InsertLeadDetalhesCaso,
  type LeadChecklist,
  type InsertLeadChecklist,
  type LeadResponsaveis,
  type InsertLeadResponsaveis,
  type Atividade,
  type InsertAtividade,
  type Proposta,
  type InsertProposta,
  type PropostaItem,
  type InsertPropostaItem,
  type Interacao,
  type InsertInteracao,
  type Produto,
  type InsertProduto,
  type Equipe,
  type InsertEquipe,
  type EquipeMembro,
  type InsertEquipeMembro,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray, sql, isNotNull, isNull } from "drizzle-orm";

export interface IStorage {
  // Lawyers (Advogados)
  getLawyers(ownerId: string): Promise<any[]>;
  getLawyer(id: number, ownerId: string): Promise<any | undefined>;
  createLawyer(lawyer: InsertAdvogado): Promise<Advogado>;
  updateLawyer(id: number, ownerId: string, lawyer: Partial<InsertAdvogado>): Promise<Advogado | undefined>;
  deleteLawyer(id: number, ownerId: string): Promise<boolean>;

  // Law Firms (Escritórios)
  getLawFirms(ownerId: string): Promise<any[]>;
  getLawFirm(id: string, ownerId: string): Promise<any | undefined>;
  createLawFirm(lawFirm: InsertEscritorio): Promise<Escritorio>;
  updateLawFirm(id: string, ownerId: string, lawFirm: Partial<InsertEscritorio>): Promise<Escritorio | undefined>;
  deleteLawFirm(id: string, ownerId: string): Promise<boolean>;

  // Claimants (Reclamantes)
  getClaimants(ownerId: string): Promise<any[]>;
  getClaimant(id: string, ownerId: string): Promise<any | undefined>;
  createClaimant(claimant: InsertReclamante): Promise<Reclamante>;
  updateClaimant(id: string, ownerId: string, claimant: Partial<InsertReclamante>): Promise<Reclamante | undefined>;
  deleteClaimant(id: string, ownerId: string): Promise<boolean>;

  // Law Firm Lawyers (N:N)
  getLawFirmLawyers(lawFirmId: string): Promise<Advogado[]>;
  addLawyerToLawFirm(lawFirmId: string, lawyerId: number): Promise<EscritorioAdvogado>;
  removeLawyerFromLawFirm(lawFirmId: string, lawyerId: number): Promise<boolean>;

  // Lawsuit Links (N:N) - Vinculação de processos com entidades
  getLawsuitsByLawyer(lawyerId: number): Promise<Processo[]>;
  getLawsuitsByClaimant(claimantId: string): Promise<Processo[]>;
  getLawsuitsByLawFirm(lawFirmId: string): Promise<Processo[]>;
  addLawyerToLawsuit(lawsuitId: string, lawyerId: number): Promise<ProcessoAdvogado>;
  addClaimantToLawsuit(lawsuitId: string, claimantId: string): Promise<ProcessoReclamante>;
  removeLawyerFromLawsuit(lawsuitId: string, lawyerId: number): Promise<boolean>;
  removeClaimantFromLawsuit(lawsuitId: string, claimantId: string): Promise<boolean>;

  // Aggregated data for pipeline (dados públicos - sem filtro por ownerId)
  getLawyersWithLawsuits(): Promise<(Advogado & { lawsuits: Processo[] })[]>;
  getClaimantsWithLawsuits(): Promise<(Reclamante & { lawsuits: Processo[] })[]>;
  getLawFirmsWithLawsuits(): Promise<(Escritorio & { lawsuits: Processo[]; lawyerIds: number[] })[]>;

  // Leads (com filtro de visibilidade por papel do usuário)
  getLeads(pipelineType?: string, visibleUserIds?: string[] | null): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeadWithDetails(id: string): Promise<(Lead & { financials?: LeadFinanceiro | null, caseDetails?: LeadDetalhesCaso | null, checklist?: LeadChecklist | null, assignments?: LeadResponsaveis | null }) | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;

  // Lead Financials (1:1)
  getLeadFinancials(leadId: string): Promise<LeadFinanceiro | undefined>;
  upsertLeadFinancials(leadId: string, data: Partial<InsertLeadFinanceiro>): Promise<LeadFinanceiro>;

  // Lead Case Details (1:1)
  getLeadCaseDetails(leadId: string): Promise<LeadDetalhesCaso | undefined>;
  upsertLeadCaseDetails(leadId: string, data: Partial<InsertLeadDetalhesCaso>): Promise<LeadDetalhesCaso>;

  // Lead Checklist (1:1)
  getLeadChecklist(leadId: string): Promise<LeadChecklist | undefined>;
  upsertLeadChecklist(leadId: string, data: Partial<InsertLeadChecklist>): Promise<LeadChecklist>;

  // Lead Assignments (1:1)
  getLeadAssignments(leadId: string): Promise<LeadResponsaveis | undefined>;
  upsertLeadAssignments(leadId: string, data: Partial<InsertLeadResponsaveis>): Promise<LeadResponsaveis>;

  // Products
  getProducts(ownerId: string): Promise<Produto[]>;
  getProduct(id: string, ownerId: string): Promise<Produto | undefined>;
  createProduct(product: InsertProduto): Promise<Produto>;
  updateProduct(id: string, ownerId: string, product: Partial<InsertProduto>): Promise<Produto | undefined>;
  deleteProduct(id: string, ownerId: string): Promise<boolean>;

  // Activities
  getActivities(ownerId: string): Promise<Atividade[]>;
  getActivity(id: string, ownerId: string): Promise<Atividade | undefined>;
  createActivity(activity: InsertAtividade): Promise<Atividade>;
  updateActivity(id: string, ownerId: string, activity: Partial<InsertAtividade>): Promise<Atividade | undefined>;
  deleteActivity(id: string, ownerId: string): Promise<boolean>;

  // Proposals
  getProposals(ownerId: string): Promise<Proposta[]>;
  getProposal(id: string, ownerId: string): Promise<Proposta | undefined>;
  createProposal(proposal: InsertProposta): Promise<Proposta>;
  updateProposal(id: string, ownerId: string, proposal: Partial<InsertProposta>): Promise<Proposta | undefined>;
  deleteProposal(id: string, ownerId: string): Promise<boolean>;

  // Proposal Items
  getProposalItems(proposalId: string): Promise<PropostaItem[]>;
  getProposalItem(id: string): Promise<PropostaItem | undefined>;
  createProposalItem(item: InsertPropostaItem): Promise<PropostaItem>;
  updateProposalItem(id: string, item: Partial<InsertPropostaItem>): Promise<PropostaItem | undefined>;
  deleteProposalItem(id: string): Promise<void>;

  // Interactions
  getInteractions(leadId: string): Promise<(Interacao & { vendedorName?: string | null })[]>;
  createInteraction(interaction: InsertInteracao): Promise<Interacao>;
  deleteInteraction(id: string, ownerId: string): Promise<boolean>;

  // Users
  getUsers(): Promise<{ id: string; name: string; email: string; papel: string; createdAt: Date | null }[]>;
  getUserByEmail(email: string): Promise<{ id: string; name: string; email: string } | undefined>;
  createUser(user: { name: string; email: string; password: string }): Promise<{ id: string; name: string; email: string; createdAt: Date | null }>;
  updateUserRole(id: string, papel: string): Promise<boolean>;
  deleteUser(id: string): Promise<boolean>;

  // Teams (Equipes)
  getTeams(): Promise<(Equipe & { coordenadores?: { id: string; nome: string }[]; membros?: { id: string; nome: string; email: string }[] })[]>;
  getTeam(id: string): Promise<(Equipe & { coordenadores?: { id: string; nome: string }[]; membros?: { id: string; nome: string; email: string }[] }) | undefined>;
  createTeam(team: InsertEquipe): Promise<Equipe>;
  updateTeam(id: string, team: Partial<InsertEquipe>): Promise<Equipe | undefined>;
  deleteTeam(id: string): Promise<boolean>;
  addTeamMember(equipeId: string, usuarioId: string, papel?: string): Promise<EquipeMembro>;
  removeTeamMember(equipeId: string, usuarioId: string): Promise<boolean>;
  getTeamMemberIds(coordenadorId: string): Promise<string[]>;
  getVisibleUserIds(userId: string, papel: string): Promise<string[] | null>;

  createLawsuitWithLead(data: InsertProcesso, userId: string): Promise<{ processo: Processo; lead: Lead }>;
  syncLawsuitsFromApi(userId: string): Promise<{ total: number; linked: number; errors: number }>;
  
  // Backward compatibility
  getTodosAdvogadosInfos(ownerId: string): Promise<Advogado[]>;
  getTodosAdvogadosInfo(id: number, ownerId: string): Promise<Advogado | undefined>;
  createTodosAdvogadosInfo(info: InsertAdvogado): Promise<Advogado>;
  updateTodosAdvogadosInfo(id: number, ownerId: string, info: Partial<InsertAdvogado>): Promise<Advogado | undefined>;
  deleteTodosAdvogadosInfo(id: number, ownerId: string): Promise<boolean>;
  
  getEscritorios(ownerId: string): Promise<Escritorio[]>;
  getEscritorio(id: string, ownerId: string): Promise<Escritorio | undefined>;
  createEscritorio(escritorio: InsertEscritorio): Promise<Escritorio>;
  updateEscritorio(id: string, ownerId: string, escritorio: Partial<InsertEscritorio>): Promise<Escritorio | undefined>;
  deleteEscritorio(id: string, ownerId: string): Promise<boolean>;
  
  getReclamantes(ownerId: string): Promise<Reclamante[]>;
  getReclamante(id: string, ownerId: string): Promise<Reclamante | undefined>;
  createReclamante(reclamante: InsertReclamante): Promise<Reclamante>;
  updateReclamante(id: string, ownerId: string, reclamante: Partial<InsertReclamante>): Promise<Reclamante | undefined>;
  deleteReclamante(id: string, ownerId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Lawyers
  private async attachLawyerContacts(lawyerRows: any[]): Promise<any[]> {
    if (lawyerRows.length === 0) return [];
    const ids = lawyerRows.map(r => r.id);
    const contactRows = await db.select({
      advogadoId: advogadoContatos.advogadoId,
      contato: contatos,
    })
    .from(advogadoContatos)
    .innerJoin(contatos, eq(advogadoContatos.contatoId, contatos.id))
    .where(inArray(advogadoContatos.advogadoId, ids));

    const contactMap = new Map<number, any[]>();
    for (const cr of contactRows) {
      if (!contactMap.has(cr.advogadoId)) contactMap.set(cr.advogadoId, []);
      contactMap.get(cr.advogadoId)!.push(cr.contato);
    }
    return lawyerRows.map(r => {
      const contatosList = contactMap.get(r.id) || [];
      const first = contatosList[0];
      return {
        ...r,
        contatos: contatosList,
        email: first?.email || null,
        telefone: first?.telefone || null,
        celular: first?.celular || null,
      };
    });
  }

  async getLawyers(ownerId: string): Promise<any[]> {
    const rows = await db.select({
      advogado: advogados,
      endereco: enderecos,
    })
    .from(advogados)
    .leftJoin(enderecos, eq(advogados.enderecoId, enderecos.id))
    .where(eq(advogados.proprietarioId, ownerId))
    .orderBy(desc(advogados.criadoEm));

    const mapped = rows.map(r => ({
      ...r.advogado,
      estado: r.endereco?.estado || null,
      municipio: r.endereco?.municipio || null,
      cidade: r.endereco?.cidade || null,
      bairro: r.endereco?.bairro || null,
      logradouro: r.endereco?.logradouro || null,
      numero: r.endereco?.numero || null,
      complemento: r.endereco?.complemento || null,
      cep: r.endereco?.cep || null,
    }));
    return this.attachLawyerContacts(mapped);
  }

  async getAllLawyers(): Promise<any[]> {
    const rows = await db.select({
      advogado: advogados,
      endereco: enderecos,
    })
    .from(advogados)
    .leftJoin(enderecos, eq(advogados.enderecoId, enderecos.id))
    .orderBy(desc(advogados.criadoEm));

    const mapped = rows.map(r => ({
      ...r.advogado,
      estado: r.endereco?.estado || null,
      municipio: r.endereco?.municipio || null,
      cidade: r.endereco?.cidade || null,
      bairro: r.endereco?.bairro || null,
      logradouro: r.endereco?.logradouro || null,
      numero: r.endereco?.numero || null,
      complemento: r.endereco?.complemento || null,
      cep: r.endereco?.cep || null,
    }));
    return this.attachLawyerContacts(mapped);
  }

  async getLawyer(id: number, ownerId: string): Promise<any | undefined> {
    const [row] = await db.select({
      advogado: advogados,
      endereco: enderecos,
    })
    .from(advogados)
    .leftJoin(enderecos, eq(advogados.enderecoId, enderecos.id))
    .where(and(eq(advogados.id, id), eq(advogados.proprietarioId, ownerId)));

    if (!row) return undefined;
    const mapped = {
      ...row.advogado,
      estado: row.endereco?.estado || null,
      municipio: row.endereco?.municipio || null,
      cidade: row.endereco?.cidade || null,
      bairro: row.endereco?.bairro || null,
      logradouro: row.endereco?.logradouro || null,
      numero: row.endereco?.numero || null,
      complemento: row.endereco?.complemento || null,
      cep: row.endereco?.cep || null,
    };
    const [result] = await this.attachLawyerContacts([mapped]);
    return result;
  }

  async createLawyer(lawyer: InsertAdvogado): Promise<Advogado> {
    const [newLawyer] = await db.insert(advogados).values(lawyer).returning();
    return newLawyer;
  }

  async updateLawyer(id: number, ownerId: string, lawyer: Partial<InsertAdvogado>): Promise<Advogado | undefined> {
    const [updated] = await db
      .update(advogados)
      .set({ ...lawyer, atualizadoEm: new Date() })
      .where(and(eq(advogados.id, id), eq(advogados.proprietarioId, ownerId)))
      .returning();
    return updated;
  }

  async deleteLawyer(id: number, ownerId: string): Promise<boolean> {
    const result = await db.delete(advogados).where(and(eq(advogados.id, id), eq(advogados.proprietarioId, ownerId))).returning();
    return result.length > 0;
  }

  // Law Firms
  private async attachFirmContacts(firmRows: any[]): Promise<any[]> {
    if (firmRows.length === 0) return [];
    const ids = firmRows.map(r => r.id);
    const contactRows = await db.select({
      escritorioId: escritorioContatos.escritorioId,
      contato: contatos,
    })
    .from(escritorioContatos)
    .innerJoin(contatos, eq(escritorioContatos.contatoId, contatos.id))
    .where(inArray(escritorioContatos.escritorioId, ids));

    const contactMap = new Map<string, any[]>();
    for (const cr of contactRows) {
      if (!contactMap.has(cr.escritorioId)) contactMap.set(cr.escritorioId, []);
      contactMap.get(cr.escritorioId)!.push(cr.contato);
    }
    return firmRows.map(r => {
      const contatosList = contactMap.get(r.id) || [];
      const first = contatosList[0];
      return {
        ...r,
        contatos: contatosList,
        email: first?.email || null,
        telefone: first?.telefone || null,
        celular: first?.celular || null,
      };
    });
  }

  async getLawFirms(ownerId: string): Promise<any[]> {
    const rows = await db.select({
      escritorio: escritorios,
      endereco: enderecos,
    })
    .from(escritorios)
    .leftJoin(enderecos, eq(escritorios.enderecoId, enderecos.id))
    .where(eq(escritorios.proprietarioId, ownerId))
    .orderBy(desc(escritorios.criadoEm));

    const mapped = rows.map(r => ({
      ...r.escritorio,
      estado: r.endereco?.estado || null,
      municipio: r.endereco?.municipio || null,
      cidade: r.endereco?.cidade || null,
      bairro: r.endereco?.bairro || null,
      logradouro: r.endereco?.logradouro || null,
      numero: r.endereco?.numero || null,
      complemento: r.endereco?.complemento || null,
      cep: r.endereco?.cep || null,
    }));
    return this.attachFirmContacts(mapped);
  }

  async getAllLawFirms(): Promise<any[]> {
    const rows = await db.select({
      escritorio: escritorios,
      endereco: enderecos,
    })
    .from(escritorios)
    .leftJoin(enderecos, eq(escritorios.enderecoId, enderecos.id))
    .orderBy(desc(escritorios.criadoEm));

    const mapped = rows.map(r => ({
      ...r.escritorio,
      estado: r.endereco?.estado || null,
      municipio: r.endereco?.municipio || null,
      cidade: r.endereco?.cidade || null,
      bairro: r.endereco?.bairro || null,
      logradouro: r.endereco?.logradouro || null,
      numero: r.endereco?.numero || null,
      complemento: r.endereco?.complemento || null,
      cep: r.endereco?.cep || null,
    }));
    return this.attachFirmContacts(mapped);
  }

  async getLawFirm(id: string, ownerId: string): Promise<any | undefined> {
    const [row] = await db.select({
      escritorio: escritorios,
      endereco: enderecos,
    })
    .from(escritorios)
    .leftJoin(enderecos, eq(escritorios.enderecoId, enderecos.id))
    .where(and(eq(escritorios.id, id), eq(escritorios.proprietarioId, ownerId)));

    if (!row) return undefined;
    const mapped = {
      ...row.escritorio,
      estado: row.endereco?.estado || null,
      municipio: row.endereco?.municipio || null,
      cidade: row.endereco?.cidade || null,
      bairro: row.endereco?.bairro || null,
      logradouro: row.endereco?.logradouro || null,
      numero: row.endereco?.numero || null,
      complemento: row.endereco?.complemento || null,
      cep: row.endereco?.cep || null,
    };
    const [result] = await this.attachFirmContacts([mapped]);
    return result;
  }

  async createLawFirm(lawFirm: InsertEscritorio): Promise<Escritorio> {
    const [newLawFirm] = await db.insert(escritorios).values(lawFirm).returning();
    return newLawFirm;
  }

  async updateLawFirm(id: string, ownerId: string, lawFirm: Partial<InsertEscritorio>): Promise<Escritorio | undefined> {
    const [updated] = await db
      .update(escritorios)
      .set({ ...lawFirm, atualizadoEm: new Date() })
      .where(and(eq(escritorios.id, id), eq(escritorios.proprietarioId, ownerId)))
      .returning();
    return updated;
  }

  async deleteLawFirm(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(escritorios).where(and(eq(escritorios.id, id), eq(escritorios.proprietarioId, ownerId))).returning();
    return result.length > 0;
  }

  // Claimants
  private async attachClaimantContacts(claimantRows: any[]): Promise<any[]> {
    if (claimantRows.length === 0) return [];
    const ids = claimantRows.map(r => r.id);
    const contactRows = await db.select({
      reclamanteId: reclamanteContatos.reclamanteId,
      contato: contatos,
    })
    .from(reclamanteContatos)
    .innerJoin(contatos, eq(reclamanteContatos.contatoId, contatos.id))
    .where(inArray(reclamanteContatos.reclamanteId, ids));

    const contactMap = new Map<string, any[]>();
    for (const cr of contactRows) {
      if (!contactMap.has(cr.reclamanteId)) contactMap.set(cr.reclamanteId, []);
      contactMap.get(cr.reclamanteId)!.push(cr.contato);
    }
    return claimantRows.map(r => {
      const contatosList = contactMap.get(r.id) || [];
      const first = contatosList[0];
      return {
        ...r,
        contatos: contatosList,
        email: first?.email || null,
        telefone: first?.telefone || null,
        celular: first?.celular || null,
      };
    });
  }

  async getClaimants(ownerId: string): Promise<any[]> {
    const rows = await db.select({
      reclamante: reclamantes,
      endereco: enderecos,
    })
    .from(reclamantes)
    .leftJoin(enderecos, eq(reclamantes.enderecoId, enderecos.id))
    .where(eq(reclamantes.proprietarioId, ownerId))
    .orderBy(desc(reclamantes.criadoEm));

    const mapped = rows.map(r => ({
      ...r.reclamante,
      estado: r.endereco?.estado || null,
      municipio: r.endereco?.municipio || null,
      cidade: r.endereco?.cidade || null,
      bairro: r.endereco?.bairro || null,
      logradouro: r.endereco?.logradouro || null,
      numero: r.endereco?.numero || null,
      complemento: r.endereco?.complemento || null,
      cep: r.endereco?.cep || null,
    }));
    return this.attachClaimantContacts(mapped);
  }

  async getAllClaimants(): Promise<any[]> {
    const rows = await db.select({
      reclamante: reclamantes,
      endereco: enderecos,
    })
    .from(reclamantes)
    .leftJoin(enderecos, eq(reclamantes.enderecoId, enderecos.id))
    .orderBy(desc(reclamantes.criadoEm));

    const mapped = rows.map(r => ({
      ...r.reclamante,
      estado: r.endereco?.estado || null,
      municipio: r.endereco?.municipio || null,
      cidade: r.endereco?.cidade || null,
      bairro: r.endereco?.bairro || null,
      logradouro: r.endereco?.logradouro || null,
      numero: r.endereco?.numero || null,
      complemento: r.endereco?.complemento || null,
      cep: r.endereco?.cep || null,
    }));
    return this.attachClaimantContacts(mapped);
  }

  async getClaimant(id: string, ownerId: string): Promise<any | undefined> {
    const [row] = await db.select({
      reclamante: reclamantes,
      endereco: enderecos,
    })
    .from(reclamantes)
    .leftJoin(enderecos, eq(reclamantes.enderecoId, enderecos.id))
    .where(and(eq(reclamantes.id, id), eq(reclamantes.proprietarioId, ownerId)));

    if (!row) return undefined;
    const mapped = {
      ...row.reclamante,
      estado: row.endereco?.estado || null,
      municipio: row.endereco?.municipio || null,
      cidade: row.endereco?.cidade || null,
      bairro: row.endereco?.bairro || null,
      logradouro: row.endereco?.logradouro || null,
      numero: row.endereco?.numero || null,
      complemento: row.endereco?.complemento || null,
      cep: row.endereco?.cep || null,
    };
    const [result] = await this.attachClaimantContacts([mapped]);
    return result;
  }

  async createClaimant(claimant: InsertReclamante): Promise<Reclamante> {
    const [newClaimant] = await db.insert(reclamantes).values(claimant).returning();
    return newClaimant;
  }

  async updateClaimant(id: string, ownerId: string, claimant: Partial<InsertReclamante>): Promise<Reclamante | undefined> {
    const [updated] = await db
      .update(reclamantes)
      .set({ ...claimant, atualizadoEm: new Date() })
      .where(and(eq(reclamantes.id, id), eq(reclamantes.proprietarioId, ownerId)))
      .returning();
    return updated;
  }

  async deleteClaimant(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(reclamantes).where(and(eq(reclamantes.id, id), eq(reclamantes.proprietarioId, ownerId))).returning();
    return result.length > 0;
  }

  // Law Firm Lawyers N:N
  async getLawFirmLawyers(lawFirmId: string): Promise<Advogado[]> {
    const result = await db
      .select({ lawyer: advogados })
      .from(escritorioAdvogados)
      .innerJoin(advogados, eq(escritorioAdvogados.advogadoId, advogados.id))
      .where(eq(escritorioAdvogados.escritorioId, lawFirmId));
    return result.map(r => r.lawyer);
  }

  async addLawyerToLawFirm(lawFirmId: string, lawyerId: number): Promise<EscritorioAdvogado> {
    const [newRelation] = await db.insert(escritorioAdvogados).values({ escritorioId: lawFirmId, advogadoId: lawyerId }).returning();
    return newRelation;
  }

  async removeLawyerFromLawFirm(lawFirmId: string, lawyerId: number): Promise<boolean> {
    const result = await db.delete(escritorioAdvogados)
      .where(and(eq(escritorioAdvogados.escritorioId, lawFirmId), eq(escritorioAdvogados.advogadoId, lawyerId)))
      .returning();
    return result.length > 0;
  }

  // Lawsuit Links (N:N) - Vinculação de processos com entidades
  async getLawsuitsByLawyer(lawyerId: number): Promise<Processo[]> {
    const links = await db.select()
      .from(processoAdvogados)
      .innerJoin(processos, eq(processoAdvogados.processoId, processos.id))
      .where(eq(processoAdvogados.advogadoId, lawyerId));
    return links.map(l => l.processos);
  }

  async getLawsuitsByClaimant(claimantId: string): Promise<Processo[]> {
    const links = await db.select()
      .from(processoReclamantes)
      .innerJoin(processos, eq(processoReclamantes.processoId, processos.id))
      .where(eq(processoReclamantes.reclamanteId, claimantId));
    return links.map(l => l.processos);
  }

  async getLawsuitsByLawFirm(lawFirmId: string): Promise<Processo[]> {
    const firmLawyers = await db.select()
      .from(escritorioAdvogados)
      .where(eq(escritorioAdvogados.escritorioId, lawFirmId));
    if (firmLawyers.length === 0) return [];
    const lawyerIds = firmLawyers.map(fl => fl.advogadoId);
    const links = await db.select()
      .from(processoAdvogados)
      .innerJoin(processos, eq(processoAdvogados.processoId, processos.id))
      .where(inArray(processoAdvogados.advogadoId, lawyerIds));
    const seen = new Set<string>();
    const result: Processo[] = [];
    for (const l of links) {
      if (!seen.has(l.processos.id)) {
        seen.add(l.processos.id);
        result.push(l.processos);
      }
    }
    return result;
  }

  async addLawyerToLawsuit(lawsuitId: string, lawyerId: number): Promise<ProcessoAdvogado> {
    const [link] = await db.insert(processoAdvogados)
      .values({ processoId: lawsuitId, advogadoId: lawyerId })
      .onConflictDoNothing()
      .returning();
    return link;
  }

  async addClaimantToLawsuit(lawsuitId: string, claimantId: string): Promise<ProcessoReclamante> {
    const [link] = await db.insert(processoReclamantes)
      .values({ processoId: lawsuitId, reclamanteId: claimantId })
      .onConflictDoNothing()
      .returning();
    return link;
  }

  async removeLawyerFromLawsuit(lawsuitId: string, lawyerId: number): Promise<boolean> {
    const result = await db.delete(processoAdvogados)
      .where(and(eq(processoAdvogados.processoId, lawsuitId), eq(processoAdvogados.advogadoId, lawyerId)))
      .returning();
    return result.length > 0;
  }

  async removeClaimantFromLawsuit(lawsuitId: string, claimantId: string): Promise<boolean> {
    const result = await db.delete(processoReclamantes)
      .where(and(eq(processoReclamantes.processoId, lawsuitId), eq(processoReclamantes.reclamanteId, claimantId)))
      .returning();
    return result.length > 0;
  }

  // Aggregated data for pipeline - retorna entidades com seus processos agrupados (dados públicos)
  async getLawyersWithLawsuits(): Promise<(Advogado & { lawsuits: Processo[] })[]> {
    const allLawyers = await this.getAllLawyers();
    
    if (allLawyers.length === 0) return [];
    
    const lawyerIds = allLawyers.map(l => l.id);
    const allLinks = await db.select({
      advogadoId: processoAdvogados.advogadoId,
      lawsuit: processos,
    })
    .from(processoAdvogados)
    .innerJoin(processos, eq(processoAdvogados.processoId, processos.id))
    .where(inArray(processoAdvogados.advogadoId, lawyerIds));
    
    const lawsuitsByLawyer = new Map<number, Processo[]>();
    for (const link of allLinks) {
      if (!lawsuitsByLawyer.has(link.advogadoId)) {
        lawsuitsByLawyer.set(link.advogadoId, []);
      }
      lawsuitsByLawyer.get(link.advogadoId)!.push(link.lawsuit);
    }
    
    return allLawyers.map(lawyer => ({
      ...lawyer,
      lawsuits: lawsuitsByLawyer.get(lawyer.id) || [],
    }));
  }

  async getClaimantsWithLawsuits(): Promise<(Reclamante & { lawsuits: Processo[] })[]> {
    const allClaimants = await this.getAllClaimants();
    
    if (allClaimants.length === 0) return [];
    
    const claimantIds = allClaimants.map(c => c.id);
    const allLinks = await db.select({
      reclamanteId: processoReclamantes.reclamanteId,
      lawsuit: processos,
    })
    .from(processoReclamantes)
    .innerJoin(processos, eq(processoReclamantes.processoId, processos.id))
    .where(inArray(processoReclamantes.reclamanteId, claimantIds));
    
    const lawsuitsByClaimant = new Map<string, Processo[]>();
    for (const link of allLinks) {
      if (!lawsuitsByClaimant.has(link.reclamanteId)) {
        lawsuitsByClaimant.set(link.reclamanteId, []);
      }
      lawsuitsByClaimant.get(link.reclamanteId)!.push(link.lawsuit);
    }
    
    return allClaimants.map(claimant => ({
      ...claimant,
      lawsuits: lawsuitsByClaimant.get(claimant.id) || [],
    }));
  }

  async getLawFirmsWithLawsuits(): Promise<(Escritorio & { lawsuits: Processo[]; lawyerIds: number[] })[]> {
    const allLawFirms = await this.getAllLawFirms();
    
    if (allLawFirms.length === 0) return [];
    
    const lawFirmIds = allLawFirms.map(l => l.id);
    const firmLawyerLinks = await db.select()
    .from(escritorioAdvogados)
    .where(inArray(escritorioAdvogados.escritorioId, lawFirmIds));
    
    const lawyerToFirms = new Map<number, string[]>();
    const firmToLawyers = new Map<string, number[]>();
    for (const fl of firmLawyerLinks) {
      if (!lawyerToFirms.has(fl.advogadoId)) lawyerToFirms.set(fl.advogadoId, []);
      lawyerToFirms.get(fl.advogadoId)!.push(fl.escritorioId);
      if (!firmToLawyers.has(fl.escritorioId)) firmToLawyers.set(fl.escritorioId, []);
      firmToLawyers.get(fl.escritorioId)!.push(fl.advogadoId);
    }
    
    const uniqueLawyerIds = Array.from(lawyerToFirms.keys());
    let allLinks: { lawFirmId: string; lawsuit: Processo }[] = [];
    if (uniqueLawyerIds.length > 0) {
      const lawyerLawsuitLinks = await db.select({
        advogadoId: processoAdvogados.advogadoId,
        lawsuit: processos,
      })
      .from(processoAdvogados)
      .innerJoin(processos, eq(processoAdvogados.processoId, processos.id))
      .where(inArray(processoAdvogados.advogadoId, uniqueLawyerIds));
      
      for (const ll of lawyerLawsuitLinks) {
        const firmIds = lawyerToFirms.get(ll.advogadoId) || [];
        for (const firmId of firmIds) {
          allLinks.push({ lawFirmId: firmId, lawsuit: ll.lawsuit });
        }
      }
    }
    
    const lawsuitsByLawFirm = new Map<string, Processo[]>();
    for (const link of allLinks) {
      if (!lawsuitsByLawFirm.has(link.lawFirmId)) {
        lawsuitsByLawFirm.set(link.lawFirmId, []);
      }
      lawsuitsByLawFirm.get(link.lawFirmId)!.push(link.lawsuit);
    }
    
    return allLawFirms.map(lawFirm => ({
      ...lawFirm,
      lawsuits: lawsuitsByLawFirm.get(lawFirm.id) || [],
      lawyerIds: firmToLawyers.get(lawFirm.id) || [],
    }));
  }

  // Leads (com filtro de visibilidade por papel do usuário)
  async getLeads(pipelineType?: string, visibleUserIds?: string[] | null): Promise<Lead[]> {
    const conditions = [];
    if (pipelineType) {
      conditions.push(eq(leads.tipoPipeline, pipelineType as any));
    }
    if (visibleUserIds !== null && visibleUserIds !== undefined && visibleUserIds.length > 0) {
      const leadsComResponsavel = await db.select({ leadId: leadResponsaveis.leadId })
        .from(leadResponsaveis)
        .where(inArray(leadResponsaveis.comercialResponsavelId, visibleUserIds));
      const leadIdsComResponsavel = leadsComResponsavel.map(l => l.leadId);
      const leadsVendedor = await db.select({ id: leads.id })
        .from(leads)
        .where(inArray(leads.vendedorId, visibleUserIds));
      const leadIdsVendedor = leadsVendedor.map(l => l.id);
      const leadsComResponsavelDefinido = await db.select({ leadId: leadResponsaveis.leadId })
        .from(leadResponsaveis)
        .where(isNotNull(leadResponsaveis.comercialResponsavelId));
      const leadIdsComResponsavelDefinido = new Set(leadsComResponsavelDefinido.map(l => l.leadId));
      const todosLeads = await db.select({ id: leads.id }).from(leads);
      const leadIdsSemResponsavel = todosLeads
        .filter(l => !leadIdsComResponsavelDefinido.has(l.id))
        .map(l => l.id);
      const allVisibleLeadIds = Array.from(new Set([...leadIdsComResponsavel, ...leadIdsVendedor, ...leadIdsSemResponsavel]));
      if (allVisibleLeadIds.length === 0) {
        return [];
      }
      conditions.push(inArray(leads.id, allVisibleLeadIds));
    }
    if (conditions.length > 0) {
      return db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.criadoEm));
    }
    return db.select().from(leads).orderBy(desc(leads.criadoEm));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updated] = await db
      .update(leads)
      .set({ ...lead, atualizadoEm: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }

  async deleteLead(id: string): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id)).returning();
    return result.length > 0;
  }

  async getLeadWithDetails(id: string): Promise<(Lead & { financials?: LeadFinanceiro | null, caseDetails?: LeadDetalhesCaso | null, checklist?: LeadChecklist | null, assignments?: LeadResponsaveis | null }) | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    if (!lead) return undefined;

    const [financials] = await db.select().from(leadFinanceiros).where(eq(leadFinanceiros.leadId, id));
    const [caseDetails] = await db.select().from(leadDetalhesCaso).where(eq(leadDetalhesCaso.leadId, id));
    const [checklist] = await db.select().from(leadChecklist).where(eq(leadChecklist.leadId, id));
    const [assignments] = await db.select().from(leadResponsaveis).where(eq(leadResponsaveis.leadId, id));

    return {
      ...lead,
      financials: financials || null,
      caseDetails: caseDetails || null,
      checklist: checklist || null,
      assignments: assignments || null,
    };
  }

  // Lead Financials (1:1)
  async getLeadFinancials(leadId: string): Promise<LeadFinanceiro | undefined> {
    const [result] = await db.select().from(leadFinanceiros).where(eq(leadFinanceiros.leadId, leadId));
    return result;
  }

  async upsertLeadFinancials(leadId: string, data: Partial<InsertLeadFinanceiro>): Promise<LeadFinanceiro> {
    const existing = await this.getLeadFinancials(leadId);
    if (existing) {
      const [updated] = await db.update(leadFinanceiros)
        .set({ ...data, atualizadoEm: new Date() })
        .where(eq(leadFinanceiros.leadId, leadId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(leadFinanceiros)
      .values({ ...data, leadId })
      .returning();
    return created;
  }

  // Lead Case Details (1:1)
  async getLeadCaseDetails(leadId: string): Promise<LeadDetalhesCaso | undefined> {
    const [result] = await db.select().from(leadDetalhesCaso).where(eq(leadDetalhesCaso.leadId, leadId));
    return result;
  }

  async upsertLeadCaseDetails(leadId: string, data: Partial<InsertLeadDetalhesCaso>): Promise<LeadDetalhesCaso> {
    const existing = await this.getLeadCaseDetails(leadId);
    if (existing) {
      const [updated] = await db.update(leadDetalhesCaso)
        .set({ ...data, atualizadoEm: new Date() })
        .where(eq(leadDetalhesCaso.leadId, leadId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(leadDetalhesCaso)
      .values({ ...data, leadId })
      .returning();
    return created;
  }

  // Lead Checklist (1:1)
  async getLeadChecklist(leadId: string): Promise<LeadChecklist | undefined> {
    const [result] = await db.select().from(leadChecklist).where(eq(leadChecklist.leadId, leadId));
    return result;
  }

  async upsertLeadChecklist(leadId: string, data: Partial<InsertLeadChecklist>): Promise<LeadChecklist> {
    const existing = await this.getLeadChecklist(leadId);
    if (existing) {
      const [updated] = await db.update(leadChecklist)
        .set({ ...data, atualizadoEm: new Date() })
        .where(eq(leadChecklist.leadId, leadId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(leadChecklist)
      .values({ ...data, leadId })
      .returning();
    return created;
  }

  // Lead Assignments (1:1)
  async getLeadAssignments(leadId: string): Promise<LeadResponsaveis | undefined> {
    const [result] = await db.select().from(leadResponsaveis).where(eq(leadResponsaveis.leadId, leadId));
    return result;
  }

  async upsertLeadAssignments(leadId: string, data: Partial<InsertLeadResponsaveis>): Promise<LeadResponsaveis> {
    const existing = await this.getLeadAssignments(leadId);
    if (existing) {
      const [updated] = await db.update(leadResponsaveis)
        .set({ ...data, atualizadoEm: new Date() })
        .where(eq(leadResponsaveis.leadId, leadId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(leadResponsaveis)
      .values({ ...data, leadId })
      .returning();
    return created;
  }

  // Products
  async getProducts(ownerId: string): Promise<Produto[]> {
    return db.select().from(produtos).where(eq(produtos.proprietarioId, ownerId)).orderBy(desc(produtos.criadoEm));
  }

  async getProduct(id: string, ownerId: string): Promise<Produto | undefined> {
    const [product] = await db.select().from(produtos).where(and(eq(produtos.id, id), eq(produtos.proprietarioId, ownerId)));
    return product;
  }

  async createProduct(product: InsertProduto): Promise<Produto> {
    const [newProduct] = await db.insert(produtos).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, ownerId: string, product: Partial<InsertProduto>): Promise<Produto | undefined> {
    const [updated] = await db
      .update(produtos)
      .set({ ...product, atualizadoEm: new Date() })
      .where(and(eq(produtos.id, id), eq(produtos.proprietarioId, ownerId)))
      .returning();
    return updated;
  }

  async deleteProduct(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(produtos).where(and(eq(produtos.id, id), eq(produtos.proprietarioId, ownerId))).returning();
    return result.length > 0;
  }

  // Activities
  async getActivities(ownerId: string): Promise<Atividade[]> {
    return db.select().from(atividades).where(eq(atividades.proprietarioId, ownerId)).orderBy(desc(atividades.criadoEm));
  }

  async getActivity(id: string, ownerId: string): Promise<Atividade | undefined> {
    const [activity] = await db.select().from(atividades).where(and(eq(atividades.id, id), eq(atividades.proprietarioId, ownerId)));
    return activity;
  }

  async createActivity(activity: InsertAtividade): Promise<Atividade> {
    const [newActivity] = await db.insert(atividades).values(activity).returning();
    return newActivity;
  }

  async updateActivity(id: string, ownerId: string, activity: Partial<InsertAtividade>): Promise<Atividade | undefined> {
    const [updated] = await db
      .update(atividades)
      .set(activity)
      .where(and(eq(atividades.id, id), eq(atividades.proprietarioId, ownerId)))
      .returning();
    return updated;
  }

  async deleteActivity(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(atividades).where(and(eq(atividades.id, id), eq(atividades.proprietarioId, ownerId))).returning();
    return result.length > 0;
  }

  // Proposals
  async getProposals(ownerId: string): Promise<Proposta[]> {
    return db.select().from(propostas).where(eq(propostas.proprietarioId, ownerId)).orderBy(desc(propostas.criadoEm));
  }

  async getProposal(id: string, ownerId: string): Promise<Proposta | undefined> {
    const [proposal] = await db.select().from(propostas).where(and(eq(propostas.id, id), eq(propostas.proprietarioId, ownerId)));
    return proposal;
  }

  async createProposal(proposal: InsertProposta): Promise<Proposta> {
    const [newProposal] = await db.insert(propostas).values(proposal).returning();
    return newProposal;
  }

  async updateProposal(id: string, ownerId: string, proposal: Partial<InsertProposta>): Promise<Proposta | undefined> {
    const [updated] = await db
      .update(propostas)
      .set({ ...proposal, atualizadoEm: new Date() })
      .where(and(eq(propostas.id, id), eq(propostas.proprietarioId, ownerId)))
      .returning();
    return updated;
  }

  async deleteProposal(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(propostas).where(and(eq(propostas.id, id), eq(propostas.proprietarioId, ownerId))).returning();
    return result.length > 0;
  }

  // Proposal Items
  async getProposalItems(proposalId: string): Promise<PropostaItem[]> {
    return db.select().from(propostaItens).where(eq(propostaItens.propostaId, proposalId));
  }

  async getProposalItem(id: string): Promise<PropostaItem | undefined> {
    const [item] = await db.select().from(propostaItens).where(eq(propostaItens.id, id));
    return item;
  }

  async createProposalItem(item: InsertPropostaItem): Promise<PropostaItem> {
    const [newItem] = await db.insert(propostaItens).values(item).returning();
    return newItem;
  }

  async updateProposalItem(id: string, item: Partial<InsertPropostaItem>): Promise<PropostaItem | undefined> {
    const [updated] = await db
      .update(propostaItens)
      .set(item)
      .where(eq(propostaItens.id, id))
      .returning();
    return updated;
  }

  async deleteProposalItem(id: string): Promise<void> {
    await db.delete(propostaItens).where(eq(propostaItens.id, id));
  }

  // Interactions
  async getInteractions(leadId: string): Promise<(Interacao & { vendedorName?: string | null })[]> {
    const result = await db
      .select({
        interaction: interacoes,
        vendedorName: usuarios.nome,
      })
      .from(interacoes)
      .leftJoin(usuarios, eq(interacoes.vendedorId, usuarios.id))
      .where(eq(interacoes.leadId, leadId))
      .orderBy(desc(interacoes.criadoEm));
    
    return result.map(r => ({
      ...r.interaction,
      vendedorName: r.vendedorName,
    }));
  }

  async createInteraction(interaction: InsertInteracao): Promise<Interacao> {
    const [newInteraction] = await db.insert(interacoes).values(interaction).returning();
    return newInteraction;
  }

  async deleteInteraction(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(interacoes).where(and(eq(interacoes.id, id), eq(interacoes.proprietarioId, ownerId))).returning();
    return result.length > 0;
  }

  // Users
  async getUsers(): Promise<{ id: string; name: string; email: string; papel: string; createdAt: Date | null }[]> {
    const result = await db.select({
      id: usuarios.id,
      name: usuarios.nome,
      email: usuarios.email,
      papel: usuarios.papel,
      createdAt: usuarios.criadoEm,
    }).from(usuarios);
    return result.map(u => ({ ...u, papel: u.papel || 'funcionario' }));
  }

  async getUserByEmail(email: string): Promise<{ id: string; name: string; email: string } | undefined> {
    const [user] = await db.select({
      id: usuarios.id,
      name: usuarios.nome,
      email: usuarios.email,
    }).from(usuarios).where(eq(usuarios.email, email));
    return user;
  }

  async createUser(user: { name: string; email: string; password: string }): Promise<{ id: string; name: string; email: string; createdAt: Date | null }> {
    const [newUser] = await db.insert(usuarios).values({
      nome: user.name,
      email: user.email,
      senha: user.password,
    }).returning({
      id: usuarios.id,
      name: usuarios.nome,
      email: usuarios.email,
      createdAt: usuarios.criadoEm,
    });
    return newUser;
  }

  async updateUserRole(id: string, papel: string): Promise<boolean> {
    const result = await db.update(usuarios).set({ papel: papel as any }).where(eq(usuarios.id, id)).returning();
    return result.length > 0;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(usuarios).where(eq(usuarios.id, id)).returning();
    return result.length > 0;
  }

  // Teams (Equipes)
  async getTeams(): Promise<(Equipe & { coordenadores?: { id: string; nome: string }[]; membros?: { id: string; nome: string; email: string }[] })[]> {
    const allTeams = await db.select().from(equipes).orderBy(equipes.nome);
    const result = [];
    for (const team of allTeams) {
      const coordenadoresRows = await db.select({
        id: usuarios.id,
        nome: usuarios.nome,
      }).from(equipeMembros)
        .innerJoin(usuarios, eq(equipeMembros.usuarioId, usuarios.id))
        .where(and(eq(equipeMembros.equipeId, team.id), eq(equipeMembros.papel, 'coordenador')));
      const membrosRows = await db.select({
        id: usuarios.id,
        nome: usuarios.nome,
        email: usuarios.email,
      }).from(equipeMembros)
        .innerJoin(usuarios, eq(equipeMembros.usuarioId, usuarios.id))
        .where(and(eq(equipeMembros.equipeId, team.id), eq(equipeMembros.papel, 'membro')));
      result.push({ ...team, coordenadores: coordenadoresRows, membros: membrosRows });
    }
    return result;
  }

  async getTeam(id: string): Promise<(Equipe & { coordenadores?: { id: string; nome: string }[]; membros?: { id: string; nome: string; email: string }[] }) | undefined> {
    const [team] = await db.select().from(equipes).where(eq(equipes.id, id));
    if (!team) return undefined;
    const coordenadoresRows = await db.select({
      id: usuarios.id,
      nome: usuarios.nome,
    }).from(equipeMembros)
      .innerJoin(usuarios, eq(equipeMembros.usuarioId, usuarios.id))
      .where(and(eq(equipeMembros.equipeId, team.id), eq(equipeMembros.papel, 'coordenador')));
    const membrosRows = await db.select({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
    }).from(equipeMembros)
      .innerJoin(usuarios, eq(equipeMembros.usuarioId, usuarios.id))
      .where(and(eq(equipeMembros.equipeId, team.id), eq(equipeMembros.papel, 'membro')));
    return { ...team, coordenadores: coordenadoresRows, membros: membrosRows };
  }

  async createTeam(team: InsertEquipe): Promise<Equipe> {
    const [newTeam] = await db.insert(equipes).values(team).returning();
    return newTeam;
  }

  async updateTeam(id: string, team: Partial<InsertEquipe>): Promise<Equipe | undefined> {
    const [updated] = await db.update(equipes).set(team).where(eq(equipes.id, id)).returning();
    return updated;
  }

  async deleteTeam(id: string): Promise<boolean> {
    const result = await db.delete(equipes).where(eq(equipes.id, id)).returning();
    return result.length > 0;
  }

  async addTeamMember(equipeId: string, usuarioId: string, papel: string = 'membro'): Promise<EquipeMembro> {
    const existing = await db.select().from(equipeMembros)
      .where(and(eq(equipeMembros.equipeId, equipeId), eq(equipeMembros.usuarioId, usuarioId)));
    if (existing.length > 0) {
      const [updated] = await db.update(equipeMembros)
        .set({ papel: papel as any })
        .where(and(eq(equipeMembros.equipeId, equipeId), eq(equipeMembros.usuarioId, usuarioId)))
        .returning();
      return updated;
    }
    const [member] = await db.insert(equipeMembros).values({ equipeId, usuarioId, papel: papel as any }).returning();
    return member;
  }

  async removeTeamMember(equipeId: string, usuarioId: string): Promise<boolean> {
    const result = await db.delete(equipeMembros)
      .where(and(eq(equipeMembros.equipeId, equipeId), eq(equipeMembros.usuarioId, usuarioId)))
      .returning();
    return result.length > 0;
  }

  async getTeamMemberIds(coordenadorId: string): Promise<string[]> {
    const coordTeams = await db.select({ equipeId: equipeMembros.equipeId })
      .from(equipeMembros)
      .where(and(eq(equipeMembros.usuarioId, coordenadorId), eq(equipeMembros.papel, 'coordenador')));
    if (coordTeams.length === 0) return [];
    const teamIds = coordTeams.map(t => t.equipeId);
    const members = await db.select({ usuarioId: equipeMembros.usuarioId })
      .from(equipeMembros)
      .where(inArray(equipeMembros.equipeId, teamIds));
    return Array.from(new Set(members.map(m => m.usuarioId)));
  }

  async getVisibleUserIds(userId: string, papel: string): Promise<string[] | null> {
    if (papel === 'admin') return null;
    if (papel === 'coordenador') {
      const memberIds = await this.getTeamMemberIds(userId);
      return Array.from(new Set([userId, ...memberIds]));
    }
    return [userId];
  }

  async createLawsuitWithLead(data: InsertProcesso, userId: string): Promise<{ processo: Processo; lead: Lead }> {
    const [processo] = await db.insert(processos).values(data).returning();
    
    const lead = await this.createLead({
      titulo: processo.cnj || `Processo ${processo.id.substring(0, 8)}`,
      tipoPipeline: "triagem",
      etapa: "novo_caso",
      posicao: 0,
      valor: processo.valorCausa || null,
      probabilidade: processo.probabilidadeSucesso ? Math.round(Number(processo.probabilidadeSucesso)) : 0,
      vendedorId: userId,
      proprietarioId: userId,
      processoId: processo.id,
      advogadoId: null,
      escritorioId: null,
      reclamanteId: null,
    });

    await this.upsertLeadCaseDetails(lead.id, {
      leadId: lead.id,
      cnj: processo.cnj || undefined,
      tribunal: processo.tribunal || undefined,
      orgaoJulgador: processo.vara || undefined,
      assuntoPrincipal: processo.assunto || undefined,
      cliente: processo.autor || undefined,
    });

    await this.upsertLeadChecklist(lead.id, {
      leadId: lead.id,
      reclamante: processo.autor || undefined,
      reclamado: processo.reu || undefined,
    });

    return { processo, lead };
  }

  // Sync Lawsuits from external API
  async syncLawsuitsFromApi(userId: string): Promise<{ total: number; linked: number; errors: number }> {
    const API_URL = "http://10.15.0.1:8005/api/v1/tese_advogado/tese_processos";
    const API_USERNAME = "technologies";
    const API_PASSWORD = "0WoOle0bfXRURWmApVkP";

    const normalizeCpf = (cpf: string) => cpf?.replace(/[.\-\s]/g, '') || '';

    const allLawyers = await this.getLawyers(userId);
    const lawyersWithCpf = allLawyers.filter(l => l.cpf);
    
    const lawyersMap: Record<string, number> = {};
    for (const lawyer of lawyersWithCpf) {
      const cpfNorm = normalizeCpf(lawyer.cpf!);
      if (cpfNorm) lawyersMap[cpfNorm] = lawyer.id;
    }

    const processedCnjs = new Set<string>();
    const allProcessos: any[] = [];
    let totalProcessed = 0;
    let totalLinked = 0;
    let totalErrors = 0;

    for (const lawyer of lawyersWithCpf) {
      try {
        const auth = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
        const response = await fetch(`${API_URL}?cpf=${encodeURIComponent(lawyer.cpf!)}`, {
          headers: { 'Authorization': `Basic ${auth}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.data) {
            for (const processo of data.data) {
              const cnj = processo.cnj;
              if (cnj && !processedCnjs.has(cnj)) {
                processedCnjs.add(cnj);
                allProcessos.push(processo);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching for CPF ${lawyer.cpf}:`, error);
      }
    }

    for (const processo of allProcessos) {
      try {
        const cnj = processo.cnj;
        const reclamantesData = processo.reclamantes || [];
        const autor = reclamantesData.map((r: any) => r.nome).join(', ') || null;

        const [existing] = await db.select().from(processos).where(eq(processos.cnj, cnj));
        
        let processoId: string;
        if (existing) {
          await db.update(processos).set({
            valorCausa: processo.valor_causa?.toString(),
            teseId: processo.tese_id?.toString(),
            autor,
            apiData: JSON.stringify(processo),
            atualizadoEm: new Date(),
          }).where(eq(processos.cnj, cnj));
          processoId = existing.id;
        } else {
          const result = await this.createLawsuitWithLead({
            cnj,
            valorCausa: processo.valor_causa?.toString(),
            teseId: processo.tese_id?.toString(),
            autor,
            apiData: JSON.stringify(processo),
            proprietarioId: userId,
          }, userId);
          processoId = result.processo.id;
        }

        totalProcessed++;

        const advogadosData = processo.advogados || [];
        for (const adv of advogadosData) {
          const cpfNorm = normalizeCpf(adv.cpf);
          const lawyerId = lawyersMap[cpfNorm];
          if (lawyerId) {
            try {
              await db.insert(processoAdvogados).values({
                processoId,
                advogadoId: lawyerId,
              }).onConflictDoNothing();
              totalLinked++;
            } catch (e) {
            }
          }
        }
      } catch (error) {
        console.error(`Error processing CNJ ${processo.cnj}:`, error);
        totalErrors++;
      }
    }

    return { total: totalProcessed, linked: totalLinked, errors: totalErrors };
  }

  // Backward compatibility methods
  async getTodosAdvogadosInfos(ownerId: string): Promise<Advogado[]> {
    return this.getLawyers(ownerId);
  }

  async getTodosAdvogadosInfo(id: number, ownerId: string): Promise<Advogado | undefined> {
    return this.getLawyer(id, ownerId);
  }

  async createTodosAdvogadosInfo(info: InsertAdvogado): Promise<Advogado> {
    return this.createLawyer(info);
  }

  async updateTodosAdvogadosInfo(id: number, ownerId: string, info: Partial<InsertAdvogado>): Promise<Advogado | undefined> {
    return this.updateLawyer(id, ownerId, info);
  }

  async deleteTodosAdvogadosInfo(id: number, ownerId: string): Promise<boolean> {
    return this.deleteLawyer(id, ownerId);
  }

  async getEscritorios(ownerId: string): Promise<Escritorio[]> {
    return this.getLawFirms(ownerId);
  }

  async getEscritorio(id: string, ownerId: string): Promise<Escritorio | undefined> {
    return this.getLawFirm(id, ownerId);
  }

  async createEscritorio(escritorio: InsertEscritorio): Promise<Escritorio> {
    return this.createLawFirm(escritorio);
  }

  async updateEscritorio(id: string, ownerId: string, escritorio: Partial<InsertEscritorio>): Promise<Escritorio | undefined> {
    return this.updateLawFirm(id, ownerId, escritorio);
  }

  async deleteEscritorio(id: string, ownerId: string): Promise<boolean> {
    return this.deleteLawFirm(id, ownerId);
  }

  async getReclamantes(ownerId: string): Promise<Reclamante[]> {
    return this.getClaimants(ownerId);
  }

  async getReclamante(id: string, ownerId: string): Promise<Reclamante | undefined> {
    return this.getClaimant(id, ownerId);
  }

  async createReclamante(reclamante: InsertReclamante): Promise<Reclamante> {
    return this.createClaimant(reclamante);
  }

  async updateReclamante(id: string, ownerId: string, reclamante: Partial<InsertReclamante>): Promise<Reclamante | undefined> {
    return this.updateClaimant(id, ownerId, reclamante);
  }

  async deleteReclamante(id: string, ownerId: string): Promise<boolean> {
    return this.deleteClaimant(id, ownerId);
  }
}

export const storage = new DatabaseStorage();
