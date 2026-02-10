import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { z } from "zod";
import Redis from "ioredis";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { isAuthenticated, registerAuthRoutes, AuthRequest } from "./auth";
import { processAssistantMessage } from "./assistant";
import { wsManager } from "./websocket";
import logger from "./logger";
import { 
  getCalendarEvents, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent, 
  checkOutlookConnection,
  getOAuthConfig,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  saveUserTokens,
  deleteUserTokens,
  type CalendarEvent 
} from "./outlook";
import { db } from "./db";
import {
  contatos,
  advogadoContatos,
  escritorioContatos,
  reclamanteContatos,
  insertAdvogadoSchema,
  insertEscritorioSchema,
  insertReclamanteSchema,
  insertProcessoSchema,
  insertLeadSchema,
  insertLeadFinanceiroSchema,
  insertLeadDetalhesCasoSchema,
  insertLeadChecklistSchema,
  insertProdutoSchema,
  insertAtividadeSchema,
  insertPropostaSchema,
  insertPropostaItemSchema,
  insertInteracaoSchema,
  insertEquipeSchema,
  type Lead,
  type Advogado,
  type Escritorio,
  type Reclamante,
  type Processo,
} from "@shared/schema";

// Redis-based shared cache with TTL
class RedisCache {
  private redis: Redis | null = null;
  private ttl: number; // TTL in seconds
  private prefix: string = "hermes:cache:";
  private connected: boolean = false;
  private localCache = new Map<string, { data: any; timestamp: number }>();

  constructor(ttlSeconds: number = 30) {
    this.ttl = ttlSeconds;
    this.initRedis();
  }

