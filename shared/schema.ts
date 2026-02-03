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

// Stages for each pipeline type
export const advogadoStageEnum = pgEnum("advogado_stage", [
  "novo_lead",
  "contato_inicial",
  "negociando",
  "aguardando_documentos",
  "qualificado"
]);

export const escritorioStageEnum = pgEnum("escritorio_stage", [
  "novo_lead",
  "contato_inicial",
  "reuniao_agendada",
  "proposta_enviada",
  "qualificado"
]);

export const reclamanteStageEnum = pgEnum("reclamante_stage", [
  "novo_lead",
  "contato_inicial",
  "coletando_dados",
  "aguardando_documentos",
  "qualificado"
]);

export const triagemStageEnum = pgEnum("triagem_stage", [
  "novo_caso",
  "prioridade",
  "triagem",
  "acompanhar",
  "discutir",
  "qualificar"
]);

export const fechamentoStageEnum = pgEnum("fechamento_stage", [
  "analise_financeira",
  "negociacao_valores",
  "contrato",
  "assinatura",
  "fechado"
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

// Escritórios (Law Firms)
export const escritorios = pgTable("escritorios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  cnpj: varchar("cnpj", { length: 18 }),
  email: text("email"),
  telefone: varchar("telefone", { length: 20 }),
  endereco: text("endereco"),
  cidade: text("cidade"),
  estado: varchar("estado", { length: 2 }),
  cep: varchar("cep", { length: 10 }),
  numeroCaso: varchar("numero_caso", { length: 50 }),
  observacoes: text("observacoes"),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const escritoriosRelations = relations(escritorios, ({ many }) => ({
  leads: many(leads),
}));

// Todos Advogados Infos (substitui a tabela advogados)
export const todosAdvogadosInfos = pgTable("todos_advogados_infos", {
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

export const todosAdvogadosInfosRelations = relations(todosAdvogadosInfos, ({ many }) => ({
  leads: many(leads),
}));

// Reclamantes (Claimants)
export const reclamantes = pgTable("reclamantes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  cpf: varchar("cpf", { length: 14 }),
  email: text("email"),
  telefone: varchar("telefone", { length: 20 }),
  celular: varchar("celular", { length: 20 }),
  endereco: text("endereco"),
  cidade: text("cidade"),
  estado: varchar("estado", { length: 2 }),
  cep: varchar("cep", { length: 10 }),
  processoNumero: varchar("processo_numero", { length: 50 }),
  valorCausa: numeric("valor_causa", { precision: 12, scale: 2 }),
  observacoes: text("observacoes"),
  enviadoParaPipeline: boolean("enviado_para_pipeline").default(false),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reclamantesRelations = relations(reclamantes, ({ many }) => ({
  leads: many(leads),
}));

// Leads - Entidade unificada para o pipeline
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  titulo: text("titulo").notNull(),
  pipelineType: pipelineTypeEnum("pipeline_type").notNull().default("advogados"),
  stage: text("stage").notNull().default("novo_lead"),
  position: integer("position").default(0),
  
  // Referências opcionais dependendo do pipeline (mantidas para compatibilidade, mas N:N usa tabelas de junção)
  todosAdvogadosInfosId: integer("todos_advogados_infos_id").references(() => todosAdvogadosInfos.id, { onDelete: "cascade" }),
  escritorioId: varchar("escritorio_id").references(() => escritorios.id, { onDelete: "cascade" }),
  reclamanteId: varchar("reclamante_id").references(() => reclamantes.id, { onDelete: "cascade" }),
  
  // CNJ principal do lead (para agrupar advogados e reclamantes)
  cnj: varchar("cnj", { length: 30 }),
  
  valor: numeric("valor", { precision: 12, scale: 2 }),
  probabilidade: integer("probabilidade").default(0),
  previsaoFechamento: timestamp("previsao_fechamento"),
  descricao: text("descricao"),
  motivoPerda: text("motivo_perda"),
  
  // Campos de fechamento financeiro
  valorFechamento: numeric("valor_fechamento", { precision: 12, scale: 2 }),
  percentualComissao: numeric("percentual_comissao", { precision: 5, scale: 2 }),
  formaPagamento: text("forma_pagamento"),
  observacoesFinanceiras: text("observacoes_financeiras"),
  
  vendedorId: varchar("vendedor_id").notNull(),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela de junção: Leads x Advogados (N:N)
export const leadsAdvogados = pgTable("leads_advogados", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  advogadoId: integer("advogado_id").notNull().references(() => todosAdvogadosInfos.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("leads_advogados_unique").on(table.leadId, table.advogadoId),
]);

// Tabela de junção: Leads x Reclamantes (N:N)
export const leadsReclamantes = pgTable("leads_reclamantes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  reclamanteId: varchar("reclamante_id").notNull().references(() => reclamantes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("leads_reclamantes_unique").on(table.leadId, table.reclamanteId),
]);

export const leadsRelations = relations(leads, ({ one, many }) => ({
  todosAdvogadosInfos: one(todosAdvogadosInfos, {
    fields: [leads.todosAdvogadosInfosId],
    references: [todosAdvogadosInfos.id],
  }),
  escritorio: one(escritorios, {
    fields: [leads.escritorioId],
    references: [escritorios.id],
  }),
  reclamante: one(reclamantes, {
    fields: [leads.reclamanteId],
    references: [reclamantes.id],
  }),
  vendedor: one(users, {
    fields: [leads.vendedorId],
    references: [users.id],
  }),
  interactions: many(interactions),
  activities: many(activities),
  leadsAdvogados: many(leadsAdvogados),
  leadsReclamantes: many(leadsReclamantes),
}));

export const leadsAdvogadosRelations = relations(leadsAdvogados, ({ one }) => ({
  lead: one(leads, {
    fields: [leadsAdvogados.leadId],
    references: [leads.id],
  }),
  advogado: one(todosAdvogadosInfos, {
    fields: [leadsAdvogados.advogadoId],
    references: [todosAdvogadosInfos.id],
  }),
}));

export const leadsReclamantesRelations = relations(leadsReclamantes, ({ one }) => ({
  lead: one(leads, {
    fields: [leadsReclamantes.leadId],
    references: [leads.id],
  }),
  reclamante: one(reclamantes, {
    fields: [leadsReclamantes.reclamanteId],
    references: [reclamantes.id],
  }),
}));

// Interações (Comentários entre vendedores)
export const interactionTypeEnum = pgEnum("interaction_type", [
  "comment",
  "file",
  "status_change",
  "call_log",
  "email_log"
]);

export const interactions = pgTable("interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
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

// Activities
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

export const activitiesRelations = relations(activities, ({ one }) => ({
  lead: one(leads, {
    fields: [activities.leadId],
    references: [leads.id],
  }),
}));

// Products (mantido para propostas)
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

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  lead: one(leads, {
    fields: [proposals.leadId],
    references: [leads.id],
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

// Pipeline Triggers
export const httpMethodEnum = pgEnum("http_method", ["GET", "POST", "PUT", "PATCH", "DELETE"]);

export const pipelineTriggers = pgTable("pipeline_triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  pipelineType: pipelineTypeEnum("pipeline_type").notNull(),
  fromStage: text("from_stage"),
  toStage: text("to_stage").notNull(),
  webhookUrl: text("webhook_url").notNull(),
  httpMethod: httpMethodEnum("http_method").default("POST"),
  headers: text("headers"),
  bodyTemplate: text("body_template"),
  isActive: boolean("is_active").default(true),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertEscritorioSchema = createInsertSchema(escritorios).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTodosAdvogadosInfosSchema = createInsertSchema(todosAdvogadosInfos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReclamanteSchema = createInsertSchema(reclamantes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInteractionSchema = createInsertSchema(interactions).omit({ id: true, createdAt: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProposalSchema = createInsertSchema(proposals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProposalItemSchema = createInsertSchema(proposalItems).omit({ id: true });
export const insertPipelineTriggerSchema = createInsertSchema(pipelineTriggers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLeadAdvogadoSchema = createInsertSchema(leadsAdvogados).omit({ id: true, createdAt: true });
export const insertLeadReclamanteSchema = createInsertSchema(leadsReclamantes).omit({ id: true, createdAt: true });

// Types
export type Escritorio = typeof escritorios.$inferSelect;
export type InsertEscritorio = z.infer<typeof insertEscritorioSchema>;
export type TodosAdvogadosInfos = typeof todosAdvogadosInfos.$inferSelect;
export type InsertTodosAdvogadosInfos = z.infer<typeof insertTodosAdvogadosInfosSchema>;
export type Reclamante = typeof reclamantes.$inferSelect;
export type InsertReclamante = z.infer<typeof insertReclamanteSchema>;
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
export type PipelineTrigger = typeof pipelineTriggers.$inferSelect;
export type InsertPipelineTrigger = z.infer<typeof insertPipelineTriggerSchema>;
export type LeadAdvogado = typeof leadsAdvogados.$inferSelect;
export type InsertLeadAdvogado = z.infer<typeof insertLeadAdvogadoSchema>;
export type LeadReclamante = typeof leadsReclamantes.$inferSelect;
export type InsertLeadReclamante = z.infer<typeof insertLeadReclamanteSchema>;

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
    { id: "prioridade", label: "Prioridade", color: "bg-purple-500" },
    { id: "acompanhar", label: "Acompanhar", color: "bg-yellow-500" },
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

// Opportunity status enum
export const opportunityStatusEnum = pgEnum("opportunity_status", [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
  "falando_escritorio"
]);

// Clients table
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

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

// Opportunities table
export const opportunities = pgTable("opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  value: numeric("value", { precision: 12, scale: 2 }),
  status: opportunityStatusEnum("status").default("lead"),
  probability: integer("probability"),
  expectedCloseDate: timestamp("expected_close_date"),
  description: text("description"),
  lostReason: text("lost_reason"),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const opportunitiesRelations = relations(opportunities, ({ one }) => ({
  client: one(clients, {
    fields: [opportunities.clientId],
    references: [clients.id],
  }),
}));

export const insertOpportunitySchema = createInsertSchema(opportunities).omit({ id: true, createdAt: true, updatedAt: true });
export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
