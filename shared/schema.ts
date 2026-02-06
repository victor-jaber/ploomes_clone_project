import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, numeric, boolean, pgEnum, unique, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const usuarios = pgTable("usuarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senha: text("senha").notNull(),
  preferencias: text("preferencias"),
  criadoEm: timestamp("criado_em").defaultNow(),
});

export const tokensOAuthUsuario = pgTable("tokens_oauth_usuario", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: varchar("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  provedor: varchar("provedor", { length: 50 }).notNull().default("microsoft"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiraEm: timestamp("expira_em"),
  escopo: text("escopo"),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const insertTokenOAuthUsuarioSchema = createInsertSchema(tokensOAuthUsuario).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type TokenOAuthUsuario = typeof tokensOAuthUsuario.$inferSelect;
export type InsertTokenOAuthUsuario = z.infer<typeof insertTokenOAuthUsuarioSchema>;

export const insertUsuarioSchema = createInsertSchema(usuarios).omit({ id: true, criadoEm: true });
export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});
export const registerSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
});

export type Usuario = typeof usuarios.$inferSelect;
export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;

export const tipoPipelineEnum = pgEnum("tipo_pipeline", [
  "advogados",
  "escritorios",
  "reclamantes",
  "triagem",
  "fechamento"
]);

export const tipoAtividadeEnum = pgEnum("tipo_atividade", [
  "ligacao",
  "email",
  "reuniao",
  "tarefa",
  "nota"
]);

export const statusAtividadeEnum = pgEnum("status_atividade", [
  "pendente",
  "concluido",
  "cancelado"
]);

export const statusPropostaEnum = pgEnum("status_proposta", [
  "rascunho",
  "enviado",
  "aceito",
  "rejeitado",
  "expirado"
]);

export const tipoInteracaoEnum = pgEnum("tipo_interacao", [
  "comentario",
  "arquivo",
  "mudanca_status",
  "registro_ligacao",
  "registro_email",
  "whatsapp",
  "reuniao",
  "visita"
]);