  private async initRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.warn("REDIS_URL não configurado, usando cache local", { prefix: "Cache" });
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 1000);
        },
      });

      this.redis.on("connect", () => {
        logger.success("Conectado ao Redis", { prefix: "Cache" });
        this.connected = true;
      });

      this.redis.on("error", (err) => {
        logger.error(`Erro no Redis: ${err.message}`, undefined, { prefix: "Cache" });
        this.connected = false;
      });

      this.redis.on("close", () => {
        logger.info("Conexão Redis fechada", { prefix: "Cache" });
        this.connected = false;
      });

      await this.redis.connect();
    } catch (error) {
      logger.error("Falha ao conectar ao Redis", error as Error, { prefix: "Cache" });
      this.redis = null;
      this.connected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.prefix + key;

    // Try Redis first
    if (this.redis && this.connected) {
      try {
        const data = await this.redis.get(fullKey);
        if (data) {
          return JSON.parse(data) as T;
        }
        return null;
      } catch (error) {
        logger.debug("Erro ao buscar cache Redis", { prefix: "Cache" });
      }
    }

    // Fallback to local cache
    const entry = this.localCache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl * 1000) {
      this.localCache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  async set<T>(key: string, data: T): Promise<void> {
    const fullKey = this.prefix + key;

    // Try Redis first
    if (this.redis && this.connected) {
      try {
        await this.redis.setex(fullKey, this.ttl, JSON.stringify(data));
        return;
      } catch (error) {
        logger.debug("Erro ao salvar cache Redis", { prefix: "Cache" });
      }
    }

    // Fallback to local cache
    this.localCache.set(key, { data, timestamp: Date.now() });
  }

  async invalidate(pattern?: string): Promise<void> {
    // Clear local cache
    if (!pattern) {
      this.localCache.clear();
    } else {
      const keys = Array.from(this.localCache.keys());
      for (const key of keys) {
        if (key.includes(pattern)) {
          this.localCache.delete(key);
        }
      }
    }

    // Clear Redis cache
    if (this.redis && this.connected) {
      try {
        if (!pattern) {
          const keys = await this.redis.keys(this.prefix + "*");
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } else {
          const keys = await this.redis.keys(this.prefix + "*" + pattern + "*");
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        }
      } catch (error) {
        logger.debug("Erro ao invalidar cache Redis", { prefix: "Cache" });
      }
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Cache for aggregated data (30 second TTL) - shared across all users via Redis
const aggregationCache = new RedisCache(30);

// Backward compatibility aliases
const insertTodosAdvogadosInfosSchema = insertAdvogadoSchema;
const insertCaseSchema = insertLeadSchema;

// Helper to extract params
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || '';
};

import { eq, and } from "drizzle-orm";

async function extractAndCreateContact(body: any): Promise<string | null> {
  const { email, telefone, celular } = body;
  if (!email && !telefone && !celular) return null;
  const [newContact] = await db.insert(contatos).values({
    email: email || null,
    telefone: telefone || null,
    celular: celular || null,
  }).returning();
  return newContact.id;
}

async function updateOrCreateContactForLawyer(lawyerId: number, body: any): Promise<void> {
  const { email, telefone, celular } = body;
  if (email === undefined && telefone === undefined && celular === undefined) return;
  
  const existing = await db.select({ contatoId: advogadoContatos.contatoId })
    .from(advogadoContatos)
    .where(eq(advogadoContatos.advogadoId, lawyerId))
    .limit(1);
  
  if (existing.length > 0) {
    const updates: any = {};
    if (email !== undefined) updates.email = email || null;
    if (telefone !== undefined) updates.telefone = telefone || null;
    if (celular !== undefined) updates.celular = celular || null;
    await db.update(contatos).set(updates).where(eq(contatos.id, existing[0].contatoId));
  } else {
    const contactId = await extractAndCreateContact(body);
    if (contactId) {
      await db.insert(advogadoContatos).values({ advogadoId: lawyerId, contatoId: contactId });
    }
  }
}

async function updateOrCreateContactForFirm(firmId: string, body: any): Promise<void> {
  const { email, telefone, celular } = body;
  if (email === undefined && telefone === undefined && celular === undefined) return;
  
  const existing = await db.select({ contatoId: escritorioContatos.contatoId })
    .from(escritorioContatos)
    .where(eq(escritorioContatos.escritorioId, firmId))
    .limit(1);
  
  if (existing.length > 0) {
    const updates: any = {};
    if (email !== undefined) updates.email = email || null;
    if (telefone !== undefined) updates.telefone = telefone || null;
    if (celular !== undefined) updates.celular = celular || null;
    await db.update(contatos).set(updates).where(eq(contatos.id, existing[0].contatoId));
  } else {
    const contactId = await extractAndCreateContact(body);
    if (contactId) {
      await db.insert(escritorioContatos).values({ escritorioId: firmId, contatoId: contactId });
    }
  }
}

async function updateOrCreateContactForClaimant(claimantId: string, body: any): Promise<void> {
  const { email, telefone, celular } = body;
  if (email === undefined && telefone === undefined && celular === undefined) return;
  
  const existing = await db.select({ contatoId: reclamanteContatos.contatoId })
    .from(reclamanteContatos)
    .where(eq(reclamanteContatos.reclamanteId, claimantId))
    .limit(1);
  
  if (existing.length > 0) {
    const updates: any = {};
    if (email !== undefined) updates.email = email || null;
    if (telefone !== undefined) updates.telefone = telefone || null;
    if (celular !== undefined) updates.celular = celular || null;
    await db.update(contatos).set(updates).where(eq(contatos.id, existing[0].contatoId));
  } else {
    const contactId = await extractAndCreateContact(body);
    if (contactId) {
      await db.insert(reclamanteContatos).values({ reclamanteId: claimantId, contatoId: contactId });
    }
  }
}

function stripContactFields(body: any): any {
  const { email, telefone, celular, ...rest } = body;
  return rest;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  wsManager.initialize(httpServer);
  registerAuthRoutes(app);

  // Lawyers (Advogados)
  app.get("/api/lawyers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawyers = await storage.getAllLawyers();
      res.json(lawyers);
    } catch (error) {
      logger.error("fetching lawyers", error as Error);
      res.status(500).json({ message: "Failed to fetch lawyers" });
    }
  });

  app.get("/api/lawyers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(getParam(req.params.id), 10);
      const lawyer = await storage.getLawyer(id);
      if (!lawyer) {
        res.status(404).json({ message: "Lawyer not found" });
        return;
      }
      res.json(lawyer);
    } catch (error) {
      logger.error("fetching lawyer", error as Error);
      res.status(500).json({ message: "Failed to fetch lawyer" });
    }
  });

  app.post("/api/lawyers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const strippedBody = stripContactFields(req.body);
      const parsed = insertAdvogadoSchema.safeParse(strippedBody);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lawyer = await storage.createLawyer(parsed.data);
      const contactId = await extractAndCreateContact(req.body);
      if (contactId) {
        await db.insert(advogadoContatos).values({ advogadoId: lawyer.id, contatoId: contactId });
      }
      await aggregationCache.invalidate('lawyers-with-lawsuits');
      
      const lead = await storage.createLead({
        titulo: lawyer.nome,
        tipoPipeline: 'advogados',
        etapa: 'novo_lead',
        valor: null,
        usuarioId: userId,
      });
      wsManager.broadcastLeadCreated(lead);
      
      res.status(201).json(lawyer);
    } catch (error) {
      logger.error("creating lawyer", error as Error);
      res.status(500).json({ message: "Failed to create lawyer" });
    }
  });

  app.patch("/api/lawyers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(getParam(req.params.id), 10);
      const strippedBody = stripContactFields(req.body);
      const partial = insertAdvogadoSchema.partial().safeParse(strippedBody);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const lawyer = await storage.updateLawyer(id, partial.data);
      if (!lawyer) {
        res.status(404).json({ message: "Lawyer not found" });
        return;
      }
      await updateOrCreateContactForLawyer(id, req.body);
      await aggregationCache.invalidate('lawyers-with-lawsuits');
      res.json(lawyer);
    } catch (error) {
      logger.error("updating lawyer", error as Error);
      res.status(500).json({ message: "Failed to update lawyer" });
    }
  });

  app.delete("/api/lawyers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(getParam(req.params.id), 10);
      const deleted = await storage.deleteLawyer(id);
      if (!deleted) {
        res.status(404).json({ message: "Lawyer not found" });
        return;
      }
      await aggregationCache.invalidate('lawyers-with-lawsuits');
      res.status(204).send();
    } catch (error) {
      logger.error("deleting lawyer", error as Error);
      res.status(500).json({ message: "Failed to delete lawyer" });
    }
  });

  // Backward compatibility: /api/todos-advogados-infos
  app.get("/api/todos-advogados-infos", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawyers = await storage.getAllLawyers();
      res.json(lawyers);
    } catch (error) {
      logger.error("fetching lawyers", error as Error);
      res.status(500).json({ message: "Failed to fetch lawyers" });
    }
  });

  app.get("/api/todos-advogados-infos/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(getParam(req.params.id), 10);
      const lawyer = await storage.getLawyer(id);
      if (!lawyer) {
        res.status(404).json({ message: "Lawyer not found" });
        return;
      }
      res.json(lawyer);
    } catch (error) {
      logger.error("fetching lawyer", error as Error);
      res.status(500).json({ message: "Failed to fetch lawyer" });
    }
  });

  app.post("/api/todos-advogados-infos", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const strippedBody = stripContactFields(req.body);
      const parsed = insertAdvogadoSchema.safeParse(strippedBody);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lawyer = await storage.createLawyer(parsed.data);
      const contactId = await extractAndCreateContact(req.body);
      if (contactId) {
        await db.insert(advogadoContatos).values({ advogadoId: lawyer.id, contatoId: contactId });
      }
      await aggregationCache.invalidate('lawyers-with-lawsuits');
      
      const lead = await storage.createLead({
        titulo: lawyer.nome,
        tipoPipeline: 'advogados',
        etapa: 'novo_lead',
        valor: null,
        usuarioId: userId,
      });
      wsManager.broadcastLeadCreated(lead);
      
      res.status(201).json(lawyer);
    } catch (error) {
      logger.error("creating lawyer", error as Error);
      res.status(500).json({ message: "Failed to create lawyer" });
    }
  });

  app.patch("/api/todos-advogados-infos/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const id = parseInt(getParam(req.params.id), 10);
      const strippedBody = stripContactFields(req.body);
      const partial = insertAdvogadoSchema.partial().safeParse(strippedBody);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const lawyer = await storage.updateLawyer(id, partial.data);
      if (!lawyer) {
        res.status(404).json({ message: "Lawyer not found" });
        return;
      }
      await updateOrCreateContactForLawyer(id, req.body);
      await aggregationCache.invalidate('lawyers-with-lawsuits');
      res.json(lawyer);
    } catch (error) {
      logger.error("updating lawyer", error as Error);
      res.status(500).json({ message: "Failed to update lawyer" });
    }
  });

  app.delete("/api/todos-advogados-infos/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(getParam(req.params.id), 10);
      const deleted = await storage.deleteLawyer(id);
      if (!deleted) {
        res.status(404).json({ message: "Lawyer not found" });
        return;
      }
      await aggregationCache.invalidate('lawyers-with-lawsuits');
      res.status(204).send();
    } catch (error) {
      logger.error("deleting lawyer", error as Error);
      res.status(500).json({ message: "Failed to delete lawyer" });
    }
  });

  app.post("/api/lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertProcessoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const { processo, lead } = await storage.createLawsuitWithLead(parsed.data, userId);
      wsManager.broadcastLeadCreated(lead);
      res.status(201).json({ processo, lead });
    } catch (error) {
      logger.error("creating lawsuit with lead", error as Error);
      res.status(500).json({ message: "Failed to create lawsuit" });
    }
  });

  // Law Firms (Escritórios)
  app.get("/api/law-firms", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawFirms = await storage.getAllLawFirms();
      res.json(lawFirms);
    } catch (error) {
      logger.error("fetching law firms", error as Error);
      res.status(500).json({ message: "Failed to fetch law firms" });
    }
  });

  app.get("/api/law-firms/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawFirm = await storage.getLawFirm(getParam(req.params.id));
      if (!lawFirm) {
        res.status(404).json({ message: "Law firm not found" });
        return;
      }
      res.json(lawFirm);
    } catch (error) {
      logger.error("fetching law firm", error as Error);
      res.status(500).json({ message: "Failed to fetch law firm" });
    }
  });

  app.post("/api/law-firms", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const strippedBody = stripContactFields(req.body);
      const parsed = insertEscritorioSchema.safeParse(strippedBody);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lawFirm = await storage.createLawFirm(parsed.data);
      const contactId = await extractAndCreateContact(req.body);
      if (contactId) {
        await db.insert(escritorioContatos).values({ escritorioId: lawFirm.id, contatoId: contactId });
      }
      await aggregationCache.invalidate('law-firms-with-lawsuits');
      res.status(201).json(lawFirm);
    } catch (error) {
      logger.error("creating law firm", error as Error);
      res.status(500).json({ message: "Failed to create law firm" });
    }
  });

  app.patch("/api/law-firms/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const strippedBody = stripContactFields(req.body);
      const partial = insertEscritorioSchema.partial().safeParse(strippedBody);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const firmId = getParam(req.params.id);
      const lawFirm = await storage.updateLawFirm(firmId, partial.data);
      if (!lawFirm) {
        res.status(404).json({ message: "Law firm not found" });
        return;
      }
      await updateOrCreateContactForFirm(firmId, req.body);
      await aggregationCache.invalidate('law-firms-with-lawsuits');
      res.json(lawFirm);
    } catch (error) {
      logger.error("updating law firm", error as Error);
      res.status(500).json({ message: "Failed to update law firm" });
    }
  });

  app.delete("/api/law-firms/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteLawFirm(getParam(req.params.id));
      if (!deleted) {
        res.status(404).json({ message: "Law firm not found" });
        return;
      }
      await aggregationCache.invalidate('law-firms-with-lawsuits');
      res.status(204).send();
    } catch (error) {
      logger.error("deleting law firm", error as Error);
      res.status(500).json({ message: "Failed to delete law firm" });
    }
  });

  // Law Firm Lawyers N:N
  const addLawyerToFirmSchema = z.object({ lawyerId: z.number().int().positive() });

  app.get("/api/law-firms/:id/lawyers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawFirm = await storage.getLawFirm(getParam(req.params.id));
      if (!lawFirm) {
        res.status(404).json({ message: "Law firm not found" });
        return;
      }
      const lawyers = await storage.getLawFirmLawyers(getParam(req.params.id));
      res.json(lawyers);
    } catch (error) {
      logger.error("fetching law firm lawyers", error as Error);
      res.status(500).json({ message: "Failed to fetch law firm lawyers" });
    }
  });

  app.post("/api/law-firms/:id/lawyers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawFirm = await storage.getLawFirm(getParam(req.params.id));
      if (!lawFirm) {
        res.status(404).json({ message: "Law firm not found" });
        return;
      }
      const parsed = addLawyerToFirmSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const relation = await storage.addLawyerToLawFirm(getParam(req.params.id), parsed.data.lawyerId);
      res.status(201).json(relation);
    } catch (error) {
      logger.error("adding lawyer to law firm", error as Error);
      res.status(500).json({ message: "Failed to add lawyer to law firm" });
    }
  });

  app.delete("/api/law-firms/:id/lawyers/:lawyerId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawFirm = await storage.getLawFirm(getParam(req.params.id));
      if (!lawFirm) {
        res.status(404).json({ message: "Law firm not found" });
        return;
      }
      const lawyerId = parseInt(getParam(req.params.lawyerId), 10);
      const deleted = await storage.removeLawyerFromLawFirm(getParam(req.params.id), lawyerId);
      if (!deleted) {
        res.status(404).json({ message: "Relation not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      logger.error("removing lawyer from law firm", error as Error);
      res.status(500).json({ message: "Failed to remove lawyer from law firm" });
    }
  });

  // Backward compatibility: /api/escritorios
  app.get("/api/escritorios", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawFirms = await storage.getAllLawFirms();
      res.json(lawFirms);
    } catch (error) {
      logger.error("fetching law firms", error as Error);
      res.status(500).json({ message: "Failed to fetch law firms" });
    }
  });

  app.get("/api/escritorios/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawFirm = await storage.getLawFirm(getParam(req.params.id));
      if (!lawFirm) {
        res.status(404).json({ message: "Law firm not found" });
        return;
      }
      res.json(lawFirm);
    } catch (error) {
      logger.error("fetching law firm", error as Error);
      res.status(500).json({ message: "Failed to fetch law firm" });
    }
  });

  app.post("/api/escritorios", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const strippedBody = stripContactFields(req.body);
      const parsed = insertEscritorioSchema.safeParse(strippedBody);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lawFirm = await storage.createLawFirm(parsed.data);
      const contactId = await extractAndCreateContact(req.body);
      if (contactId) {
        await db.insert(escritorioContatos).values({ escritorioId: lawFirm.id, contatoId: contactId });
      }
      await aggregationCache.invalidate('law-firms-with-lawsuits');
      res.status(201).json(lawFirm);
    } catch (error) {
      logger.error("creating law firm", error as Error);
      res.status(500).json({ message: "Failed to create law firm" });
    }
  });

  app.patch("/api/escritorios/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const strippedBody = stripContactFields(req.body);
      const partial = insertEscritorioSchema.partial().safeParse(strippedBody);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const firmId = getParam(req.params.id);
      const lawFirm = await storage.updateLawFirm(firmId, partial.data);
      if (!lawFirm) {
        res.status(404).json({ message: "Law firm not found" });
        return;
      }
      await updateOrCreateContactForFirm(firmId, req.body);
      await aggregationCache.invalidate('law-firms-with-lawsuits');
      res.json(lawFirm);
    } catch (error) {
      logger.error("updating law firm", error as Error);
      res.status(500).json({ message: "Failed to update law firm" });
    }
  });

  app.delete("/api/escritorios/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteLawFirm(getParam(req.params.id));
      if (!deleted) {
        res.status(404).json({ message: "Law firm not found" });
        return;
      }
      await aggregationCache.invalidate('law-firms-with-lawsuits');
      res.status(204).send();
    } catch (error) {
      logger.error("deleting law firm", error as Error);
      res.status(500).json({ message: "Failed to delete law firm" });
    }
  });

  // Claimants (Reclamantes)
  app.get("/api/claimants", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const claimants = await storage.getAllClaimants();
      res.json(claimants);
    } catch (error) {
      logger.error("fetching claimants", error as Error);
      res.status(500).json({ message: "Failed to fetch claimants" });
    }
  });

  app.get("/api/claimants/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const claimant = await storage.getClaimant(getParam(req.params.id));
      if (!claimant) {
        res.status(404).json({ message: "Claimant not found" });
        return;
      }
      res.json(claimant);
    } catch (error) {
      logger.error("fetching claimant", error as Error);
      res.status(500).json({ message: "Failed to fetch claimant" });
    }
  });

  app.post("/api/claimants", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const strippedBody = stripContactFields(req.body);
      const parsed = insertReclamanteSchema.safeParse(strippedBody);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const claimant = await storage.createClaimant(parsed.data);
      const contactId = await extractAndCreateContact(req.body);
      if (contactId) {
        await db.insert(reclamanteContatos).values({ reclamanteId: claimant.id, contatoId: contactId });
      }
      await aggregationCache.invalidate('claimants-with-lawsuits');
      res.status(201).json(claimant);
    } catch (error) {
      logger.error("creating claimant", error as Error);
      res.status(500).json({ message: "Failed to create claimant" });
    }
  });

  app.patch("/api/claimants/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const strippedBody = stripContactFields(req.body);
      const partial = insertReclamanteSchema.partial().safeParse(strippedBody);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const claimantId = getParam(req.params.id);
      const claimant = await storage.updateClaimant(claimantId, partial.data);
      if (!claimant) {
        res.status(404).json({ message: "Claimant not found" });
        return;
      }
      await updateOrCreateContactForClaimant(claimantId, req.body);
      await aggregationCache.invalidate('claimants-with-lawsuits');
      res.json(claimant);
    } catch (error) {
      logger.error("updating claimant", error as Error);
      res.status(500).json({ message: "Failed to update claimant" });
    }
  });

  app.delete("/api/claimants/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteClaimant(getParam(req.params.id));
      if (!deleted) {
        res.status(404).json({ message: "Claimant not found" });
        return;
      }
      await aggregationCache.invalidate('claimants-with-lawsuits');
      res.status(204).send();
    } catch (error) {
      logger.error("deleting claimant", error as Error);
      res.status(500).json({ message: "Failed to delete claimant" });
    }
  });

  // Backward compatibility: /api/reclamantes
  app.get("/api/reclamantes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const claimants = await storage.getAllClaimants();
      res.json(claimants);
    } catch (error) {
      logger.error("fetching claimants", error as Error);
      res.status(500).json({ message: "Failed to fetch claimants" });
    }
  });

  app.get("/api/reclamantes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const claimant = await storage.getClaimant(getParam(req.params.id));
      if (!claimant) {
        res.status(404).json({ message: "Claimant not found" });
        return;
      }
      res.json(claimant);
    } catch (error) {
      logger.error("fetching claimant", error as Error);
      res.status(500).json({ message: "Failed to fetch claimant" });
    }
  });

  app.post("/api/reclamantes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const strippedBody = stripContactFields(req.body);
      const parsed = insertReclamanteSchema.safeParse(strippedBody);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const claimant = await storage.createClaimant(parsed.data);
      const contactId = await extractAndCreateContact(req.body);
      if (contactId) {
        await db.insert(reclamanteContatos).values({ reclamanteId: claimant.id, contatoId: contactId });
      }
      await aggregationCache.invalidate('claimants-with-lawsuits');
      res.status(201).json(claimant);
    } catch (error) {
      logger.error("creating claimant", error as Error);
      res.status(500).json({ message: "Failed to create claimant" });
    }
  });

  app.patch("/api/reclamantes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const strippedBody = stripContactFields(req.body);
      const partial = insertReclamanteSchema.partial().safeParse(strippedBody);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const claimantId = getParam(req.params.id);
      const claimant = await storage.updateClaimant(claimantId, partial.data);
      if (!claimant) {
        res.status(404).json({ message: "Claimant not found" });
        return;
      }
      await updateOrCreateContactForClaimant(claimantId, req.body);
      await aggregationCache.invalidate('claimants-with-lawsuits');
      res.json(claimant);
    } catch (error) {
      logger.error("updating claimant", error as Error);
      res.status(500).json({ message: "Failed to update claimant" });
    }
  });

  app.delete("/api/reclamantes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteClaimant(getParam(req.params.id));
      if (!deleted) {
        res.status(404).json({ message: "Claimant not found" });
        return;
      }
      await aggregationCache.invalidate('claimants-with-lawsuits');
      res.status(204).send();
    } catch (error) {
      logger.error("deleting claimant", error as Error);
      res.status(500).json({ message: "Failed to delete claimant" });
    }
  });

  // Sync Lawsuits from external API
  app.post("/api/sync-lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const result = await storage.syncLawsuitsFromApi(userId);
      // Invalidate all aggregation caches after sync
      await aggregationCache.invalidate();
      res.json(result);
    } catch (error) {
      logger.error("syncing lawsuits", error as Error);
      res.status(500).json({ message: "Failed to sync lawsuits", error: String(error) });
    }
  });

  // === Lawsuit Links API (N:N) ===
  
  // Get lawsuits by lawyer
  app.get("/api/lawyers/:id/lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawyerId = parseInt(req.params.id as string);
      const lawsuitsData = await storage.getLawsuitsByLawyer(lawyerId);
      res.json(lawsuitsData);
    } catch (error) {
      logger.error("fetching lawyer lawsuits", error as Error);
      res.status(500).json({ message: "Failed to fetch lawyer lawsuits" });
    }
  });

  // Get lawsuits by claimant
  app.get("/api/claimants/:id/lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitsData = await storage.getLawsuitsByClaimant(req.params.id as string);
      res.json(lawsuitsData);
    } catch (error) {
      logger.error("fetching claimant lawsuits", error as Error);
      res.status(500).json({ message: "Failed to fetch claimant lawsuits" });
    }
  });

  // Get lawsuits by law firm
  app.get("/api/law-firms/:id/lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitsData = await storage.getLawsuitsByLawFirm(req.params.id as string);
      res.json(lawsuitsData);
    } catch (error) {
      logger.error("fetching law firm lawsuits", error as Error);
      res.status(500).json({ message: "Failed to fetch law firm lawsuits" });
    }
  });

  // Link lawyer to lawsuit
  app.post("/api/lawsuits/:lawsuitId/lawyers/:lawyerId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitId = req.params.lawsuitId as string;
      const lawyerId = parseInt(req.params.lawyerId as string);
      const link = await storage.addLawyerToLawsuit(lawsuitId, lawyerId);
      await aggregationCache.invalidate('lawyers-with-lawsuits');
      res.status(201).json(link);
    } catch (error) {
      logger.error("linking lawyer to lawsuit", error as Error);
      res.status(500).json({ message: "Failed to link lawyer to lawsuit" });
    }
  });

  // Unlink lawyer from lawsuit
  app.delete("/api/lawsuits/:lawsuitId/lawyers/:lawyerId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitId = req.params.lawsuitId as string;
      const lawyerId = parseInt(req.params.lawyerId as string);
      const removed = await storage.removeLawyerFromLawsuit(lawsuitId, lawyerId);
      await aggregationCache.invalidate('lawyers-with-lawsuits');
      res.json({ removed });
    } catch (error) {
      logger.error("unlinking lawyer from lawsuit", error as Error);
      res.status(500).json({ message: "Failed to unlink lawyer from lawsuit" });
    }
  });

  // Link claimant to lawsuit
  app.post("/api/lawsuits/:lawsuitId/claimants/:claimantId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitId = req.params.lawsuitId as string;
      const claimantId = req.params.claimantId as string;
      const link = await storage.addClaimantToLawsuit(lawsuitId, claimantId);
      await aggregationCache.invalidate('claimants-with-lawsuits');
      res.status(201).json(link);
    } catch (error) {
      logger.error("linking claimant to lawsuit", error as Error);
      res.status(500).json({ message: "Failed to link claimant to lawsuit" });
    }
  });

  // Unlink claimant from lawsuit
  app.delete("/api/lawsuits/:lawsuitId/claimants/:claimantId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitId = req.params.lawsuitId as string;
      const claimantId = req.params.claimantId as string;
      const removed = await storage.removeClaimantFromLawsuit(lawsuitId, claimantId);
      await aggregationCache.invalidate('claimants-with-lawsuits');
      res.json({ removed });
    } catch (error) {
      logger.error("unlinking claimant from lawsuit", error as Error);
      res.status(500).json({ message: "Failed to unlink claimant from lawsuit" });
    }
  });

  // === Aggregated data for pipeline (entities with their lawsuits) ===
  
  // Get lawyers with their linked lawsuits (aggregated for pipeline cards) - CACHED
  app.get("/api/lawyers-with-lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const cacheKey = 'lawyers-with-lawsuits';
      
      // Try cache first (dados públicos - cache global via Redis)
      const cached = await aggregationCache.get<(Advogado & { lawsuits: Processo[] })[]>(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const lawyersWithLawsuits = await storage.getLawyersWithLawsuits();
      await aggregationCache.set(cacheKey, lawyersWithLawsuits);
      res.json(lawyersWithLawsuits);
    } catch (error) {
      logger.error("fetching lawyers with lawsuits", error as Error);
      res.status(500).json({ message: "Failed to fetch lawyers with lawsuits" });
    }
  });

  // Get claimants with their linked lawsuits (aggregated for pipeline cards) - CACHED
  app.get("/api/claimants-with-lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const cacheKey = 'claimants-with-lawsuits';
      
      // Try cache first (dados públicos - cache global via Redis)
      const cached = await aggregationCache.get<(Reclamante & { lawsuits: Processo[] })[]>(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const claimantsWithLawsuits = await storage.getClaimantsWithLawsuits();
      await aggregationCache.set(cacheKey, claimantsWithLawsuits);
      res.json(claimantsWithLawsuits);
    } catch (error) {
      logger.error("fetching claimants with lawsuits", error as Error);
      res.status(500).json({ message: "Failed to fetch claimants with lawsuits" });
    }
  });

  // Get law firms with their linked lawsuits (aggregated for pipeline cards) - CACHED
  app.get("/api/law-firms-with-lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const cacheKey = 'law-firms-with-lawsuits';
      
      // Try cache first (dados públicos - cache global via Redis)
      const cached = await aggregationCache.get<(Escritorio & { lawsuits: Processo[] })[]>(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const lawFirmsWithLawsuits = await storage.getLawFirmsWithLawsuits();
      await aggregationCache.set(cacheKey, lawFirmsWithLawsuits);
      res.json(lawFirmsWithLawsuits);
    } catch (error) {
      logger.error("fetching law firms with lawsuits", error as Error);
      res.status(500).json({ message: "Failed to fetch law firms with lawsuits" });
    }
  });

  // Leads (com filtro de visibilidade por papel do usuário)
  app.get("/api/leads", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const pipelineType = req.query.pipelineType as string | undefined;
      const visibleUserIds = await storage.getVisibleUserIds(authReq.user!.id, authReq.user!.papel || 'funcionario');
      const leads = await storage.getLeads(pipelineType, visibleUserIds);
      res.json(leads);
    } catch (error) {
      logger.error("fetching leads", error as Error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lead = await storage.getLead(getParam(req.params.id));
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      res.json(lead);
    } catch (error) {
      logger.error("fetching lead", error as Error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertLeadSchema.safeParse({ ...req.body, usuarioId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lead = await storage.createLead(parsed.data);
      wsManager.broadcastLeadCreated(lead);
      res.status(201).json(lead);
    } catch (error) {
      logger.error("creating lead", error as Error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const partial = insertLeadSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const lead = await storage.updateLead(getParam(req.params.id), partial.data);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      wsManager.broadcastLeadUpdate(lead);
      res.json(lead);
    } catch (error) {
      logger.error("updating lead", error as Error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteLead(getParam(req.params.id));
      if (!deleted) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      wsManager.broadcastLeadDeleted(getParam(req.params.id));
      res.status(204).send();
    } catch (error) {
      logger.error("deleting lead", error as Error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Lead with full details (normalized data)
  app.get("/api/leads/:id/details", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lead = await storage.getLeadWithDetails(getParam(req.params.id));
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      res.json(lead);
    } catch (error) {
      logger.error("fetching lead details", error as Error);
      res.status(500).json({ message: "Failed to fetch lead details" });
    }
  });

  // Lead Financials (1:1)
  app.get("/api/leads/:id/financials", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const financials = await storage.getLeadFinancials(getParam(req.params.id));
      res.json(financials || {});
    } catch (error) {
      logger.error("fetching lead financials", error as Error);
      res.status(500).json({ message: "Failed to fetch lead financials" });
    }
  });

  app.put("/api/leads/:id/financials", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leadId = getParam(req.params.id);
      const lead = await storage.getLead(leadId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const parsed = insertLeadFinanceiroSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const financials = await storage.upsertLeadFinancials(leadId, parsed.data);
      res.json(financials);
    } catch (error) {
      logger.error("updating lead financials", error as Error);
      res.status(500).json({ message: "Failed to update lead financials" });
    }
  });

  // Lead Case Details (1:1)
  app.get("/api/leads/:id/case-details", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const caseDetails = await storage.getLeadCaseDetails(getParam(req.params.id));
      res.json(caseDetails || {});
    } catch (error) {
      logger.error("fetching lead case details", error as Error);
      res.status(500).json({ message: "Failed to fetch lead case details" });
    }
  });

  app.put("/api/leads/:id/case-details", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leadId = getParam(req.params.id);
      const lead = await storage.getLead(leadId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const parsed = insertLeadDetalhesCasoSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const caseDetails = await storage.upsertLeadCaseDetails(leadId, parsed.data);
      res.json(caseDetails);
    } catch (error) {
      logger.error("updating lead case details", error as Error);
      res.status(500).json({ message: "Failed to update lead case details" });
    }
  });

  // Lead Checklist (1:1)
  app.get("/api/leads/:id/checklist", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const checklist = await storage.getLeadChecklist(getParam(req.params.id));
      res.json(checklist || {});
    } catch (error) {
      logger.error("fetching lead checklist", error as Error);
      res.status(500).json({ message: "Failed to fetch lead checklist" });
    }
  });

  app.put("/api/leads/:id/checklist", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leadId = getParam(req.params.id);
      const lead = await storage.getLead(leadId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const parsed = insertLeadChecklistSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const checklist = await storage.upsertLeadChecklist(leadId, parsed.data);
      res.json(checklist);
    } catch (error) {
      logger.error("updating lead checklist", error as Error);
      res.status(500).json({ message: "Failed to update lead checklist" });
    }
  });

  // Lead Interactions
  app.get("/api/leads/:id/interactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lead = await storage.getLead(getParam(req.params.id));
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const interactions = await storage.getInteractions(getParam(req.params.id));
      res.json(interactions);
    } catch (error) {
      logger.error("fetching interactions", error as Error);
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  app.post("/api/leads/:id/interactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lead = await storage.getLead(getParam(req.params.id));
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const parsed = insertInteracaoSchema.safeParse({
        ...req.body,
        leadId: getParam(req.params.id),
        usuarioId: userId,
      });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const interaction = await storage.createInteraction(parsed.data);
      wsManager.broadcastInteractionCreated(interaction);
      res.status(201).json(interaction);
    } catch (error) {
      logger.error("creating interaction", error as Error);
      res.status(500).json({ message: "Failed to create interaction" });
    }
  });

  app.delete("/api/interactions/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteInteraction(getParam(req.params.id));
      if (!deleted) {
        res.status(404).json({ message: "Interaction not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      logger.error("deleting interaction", error as Error);
      res.status(500).json({ message: "Failed to delete interaction" });
    }
  });

  // Products
  app.get("/api/products", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      logger.error("fetching products", error as Error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const product = await storage.getProduct(getParam(req.params.id));
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }
      res.json(product);
    } catch (error) {
      logger.error("fetching product", error as Error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const parsed = insertProdutoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const product = await storage.createProduct(parsed.data);
      res.status(201).json(product);
    } catch (error) {
      logger.error("creating product", error as Error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const partial = insertProdutoSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const product = await storage.updateProduct(getParam(req.params.id), partial.data);
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }
      res.json(product);
    } catch (error) {
      logger.error("updating product", error as Error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteProduct(getParam(req.params.id));
      if (!deleted) {
        res.status(404).json({ message: "Product not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      logger.error("deleting product", error as Error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Activities
  app.get("/api/activities", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const activities = await storage.getActivities();
      res.json(activities);
    } catch (error) {
      logger.error("fetching activities", error as Error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.get("/api/activities/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const activity = await storage.getActivity(getParam(req.params.id));
      if (!activity) {
        res.status(404).json({ message: "Activity not found" });
        return;
      }
      res.json(activity);
    } catch (error) {
      logger.error("fetching activity", error as Error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.post("/api/activities", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const body = { ...req.body };
      if (body.dataVencimento && typeof body.dataVencimento === "string") {
        body.dataVencimento = new Date(body.dataVencimento);
      }
      if (body.concluidoEm && typeof body.concluidoEm === "string") {
        body.concluidoEm = new Date(body.concluidoEm);
      }
      const parsed = insertAtividadeSchema.safeParse(body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const activity = await storage.createActivity(parsed.data);
      res.status(201).json(activity);
    } catch (error) {
      logger.error("creating activity", error as Error);
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  app.patch("/api/activities/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const body = { ...req.body };
      if (body.dataVencimento && typeof body.dataVencimento === "string") {
        body.dataVencimento = new Date(body.dataVencimento);
      }
      if (body.concluidoEm && typeof body.concluidoEm === "string") {
        body.concluidoEm = new Date(body.concluidoEm);
      }
      if (body.concluidoEm === null) {
        delete body.concluidoEm;
      }
      const partial = insertAtividadeSchema.partial().safeParse(body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const activity = await storage.updateActivity(getParam(req.params.id), partial.data);
      if (!activity) {
        res.status(404).json({ message: "Activity not found" });
        return;
      }
      res.json(activity);
    } catch (error) {
      logger.error("updating activity", error as Error);
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  app.delete("/api/activities/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteActivity(getParam(req.params.id));
      if (!deleted) {
        res.status(404).json({ message: "Activity not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      logger.error("deleting activity", error as Error);
      res.status(500).json({ message: "Failed to delete activity" });
    }
  });

  // Proposals
  app.get("/api/proposals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const proposals = await storage.getProposals();
      res.json(proposals);
    } catch (error) {
      logger.error("fetching proposals", error as Error);
      res.status(500).json({ message: "Failed to fetch proposals" });
    }
  });

  app.get("/api/proposals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const proposal = await storage.getProposal(getParam(req.params.id));
      if (!proposal) {
        res.status(404).json({ message: "Proposal not found" });
        return;
      }
      res.json(proposal);
    } catch (error) {
      logger.error("fetching proposal", error as Error);
      res.status(500).json({ message: "Failed to fetch proposal" });
    }
  });

  app.post("/api/proposals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertPropostaSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const proposal = await storage.createProposal(parsed.data);
      res.status(201).json(proposal);
    } catch (error) {
      logger.error("creating proposal", error as Error);
      res.status(500).json({ message: "Failed to create proposal" });
    }
  });

  app.patch("/api/proposals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertPropostaSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const proposal = await storage.updateProposal(getParam(req.params.id), partial.data);
      if (!proposal) {
        res.status(404).json({ message: "Proposal not found" });
        return;
      }
      res.json(proposal);
    } catch (error) {
      logger.error("updating proposal", error as Error);
      res.status(500).json({ message: "Failed to update proposal" });
    }
  });

  app.delete("/api/proposals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteProposal(getParam(req.params.id));
      if (!deleted) {
        res.status(404).json({ message: "Proposal not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      logger.error("deleting proposal", error as Error);
      res.status(500).json({ message: "Failed to delete proposal" });
    }
  });

  // Proposal Items
  app.get("/api/proposals/:id/items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const proposal = await storage.getProposal(getParam(req.params.id));
      if (!proposal) {
        res.status(404).json({ message: "Proposal not found" });
        return;
      }
      const items = await storage.getProposalItems(getParam(req.params.id));
      res.json(items);
    } catch (error) {
      logger.error("fetching proposal items", error as Error);
      res.status(500).json({ message: "Failed to fetch proposal items" });
    }
  });

  app.post("/api/proposals/:id/items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const proposal = await storage.getProposal(getParam(req.params.id));
      if (!proposal) {
        res.status(404).json({ message: "Proposal not found" });
        return;
      }
      const parsed = insertPropostaItemSchema.safeParse({
        ...req.body,
        propostaId: getParam(req.params.id),
      });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const item = await storage.createProposalItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      logger.error("creating proposal item", error as Error);
      res.status(500).json({ message: "Failed to create proposal item" });
    }
  });

  app.patch("/api/proposal-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const partial = insertPropostaItemSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const item = await storage.updateProposalItem(getParam(req.params.id), partial.data);
      if (!item) {
        res.status(404).json({ message: "Proposal item not found" });
        return;
      }
      res.json(item);
    } catch (error) {
      logger.error("updating proposal item", error as Error);
      res.status(500).json({ message: "Failed to update proposal item" });
    }
  });

  app.delete("/api/proposal-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteProposalItem(getParam(req.params.id));
      res.status(204).send();
    } catch (error) {
      logger.error("deleting proposal item", error as Error);
      res.status(500).json({ message: "Failed to delete proposal item" });
    }
  });

  // Users list (for internal use)
  app.get("/api/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      logger.error("fetching users", error as Error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (authReq.user!.papel !== 'admin') {
        res.status(403).json({ message: "Apenas administradores podem criar usuários" });
        return;
      }
      const { nome, email, senha } = req.body;
      if (!nome || !email || !senha) {
        res.status(400).json({ message: "Nome, email e senha são obrigatórios" });
        return;
      }
      const hashedPassword = await bcrypt.hash(senha, 10);
      const newUser = await storage.createUser({ name: nome, email, password: hashedPassword });
      res.status(201).json(newUser);
    } catch (error: any) {
      if (error?.message?.includes("duplicate") || error?.code === "23505") {
        res.status(400).json({ message: "Email já cadastrado" });
        return;
      }
      logger.error("creating user", error as Error);
      res.status(500).json({ message: "Falha ao criar usuário" });
    }
  });

  // Update user role (admin only)
  app.patch("/api/users/:id/role", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (authReq.user!.papel !== 'admin') {
        res.status(403).json({ message: "Apenas administradores podem alterar papéis" });
        return;
      }
      const { papel } = req.body;
      if (!['admin', 'coordenador', 'funcionario'].includes(papel)) {
        res.status(400).json({ message: "Papel inválido" });
        return;
      }
      const success = await storage.updateUserRole(getParam(req.params.id), papel);
      if (!success) {
        res.status(404).json({ message: "Usuário não encontrado" });
        return;
      }
      res.json({ message: "Papel atualizado com sucesso" });
    } catch (error) {
      logger.error("updating user role", error as Error);
      res.status(500).json({ message: "Falha ao atualizar papel" });
    }
  });

  // Teams (Equipes) CRUD
  app.get("/api/teams", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      logger.error("fetching teams", error as Error);
      res.status(500).json({ message: "Falha ao buscar equipes" });
    }
  });

  app.get("/api/teams/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const team = await storage.getTeam(getParam(req.params.id));
      if (!team) {
        res.status(404).json({ message: "Equipe não encontrada" });
        return;
      }
      res.json(team);
    } catch (error) {
      logger.error("fetching team", error as Error);
      res.status(500).json({ message: "Falha ao buscar equipe" });
    }
  });

  app.post("/api/teams", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (authReq.user!.papel !== 'admin') {
        res.status(403).json({ message: "Apenas administradores podem criar equipes" });
        return;
      }
      const { coordenadorIds, ...teamData } = req.body;
      const parsed = insertEquipeSchema.safeParse(teamData);
      if (!parsed.success) {
        res.status(400).json({ message: "Dados inválidos", errors: parsed.error.errors });
        return;
      }
      const team = await storage.createTeam(parsed.data);
      if (coordenadorIds && Array.isArray(coordenadorIds)) {
        for (const coordId of coordenadorIds) {
          await storage.addTeamMember(team.id, coordId, 'coordenador');
        }
      }
      const fullTeam = await storage.getTeam(team.id);
      res.status(201).json(fullTeam);
    } catch (error) {
      logger.error("creating team", error as Error);
      res.status(500).json({ message: "Falha ao criar equipe" });
    }
  });

  app.patch("/api/teams/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (authReq.user!.papel !== 'admin') {
        res.status(403).json({ message: "Apenas administradores podem editar equipes" });
        return;
      }
      const teamId = getParam(req.params.id);
      const { coordenadorIds, ...teamData } = req.body;
      if (Object.keys(teamData).length > 0) {
        const team = await storage.updateTeam(teamId, teamData);
        if (!team) {
          res.status(404).json({ message: "Equipe não encontrada" });
          return;
        }
      }
      if (coordenadorIds && Array.isArray(coordenadorIds)) {
        const existingTeam = await storage.getTeam(teamId);
        if (!existingTeam) {
          res.status(404).json({ message: "Equipe não encontrada" });
          return;
        }
        const existingCoordIds = (existingTeam.coordenadores || []).map(c => c.id);
        for (const oldCoordId of existingCoordIds) {
          if (!coordenadorIds.includes(oldCoordId)) {
            await storage.removeTeamMember(teamId, oldCoordId);
          }
        }
        for (const newCoordId of coordenadorIds) {
          if (!existingCoordIds.includes(newCoordId)) {
            await storage.addTeamMember(teamId, newCoordId, 'coordenador');
          }
        }
      }
      const fullTeam = await storage.getTeam(teamId);
      res.json(fullTeam);
    } catch (error) {
      logger.error("updating team", error as Error);
      res.status(500).json({ message: "Falha ao atualizar equipe" });
    }
  });

  app.delete("/api/teams/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (authReq.user!.papel !== 'admin') {
        res.status(403).json({ message: "Apenas administradores podem excluir equipes" });
        return;
      }
      const success = await storage.deleteTeam(getParam(req.params.id));
      if (!success) {
        res.status(404).json({ message: "Equipe não encontrada" });
        return;
      }
      res.json({ message: "Equipe excluída com sucesso" });
    } catch (error) {
      logger.error("deleting team", error as Error);
      res.status(500).json({ message: "Falha ao excluir equipe" });
    }
  });

  app.post("/api/teams/:id/members", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (authReq.user!.papel !== 'admin') {
        res.status(403).json({ message: "Apenas administradores podem gerenciar membros" });
        return;
      }
      const { usuarioId, papel } = req.body;
      if (!usuarioId) {
        res.status(400).json({ message: "usuarioId é obrigatório" });
        return;
      }
      const member = await storage.addTeamMember(getParam(req.params.id), usuarioId, papel || 'membro');
      res.status(201).json(member);
    } catch (error: any) {
      if (error.code === '23505') {
        res.status(409).json({ message: "Usuário já é membro desta equipe" });
        return;
      }
      logger.error("adding team member", error as Error);
      res.status(500).json({ message: "Falha ao adicionar membro" });
    }
  });

  app.delete("/api/teams/:id/members/:usuarioId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (authReq.user!.papel !== 'admin') {
        res.status(403).json({ message: "Apenas administradores podem gerenciar membros" });
        return;
      }
      const success = await storage.removeTeamMember(getParam(req.params.id), getParam(req.params.usuarioId));
      if (!success) {
        res.status(404).json({ message: "Membro não encontrado" });
        return;
      }
      res.json({ message: "Membro removido com sucesso" });
    } catch (error) {
      logger.error("removing team member", error as Error);
      res.status(500).json({ message: "Falha ao remover membro" });
    }
  });

  // Calendar routes (Microsoft Outlook integration with per-user OAuth)
  app.get("/api/calendar/config", isAuthenticated, async (req: Request, res: Response) => {
    const config = getOAuthConfig();
    res.json({ configured: config.configured });
  });

  app.get("/api/calendar/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        return res.json({ connected: false });
      }
      const connected = await checkOutlookConnection(userId);
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  app.get("/api/calendar/authorize", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const crypto = await import("crypto");
      const timestamp = Date.now();
      const secret = process.env.JWT_SECRET || "hermes-crm-secret";
      const data = JSON.stringify({ userId, timestamp });
      const signature = crypto.createHmac("sha256", secret).update(data).digest("hex");
      const state = Buffer.from(JSON.stringify({ userId, timestamp, signature })).toString("base64");
      const authUrl = getAuthorizationUrl(state);
      res.json({ authUrl });
    } catch (error) {
      logger.error("getting calendar authorize url", error as Error);
      res.status(500).json({ message: "Falha ao gerar URL de autorização" });
    }
  });

  app.get("/api/calendar/callback", async (req: Request, res: Response) => {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        logger.error("OAuth callback error: " + error);
        return res.redirect("/calendario?error=auth_denied");
      }
      
      if (!code || !state) {
        return res.redirect("/calendario?error=missing_params");
      }
      
      const stateData = JSON.parse(Buffer.from(state as string, "base64").toString());
      const { userId, timestamp, signature } = stateData;
      
      if (!userId || !timestamp || !signature) {
        return res.redirect("/calendario?error=invalid_state");
      }
      
      const crypto = await import("crypto");
      const secret = process.env.JWT_SECRET || "hermes-crm-secret";
      const expectedSignature = crypto.createHmac("sha256", secret).update(JSON.stringify({ userId, timestamp })).digest("hex");
      
      if (signature !== expectedSignature) {
        logger.warn("Invalid OAuth state signature");
        return res.redirect("/calendario?error=invalid_state");
      }
      
      const stateAge = Date.now() - timestamp;
      if (stateAge > 10 * 60 * 1000) {
        logger.warn("OAuth state expired");
        return res.redirect("/calendario?error=state_expired");
      }
      
      const tokens = await exchangeCodeForTokens(code as string);
      await saveUserTokens(userId, tokens);
      
      logger.success("Calendário Microsoft conectado com sucesso", { prefix: "OAuth" });
      res.redirect("/calendario?success=connected");
    } catch (error) {
      logger.error("calendar oauth callback", error as Error);
      res.redirect("/calendario?error=auth_failed");
    }
  });

  app.post("/api/calendar/disconnect", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      await deleteUserTokens(userId);
      res.json({ success: true });
    } catch (error) {
      logger.error("disconnecting calendar", error as Error);
      res.status(500).json({ message: "Falha ao desconectar calendário" });
    }
  });

  app.get("/api/calendar/events", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const { startDate, endDate } = req.query;
      const events = await getCalendarEvents(
        userId,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(events);
    } catch (error: any) {
      logger.error("fetching calendar events", error as Error);
      if (error.message?.includes("não conectado") || error.message?.includes("reconecte")) {
        res.status(401).json({ message: error.message, needsReconnect: true });
      } else {
        res.status(500).json({ message: "Falha ao buscar eventos do calendário" });
      }
    }
  });

  app.post("/api/calendar/events", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const event = await createCalendarEvent(userId, req.body);
      res.status(201).json(event);
    } catch (error) {
      logger.error("creating calendar event", error as Error);
      res.status(500).json({ message: "Falha ao criar evento no calendário" });
    }
  });

  app.patch("/api/calendar/events/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const eventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const event = await updateCalendarEvent(userId, eventId, req.body);
      res.json(event);
    } catch (error) {
      logger.error("updating calendar event", error as Error);
      res.status(500).json({ message: "Falha ao atualizar evento no calendário" });
    }
  });

  app.delete("/api/calendar/events/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const eventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await deleteCalendarEvent(userId, eventId);
      res.status(204).send();
    } catch (error) {
      logger.error("deleting calendar event", error as Error);
      res.status(500).json({ message: "Falha ao excluir evento no calendário" });
    }
  });

  app.post("/api/assistant/chat", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        res.status(400).json({ message: "Mensagem é obrigatória" });
        return;
      }
      const response = await processAssistantMessage(message);
      res.json(response);
    } catch (error) {
      logger.error("assistant chat", error as Error);
      res.status(500).json({ message: "Erro ao processar mensagem do assistente" });
    }
  });

  return httpServer;
}
