import {
  clients,
  contacts,
  products,
  opportunities,
  activities,
  proposals,
  proposalItems,
  pipelineTriggers,
  interactions,
  type Client,
  type InsertClient,
  type Contact,
  type InsertContact,
  type Product,
  type InsertProduct,
  type Opportunity,
  type InsertOpportunity,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Clients
  getClients(ownerId: string): Promise<Client[]>;
  getClient(id: string, ownerId: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, ownerId: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string, ownerId: string): Promise<boolean>;

  // Contacts
  getContacts(clientId: string): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contact: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<void>;

  // Products
  getProducts(ownerId: string): Promise<Product[]>;
  getProduct(id: string, ownerId: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, ownerId: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string, ownerId: string): Promise<boolean>;

  // Opportunities
  getOpportunities(ownerId: string): Promise<Opportunity[]>;
  getOpportunity(id: string, ownerId: string): Promise<Opportunity | undefined>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  updateOpportunity(id: string, ownerId: string, opportunity: Partial<InsertOpportunity>): Promise<Opportunity | undefined>;
  deleteOpportunity(id: string, ownerId: string): Promise<boolean>;

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
  getMatchingTriggers(ownerId: string, fromStatus: string | null, toStatus: string): Promise<PipelineTrigger[]>;

  // Interactions
  getInteractions(opportunityId: string): Promise<Interaction[]>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  deleteInteraction(id: string, ownerId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Clients
  async getClients(ownerId: string): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.ownerId, ownerId)).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string, ownerId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.ownerId, ownerId)));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: string, ownerId: string, client: Partial<InsertClient>): Promise<Client | undefined> {
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

  // Contacts
  async getContacts(clientId: string): Promise<Contact[]> {
    return db.select().from(contacts).where(eq(contacts.clientId, clientId));
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async updateContact(id: string, contact: Partial<InsertContact>): Promise<Contact | undefined> {
    const [updated] = await db.update(contacts).set(contact).where(eq(contacts.id, id)).returning();
    return updated;
  }

  async deleteContact(id: string): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
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

  // Opportunities
  async getOpportunities(ownerId: string): Promise<Opportunity[]> {
    return db.select().from(opportunities).where(eq(opportunities.ownerId, ownerId)).orderBy(desc(opportunities.createdAt));
  }

  async getOpportunity(id: string, ownerId: string): Promise<Opportunity | undefined> {
    const [opportunity] = await db.select().from(opportunities).where(and(eq(opportunities.id, id), eq(opportunities.ownerId, ownerId)));
    return opportunity;
  }

  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const [newOpportunity] = await db.insert(opportunities).values(opportunity).returning();
    return newOpportunity;
  }

  async updateOpportunity(id: string, ownerId: string, opportunity: Partial<InsertOpportunity>): Promise<Opportunity | undefined> {
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

  async getMatchingTriggers(ownerId: string, fromStatus: string | null, toStatus: string): Promise<PipelineTrigger[]> {
    const allTriggers = await db.select().from(pipelineTriggers).where(
      and(
        eq(pipelineTriggers.ownerId, ownerId),
        eq(pipelineTriggers.isActive, true),
        eq(pipelineTriggers.toStatus, toStatus as any)
      )
    );
    
    // Filter triggers that match fromStatus (null means any)
    return allTriggers.filter(t => !t.fromStatus || t.fromStatus === fromStatus);
  }

  // Interactions
  async getInteractions(opportunityId: string): Promise<Interaction[]> {
    return db.select().from(interactions).where(eq(interactions.opportunityId, opportunityId)).orderBy(desc(interactions.createdAt));
  }

  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const [newInteraction] = await db.insert(interactions).values(interaction).returning();
    return newInteraction;
  }

  async deleteInteraction(id: string, ownerId: string): Promise<boolean> {
    const result = await db.delete(interactions).where(and(eq(interactions.id, id), eq(interactions.ownerId, ownerId))).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
