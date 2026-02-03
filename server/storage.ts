import {
  todosAdvogadosInfos,
  escritorios,
  reclamantes,
  leads,
  leadsAdvogados,
  leadsReclamantes,
  activities,
  proposals,
  proposalItems,
  pipelineTriggers,
  interactions,
  products,
  clients,
  opportunities,
  users,
  type TodosAdvogadosInfos,
  type InsertTodosAdvogadosInfos,
  type Escritorio,
  type InsertEscritorio,
  type Reclamante,
  type InsertReclamante,
  type Lead,
  type InsertLead,
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
  type Client,
  type InsertClient,
  type Opportunity,
  type InsertOpportunity,
  type LeadAdvogado,
  type InsertLeadAdvogado,
  type LeadReclamante,
  type InsertLeadReclamante,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Todos Advogados Infos - Dados compartilhados entre todos os usuários
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

  // Leads
  getLeads(ownerId: string, pipelineType?: string): Promise<Lead[]>;
  getLead(id: string, ownerId: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, ownerId: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string, ownerId: string): Promise<boolean>;

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
  getInteractions(leadId: string): Promise<(Interaction & { vendedorName?: string | null })[]>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  deleteInteraction(id: string, ownerId: string): Promise<boolean>;

  // Clients
  getClients(ownerId: string): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>, ownerId: string): Promise<Client | undefined>;
  deleteClient(id: string, ownerId: string): Promise<boolean>;

  // Opportunities
  getOpportunities(ownerId: string): Promise<Opportunity[]>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  updateOpportunity(id: string, opportunity: Partial<InsertOpportunity>, ownerId: string): Promise<Opportunity | undefined>;
  deleteOpportunity(id: string, ownerId: string): Promise<boolean>;

  // Users
  getUsers(): Promise<{ id: string; name: string; email: string; createdAt: Date | null }[]>;
  getUserByEmail(email: string): Promise<{ id: string; name: string; email: string } | undefined>;
  createUser(user: { name: string; email: string; password: string }): Promise<{ id: string; name: string; email: string; createdAt: Date | null }>;
  deleteUser(id: string): Promise<boolean>;

  // Sync Advogados to Leads
  syncAdvogadosToLeads(userId: string): Promise<{ synced: number; skipped: number; leads: Lead[] }>;
  
  // Sync Reclamantes to Leads
  syncReclamantesToLeads(userId: string): Promise<{ synced: number; skipped: number; leads: Lead[] }>;

  // Lead-Advogados N:N
  getLeadAdvogados(leadId: string): Promise<TodosAdvogadosInfos[]>;
  addAdvogadoToLead(leadId: string, advogadoId: number): Promise<LeadAdvogado>;
  removeAdvogadoFromLead(leadId: string, advogadoId: number): Promise<boolean>;
  getAllLeadAdvogadosForUser(ownerId: string): Promise<{ leadId: string; advogadoId: number }[]>;

  // Lead-Reclamantes N:N
  getLeadReclamantes(leadId: string): Promise<Reclamante[]>;
  addReclamanteToLead(leadId: string, reclamanteId: string): Promise<LeadReclamante>;
  removeReclamanteFromLead(leadId: string, reclamanteId: string): Promise<boolean>;
  getAllLeadReclamantesForUser(ownerId: string): Promise<{ leadId: string; reclamanteId: string }[]>;
}

export class DatabaseStorage implements IStorage {
  // Todos Advogados Infos - Dados compartilhados entre todos os usuários
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

