import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for JWT auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const opportunityStatusEnum = pgEnum("opportunity_status", [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost"
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "call",
  "email",
  "meeting",
  "task",
  "note"
]);

export const activityStatusEnum = pgEnum("activity_status", [
  "pending",
  "completed",
  "cancelled"
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired"
]);

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  tradeName: text("trade_name"),
  cnpj: varchar("cnpj", { length: 18 }),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  website: text("website"),
  address: text("address"),
  city: text("city"),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zip_code", { length: 10 }),
  segment: text("segment"),
  notes: text("notes"),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientsRelations = relations(clients, ({ many, one }) => ({
  contacts: many(contacts),
  opportunities: many(opportunities),
  activities: many(activities),
}));

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  position: text("position"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contactsRelations = relations(contacts, ({ one }) => ({
  client: one(clients, {
    fields: [contacts.clientId],
    references: [clients.id],
  }),
}));

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 50 }),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).default("un"),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const opportunities = pgTable("opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  value: numeric("value", { precision: 12, scale: 2 }),
  status: opportunityStatusEnum("status").default("lead"),
  probability: integer("probability").default(0),
  expectedCloseDate: timestamp("expected_close_date"),
  description: text("description"),
  lostReason: text("lost_reason"),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const opportunitiesRelations = relations(opportunities, ({ one, many }) => ({
  client: one(clients, {
    fields: [opportunities.clientId],
    references: [clients.id],
  }),
  activities: many(activities),
  proposals: many(proposals),
}));

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: activityTypeEnum("type").notNull(),
  status: activityStatusEnum("status").default("pending"),
  description: text("description"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }),
  opportunityId: varchar("opportunity_id").references(() => opportunities.id, { onDelete: "cascade" }),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activitiesRelations = relations(activities, ({ one }) => ({
  client: one(clients, {
    fields: [activities.clientId],
    references: [clients.id],
  }),
  opportunity: one(opportunities, {
    fields: [activities.opportunityId],
    references: [opportunities.id],
  }),
}));

export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: varchar("number", { length: 20 }).notNull(),
  opportunityId: varchar("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
  status: proposalStatusEnum("status").default("draft"),
  validUntil: timestamp("valid_until"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  terms: text("terms"),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  opportunity: one(opportunities, {
    fields: [proposals.opportunityId],
    references: [opportunities.id],
  }),
  items: many(proposalItems),
}));

export const proposalItems = pgTable("proposal_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: varchar("proposal_id").notNull().references(() => proposals.id, { onDelete: "cascade" }),
  productId: varchar("product_id").references(() => products.id),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).default("1"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
});

export const proposalItemsRelations = relations(proposalItems, ({ one }) => ({
  proposal: one(proposals, {
    fields: [proposalItems.proposalId],
    references: [proposals.id],
  }),
  product: one(products, {
    fields: [proposalItems.productId],
    references: [products.id],
  }),
}));

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOpportunitySchema = createInsertSchema(opportunities).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export const insertProposalSchema = createInsertSchema(proposals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProposalItemSchema = createInsertSchema(proposalItems).omit({ id: true });

// Pipeline Triggers for external API calls
export const httpMethodEnum = pgEnum("http_method", ["GET", "POST", "PUT", "PATCH", "DELETE"]);

export const pipelineTriggers = pgTable("pipeline_triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  fromStatus: opportunityStatusEnum("from_status"),
  toStatus: opportunityStatusEnum("to_status").notNull(),
  webhookUrl: text("webhook_url").notNull(),
  httpMethod: httpMethodEnum("http_method").default("POST"),
  headers: text("headers"), // JSON string
  bodyTemplate: text("body_template"), // JSON template with placeholders
  isActive: boolean("is_active").default(true),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPipelineTriggerSchema = createInsertSchema(pipelineTriggers).omit({ id: true, createdAt: true, updatedAt: true });
export type PipelineTrigger = typeof pipelineTriggers.$inferSelect;
export type InsertPipelineTrigger = z.infer<typeof insertPipelineTriggerSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type ProposalItem = typeof proposalItems.$inferSelect;
export type InsertProposalItem = z.infer<typeof insertProposalItemSchema>;
