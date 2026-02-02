import {
  advogados,
  escritorios,
  advogadoEscritorios,
  reclamantes,
  leads,
  activities,
  proposals,
  proposalItems,
  pipelineTriggers,
  interactions,
  products,
  clients,
  opportunities,
  users,
  type Advogado,
  type InsertAdvogado,
  type Escritorio,
  type InsertEscritorio,
  type AdvogadoEscritorio,
  type InsertAdvogadoEscritorio,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Advogados
  getAdvogados(ownerId: string): Promise<Advogado[]>;
  getAdvogado(id: string, ownerId: string): Promise<Advogado | undefined>;
  createAdvogado(advogado: InsertAdvogado): Promise<Advogado>;
  updateAdvogado(id: string, ownerId: string, advogado: Partial<InsertAdvogado>): Promise<Advogado | undefined>;
  deleteAdvogado(id: string, ownerId: string): Promise<boolean>;

  // Escritórios
  getEscritorios(ownerId: string): Promise<Escritorio[]>;
  getEscritorio(id: string, ownerId: string): Promise<Escritorio | undefined>;
  createEscritorio(escritorio: InsertEscritorio): Promise<Escritorio>;
  updateEscritorio(id: string, ownerId: string, escritorio: Partial<InsertEscritorio>): Promise<Escritorio | undefined>;
  deleteEscritorio(id: string, ownerId: string): Promise<boolean>;

  // Advogado-Escritório (relação N:N)
  getAdvogadoEscritorios(advogadoId: string): Promise<AdvogadoEscritorio[]>;
  getEscritorioAdvogados(escritorioId: string): Promise<AdvogadoEscritorio[]>;
  createAdvogadoEscritorio(rel: InsertAdvogadoEscritorio): Promise<AdvogadoEscritorio>;
  deleteAdvogadoEscritorio(id: string): Promise<boolean>;

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
}

export class DatabaseStorage implements IStorage {
  // Advogados
  async getAdvogados(ownerId: string): Promise<Advogado[]> {
    return db.select().from(advogados).where(eq(advogados.ownerId, ownerId)).orderBy(desc(advogados.createdAt));
  }

  async getAdvogado(id: string, ownerId: string): Promise<Advogado | undefined> {
    const [advogado] = await db.select().from(advogados).where(and(eq(advogados.id, id), eq(advogados.ownerId, ownerId)));
    return advogado;
  }

  async createAdvogado(advogado: InsertAdvogado): Promise<Advogado> {
    const [newAdvogado] = await db.insert(advogados).values(advogado).returning();
    return newAdvogado;
  }

  async updateAdvogado(id: string, ownerId: string, advogado: Partial<InsertAdvogado>): Promise<Advogado | undefined> {
    const [updated] = await db
      .update(advogados)
      .set({ ...advogado, updatedAt: new Date() })
      .where(and(eq(advogados.id, id), eq(advogados.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteAdvogado(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(advogados).where(and(eq(advogados.id, id), eq(advogados.ownerId, ownerId))).returning();
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

  // Advogado-Escritório
  async getAdvogadoEscritorios(advogadoId: string): Promise<AdvogadoEscritorio[]> {
    return db.select().from(advogadoEscritorios).where(eq(advogadoEscritorios.advogadoId, advogadoId));
  }

  async getEscritorioAdvogados(escritorioId: string): Promise<AdvogadoEscritorio[]> {
    return db.select().from(advogadoEscritorios).where(eq(advogadoEscritorios.escritorioId, escritorioId));
  }

  async createAdvogadoEscritorio(rel: InsertAdvogadoEscritorio): Promise<AdvogadoEscritorio> {
    const [newRel] = await db.insert(advogadoEscritorios).values(rel).returning();
    return newRel;
  }

  async deleteAdvogadoEscritorio(id: string): Promise<boolean> {
    const result = await db.delete(advogadoEscritorios).where(eq(advogadoEscritorios.id, id)).returning();
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
}

export const storage = new DatabaseStorage();
