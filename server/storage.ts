import {
  todosAdvogadosInfos,
  escritorios,
  reclamantes,
  cases,
  processos,
  resultados,
  processoAdvogado,
  processoReclamante,
  escritorioCase,
  caseProcesso,
  activities,
  proposals,
  proposalItems,
  pipelineTriggers,
  interactions,
  products,
  users,
  lembretes,
  type TodosAdvogadosInfos,
  type InsertTodosAdvogadosInfos,
  type Escritorio,
  type InsertEscritorio,
  type Reclamante,
  type InsertReclamante,
  type Case,
  type InsertCase,
  type Processo,
  type InsertProcesso,
  type Resultado,
  type InsertResultado,
  type Activity,
  type InsertActivity,
  type Proposal,
  type InsertProposal,
  type ProposalItem,
  type InsertProposalItem,
  type PipelineTrigger,
  type InsertPipelineTrigger,
  type Interaction,
  type InsertInteraction,
  type Product,
  type InsertProduct,
  type ProcessoAdvogado,
  type InsertProcessoAdvogado,
  type ProcessoReclamante,
  type InsertProcessoReclamante,
  type EscritorioCase,
  type InsertEscritorioCase,
  type CaseProcesso,
  type InsertCaseProcesso,
  type Lembrete,
  type InsertLembrete,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Backward compatibility aliases
type Lead = Case;
type InsertLead = InsertCase;
const leads = cases;

export interface IStorage {
  // Advogados
  getTodosAdvogadosInfos(): Promise<TodosAdvogadosInfos[]>;
  getTodosAdvogadosInfo(id: number): Promise<TodosAdvogadosInfos | undefined>;
  createTodosAdvogadosInfo(info: InsertTodosAdvogadosInfos): Promise<TodosAdvogadosInfos>;
  updateTodosAdvogadosInfo(id: number, info: Partial<InsertTodosAdvogadosInfos>): Promise<TodosAdvogadosInfos | undefined>;
  deleteTodosAdvogadosInfo(id: number): Promise<boolean>;

  // Escritórios
  getEscritorios(ownerId: string): Promise<Escritorio[]>;
  getEscritorio(id: string, ownerId: string): Promise<Escritorio | undefined>;
  createEscritorio(escritorio: InsertEscritorio): Promise<Escritorio>;
  updateEscritorio(id: string, ownerId: string, escritorio: Partial<InsertEscritorio>): Promise<Escritorio | undefined>;
  deleteEscritorio(id: string, ownerId: string): Promise<boolean>;

  // Reclamantes
  getReclamantes(ownerId: string): Promise<Reclamante[]>;
  getReclamante(id: string, ownerId: string): Promise<Reclamante | undefined>;
  createReclamante(reclamante: InsertReclamante): Promise<Reclamante>;
  updateReclamante(id: string, ownerId: string, reclamante: Partial<InsertReclamante>): Promise<Reclamante | undefined>;
  deleteReclamante(id: string, ownerId: string): Promise<boolean>;

  // Processos
  getProcessos(ownerId: string): Promise<Processo[]>;
  getProcesso(id: string, ownerId: string): Promise<Processo | undefined>;
  getProcessoByCnj(cnj: string, ownerId: string): Promise<Processo | undefined>;
  createProcesso(processo: InsertProcesso): Promise<Processo>;
  updateProcesso(id: string, ownerId: string, processo: Partial<InsertProcesso>): Promise<Processo | undefined>;
  deleteProcesso(id: string, ownerId: string): Promise<boolean>;

  // Resultados
  getResultados(ownerId: string): Promise<Resultado[]>;
  getResultado(id: string, ownerId: string): Promise<Resultado | undefined>;
  getResultadoByProcesso(processoId: string): Promise<Resultado | undefined>;
  createResultado(resultado: InsertResultado): Promise<Resultado>;
  updateResultado(id: string, ownerId: string, resultado: Partial<InsertResultado>): Promise<Resultado | undefined>;
  deleteResultado(id: string, ownerId: string): Promise<boolean>;

  // Cases (formerly Leads)
  getCases(ownerId: string, pipelineType?: string): Promise<Case[]>;
  getCase(id: string, ownerId: string): Promise<Case | undefined>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, ownerId: string, caseData: Partial<InsertCase>): Promise<Case | undefined>;
  deleteCase(id: string, ownerId: string): Promise<boolean>;

  // Backward compatibility: Leads = Cases
  getLeads(ownerId: string, pipelineType?: string): Promise<Lead[]>;
  getLead(id: string, ownerId: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, ownerId: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string, ownerId: string): Promise<boolean>;

  // Processo-Advogado N:N
  getProcessoAdvogados(processoId: string): Promise<TodosAdvogadosInfos[]>;
  addAdvogadoToProcesso(processoId: string, advogadoId: number): Promise<ProcessoAdvogado>;
  removeAdvogadoFromProcesso(processoId: string, advogadoId: number): Promise<boolean>;

  // Processo-Reclamante N:N
  getProcessoReclamantes(processoId: string): Promise<Reclamante[]>;
  addReclamanteToProcesso(processoId: string, reclamanteId: string): Promise<ProcessoReclamante>;
  removeReclamanteFromProcesso(processoId: string, reclamanteId: string): Promise<boolean>;

  // Escritorio-Case N:N
  getCaseEscritorios(caseId: string): Promise<Escritorio[]>;
  addEscritorioToCase(caseId: string, escritorioId: string): Promise<EscritorioCase>;
  removeEscritorioFromCase(caseId: string, escritorioId: string): Promise<boolean>;

  // Case-Processo N:N
  getCaseProcessos(caseId: string): Promise<Processo[]>;
  addProcessoToCase(caseId: string, processoId: string): Promise<CaseProcesso>;
  removeProcessoFromCase(caseId: string, processoId: string): Promise<boolean>;

  // Products
  getProducts(ownerId: string): Promise<Product[]>;
  getProduct(id: string, ownerId: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, ownerId: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string, ownerId: string): Promise<boolean>;

  // Activities
  getActivities(ownerId: string): Promise<Activity[]>;
  getActivity(id: string, ownerId: string): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: string, ownerId: string, activity: Partial<InsertActivity>): Promise<Activity | undefined>;
  deleteActivity(id: string, ownerId: string): Promise<boolean>;

  // Proposals
  getProposals(ownerId: string): Promise<Proposal[]>;
  getProposal(id: string, ownerId: string): Promise<Proposal | undefined>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: string, ownerId: string, proposal: Partial<InsertProposal>): Promise<Proposal | undefined>;
  deleteProposal(id: string, ownerId: string): Promise<boolean>;

  // Proposal Items
  getProposalItems(proposalId: string): Promise<ProposalItem[]>;
  getProposalItem(id: string): Promise<ProposalItem | undefined>;
  createProposalItem(item: InsertProposalItem): Promise<ProposalItem>;
  updateProposalItem(id: string, item: Partial<InsertProposalItem>): Promise<ProposalItem | undefined>;
  deleteProposalItem(id: string): Promise<void>;

  // Pipeline Triggers
  getPipelineTriggers(ownerId: string): Promise<PipelineTrigger[]>;
  getPipelineTrigger(id: string, ownerId: string): Promise<PipelineTrigger | undefined>;
  createPipelineTrigger(trigger: InsertPipelineTrigger): Promise<PipelineTrigger>;
  updatePipelineTrigger(id: string, ownerId: string, trigger: Partial<InsertPipelineTrigger>): Promise<PipelineTrigger | undefined>;
  deletePipelineTrigger(id: string, ownerId: string): Promise<boolean>;
  getMatchingTriggers(ownerId: string, pipelineType: string, fromStage: string | null, toStage: string): Promise<PipelineTrigger[]>;

  // Interactions
  getInteractions(caseId: string): Promise<(Interaction & { vendedorName?: string | null })[]>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  deleteInteraction(id: string, ownerId: string): Promise<boolean>;

  // Lembretes
  getLembretes(ownerId: string): Promise<Lembrete[]>;
  getLembrete(id: string, ownerId: string): Promise<Lembrete | undefined>;
  createLembrete(lembrete: InsertLembrete): Promise<Lembrete>;
  updateLembrete(id: string, ownerId: string, lembrete: Partial<InsertLembrete>): Promise<Lembrete | undefined>;
  deleteLembrete(id: string, ownerId: string): Promise<boolean>;

  // Users
  getUsers(): Promise<{ id: string; name: string; email: string; createdAt: Date | null }[]>;
  getUserByEmail(email: string): Promise<{ id: string; name: string; email: string } | undefined>;
  createUser(user: { name: string; email: string; password: string }): Promise<{ id: string; name: string; email: string; createdAt: Date | null }>;
  deleteUser(id: string): Promise<boolean>;

  // Sync functions
  syncAdvogadosToLeads(userId: string): Promise<{ synced: number; skipped: number; leads: Lead[] }>;
  syncReclamantesToLeads(userId: string): Promise<{ synced: number; skipped: number; leads: Lead[] }>;
}