  // Leads
  async getLeads(ownerId: string, pipelineType?: string): Promise<Lead[]> {
    if (pipelineType) {
      return db.select().from(leads).where(
        and(eq(leads.ownerId, ownerId), eq(leads.pipelineType, pipelineType as any))
      ).orderBy(desc(leads.createdAt));
    }
    return db.select().from(leads).where(eq(leads.ownerId, ownerId)).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string, ownerId: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(and(eq(leads.id, id), eq(leads.ownerId, ownerId)));
    return lead;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async updateLead(id: string, ownerId: string, lead: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updated] = await db
      .update(leads)
      .set({ ...lead, updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteLead(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(leads).where(and(eq(leads.id, id), eq(leads.ownerId, ownerId))).returning();
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
  async getInteractions(leadId: string): Promise<(Interaction & { vendedorName?: string | null })[]> {
    const result = await db
      .select({
        id: interactions.id,
        leadId: interactions.leadId,
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
      .where(eq(interactions.leadId, leadId))
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

  // Clients
  async getClients(ownerId: string): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.ownerId, ownerId)).orderBy(desc(clients.createdAt));
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: string, client: Partial<InsertClient>, ownerId: string): Promise<Client | undefined> {
    const [updated] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteClient(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(clients).where(and(eq(clients.id, id), eq(clients.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Opportunities
  async getOpportunities(ownerId: string): Promise<Opportunity[]> {
    return db.select().from(opportunities).where(eq(opportunities.ownerId, ownerId)).orderBy(desc(opportunities.createdAt));
  }

  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const [newOpportunity] = await db.insert(opportunities).values(opportunity).returning();
    return newOpportunity;
  }

  async updateOpportunity(id: string, opportunity: Partial<InsertOpportunity>, ownerId: string): Promise<Opportunity | undefined> {
    const [updated] = await db
      .update(opportunities)
      .set({ ...opportunity, updatedAt: new Date() })
      .where(and(eq(opportunities.id, id), eq(opportunities.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteOpportunity(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(opportunities).where(and(eq(opportunities.id, id), eq(opportunities.ownerId, ownerId))).returning();
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

  async syncAdvogadosToLeads(userId: string): Promise<{ synced: number; skipped: number; leads: Lead[] }> {
    const advogadosToSync = await db.select().from(todosAdvogadosInfos).where(eq(todosAdvogadosInfos.enviadoParaPipeline, false));
    
    let synced = 0;
    let skipped = 0;
    const createdLeads: Lead[] = [];
    
    for (const advogado of advogadosToSync) {
      const titulo = `${advogado.nome} - ${advogado.cpf || 'Sem CPF'}`;
      
      const [newLead] = await db.insert(leads).values({
        titulo,
        pipelineType: 'advogados',
        stage: 'novo_lead',
        todosAdvogadosInfosId: advogado.id,
        valor: advogado.valorCausa,
        ownerId: userId,
        vendedorId: userId,
      }).returning();
      
      await db.update(todosAdvogadosInfos)
        .set({ enviadoParaPipeline: true })
        .where(eq(todosAdvogadosInfos.id, advogado.id));
      
      createdLeads.push(newLead);
      synced++;
    }
    
    return { synced, skipped, leads: createdLeads };
  }

  async syncReclamantesToLeads(userId: string): Promise<{ synced: number; skipped: number; leads: Lead[] }> {
    const reclamantesToSync = await db.select().from(reclamantes).where(
      eq(reclamantes.enviadoParaPipeline, false)
    );
    
    let synced = 0;
    let skipped = 0;
    const createdLeads: Lead[] = [];
    
    for (const reclamante of reclamantesToSync) {
      const titulo = `${reclamante.nome} - ${reclamante.cpf || 'Sem CPF'}`;
      
      const [newLead] = await db.insert(leads).values({
        titulo,
        pipelineType: 'reclamantes',
        stage: 'novo_lead',
        reclamanteId: reclamante.id,
        valor: reclamante.valorCausa,
        ownerId: userId,
        vendedorId: userId,
      }).returning();
      
      await db.update(reclamantes)
        .set({ enviadoParaPipeline: true })
        .where(eq(reclamantes.id, reclamante.id));
      
      createdLeads.push(newLead);
      synced++;
    }
    
    return { synced, skipped, leads: createdLeads };
  }

  // Lead-Advogados N:N
  async getLeadAdvogados(leadId: string): Promise<TodosAdvogadosInfos[]> {
    const result = await db
      .select({ advogado: todosAdvogadosInfos })
      .from(leadsAdvogados)
      .innerJoin(todosAdvogadosInfos, eq(leadsAdvogados.advogadoId, todosAdvogadosInfos.id))
      .where(eq(leadsAdvogados.leadId, leadId));
    return result.map(r => r.advogado);
  }

  async addAdvogadoToLead(leadId: string, advogadoId: number): Promise<LeadAdvogado> {
    const [result] = await db.insert(leadsAdvogados).values({ leadId, advogadoId }).returning();
    return result;
  }

  async removeAdvogadoFromLead(leadId: string, advogadoId: number): Promise<boolean> {
    const result = await db.delete(leadsAdvogados)
      .where(and(eq(leadsAdvogados.leadId, leadId), eq(leadsAdvogados.advogadoId, advogadoId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Lead-Reclamantes N:N
  async getLeadReclamantes(leadId: string): Promise<Reclamante[]> {
    const result = await db
      .select({ reclamante: reclamantes })
      .from(leadsReclamantes)
      .innerJoin(reclamantes, eq(leadsReclamantes.reclamanteId, reclamantes.id))
      .where(eq(leadsReclamantes.leadId, leadId));
    return result.map(r => r.reclamante);
  }

  async addReclamanteToLead(leadId: string, reclamanteId: string): Promise<LeadReclamante> {
    const [result] = await db.insert(leadsReclamantes).values({ leadId, reclamanteId }).returning();
    return result;
  }

  async removeReclamanteFromLead(leadId: string, reclamanteId: string): Promise<boolean> {
    const result = await db.delete(leadsReclamantes)
      .where(and(eq(leadsReclamantes.leadId, leadId), eq(leadsReclamantes.reclamanteId, reclamanteId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllLeadAdvogadosForUser(ownerId: string): Promise<{ leadId: string; advogadoId: number }[]> {
    const result = await db
      .select({ leadId: leadsAdvogados.leadId, advogadoId: leadsAdvogados.advogadoId })
      .from(leadsAdvogados)
      .innerJoin(leads, eq(leadsAdvogados.leadId, leads.id))
      .where(eq(leads.ownerId, ownerId));
    return result;
  }

  async getAllLeadReclamantesForUser(ownerId: string): Promise<{ leadId: string; reclamanteId: string }[]> {
    const result = await db
      .select({ leadId: leadsReclamantes.leadId, reclamanteId: leadsReclamantes.reclamanteId })
      .from(leadsReclamantes)
      .innerJoin(leads, eq(leadsReclamantes.leadId, leads.id))
      .where(eq(leads.ownerId, ownerId));
    return result;
  }
}

export const storage = new DatabaseStorage();
