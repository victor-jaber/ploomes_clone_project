import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, numeric, boolean, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for JWT auth (Vendedores)
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

// Pipeline Types
export const pipelineTypeEnum = pgEnum("pipeline_type", [
  "advogados",
  "escritorios",
  "reclamantes",
  "triagem",
  "fechamento"
]);

// Activity enums
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

// Lawyers (Advogados) - formerly todos_advogados_infos
export const lawyers = pgTable("lawyers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  cpf: varchar("cpf", { length: 14 }),
  nome: text("nome").notNull(),
  cnj: varchar("cnj", { length: 30 }),
  valorCausa: numeric("valor_causa", { precision: 12, scale: 2 }),
  email: text("email"),
  telefone: text("telefone"),
  celular: text("celular"),
  cep: text("cep"),
  estado: varchar("estado", { length: 2 }),
  municipio: text("municipio"),
  bairro: text("bairro"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  complemento: text("complemento"),
  observacoes: text("observacoes"),
  enviadoParaPipeline: boolean("enviado_para_pipeline").default(false),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Law Firms (Escritórios)
export const lawFirms = pgTable("law_firms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  cnpj: varchar("cnpj", { length: 18 }),
  email: text("email"),
  telefone: varchar("telefone", { length: 20 }),
  endereco: text("endereco"),
  cidade: text("cidade"),
  estado: varchar("estado", { length: 2 }),
  cep: varchar("cep", { length: 10 }),
  observacoes: text("observacoes"),
  cnjs: text("cnjs").array(), // Array of CNJ numbers
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Claimants (Reclamantes)
export const claimants = pgTable("claimants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  cpf: varchar("cpf", { length: 14 }),
  cnj: varchar("cnj", { length: 30 }),
  email: text("email"),
  telefone: varchar("telefone", { length: 20 }),
  celular: varchar("celular", { length: 20 }),
  endereco: text("endereco"),
  cidade: text("cidade"),
  estado: varchar("estado", { length: 2 }),
  cep: varchar("cep", { length: 10 }),
  valorCausa: numeric("valor_causa", { precision: 12, scale: 2 }),
  observacoes: text("observacoes"),
  enviadoParaPipeline: boolean("enviado_para_pipeline").default(false),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Law Firm Lawyers junction table (N:N)
export const lawFirmLawyers = pgTable("law_firm_lawyers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lawFirmId: varchar("law_firm_id").notNull().references(() => lawFirms.id, { onDelete: "cascade" }),
  lawyerId: integer("lawyer_id").notNull().references(() => lawyers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("law_firm_lawyer_unique").on(table.lawFirmId, table.lawyerId),
]);

// Leads (Cases no pipeline)
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  titulo: text("titulo").notNull(),
  pipelineType: pipelineTypeEnum("pipeline_type").notNull().default("advogados"),
  stage: text("stage").notNull().default("novo_lead"),
  position: integer("position").default(0),
  
  valor: numeric("valor", { precision: 12, scale: 2 }),
  probabilidade: integer("probabilidade").default(0),
  previsaoFechamento: timestamp("previsao_fechamento"),
  descricao: text("descricao"),
  motivoPerda: text("motivo_perda"),
  
  valorFechamento: numeric("valor_fechamento", { precision: 12, scale: 2 }),
  percentualComissao: numeric("percentual_comissao", { precision: 5, scale: 2 }),
  formaPagamento: text("forma_pagamento"),
  observacoesFinanceiras: text("observacoes_financeiras"),
  
  lawyerId: integer("lawyer_id"),
  lawFirmId: varchar("law_firm_id"),
  claimantId: varchar("claimant_id"),
  
  vendedorId: varchar("vendedor_id").notNull(),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Interaction Types
export const interactionTypeEnum = pgEnum("interaction_type", [
  "comment",
  "file",
  "status_change",
  "call_log",
  "email_log"
]);

// Interactions (Comentários)
export const interactions = pgTable("interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  type: interactionTypeEnum("type").notNull(),
  content: text("content"),
  fileName: text("file_name"),
  fileUrl: text("file_url"),
  fileType: text("file_type"),
  metadata: text("metadata"),
  vendedorId: varchar("vendedor_id").notNull().references(() => users.id),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activities (Tarefas)
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: activityTypeEnum("type").notNull(),
  status: activityStatusEnum("status").default("pending"),
  description: text("description"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  leadId: varchar("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products
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

// Proposals
export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: varchar("number", { length: 20 }).notNull(),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
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

// Proposal Items
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

// Relations
export const lawyersRelations = relations(lawyers, ({ many }) => ({
  lawFirmLawyers: many(lawFirmLawyers),
}));

export const lawFirmsRelations = relations(lawFirms, ({ many }) => ({
  lawFirmLawyers: many(lawFirmLawyers),
}));

export const lawFirmLawyersRelations = relations(lawFirmLawyers, ({ one }) => ({
  lawFirm: one(lawFirms, {
    fields: [lawFirmLawyers.lawFirmId],
    references: [lawFirms.id],
  }),
  lawyer: one(lawyers, {
    fields: [lawFirmLawyers.lawyerId],
    references: [lawyers.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  vendedor: one(users, {
    fields: [leads.vendedorId],
    references: [users.id],
  }),
  interactions: many(interactions),
  activities: many(activities),
  proposals: many(proposals),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  lead: one(leads, {
    fields: [interactions.leadId],
    references: [leads.id],
  }),
  vendedor: one(users, {
    fields: [interactions.vendedorId],
    references: [users.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  lead: one(leads, {
    fields: [activities.leadId],
    references: [leads.id],
  }),
}));

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  lead: one(leads, {
    fields: [proposals.leadId],
    references: [leads.id],
  }),
  items: many(proposalItems),
}));

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

// Insert schemas
export const insertLawyerSchema = createInsertSchema(lawyers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLawFirmSchema = createInsertSchema(lawFirms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClaimantSchema = createInsertSchema(claimants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLawFirmLawyerSchema = createInsertSchema(lawFirmLawyers).omit({ id: true, createdAt: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInteractionSchema = createInsertSchema(interactions).omit({ id: true, createdAt: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProposalSchema = createInsertSchema(proposals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProposalItemSchema = createInsertSchema(proposalItems).omit({ id: true });

// Types
export type Lawyer = typeof lawyers.$inferSelect;
export type InsertLawyer = z.infer<typeof insertLawyerSchema>;
export type LawFirm = typeof lawFirms.$inferSelect;
export type InsertLawFirm = z.infer<typeof insertLawFirmSchema>;
export type Claimant = typeof claimants.$inferSelect;
export type InsertClaimant = z.infer<typeof insertClaimantSchema>;
export type LawFirmLawyer = typeof lawFirmLawyers.$inferSelect;
export type InsertLawFirmLawyer = z.infer<typeof insertLawFirmLawyerSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type ProposalItem = typeof proposalItems.$inferSelect;
export type InsertProposalItem = z.infer<typeof insertProposalItemSchema>;

// Backward compatibility aliases
export const todosAdvogadosInfos = lawyers;
export type TodosAdvogadosInfos = Lawyer;
export type InsertTodosAdvogadosInfos = InsertLawyer;
export const insertTodosAdvogadosInfosSchema = insertLawyerSchema;

export const escritorios = lawFirms;
export type Escritorio = LawFirm;
export type InsertEscritorio = InsertLawFirm;
export const insertEscritorioSchema = insertLawFirmSchema;

export const reclamantes = claimants;
export type Reclamante = Claimant;
export type InsertReclamante = InsertClaimant;
export const insertReclamanteSchema = insertClaimantSchema;

export const cases = leads;
export type Case = Lead;
export type InsertCase = InsertLead;
export const insertCaseSchema = insertLeadSchema;

// Pipeline stage configurations
export const PIPELINE_STAGES = {
  advogados: [
    { id: "novo_lead", label: "Novo Lead", color: "bg-blue-500" },
    { id: "contato_inicial", label: "Contato Inicial", color: "bg-purple-500" },
    { id: "negociando", label: "Negociando", color: "bg-yellow-500" },
    { id: "aguardando_documentos", label: "Aguardando Documentos", color: "bg-orange-500" },
    { id: "qualificado", label: "Qualificado", color: "bg-green-500" },
  ],
  escritorios: [
    { id: "novo_lead", label: "Novo Lead", color: "bg-blue-500" },
    { id: "contato_inicial", label: "Contato Inicial", color: "bg-purple-500" },
    { id: "reuniao_agendada", label: "Reunião Agendada", color: "bg-yellow-500" },
    { id: "proposta_enviada", label: "Proposta Enviada", color: "bg-orange-500" },
    { id: "qualificado", label: "Qualificado", color: "bg-green-500" },
  ],
  reclamantes: [
    { id: "novo_lead", label: "Novo Lead", color: "bg-blue-500" },
    { id: "contato_inicial", label: "Contato Inicial", color: "bg-purple-500" },
    { id: "coletando_dados", label: "Coletando Dados", color: "bg-yellow-500" },
    { id: "aguardando_documentos", label: "Aguardando Documentos", color: "bg-orange-500" },
    { id: "qualificado", label: "Qualificado", color: "bg-green-500" },
  ],
  triagem: [
    { id: "novo_caso", label: "Novo Caso", color: "bg-blue-500" },
    { id: "prioridade", label: "Prioridade", color: "bg-red-500" },
    { id: "triagem", label: "Triagem", color: "bg-yellow-500" },
    { id: "acompanhar", label: "Acompanhar", color: "bg-purple-500" },
    { id: "discutir", label: "Discutir", color: "bg-orange-500" },
    { id: "qualificar", label: "Qualificar", color: "bg-green-500" },
  ],
  fechamento: [
    { id: "analise_financeira", label: "Análise Financeira", color: "bg-blue-500" },
    { id: "negociacao_valores", label: "Negociação de Valores", color: "bg-purple-500" },
    { id: "contrato", label: "Contrato", color: "bg-yellow-500" },
    { id: "assinatura", label: "Assinatura", color: "bg-orange-500" },
    { id: "fechado", label: "Fechado", color: "bg-green-500" },
  ],
} as const;

export type PipelineType = keyof typeof PIPELINE_STAGES;