export class DatabaseStorage implements IStorage {
  // Advogados
  async getTodosAdvogadosInfos(): Promise<TodosAdvogadosInfos[]> {
    return db.select().from(todosAdvogadosInfos).orderBy(desc(todosAdvogadosInfos.createdAt));
  }

  async getTodosAdvogadosInfo(id: number): Promise<TodosAdvogadosInfos | undefined> {
    const [info] = await db.select().from(todosAdvogadosInfos).where(eq(todosAdvogadosInfos.id, id));
    return info;
  }

  async createTodosAdvogadosInfo(info: InsertTodosAdvogadosInfos): Promise<TodosAdvogadosInfos> {
    const [newInfo] = await db.insert(todosAdvogadosInfos).values(info).returning();
    return newInfo;
  }

  async updateTodosAdvogadosInfo(id: number, info: Partial<InsertTodosAdvogadosInfos>): Promise<TodosAdvogadosInfos | undefined> {
    const [updated] = await db
      .update(todosAdvogadosInfos)
      .set({ ...info, updatedAt: new Date() })
      .where(eq(todosAdvogadosInfos.id, id))
      .returning();
    return updated;
  }

  async deleteTodosAdvogadosInfo(id: number): Promise<boolean> {
    const result = await db.delete(todosAdvogadosInfos).where(eq(todosAdvogadosInfos.id, id)).returning();
    return result.length > 0;
  }

