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

// Resultado do processo
export const resultadoTypeEnum = pgEnum("resultado_type", [
  "ganho",
  "perdido",
  "acordo",
  "arquivado",
  "em_andamento"
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
  observacoes: text("observacoes"),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Advogados (todos_advogados_infos)
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

// Reclamantes (Claimants)
export const reclamantes = pgTable("reclamantes", {
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

// Processo (Processo Judicial - CNJ)
export const processos = pgTable("processos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cnj: varchar("cnj", { length: 30 }).notNull(),
  valorCausa: numeric("valor_causa", { precision: 12, scale: 2 }),
  tribunal: text("tribunal"),
  vara: text("vara"),
  comarca: text("comarca"),
  estado: varchar("estado", { length: 2 }),
  dataDistribuicao: timestamp("data_distribuicao"),
  assunto: text("assunto"),
  observacoes: text("observacoes"),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Resultado (Desfecho do Processo)
export const resultados = pgTable("resultados", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processoId: varchar("processo_id").notNull().references(() => processos.id, { onDelete: "cascade" }),
  tipo: resultadoTypeEnum("tipo").notNull().default("em_andamento"),
  valorRecebido: numeric("valor_recebido", { precision: 12, scale: 2 }),
  dataResultado: timestamp("data_resultado"),
  descricao: text("descricao"),
  observacoes: text("observacoes"),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cases (evolução de Leads - representa o caso trabalhado pelo vendedor)
// Nota: tabela permanece como "leads" no DB para backward compatibility
export const cases = pgTable("leads", {
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
  
  vendedorId: varchar("vendedor_id").notNull(),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabela de junção: Processo x Advogado (N:N)
export const processoAdvogado = pgTable("processo_advogado", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processoId: varchar("processo_id").notNull().references(() => processos.id, { onDelete: "cascade" }),
  advogadoId: integer("advogado_id").notNull().references(() => todosAdvogadosInfos.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("processo_advogado_unique").on(table.processoId, table.advogadoId),
]);

// Tabela de junção: Processo x Reclamante (N:N)
export const processoReclamante = pgTable("processo_reclamante", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processoId: varchar("processo_id").notNull().references(() => processos.id, { onDelete: "cascade" }),
  reclamanteId: varchar("reclamante_id").notNull().references(() => reclamantes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("processo_reclamante_unique").on(table.processoId, table.reclamanteId),
]);

// Tabela de junção: Escritório x Case (N:N)
export const escritorioCase = pgTable("escritorio_case", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  escritorioId: varchar("escritorio_id").notNull().references(() => escritorios.id, { onDelete: "cascade" }),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("escritorio_case_unique").on(table.escritorioId, table.caseId),
]);

// Tabela de junção: Case x Processo (N:N)
export const caseProcesso = pgTable("case_processo", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  processoId: varchar("processo_id").notNull().references(() => processos.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("case_processo_unique").on(table.caseId, table.processoId),
]);

// Relations
export const escritoriosRelations = relations(escritorios, ({ many }) => ({
  escritorioCases: many(escritorioCase),
}));

export const todosAdvogadosInfosRelations = relations(todosAdvogadosInfos, ({ many }) => ({
  processoAdvogados: many(processoAdvogado),
}));

export const reclamantesRelations = relations(reclamantes, ({ many }) => ({
  processoReclamantes: many(processoReclamante),
}));

export const processosRelations = relations(processos, ({ many, one }) => ({
  processoAdvogados: many(processoAdvogado),
  processoReclamantes: many(processoReclamante),
  caseProcessos: many(caseProcesso),
  resultado: one(resultados, {
    fields: [processos.id],
    references: [resultados.processoId],
  }),
}));

export const resultadosRelations = relations(resultados, ({ one }) => ({
  processo: one(processos, {
    fields: [resultados.processoId],
    references: [processos.id],
  }),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  vendedor: one(users, {
    fields: [cases.vendedorId],
    references: [users.id],
  }),
  caseProcessos: many(caseProcesso),
  escritorioCases: many(escritorioCase),
  interactions: many(interactions),
  activities: many(activities),
}));

export const processoAdvogadoRelations = relations(processoAdvogado, ({ one }) => ({
  processo: one(processos, {
    fields: [processoAdvogado.processoId],
    references: [processos.id],
  }),
  advogado: one(todosAdvogadosInfos, {
    fields: [processoAdvogado.advogadoId],
    references: [todosAdvogadosInfos.id],
  }),
}));

export const processoReclamanteRelations = relations(processoReclamante, ({ one }) => ({
  processo: one(processos, {
    fields: [processoReclamante.processoId],
    references: [processos.id],
  }),
  reclamante: one(reclamantes, {
    fields: [processoReclamante.reclamanteId],
    references: [reclamantes.id],
  }),
}));

export const escritorioCaseRelations = relations(escritorioCase, ({ one }) => ({
  escritorio: one(escritorios, {
    fields: [escritorioCase.escritorioId],
    references: [escritorios.id],
  }),
  case: one(cases, {
    fields: [escritorioCase.caseId],
    references: [cases.id],
  }),
}));

export const caseProcessoRelations = relations(caseProcesso, ({ one }) => ({
  case: one(cases, {
    fields: [caseProcesso.caseId],
    references: [cases.id],
  }),
  processo: one(processos, {
    fields: [caseProcesso.processoId],
    references: [processos.id],
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
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
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
  case: one(cases, {
    fields: [interactions.caseId],
    references: [cases.id],
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
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "cascade" }),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activitiesRelations = relations(activities, ({ one }) => ({
  case: one(cases, {
    fields: [activities.caseId],
    references: [cases.id],
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
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
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
  case: one(cases, {
    fields: [proposals.caseId],
    references: [cases.id],
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

// Lembrete (Reminder linked to Case)
export const lembretes = pgTable("lembretes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  dataLembrete: timestamp("data_lembrete").notNull(),
  concluido: boolean("concluido").default(false),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lembretesRelations = relations(lembretes, ({ one }) => ({
  case: one(cases, {
    fields: [lembretes.caseId],
    references: [cases.id],
  }),
}));

// Insert schemas
export const insertEscritorioSchema = createInsertSchema(escritorios).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTodosAdvogadosInfosSchema = createInsertSchema(todosAdvogadosInfos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReclamanteSchema = createInsertSchema(reclamantes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProcessoSchema = createInsertSchema(processos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertResultadoSchema = createInsertSchema(resultados).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCaseSchema = createInsertSchema(cases).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInteractionSchema = createInsertSchema(interactions).omit({ id: true, createdAt: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProposalSchema = createInsertSchema(proposals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProposalItemSchema = createInsertSchema(proposalItems).omit({ id: true });
export const insertPipelineTriggerSchema = createInsertSchema(pipelineTriggers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProcessoAdvogadoSchema = createInsertSchema(processoAdvogado).omit({ id: true, createdAt: true });
export const insertProcessoReclamanteSchema = createInsertSchema(processoReclamante).omit({ id: true, createdAt: true });
export const insertEscritorioCaseSchema = createInsertSchema(escritorioCase).omit({ id: true, createdAt: true });
export const insertCaseProcessoSchema = createInsertSchema(caseProcesso).omit({ id: true, createdAt: true });
export const insertLembreteSchema = createInsertSchema(lembretes).omit({ id: true, createdAt: true });

// Types
export type Escritorio = typeof escritorios.$inferSelect;
export type InsertEscritorio = z.infer<typeof insertEscritorioSchema>;
export type TodosAdvogadosInfos = typeof todosAdvogadosInfos.$inferSelect;
export type InsertTodosAdvogadosInfos = z.infer<typeof insertTodosAdvogadosInfosSchema>;
export type Reclamante = typeof reclamantes.$inferSelect;
export type InsertReclamante = z.infer<typeof insertReclamanteSchema>;
export type Processo = typeof processos.$inferSelect;
export type InsertProcesso = z.infer<typeof insertProcessoSchema>;
export type Resultado = typeof resultados.$inferSelect;
export type InsertResultado = z.infer<typeof insertResultadoSchema>;
export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
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
export type ProcessoAdvogado = typeof processoAdvogado.$inferSelect;
export type InsertProcessoAdvogado = z.infer<typeof insertProcessoAdvogadoSchema>;
export type ProcessoReclamante = typeof processoReclamante.$inferSelect;
export type InsertProcessoReclamante = z.infer<typeof insertProcessoReclamanteSchema>;
export type EscritorioCase = typeof escritorioCase.$inferSelect;
export type InsertEscritorioCase = z.infer<typeof insertEscritorioCaseSchema>;
export type CaseProcesso = typeof caseProcesso.$inferSelect;
export type InsertCaseProcesso = z.infer<typeof insertCaseProcessoSchema>;
export type Lembrete = typeof lembretes.$inferSelect;
export type InsertLembrete = z.infer<typeof insertLembreteSchema>;

// Backward compatibility aliases (Lead = Case)
export const leads = cases;
export type Lead = Case;
export type InsertLead = InsertCase;
export const insertLeadSchema = insertCaseSchema;

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
