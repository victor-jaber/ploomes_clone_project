import {
  lawyers,
  lawFirms,
  claimants,
  lawFirmLawyers,
  lawsuits,
  lawsuitLawyers,
  lawsuitClaimants,
  lawsuitLawFirms,
  leads,
  activities,
  proposals,
  proposalItems,
  interactions,
  products,
  users,
  type Lawyer,
  type InsertLawyer,
  type LawFirm,
  type InsertLawFirm,
  type Claimant,
  type InsertClaimant,
  type LawFirmLawyer,
  type InsertLawFirmLawyer,
  type Lawsuit,
  type LawsuitLawyer,
  type LawsuitClaimant,
  type LawsuitLawFirm,
  type Lead,
  type InsertLead,
  type Activity,
  type InsertActivity,
  type Proposal,
  type InsertProposal,
  type ProposalItem,
  type InsertProposalItem,
  type Interaction,
  type InsertInteraction,
  type Product,
  type InsertProduct,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Backward compatibility aliases
type TodosAdvogadosInfos = Lawyer;
type InsertTodosAdvogadosInfos = InsertLawyer;
type Escritorio = LawFirm;
type InsertEscritorio = InsertLawFirm;
type Reclamante = Claimant;
type InsertReclamante = InsertClaimant;
type Case = Lead;
type InsertCase = InsertLead;

export interface IStorage {
  // Lawyers (Advogados)
  getLawyers(ownerId: string): Promise<Lawyer[]>;
  getLawyer(id: number, ownerId: string): Promise<Lawyer | undefined>;
  createLawyer(lawyer: InsertLawyer): Promise<Lawyer>;
  updateLawyer(id: number, ownerId: string, lawyer: Partial<InsertLawyer>): Promise<Lawyer | undefined>;
  deleteLawyer(id: number, ownerId: string): Promise<boolean>;

  // Law Firms (Escritórios)
  getLawFirms(ownerId: string): Promise<LawFirm[]>;
  getLawFirm(id: string, ownerId: string): Promise<LawFirm | undefined>;
  createLawFirm(lawFirm: InsertLawFirm): Promise<LawFirm>;
  updateLawFirm(id: string, ownerId: string, lawFirm: Partial<InsertLawFirm>): Promise<LawFirm | undefined>;
  deleteLawFirm(id: string, ownerId: string): Promise<boolean>;

  // Claimants (Reclamantes)
  getClaimants(ownerId: string): Promise<Claimant[]>;
  getClaimant(id: string, ownerId: string): Promise<Claimant | undefined>;
  createClaimant(claimant: InsertClaimant): Promise<Claimant>;
  updateClaimant(id: string, ownerId: string, claimant: Partial<InsertClaimant>): Promise<Claimant | undefined>;
  deleteClaimant(id: string, ownerId: string): Promise<boolean>;

  // Law Firm Lawyers (N:N)
  getLawFirmLawyers(lawFirmId: string): Promise<Lawyer[]>;
  addLawyerToLawFirm(lawFirmId: string, lawyerId: number): Promise<LawFirmLawyer>;
  removeLawyerFromLawFirm(lawFirmId: string, lawyerId: number): Promise<boolean>;

  // Lawsuit Links (N:N) - Vinculação de processos com entidades
  getLawsuitsByLawyer(lawyerId: number): Promise<Lawsuit[]>;
  getLawsuitsByClaimant(claimantId: string): Promise<Lawsuit[]>;
  getLawsuitsByLawFirm(lawFirmId: string): Promise<Lawsuit[]>;
  addLawyerToLawsuit(lawsuitId: string, lawyerId: number): Promise<LawsuitLawyer>;
  addClaimantToLawsuit(lawsuitId: string, claimantId: string): Promise<LawsuitClaimant>;
  addLawFirmToLawsuit(lawsuitId: string, lawFirmId: string): Promise<LawsuitLawFirm>;
  removeLawyerFromLawsuit(lawsuitId: string, lawyerId: number): Promise<boolean>;
  removeClaimantFromLawsuit(lawsuitId: string, claimantId: string): Promise<boolean>;
  removeLawFirmFromLawsuit(lawsuitId: string, lawFirmId: string): Promise<boolean>;

  // Aggregated data for pipeline
  getLawyersWithLawsuits(ownerId: string): Promise<(Lawyer & { lawsuits: Lawsuit[] })[]>;
  getClaimantsWithLawsuits(ownerId: string): Promise<(Claimant & { lawsuits: Lawsuit[] })[]>;
  getLawFirmsWithLawsuits(ownerId: string): Promise<(LawFirm & { lawsuits: Lawsuit[] })[]>;

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

  // Interactions
  getInteractions(leadId: string): Promise<(Interaction & { vendedorName?: string | null })[]>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  deleteInteraction(id: string, ownerId: string): Promise<boolean>;

  // Users
  getUsers(): Promise<{ id: string; name: string; email: string; createdAt: Date | null }[]>;
  getUserByEmail(email: string): Promise<{ id: string; name: string; email: string } | undefined>;
  createUser(user: { name: string; email: string; password: string }): Promise<{ id: string; name: string; email: string; createdAt: Date | null }>;
  deleteUser(id: string): Promise<boolean>;

  // Sync functions
  syncLawyersToLeads(userId: string): Promise<{ synced: number; skipped: number; leads: Lead[] }>;
  syncClaimantsToLeads(userId: string): Promise<{ synced: number; skipped: number; leads: Lead[] }>;
  syncLawsuitsFromApi(userId: string): Promise<{ total: number; linked: number; errors: number }>;
  
  // Backward compatibility
  getTodosAdvogadosInfos(ownerId: string): Promise<TodosAdvogadosInfos[]>;
  getTodosAdvogadosInfo(id: number, ownerId: string): Promise<TodosAdvogadosInfos | undefined>;
  createTodosAdvogadosInfo(info: InsertTodosAdvogadosInfos): Promise<TodosAdvogadosInfos>;
  updateTodosAdvogadosInfo(id: number, ownerId: string, info: Partial<InsertTodosAdvogadosInfos>): Promise<TodosAdvogadosInfos | undefined>;
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
  async getLawyers(ownerId: string): Promise<Lawyer[]> {
    return db.select().from(lawyers).where(eq(lawyers.ownerId, ownerId)).orderBy(desc(lawyers.createdAt));
  }

  async getLawyer(id: number, ownerId: string): Promise<Lawyer | undefined> {
    const [lawyer] = await db.select().from(lawyers).where(and(eq(lawyers.id, id), eq(lawyers.ownerId, ownerId)));
    return lawyer;
  }

  async createLawyer(lawyer: InsertLawyer): Promise<Lawyer> {
    const [newLawyer] = await db.insert(lawyers).values(lawyer).returning();
    return newLawyer;
  }

  async updateLawyer(id: number, ownerId: string, lawyer: Partial<InsertLawyer>): Promise<Lawyer | undefined> {
    const [updated] = await db
      .update(lawyers)
      .set({ ...lawyer, updatedAt: new Date() })
      .where(and(eq(lawyers.id, id), eq(lawyers.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteLawyer(id: number, ownerId: string): Promise<boolean> {
    const result = await db.delete(lawyers).where(and(eq(lawyers.id, id), eq(lawyers.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Law Firms
  async getLawFirms(ownerId: string): Promise<LawFirm[]> {
    return db.select().from(lawFirms).where(eq(lawFirms.ownerId, ownerId)).orderBy(desc(lawFirms.createdAt));
  }

  async getLawFirm(id: string, ownerId: string): Promise<LawFirm | undefined> {
    const [lawFirm] = await db.select().from(lawFirms).where(and(eq(lawFirms.id, id), eq(lawFirms.ownerId, ownerId)));
    return lawFirm;
  }

  async createLawFirm(lawFirm: InsertLawFirm): Promise<LawFirm> {
    const [newLawFirm] = await db.insert(lawFirms).values(lawFirm).returning();
    return newLawFirm;
  }

  async updateLawFirm(id: string, ownerId: string, lawFirm: Partial<InsertLawFirm>): Promise<LawFirm | undefined> {
    const [updated] = await db
      .update(lawFirms)
      .set({ ...lawFirm, updatedAt: new Date() })
      .where(and(eq(lawFirms.id, id), eq(lawFirms.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteLawFirm(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(lawFirms).where(and(eq(lawFirms.id, id), eq(lawFirms.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Claimants
  async getClaimants(ownerId: string): Promise<Claimant[]> {
    return db.select().from(claimants).where(eq(claimants.ownerId, ownerId)).orderBy(desc(claimants.createdAt));
  }

  async getClaimant(id: string, ownerId: string): Promise<Claimant | undefined> {
    const [claimant] = await db.select().from(claimants).where(and(eq(claimants.id, id), eq(claimants.ownerId, ownerId)));
    return claimant;
  }

  async createClaimant(claimant: InsertClaimant): Promise<Claimant> {
    const [newClaimant] = await db.insert(claimants).values(claimant).returning();
    return newClaimant;
  }

  async updateClaimant(id: string, ownerId: string, claimant: Partial<InsertClaimant>): Promise<Claimant | undefined> {
    const [updated] = await db
      .update(claimants)
      .set({ ...claimant, updatedAt: new Date() })
      .where(and(eq(claimants.id, id), eq(claimants.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteClaimant(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(claimants).where(and(eq(claimants.id, id), eq(claimants.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Law Firm Lawyers N:N
  async getLawFirmLawyers(lawFirmId: string): Promise<Lawyer[]> {
    const result = await db
      .select({ lawyer: lawyers })
      .from(lawFirmLawyers)
      .innerJoin(lawyers, eq(lawFirmLawyers.lawyerId, lawyers.id))
      .where(eq(lawFirmLawyers.lawFirmId, lawFirmId));
    return result.map(r => r.lawyer);
  }

  async addLawyerToLawFirm(lawFirmId: string, lawyerId: number): Promise<LawFirmLawyer> {
    const [newRelation] = await db.insert(lawFirmLawyers).values({ lawFirmId, lawyerId }).returning();
    return newRelation;
  }

  async removeLawyerFromLawFirm(lawFirmId: string, lawyerId: number): Promise<boolean> {
    const result = await db.delete(lawFirmLawyers)
      .where(and(eq(lawFirmLawyers.lawFirmId, lawFirmId), eq(lawFirmLawyers.lawyerId, lawyerId)))
      .returning();
    return result.length > 0;
  }

  // Lawsuit Links (N:N) - Vinculação de processos com entidades
  async getLawsuitsByLawyer(lawyerId: number): Promise<Lawsuit[]> {
    const links = await db.select()
      .from(lawsuitLawyers)
      .innerJoin(lawsuits, eq(lawsuitLawyers.lawsuitId, lawsuits.id))
      .where(eq(lawsuitLawyers.lawyerId, lawyerId));
    return links.map(l => l.lawsuits);
  }

  async getLawsuitsByClaimant(claimantId: string): Promise<Lawsuit[]> {
    const links = await db.select()
      .from(lawsuitClaimants)
      .innerJoin(lawsuits, eq(lawsuitClaimants.lawsuitId, lawsuits.id))
      .where(eq(lawsuitClaimants.claimantId, claimantId));
    return links.map(l => l.lawsuits);
  }

  async getLawsuitsByLawFirm(lawFirmId: string): Promise<Lawsuit[]> {
    const links = await db.select()
      .from(lawsuitLawFirms)
      .innerJoin(lawsuits, eq(lawsuitLawFirms.lawsuitId, lawsuits.id))
      .where(eq(lawsuitLawFirms.lawFirmId, lawFirmId));
    return links.map(l => l.lawsuits);
  }

  async addLawyerToLawsuit(lawsuitId: string, lawyerId: number): Promise<LawsuitLawyer> {
    const [link] = await db.insert(lawsuitLawyers)
      .values({ lawsuitId, lawyerId })
      .onConflictDoNothing()
      .returning();
    return link;
  }

  async addClaimantToLawsuit(lawsuitId: string, claimantId: string): Promise<LawsuitClaimant> {
    const [link] = await db.insert(lawsuitClaimants)
      .values({ lawsuitId, claimantId })
      .onConflictDoNothing()
      .returning();
    return link;
  }

  async addLawFirmToLawsuit(lawsuitId: string, lawFirmId: string): Promise<LawsuitLawFirm> {
    const [link] = await db.insert(lawsuitLawFirms)
      .values({ lawsuitId, lawFirmId })
      .onConflictDoNothing()
      .returning();
    return link;
  }

  async removeLawyerFromLawsuit(lawsuitId: string, lawyerId: number): Promise<boolean> {
    const result = await db.delete(lawsuitLawyers)
      .where(and(eq(lawsuitLawyers.lawsuitId, lawsuitId), eq(lawsuitLawyers.lawyerId, lawyerId)))
      .returning();
    return result.length > 0;
  }

  async removeClaimantFromLawsuit(lawsuitId: string, claimantId: string): Promise<boolean> {
    const result = await db.delete(lawsuitClaimants)
      .where(and(eq(lawsuitClaimants.lawsuitId, lawsuitId), eq(lawsuitClaimants.claimantId, claimantId)))
      .returning();
    return result.length > 0;
  }

  async removeLawFirmFromLawsuit(lawsuitId: string, lawFirmId: string): Promise<boolean> {
    const result = await db.delete(lawsuitLawFirms)
      .where(and(eq(lawsuitLawFirms.lawsuitId, lawsuitId), eq(lawsuitLawFirms.lawFirmId, lawFirmId)))
      .returning();
    return result.length > 0;
  }

  // Aggregated data for pipeline - retorna entidades com seus processos agrupados
  async getLawyersWithLawsuits(ownerId: string): Promise<(Lawyer & { lawsuits: Lawsuit[] })[]> {
    const allLawyers = await this.getLawyers(ownerId);
    const result: (Lawyer & { lawsuits: Lawsuit[] })[] = [];
    
    for (const lawyer of allLawyers) {
      const lawyerLawsuits = await this.getLawsuitsByLawyer(lawyer.id);
      result.push({ ...lawyer, lawsuits: lawyerLawsuits });
    }
    
    return result;
  }

  async getClaimantsWithLawsuits(ownerId: string): Promise<(Claimant & { lawsuits: Lawsuit[] })[]> {
    const allClaimants = await this.getClaimants(ownerId);
    const result: (Claimant & { lawsuits: Lawsuit[] })[] = [];
    
    for (const claimant of allClaimants) {
      const claimantLawsuits = await this.getLawsuitsByClaimant(claimant.id);
      result.push({ ...claimant, lawsuits: claimantLawsuits });
    }
    
    return result;
  }

  async getLawFirmsWithLawsuits(ownerId: string): Promise<(LawFirm & { lawsuits: Lawsuit[] })[]> {
    const allLawFirms = await this.getLawFirms(ownerId);
    const result: (LawFirm & { lawsuits: Lawsuit[] })[] = [];
    
    for (const lawFirm of allLawFirms) {
      const lawFirmLawsuitsData = await this.getLawsuitsByLawFirm(lawFirm.id);
      result.push({ ...lawFirm, lawsuits: lawFirmLawsuitsData });
    }
    
    return result;
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
    const [updated] = await db
      .update(proposalItems)
      .set(item)
      .where(eq(proposalItems.id, id))
      .returning();
    return updated;
  }

  async deleteProposalItem(id: string): Promise<void> {
    await db.delete(proposalItems).where(eq(proposalItems.id, id));
  }

  // Interactions
  async getInteractions(leadId: string): Promise<(Interaction & { vendedorName?: string | null })[]> {
    const result = await db
      .select({
        interaction: interactions,
        vendedorName: users.name,
      })
      .from(interactions)
      .leftJoin(users, eq(interactions.vendedorId, users.id))
      .where(eq(interactions.leadId, leadId))
      .orderBy(desc(interactions.createdAt));
    
    return result.map(r => ({
      ...r.interaction,
      vendedorName: r.vendedorName,
    }));
  }

  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const [newInteraction] = await db.insert(interactions).values(interaction).returning();
    return newInteraction;
  }

  async deleteInteraction(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(interactions).where(and(eq(interactions.id, id), eq(interactions.ownerId, ownerId))).returning();
    return result.length > 0;
  }

  // Users
  async getUsers(): Promise<{ id: string; name: string; email: string; createdAt: Date | null }[]> {
    const result = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    }).from(users);
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

  // Sync Lawyers to Leads
  async syncLawyersToLeads(userId: string): Promise<{ synced: number; skipped: number; leads: Lead[] }> {
    const allLawyers = await this.getLawyers(userId);
    const notSynced = allLawyers.filter(l => !l.enviadoParaPipeline);
    
    const newLeads: Lead[] = [];
    for (const lawyer of notSynced) {
      const lead = await this.createLead({
        titulo: `${lawyer.nome} - ${lawyer.cpf || 'Sem CPF'}`,
        pipelineType: "advogados",
        stage: "novo_lead",
        position: 0,
        valor: lawyer.valorCausa || null,
        probabilidade: 0,
        vendedorId: userId,
        ownerId: userId,
        lawyerId: lawyer.id,
      });
      newLeads.push(lead);
      await this.updateLawyer(lawyer.id, userId, { enviadoParaPipeline: true });
    }
    
    return {
      synced: newLeads.length,
      skipped: allLawyers.length - notSynced.length,
      leads: newLeads,
    };
  }

  // Sync Claimants to Leads
  async syncClaimantsToLeads(userId: string): Promise<{ synced: number; skipped: number; leads: Lead[] }> {
    const allClaimants = await this.getClaimants(userId);
    const notSynced = allClaimants.filter(c => !c.enviadoParaPipeline);
    
    const newLeads: Lead[] = [];
    for (const claimant of notSynced) {
      const lead = await this.createLead({
        titulo: `${claimant.nome} - ${claimant.cpf || 'Sem CPF'}`,
        pipelineType: "reclamantes",
        stage: "novo_lead",
        position: 0,
        valor: claimant.valorCausa || null,
        probabilidade: 0,
        vendedorId: userId,
        ownerId: userId,
        claimantId: claimant.id,
      });
      newLeads.push(lead);
      await this.updateClaimant(claimant.id, userId, { enviadoParaPipeline: true });
    }
    
    return {
      synced: newLeads.length,
      skipped: allClaimants.length - notSynced.length,
      leads: newLeads,
    };
  }

  // Sync Lawsuits from external API
  async syncLawsuitsFromApi(userId: string): Promise<{ total: number; linked: number; errors: number }> {
    const API_URL = "http://10.15.0.1:8005/api/v1/tese_advogado/tese_processos";
    const API_USERNAME = "technologies";
    const API_PASSWORD = "0WoOle0bfXRURWmApVkP";

    // Helper to normalize CPF
    const normalizeCpf = (cpf: string) => cpf?.replace(/[.\-\s]/g, '') || '';

    // Get all lawyers with CPF
    const allLawyers = await this.getLawyers(userId);
    const lawyersWithCpf = allLawyers.filter(l => l.cpf);
    
    // Create CPF map
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

    // Fetch processes for each lawyer
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

    // Process each unique lawsuit
    for (const processo of allProcessos) {
      try {
        const cnj = processo.cnj;
        const reclamantes = processo.reclamantes || [];
        const autor = reclamantes.map((r: any) => r.nome).join(', ') || null;

        // Insert or update lawsuit
        const [existing] = await db.select().from(lawsuits).where(eq(lawsuits.cnj, cnj));
        
        let lawsuitId: string;
        if (existing) {
          await db.update(lawsuits).set({
            valorCausa: processo.valor_causa?.toString(),
            teseId: processo.tese_id?.toString(),
            autor,
            apiData: JSON.stringify(processo),
            updatedAt: new Date(),
          }).where(eq(lawsuits.cnj, cnj));
          lawsuitId = existing.id;
        } else {
          const [newLawsuit] = await db.insert(lawsuits).values({
            cnj,
            valorCausa: processo.valor_causa?.toString(),
            teseId: processo.tese_id?.toString(),
            autor,
            apiData: JSON.stringify(processo),
            ownerId: userId,
          }).returning();
          lawsuitId = newLawsuit.id;
        }

        totalProcessed++;

        // Link all lawyers from the process
        const advogados = processo.advogados || [];
        for (const adv of advogados) {
          const cpfNorm = normalizeCpf(adv.cpf);
          const lawyerId = lawyersMap[cpfNorm];
          if (lawyerId) {
            try {
              await db.insert(lawsuitLawyers).values({
                lawsuitId,
                lawyerId,
              }).onConflictDoNothing();
              totalLinked++;
            } catch (e) {
              // Ignore duplicate errors
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
  async getTodosAdvogadosInfos(ownerId: string): Promise<TodosAdvogadosInfos[]> {
    return this.getLawyers(ownerId);
  }

  async getTodosAdvogadosInfo(id: number, ownerId: string): Promise<TodosAdvogadosInfos | undefined> {
    return this.getLawyer(id, ownerId);
  }

  async createTodosAdvogadosInfo(info: InsertTodosAdvogadosInfos): Promise<TodosAdvogadosInfos> {
    return this.createLawyer(info);
  }

  async updateTodosAdvogadosInfo(id: number, ownerId: string, info: Partial<InsertTodosAdvogadosInfos>): Promise<TodosAdvogadosInfos | undefined> {
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