  // Escritórios
  async getEscritorios(ownerId: string): Promise<Escritorio[]> {
    return db.select().from(escritorios).where(eq(escritorios.ownerId, ownerId)).orderBy(desc(escritorios.createdAt));
  }

  async getEscritorio(id: string, ownerId: string): Promise<Escritorio | undefined> {
    const [escritorio] = await db.select().from(escritorios).where(and(eq(escritorios.id, id), eq(escritorios.ownerId, ownerId)));
    return escritorio;
  }

  async createEscritorio(escritorio: InsertEscritorio): Promise<Escritorio> {
    const [newEscritorio] = await db.insert(escritorios).values(escritorio).returning();
    return newEscritorio;
  }

  async updateEscritorio(id: string, ownerId: string, escritorio: Partial<InsertEscritorio>): Promise<Escritorio | undefined> {
    const [updated] = await db
      .update(escritorios)
      .set({ ...escritorio, updatedAt: new Date() })
      .where(and(eq(escritorios.id, id), eq(escritorios.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteEscritorio(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(escritorios).where(and(eq(escritorios.id, id), eq(escritorios.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Reclamantes
  async getReclamantes(ownerId: string): Promise<Reclamante[]> {
    return db.select().from(reclamantes).where(eq(reclamantes.ownerId, ownerId)).orderBy(desc(reclamantes.createdAt));
  }

  async getReclamante(id: string, ownerId: string): Promise<Reclamante | undefined> {
    const [reclamante] = await db.select().from(reclamantes).where(and(eq(reclamantes.id, id), eq(reclamantes.ownerId, ownerId)));
    return reclamante;
  }

  async createReclamante(reclamante: InsertReclamante): Promise<Reclamante> {
    const [newReclamante] = await db.insert(reclamantes).values(reclamante).returning();
    return newReclamante;
  }

  async updateReclamante(id: string, ownerId: string, reclamante: Partial<InsertReclamante>): Promise<Reclamante | undefined> {
    const [updated] = await db
      .update(reclamantes)
      .set({ ...reclamante, updatedAt: new Date() })
      .where(and(eq(reclamantes.id, id), eq(reclamantes.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteReclamante(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(reclamantes).where(and(eq(reclamantes.id, id), eq(reclamantes.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Processos
  async getProcessos(ownerId: string): Promise<Processo[]> {
    return db.select().from(processos).where(eq(processos.ownerId, ownerId)).orderBy(desc(processos.createdAt));
  }

  async getProcesso(id: string, ownerId: string): Promise<Processo | undefined> {
    const [processo] = await db.select().from(processos).where(and(eq(processos.id, id), eq(processos.ownerId, ownerId)));
    return processo;
  }

  async getProcessoByCnj(cnj: string, ownerId: string): Promise<Processo | undefined> {
    const [processo] = await db.select().from(processos).where(and(eq(processos.cnj, cnj), eq(processos.ownerId, ownerId)));
    return processo;
  }

  async createProcesso(processo: InsertProcesso): Promise<Processo> {
    const [newProcesso] = await db.insert(processos).values(processo).returning();
    return newProcesso;
  }

  async updateProcesso(id: string, ownerId: string, processo: Partial<InsertProcesso>): Promise<Processo | undefined> {
    const [updated] = await db
      .update(processos)
      .set({ ...processo, updatedAt: new Date() })
      .where(and(eq(processos.id, id), eq(processos.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteProcesso(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(processos).where(and(eq(processos.id, id), eq(processos.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Resultados
  async getResultados(ownerId: string): Promise<Resultado[]> {
    return db.select().from(resultados).where(eq(resultados.ownerId, ownerId)).orderBy(desc(resultados.createdAt));
  }

  async getResultado(id: string, ownerId: string): Promise<Resultado | undefined> {
    const [resultado] = await db.select().from(resultados).where(and(eq(resultados.id, id), eq(resultados.ownerId, ownerId)));
    return resultado;
  }

  async getResultadoByProcesso(processoId: string): Promise<Resultado | undefined> {
    const [resultado] = await db.select().from(resultados).where(eq(resultados.processoId, processoId));
    return resultado;
  }

  async createResultado(resultado: InsertResultado): Promise<Resultado> {
    const [newResultado] = await db.insert(resultados).values(resultado).returning();
    return newResultado;
  }

  async updateResultado(id: string, ownerId: string, resultado: Partial<InsertResultado>): Promise<Resultado | undefined> {
    const [updated] = await db
      .update(resultados)
      .set({ ...resultado, updatedAt: new Date() })
      .where(and(eq(resultados.id, id), eq(resultados.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteResultado(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(resultados).where(and(eq(resultados.id, id), eq(resultados.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Cases
  async getCases(ownerId: string, pipelineType?: string): Promise<Case[]> {
    if (pipelineType) {
      return db.select().from(cases).where(
        and(eq(cases.ownerId, ownerId), eq(cases.pipelineType, pipelineType as any))
      ).orderBy(desc(cases.createdAt));
    }
    return db.select().from(cases).where(eq(cases.ownerId, ownerId)).orderBy(desc(cases.createdAt));
  }

  async getCase(id: string, ownerId: string): Promise<Case | undefined> {
    const [caseData] = await db.select().from(cases).where(and(eq(cases.id, id), eq(cases.ownerId, ownerId)));
    return caseData;
  }

  async createCase(caseData: InsertCase): Promise<Case> {
    const [newCase] = await db.insert(cases).values(caseData).returning();
    return newCase;
  }

  async updateCase(id: string, ownerId: string, caseData: Partial<InsertCase>): Promise<Case | undefined> {
    const [updated] = await db
      .update(cases)
      .set({ ...caseData, updatedAt: new Date() })
      .where(and(eq(cases.id, id), eq(cases.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteCase(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(cases).where(and(eq(cases.id, id), eq(cases.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Backward compatibility: Leads = Cases
  async getLeads(ownerId: string, pipelineType?: string): Promise<Lead[]> {
    return this.getCases(ownerId, pipelineType);
  }

  async getLead(id: string, ownerId: string): Promise<Lead | undefined> {
    return this.getCase(id, ownerId);
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    return this.createCase(lead);
  }

  async updateLead(id: string, ownerId: string, lead: Partial<InsertLead>): Promise<Lead | undefined> {
    return this.updateCase(id, ownerId, lead);
  }

  async deleteLead(id: string, ownerId: string): Promise<boolean> {
    return this.deleteCase(id, ownerId);
  }

  // Processo-Advogado N:N
  async getProcessoAdvogados(processoId: string): Promise<TodosAdvogadosInfos[]> {
    const result = await db
      .select({ advogado: todosAdvogadosInfos })
      .from(processoAdvogado)
      .innerJoin(todosAdvogadosInfos, eq(processoAdvogado.advogadoId, todosAdvogadosInfos.id))
      .where(eq(processoAdvogado.processoId, processoId));
    return result.map(r => r.advogado);
  }

  async addAdvogadoToProcesso(processoId: string, advogadoId: number): Promise<ProcessoAdvogado> {
    const [newRelation] = await db.insert(processoAdvogado).values({ processoId, advogadoId }).returning();
    return newRelation;
  }

  async removeAdvogadoFromProcesso(processoId: string, advogadoId: number): Promise<boolean> {
    const result = await db.delete(processoAdvogado)
      .where(and(eq(processoAdvogado.processoId, processoId), eq(processoAdvogado.advogadoId, advogadoId)))
      .returning();
    return result.length > 0;
  }

  // Processo-Reclamante N:N
  async getProcessoReclamantes(processoId: string): Promise<Reclamante[]> {
    const result = await db
      .select({ reclamante: reclamantes })
      .from(processoReclamante)
      .innerJoin(reclamantes, eq(processoReclamante.reclamanteId, reclamantes.id))
      .where(eq(processoReclamante.processoId, processoId));
    return result.map(r => r.reclamante);
  }

  async addReclamanteToProcesso(processoId: string, reclamanteId: string): Promise<ProcessoReclamante> {
    const [newRelation] = await db.insert(processoReclamante).values({ processoId, reclamanteId }).returning();
    return newRelation;
  }

  async removeReclamanteFromProcesso(processoId: string, reclamanteId: string): Promise<boolean> {
    const result = await db.delete(processoReclamante)
      .where(and(eq(processoReclamante.processoId, processoId), eq(processoReclamante.reclamanteId, reclamanteId)))
      .returning();
    return result.length > 0;
  }

  // Escritorio-Case N:N
  async getCaseEscritorios(caseId: string): Promise<Escritorio[]> {
    const result = await db
      .select({ escritorio: escritorios })
      .from(escritorioCase)
      .innerJoin(escritorios, eq(escritorioCase.escritorioId, escritorios.id))
      .where(eq(escritorioCase.caseId, caseId));
    return result.map(r => r.escritorio);
  }

  async addEscritorioToCase(caseId: string, escritorioId: string): Promise<EscritorioCase> {
    const [newRelation] = await db.insert(escritorioCase).values({ caseId, escritorioId }).returning();
    return newRelation;
  }

  async removeEscritorioFromCase(caseId: string, escritorioId: string): Promise<boolean> {
    const result = await db.delete(escritorioCase)
      .where(and(eq(escritorioCase.caseId, caseId), eq(escritorioCase.escritorioId, escritorioId)))
      .returning();
    return result.length > 0;
  }

  // Case-Processo N:N
  async getCaseProcessos(caseId: string): Promise<Processo[]> {
    const result = await db
      .select({ processo: processos })
      .from(caseProcesso)
      .innerJoin(processos, eq(caseProcesso.processoId, processos.id))
      .where(eq(caseProcesso.caseId, caseId));
    return result.map(r => r.processo);
  }

  async addProcessoToCase(caseId: string, processoId: string): Promise<CaseProcesso> {
    const [newRelation] = await db.insert(caseProcesso).values({ caseId, processoId }).returning();
    return newRelation;
  }

  async removeProcessoFromCase(caseId: string, processoId: string): Promise<boolean> {
    const result = await db.delete(caseProcesso)
      .where(and(eq(caseProcesso.caseId, caseId), eq(caseProcesso.processoId, processoId)))
      .returning();
    return result.length > 0;
  }

  // Products
  async getProducts(ownerId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.ownerId, ownerId)).orderBy(desc(products.createdAt));
  }

  async getProduct(id: string, ownerId: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(and(eq(products.id, id), eq(products.ownerId, ownerId)));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, ownerId: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteProduct(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(products).where(and(eq(products.id, id), eq(products.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Activities
  async getActivities(ownerId: string): Promise<Activity[]> {
    return db.select().from(activities).where(eq(activities.ownerId, ownerId)).orderBy(desc(activities.createdAt));
  }

  async getActivity(id: string, ownerId: string): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(and(eq(activities.id, id), eq(activities.ownerId, ownerId)));
    return activity;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  async updateActivity(id: string, ownerId: string, activity: Partial<InsertActivity>): Promise<Activity | undefined> {
    const [updated] = await db
      .update(activities)
      .set(activity)
      .where(and(eq(activities.id, id), eq(activities.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteActivity(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(activities).where(and(eq(activities.id, id), eq(activities.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Proposals
  async getProposals(ownerId: string): Promise<Proposal[]> {
    return db.select().from(proposals).where(eq(proposals.ownerId, ownerId)).orderBy(desc(proposals.createdAt));
  }

  async getProposal(id: string, ownerId: string): Promise<Proposal | undefined> {
    const [proposal] = await db.select().from(proposals).where(and(eq(proposals.id, id), eq(proposals.ownerId, ownerId)));
    return proposal;
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    const [newProposal] = await db.insert(proposals).values(proposal).returning();
    return newProposal;
  }

  async updateProposal(id: string, ownerId: string, proposal: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const [updated] = await db
      .update(proposals)
      .set({ ...proposal, updatedAt: new Date() })
      .where(and(eq(proposals.id, id), eq(proposals.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteProposal(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(proposals).where(and(eq(proposals.id, id), eq(proposals.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Proposal Items
  async getProposalItems(proposalId: string): Promise<ProposalItem[]> {
    return db.select().from(proposalItems).where(eq(proposalItems.proposalId, proposalId));
  }

  async getProposalItem(id: string): Promise<ProposalItem | undefined> {
    const [item] = await db.select().from(proposalItems).where(eq(proposalItems.id, id));
    return item;
  }

  async createProposalItem(item: InsertProposalItem): Promise<ProposalItem> {
    const [newItem] = await db.insert(proposalItems).values(item).returning();
    return newItem;
  }

  async updateProposalItem(id: string, item: Partial<InsertProposalItem>): Promise<ProposalItem | undefined> {
    const [updated] = await db.update(proposalItems).set(item).where(eq(proposalItems.id, id)).returning();
    return updated;
  }

  async deleteProposalItem(id: string): Promise<void> {
    await db.delete(proposalItems).where(eq(proposalItems.id, id));
  }

  // Pipeline Triggers
  async getPipelineTriggers(ownerId: string): Promise<PipelineTrigger[]> {
    return db.select().from(pipelineTriggers).where(eq(pipelineTriggers.ownerId, ownerId)).orderBy(desc(pipelineTriggers.createdAt));
  }

  async getPipelineTrigger(id: string, ownerId: string): Promise<PipelineTrigger | undefined> {
    const [trigger] = await db.select().from(pipelineTriggers).where(and(eq(pipelineTriggers.id, id), eq(pipelineTriggers.ownerId, ownerId)));
    return trigger;
  }

  async createPipelineTrigger(trigger: InsertPipelineTrigger): Promise<PipelineTrigger> {
    const [newTrigger] = await db.insert(pipelineTriggers).values(trigger).returning();
    return newTrigger;
  }

  async updatePipelineTrigger(id: string, ownerId: string, trigger: Partial<InsertPipelineTrigger>): Promise<PipelineTrigger | undefined> {
    const [updated] = await db
      .update(pipelineTriggers)
      .set({ ...trigger, updatedAt: new Date() })
      .where(and(eq(pipelineTriggers.id, id), eq(pipelineTriggers.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deletePipelineTrigger(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(pipelineTriggers).where(and(eq(pipelineTriggers.id, id), eq(pipelineTriggers.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  async getMatchingTriggers(ownerId: string, pipelineType: string, fromStage: string | null, toStage: string): Promise<PipelineTrigger[]> {
    const allTriggers = await db.select().from(pipelineTriggers).where(
      and(
        eq(pipelineTriggers.ownerId, ownerId),
        eq(pipelineTriggers.isActive, true),
        eq(pipelineTriggers.pipelineType, pipelineType as any),
        eq(pipelineTriggers.toStage, toStage)
      )
    );
    
    return allTriggers.filter(t => !t.fromStage || t.fromStage === fromStage);
  }

  // Interactions
  async getInteractions(caseId: string): Promise<(Interaction & { vendedorName?: string | null })[]> {
    const result = await db
      .select({
        id: interactions.id,
        caseId: interactions.caseId,
        vendedorId: interactions.vendedorId,
        ownerId: interactions.ownerId,
        type: interactions.type,
        content: interactions.content,
        createdAt: interactions.createdAt,
        fileName: interactions.fileName,
        fileUrl: interactions.fileUrl,
        fileType: interactions.fileType,
        metadata: interactions.metadata,
        vendedorName: users.name,
      })
      .from(interactions)
      .leftJoin(users, eq(interactions.vendedorId, users.id))
      .where(eq(interactions.caseId, caseId))
      .orderBy(desc(interactions.createdAt));
    return result;
  }

  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const [newInteraction] = await db.insert(interactions).values(interaction).returning();
    return newInteraction;
  }

  async deleteInteraction(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(interactions).where(and(eq(interactions.id, id), eq(interactions.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Lembretes
  async getLembretes(ownerId: string): Promise<Lembrete[]> {
    return db.select().from(lembretes).where(eq(lembretes.ownerId, ownerId)).orderBy(desc(lembretes.dataLembrete));
  }

  async getLembrete(id: string, ownerId: string): Promise<Lembrete | undefined> {
    const [lembrete] = await db.select().from(lembretes).where(and(eq(lembretes.id, id), eq(lembretes.ownerId, ownerId)));
    return lembrete;
  }

  async createLembrete(lembrete: InsertLembrete): Promise<Lembrete> {
    const [newLembrete] = await db.insert(lembretes).values(lembrete).returning();
    return newLembrete;
  }

  async updateLembrete(id: string, ownerId: string, lembrete: Partial<InsertLembrete>): Promise<Lembrete | undefined> {
    const [updated] = await db
      .update(lembretes)
      .set(lembrete)
      .where(and(eq(lembretes.id, id), eq(lembretes.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteLembrete(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(lembretes).where(and(eq(lembretes.id, id), eq(lembretes.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Users
  async getUsers(): Promise<{ id: string; name: string; email: string; createdAt: Date | null }[]> {
    const result = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));
    return result;
  }

  async getUserByEmail(email: string): Promise<{ id: string; name: string; email: string } | undefined> {
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: { name: string; email: string; password: string }): Promise<{ id: string; name: string; email: string; createdAt: Date | null }> {
    const [newUser] = await db.insert(users).values(user).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    });
    return newUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // Sync advogados to cases
  async syncAdvogadosToLeads(userId: string): Promise<{ synced: number; skipped: number; leads: Lead[] }> {
    const advogadosToSync = await db.select().from(todosAdvogadosInfos).where(eq(todosAdvogadosInfos.enviadoParaPipeline, false));
    
    let synced = 0;
    let skipped = 0;
    const createdLeads: Lead[] = [];
    
    for (const advogado of advogadosToSync) {
      const titulo = `${advogado.nome} - ${advogado.cpf || 'Sem CPF'}`;
      
      const [newCase] = await db.insert(cases).values({
        titulo,
        pipelineType: 'advogados',
        stage: 'novo_lead',
        position: 0,
        valor: advogado.valorCausa,
        vendedorId: userId,
        ownerId: userId,
      }).returning();
      
      await db.update(todosAdvogadosInfos)
        .set({ enviadoParaPipeline: true })
        .where(eq(todosAdvogadosInfos.id, advogado.id));
      
      createdLeads.push(newCase);
      synced++;
    }
    
    return { synced, skipped, leads: createdLeads };
  }

  // Sync reclamantes to cases
  async syncReclamantesToLeads(userId: string): Promise<{ synced: number; skipped: number; leads: Lead[] }> {
    const reclamantesToSync = await db.select().from(reclamantes).where(eq(reclamantes.enviadoParaPipeline, false));
    
    let synced = 0;
    let skipped = 0;
    const createdLeads: Lead[] = [];
    
    for (const reclamante of reclamantesToSync) {
      const titulo = `${reclamante.nome} - ${reclamante.cpf || 'Sem CPF'}`;
      
      const [newCase] = await db.insert(cases).values({
        titulo,
        pipelineType: 'reclamantes',
        stage: 'novo_lead',
        position: 0,
        valor: reclamante.valorCausa,
        vendedorId: userId,
        ownerId: userId,
      }).returning();
      
      await db.update(reclamantes)
        .set({ enviadoParaPipeline: true })
        .where(eq(reclamantes.id, reclamante.id));
      
      createdLeads.push(newCase);
      synced++;
    }
    
    return { synced, skipped, leads: createdLeads };
  }
}

export const storage = new DatabaseStorage();