export const enderecos = pgTable("enderecos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cep: text("cep"),
  estado: varchar("estado", { length: 2 }),
  municipio: text("municipio"),
  cidade: text("cidade"),
  bairro: text("bairro"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  complemento: text("complemento"),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const contatos = pgTable("contatos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email"),
  telefone: text("telefone"),
  celular: text("celular"),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const advogados = pgTable("advogados", {
  id: serial("id").primaryKey(),
  cpf: varchar("cpf", { length: 14 }),
  nome: text("nome").notNull(),
  observacoes: text("observacoes"),
  enviadoParaPipeline: boolean("enviado_para_pipeline").default(false),
  enderecoId: varchar("endereco_id").references(() => enderecos.id, { onDelete: "set null" }),
  proprietarioId: varchar("proprietario_id").notNull(),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const escritorios = pgTable("escritorios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  cnpj: varchar("cnpj", { length: 18 }),
  observacoes: text("observacoes"),
  enderecoId: varchar("endereco_id").references(() => enderecos.id, { onDelete: "set null" }),
  proprietarioId: varchar("proprietario_id").notNull(),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const reclamantes = pgTable("reclamantes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  cpf: varchar("cpf", { length: 14 }),
  observacoes: text("observacoes"),
  enviadoParaPipeline: boolean("enviado_para_pipeline").default(false),
  enderecoId: varchar("endereco_id").references(() => enderecos.id, { onDelete: "set null" }),
  proprietarioId: varchar("proprietario_id").notNull(),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const advogadoContatos = pgTable("advogado_contatos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advogadoId: integer("advogado_id").notNull().references(() => advogados.id, { onDelete: "cascade" }),
  contatoId: varchar("contato_id").notNull().references(() => contatos.id, { onDelete: "cascade" }),
  criadoEm: timestamp("criado_em").defaultNow(),
}, (table) => [
  unique("advogado_contato_unique").on(table.advogadoId, table.contatoId),
]);

export const escritorioContatos = pgTable("escritorio_contatos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  escritorioId: varchar("escritorio_id").notNull().references(() => escritorios.id, { onDelete: "cascade" }),
  contatoId: varchar("contato_id").notNull().references(() => contatos.id, { onDelete: "cascade" }),
  criadoEm: timestamp("criado_em").defaultNow(),
}, (table) => [
  unique("escritorio_contato_unique").on(table.escritorioId, table.contatoId),
]);

export const reclamanteContatos = pgTable("reclamante_contatos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reclamanteId: varchar("reclamante_id").notNull().references(() => reclamantes.id, { onDelete: "cascade" }),
  contatoId: varchar("contato_id").notNull().references(() => contatos.id, { onDelete: "cascade" }),
  criadoEm: timestamp("criado_em").defaultNow(),
}, (table) => [
  unique("reclamante_contato_unique").on(table.reclamanteId, table.contatoId),
]);

export const processos = pgTable("processos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cnj: varchar("cnj", { length: 30 }).unique(),
  tribunal: varchar("tribunal", { length: 100 }),
  vara: varchar("vara", { length: 200 }),
  classe: varchar("classe", { length: 200 }),
  assunto: text("assunto"),
  status: varchar("status", { length: 100 }),
  valorCausa: numeric("valor_causa", { precision: 12, scale: 2 }),
  autor: text("autor"),
  reu: text("reu"),
  dataDistribuicao: timestamp("data_distribuicao"),
  dataUltimaMovimentacao: timestamp("data_ultima_movimentacao"),
  teseId: varchar("tese_id", { length: 100 }),
  teseNome: text("tese_nome"),
  teseDescricao: text("tese_descricao"),
  probabilidadeSucesso: numeric("probabilidade_sucesso", { precision: 5, scale: 2 }),
  valorEstimado: numeric("valor_estimado", { precision: 12, scale: 2 }),
  apiData: text("api_data"),
  enviadoParaPipeline: boolean("enviado_para_pipeline").default(false),
  proprietarioId: varchar("proprietario_id").notNull(),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const escritorioAdvogados = pgTable("escritorio_advogados", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  escritorioId: varchar("escritorio_id").notNull().references(() => escritorios.id, { onDelete: "cascade" }),
  advogadoId: integer("advogado_id").notNull().references(() => advogados.id, { onDelete: "cascade" }),
  criadoEm: timestamp("criado_em").defaultNow(),
}, (table) => [
  unique("escritorio_advogado_unique").on(table.escritorioId, table.advogadoId),
]);

export const processoAdvogados = pgTable("processo_advogados", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processoId: varchar("processo_id").notNull().references(() => processos.id, { onDelete: "cascade" }),
  advogadoId: integer("advogado_id").notNull().references(() => advogados.id, { onDelete: "cascade" }),
  criadoEm: timestamp("criado_em").defaultNow(),
}, (table) => [
  unique("processo_advogado_unique").on(table.processoId, table.advogadoId),
]);

export const processoReclamantes = pgTable("processo_reclamantes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processoId: varchar("processo_id").notNull().references(() => processos.id, { onDelete: "cascade" }),
  reclamanteId: varchar("reclamante_id").notNull().references(() => reclamantes.id, { onDelete: "cascade" }),
  criadoEm: timestamp("criado_em").defaultNow(),
}, (table) => [
  unique("processo_reclamante_unique").on(table.processoId, table.reclamanteId),
]);

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  titulo: text("titulo").notNull(),
  tipoPipeline: tipoPipelineEnum("tipo_pipeline").notNull().default("advogados"),
  etapa: text("etapa").notNull().default("novo_lead"),
  posicao: integer("posicao").default(0),
  valor: numeric("valor", { precision: 12, scale: 2 }),
  probabilidade: integer("probabilidade").default(0),
  previsaoFechamento: timestamp("previsao_fechamento"),
  descricao: text("descricao"),
  motivoPerda: text("motivo_perda"),
  advogadoId: integer("advogado_id").references(() => advogados.id, { onDelete: "set null" }),
  escritorioId: varchar("escritorio_id").references(() => escritorios.id, { onDelete: "set null" }),
  reclamanteId: varchar("reclamante_id").references(() => reclamantes.id, { onDelete: "set null" }),
  vendedorId: varchar("vendedor_id"),
  proprietarioId: varchar("proprietario_id"),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const leadFinanceiros = pgTable("lead_financeiros", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }).unique(),
  valorFechamento: numeric("valor_fechamento", { precision: 12, scale: 2 }),
  percentualComissao: numeric("percentual_comissao", { precision: 5, scale: 2 }),
  formaPagamento: text("forma_pagamento"),
  observacoesFinanceiras: text("observacoes_financeiras"),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const leadDetalhesCaso = pgTable("lead_detalhes_caso", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }).unique(),
  tribunal: text("tribunal"),
  assuntoPrincipal: text("assunto_principal"),
  assuntos: text("assuntos"),
  orgaoJulgador: text("orgao_julgador"),
  cnj: varchar("cnj", { length: 30 }),
  cliente: text("cliente"),
  abordagem: text("abordagem"),
  origem: text("origem"),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const leadChecklist = pgTable("lead_checklist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }).unique(),
  reclamante: text("reclamante"),
  reclamado: text("reclamado"),
  liquidacaoIndicada: numeric("liquidacao_indicada", { precision: 12, scale: 2 }),
  valorBruto: numeric("valor_bruto", { precision: 12, scale: 2 }),
  valorLiquido: numeric("valor_liquido", { precision: 12, scale: 2 }),
  valorControverso: numeric("valor_controverso", { precision: 12, scale: 2 }),
  sucumbente: text("sucumbente"),
  fgts: numeric("fgts", { precision: 12, scale: 2 }),
  dataPlanilha: timestamp("data_planilha"),
  valorOutros: numeric("valor_outros", { precision: 12, scale: 2 }),
  prazoCaso: timestamp("prazo_caso"),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const leadResponsaveis = pgTable("lead_responsaveis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }).unique(),
  comercialResponsavel: text("comercial_responsavel"),
  advogadoResponsavel: text("advogado_responsavel"),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const interacoes = pgTable("interacoes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  tipo: tipoInteracaoEnum("tipo").notNull(),
  conteudo: text("conteudo"),
  nomeArquivo: text("nome_arquivo"),
  urlArquivo: text("url_arquivo"),
  tipoArquivo: text("tipo_arquivo"),
  metadados: text("metadados"),
  vendedorId: varchar("vendedor_id").notNull().references(() => usuarios.id),
  proprietarioId: varchar("proprietario_id").notNull(),
  criadoEm: timestamp("criado_em").defaultNow(),
});

export const atividades = pgTable("atividades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  titulo: text("titulo").notNull(),
  tipo: tipoAtividadeEnum("tipo").notNull(),
  status: statusAtividadeEnum("status").default("pendente"),
  descricao: text("descricao"),
  dataVencimento: timestamp("data_vencimento"),
  concluidoEm: timestamp("concluido_em"),
  leadId: varchar("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  proprietarioId: varchar("proprietario_id").notNull(),
  criadoEm: timestamp("criado_em").defaultNow(),
});

export const produtos = pgTable("produtos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  sku: varchar("sku", { length: 50 }),
  preco: numeric("preco", { precision: 12, scale: 2 }).notNull(),
  unidade: varchar("unidade", { length: 20 }).default("un"),
  categoria: text("categoria"),
  ativo: boolean("ativo").default(true),
  proprietarioId: varchar("proprietario_id").notNull(),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const propostas = pgTable("propostas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  numero: varchar("numero", { length: 20 }).notNull(),
  leadId: varchar("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  status: statusPropostaEnum("status").default("rascunho"),
  validoAte: timestamp("valido_ate"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0"),
  desconto: numeric("desconto", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).default("0"),
  observacoes: text("observacoes"),
  termos: text("termos"),
  proprietarioId: varchar("proprietario_id").notNull(),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const propostaItens = pgTable("proposta_itens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propostaId: varchar("proposta_id").notNull().references(() => propostas.id, { onDelete: "cascade" }),
  produtoId: varchar("produto_id").references(() => produtos.id),
  descricao: text("descricao").notNull(),
  quantidade: numeric("quantidade", { precision: 10, scale: 2 }).default("1"),
  precoUnitario: numeric("preco_unitario", { precision: 12, scale: 2 }).notNull(),
  desconto: numeric("desconto", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
});

export const enderecosRelations = relations(enderecos, ({ many }) => ({}));
export const contatosRelations = relations(contatos, ({ many }) => ({}));

export const advogadosRelations = relations(advogados, ({ one, many }) => ({
  endereco: one(enderecos, { fields: [advogados.enderecoId], references: [enderecos.id] }),
  advogadoContatos: many(advogadoContatos),
  escritorioAdvogados: many(escritorioAdvogados),
  processoAdvogados: many(processoAdvogados),
}));

export const reclamantesRelations = relations(reclamantes, ({ one, many }) => ({
  endereco: one(enderecos, { fields: [reclamantes.enderecoId], references: [enderecos.id] }),
  reclamanteContatos: many(reclamanteContatos),
  processoReclamantes: many(processoReclamantes),
}));

export const escritoriosRelations = relations(escritorios, ({ one, many }) => ({
  endereco: one(enderecos, { fields: [escritorios.enderecoId], references: [enderecos.id] }),
  escritorioContatos: many(escritorioContatos),
  escritorioAdvogados: many(escritorioAdvogados),
}));

export const advogadoContatosRelations = relations(advogadoContatos, ({ one }) => ({
  advogado: one(advogados, { fields: [advogadoContatos.advogadoId], references: [advogados.id] }),
  contato: one(contatos, { fields: [advogadoContatos.contatoId], references: [contatos.id] }),
}));

export const escritorioContatosRelations = relations(escritorioContatos, ({ one }) => ({
  escritorio: one(escritorios, { fields: [escritorioContatos.escritorioId], references: [escritorios.id] }),
  contato: one(contatos, { fields: [escritorioContatos.contatoId], references: [contatos.id] }),
}));

export const reclamanteContatosRelations = relations(reclamanteContatos, ({ one }) => ({
  reclamante: one(reclamantes, { fields: [reclamanteContatos.reclamanteId], references: [reclamantes.id] }),
  contato: one(contatos, { fields: [reclamanteContatos.contatoId], references: [contatos.id] }),
}));

export const escritorioAdvogadosRelations = relations(escritorioAdvogados, ({ one }) => ({
  escritorio: one(escritorios, { fields: [escritorioAdvogados.escritorioId], references: [escritorios.id] }),
  advogado: one(advogados, { fields: [escritorioAdvogados.advogadoId], references: [advogados.id] }),
}));

export const processosRelations = relations(processos, ({ many }) => ({
  processoAdvogados: many(processoAdvogados),
  processoReclamantes: many(processoReclamantes),
}));

export const processoAdvogadosRelations = relations(processoAdvogados, ({ one }) => ({
  processo: one(processos, { fields: [processoAdvogados.processoId], references: [processos.id] }),
  advogado: one(advogados, { fields: [processoAdvogados.advogadoId], references: [advogados.id] }),
}));

export const processoReclamantesRelations = relations(processoReclamantes, ({ one }) => ({
  processo: one(processos, { fields: [processoReclamantes.processoId], references: [processos.id] }),
  reclamante: one(reclamantes, { fields: [processoReclamantes.reclamanteId], references: [reclamantes.id] }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  vendedor: one(usuarios, { fields: [leads.vendedorId], references: [usuarios.id] }),
  advogado: one(advogados, { fields: [leads.advogadoId], references: [advogados.id] }),
  escritorio: one(escritorios, { fields: [leads.escritorioId], references: [escritorios.id] }),
  reclamante: one(reclamantes, { fields: [leads.reclamanteId], references: [reclamantes.id] }),
  financeiros: one(leadFinanceiros, { fields: [leads.id], references: [leadFinanceiros.leadId] }),
  detalhesCaso: one(leadDetalhesCaso, { fields: [leads.id], references: [leadDetalhesCaso.leadId] }),
  checklist: one(leadChecklist, { fields: [leads.id], references: [leadChecklist.leadId] }),
  responsaveis: one(leadResponsaveis, { fields: [leads.id], references: [leadResponsaveis.leadId] }),
  interacoes: many(interacoes),
  atividades: many(atividades),
  propostas: many(propostas),
}));

export const leadFinanceirosRelations = relations(leadFinanceiros, ({ one }) => ({
  lead: one(leads, { fields: [leadFinanceiros.leadId], references: [leads.id] }),
}));

export const leadDetalhesCasoRelations = relations(leadDetalhesCaso, ({ one }) => ({
  lead: one(leads, { fields: [leadDetalhesCaso.leadId], references: [leads.id] }),
}));

export const leadChecklistRelations = relations(leadChecklist, ({ one }) => ({
  lead: one(leads, { fields: [leadChecklist.leadId], references: [leads.id] }),
}));

export const leadResponsaveisRelations = relations(leadResponsaveis, ({ one }) => ({
  lead: one(leads, { fields: [leadResponsaveis.leadId], references: [leads.id] }),
}));

export const interacoesRelations = relations(interacoes, ({ one }) => ({
  lead: one(leads, { fields: [interacoes.leadId], references: [leads.id] }),
  vendedor: one(usuarios, { fields: [interacoes.vendedorId], references: [usuarios.id] }),
}));

export const atividadesRelations = relations(atividades, ({ one }) => ({
  lead: one(leads, { fields: [atividades.leadId], references: [leads.id] }),
}));

export const propostasRelations = relations(propostas, ({ one, many }) => ({
  lead: one(leads, { fields: [propostas.leadId], references: [leads.id] }),
  itens: many(propostaItens),
}));

export const propostaItensRelations = relations(propostaItens, ({ one }) => ({
  proposta: one(propostas, { fields: [propostaItens.propostaId], references: [propostas.id] }),
  produto: one(produtos, { fields: [propostaItens.produtoId], references: [produtos.id] }),
}));

export const insertEnderecoSchema = createInsertSchema(enderecos).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertContatoSchema = createInsertSchema(contatos).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertAdvogadoSchema = createInsertSchema(advogados).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertEscritorioSchema = createInsertSchema(escritorios).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertReclamanteSchema = createInsertSchema(reclamantes).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertProcessoSchema = createInsertSchema(processos).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertEscritorioAdvogadoSchema = createInsertSchema(escritorioAdvogados).omit({ id: true, criadoEm: true });
export const insertProcessoAdvogadoSchema = createInsertSchema(processoAdvogados).omit({ id: true, criadoEm: true });
export const insertProcessoReclamanteSchema = createInsertSchema(processoReclamantes).omit({ id: true, criadoEm: true });
export const insertAdvogadoContatoSchema = createInsertSchema(advogadoContatos).omit({ id: true, criadoEm: true });
export const insertEscritorioContatoSchema = createInsertSchema(escritorioContatos).omit({ id: true, criadoEm: true });
export const insertReclamanteContatoSchema = createInsertSchema(reclamanteContatos).omit({ id: true, criadoEm: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertLeadFinanceiroSchema = createInsertSchema(leadFinanceiros).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertLeadDetalhesCasoSchema = createInsertSchema(leadDetalhesCaso).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertLeadChecklistSchema = createInsertSchema(leadChecklist).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertLeadResponsaveisSchema = createInsertSchema(leadResponsaveis).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertInteracaoSchema = createInsertSchema(interacoes).omit({ id: true, criadoEm: true });
export const insertAtividadeSchema = createInsertSchema(atividades).omit({ id: true, criadoEm: true });
export const insertProdutoSchema = createInsertSchema(produtos).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertPropostaSchema = createInsertSchema(propostas).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertPropostaItemSchema = createInsertSchema(propostaItens).omit({ id: true });

export type Endereco = typeof enderecos.$inferSelect;
export type InsertEndereco = z.infer<typeof insertEnderecoSchema>;
export type Contato = typeof contatos.$inferSelect;
export type InsertContato = z.infer<typeof insertContatoSchema>;
export type Advogado = typeof advogados.$inferSelect;
export type InsertAdvogado = z.infer<typeof insertAdvogadoSchema>;
export type Escritorio = typeof escritorios.$inferSelect;
export type InsertEscritorio = z.infer<typeof insertEscritorioSchema>;
export type Reclamante = typeof reclamantes.$inferSelect;
export type InsertReclamante = z.infer<typeof insertReclamanteSchema>;
export type Processo = typeof processos.$inferSelect;
export type InsertProcesso = z.infer<typeof insertProcessoSchema>;
export type EscritorioAdvogado = typeof escritorioAdvogados.$inferSelect;
export type InsertEscritorioAdvogado = z.infer<typeof insertEscritorioAdvogadoSchema>;
export type ProcessoAdvogado = typeof processoAdvogados.$inferSelect;
export type InsertProcessoAdvogado = z.infer<typeof insertProcessoAdvogadoSchema>;
export type ProcessoReclamante = typeof processoReclamantes.$inferSelect;
export type InsertProcessoReclamante = z.infer<typeof insertProcessoReclamanteSchema>;
export type AdvogadoContato = typeof advogadoContatos.$inferSelect;
export type InsertAdvogadoContato = z.infer<typeof insertAdvogadoContatoSchema>;
export type EscritorioContato = typeof escritorioContatos.$inferSelect;
export type InsertEscritorioContato = z.infer<typeof insertEscritorioContatoSchema>;
export type ReclamanteContato = typeof reclamanteContatos.$inferSelect;
export type InsertReclamanteContato = z.infer<typeof insertReclamanteContatoSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type LeadFinanceiro = typeof leadFinanceiros.$inferSelect;
export type InsertLeadFinanceiro = z.infer<typeof insertLeadFinanceiroSchema>;
export type LeadDetalhesCaso = typeof leadDetalhesCaso.$inferSelect;
export type InsertLeadDetalhesCaso = z.infer<typeof insertLeadDetalhesCasoSchema>;
export type LeadChecklist = typeof leadChecklist.$inferSelect;
export type InsertLeadChecklist = z.infer<typeof insertLeadChecklistSchema>;
export type LeadResponsaveis = typeof leadResponsaveis.$inferSelect;
export type InsertLeadResponsaveis = z.infer<typeof insertLeadResponsaveisSchema>;
export type Interacao = typeof interacoes.$inferSelect;
export type InsertInteracao = z.infer<typeof insertInteracaoSchema>;
export type Atividade = typeof atividades.$inferSelect;
export type InsertAtividade = z.infer<typeof insertAtividadeSchema>;
export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = z.infer<typeof insertProdutoSchema>;
export type Proposta = typeof propostas.$inferSelect;
export type InsertProposta = z.infer<typeof insertPropostaSchema>;
export type PropostaItem = typeof propostaItens.$inferSelect;
export type InsertPropostaItem = z.infer<typeof insertPropostaItemSchema>;

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
    { id: "reuniao_agendada", label: "Reuniao Agendada", color: "bg-yellow-500" },
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
    { id: "analise_financeira", label: "Analise Financeira", color: "bg-cyan-500" },
    { id: "negociacao_valores", label: "Negociacao de Valores", color: "bg-indigo-500" },
    { id: "contrato", label: "Contrato", color: "bg-amber-500" },
    { id: "assinatura", label: "Assinatura", color: "bg-teal-500" },
    { id: "fechado", label: "Fechado", color: "bg-green-500" },
  ],
} as const;

export type PipelineType = keyof typeof PIPELINE_STAGES;
