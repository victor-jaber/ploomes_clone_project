import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { z } from "zod";
import Redis from "ioredis";
import { storage } from "./storage";
import { isAuthenticated, registerAuthRoutes, AuthRequest } from "./auth";
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
import {
  insertAdvogadoSchema,
  insertEscritorioSchema,
  insertReclamanteSchema,
  insertLeadSchema,
  insertLeadFinanceiroSchema,
  insertLeadDetalhesCasoSchema,
  insertLeadChecklistSchema,
  insertLeadResponsaveisSchema,
  insertProdutoSchema,
  insertAtividadeSchema,
  insertPropostaSchema,
  insertPropostaItemSchema,
  insertInteracaoSchema,
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  wsManager.initialize(httpServer);
  registerAuthRoutes(app);

  // Lawyers (Advogados)
  app.get("/api/lawyers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lawyers = await storage.getLawyers(userId);
      res.json(lawyers);
    } catch (error) {
      logger.error("fetching lawyers", error as Error);
      res.status(500).json({ message: "Failed to fetch lawyers" });
    }
  });

  app.get("/api/lawyers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const id = parseInt(getParam(req.params.id), 10);
      const lawyer = await storage.getLawyer(id, userId);
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
      const parsed = insertAdvogadoSchema.safeParse({ ...req.body, proprietarioId: userId, enviadoParaPipeline: true });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lawyer = await storage.createLawyer(parsed.data);
      await aggregationCache.invalidate('lawyers-with-lawsuits');
      
      const lead = await storage.createLead({
        titulo: lawyer.nome,
        tipoPipeline: 'advogados',
        etapa: 'novo_lead',
        valor: null,
        proprietarioId: userId,
        vendedorId: userId,
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
      const userId = (req as AuthRequest).user!.id;
      const id = parseInt(getParam(req.params.id), 10);
      const partial = insertAdvogadoSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const lawyer = await storage.updateLawyer(id, userId, partial.data);
      if (!lawyer) {
        res.status(404).json({ message: "Lawyer not found" });
        return;
      }
      await aggregationCache.invalidate('lawyers-with-lawsuits');
      res.json(lawyer);
    } catch (error) {
      logger.error("updating lawyer", error as Error);
      res.status(500).json({ message: "Failed to update lawyer" });
    }
  });

  app.delete("/api/lawyers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const id = parseInt(getParam(req.params.id), 10);
      const deleted = await storage.deleteLawyer(id, userId);
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
      const userId = (req as AuthRequest).user!.id;
      const lawyers = await storage.getLawyers(userId);
      res.json(lawyers);
    } catch (error) {
      logger.error("fetching lawyers", error as Error);
      res.status(500).json({ message: "Failed to fetch lawyers" });
    }
  });

  app.get("/api/todos-advogados-infos/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const id = parseInt(getParam(req.params.id), 10);
      const lawyer = await storage.getLawyer(id, userId);
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
      const parsed = insertAdvogadoSchema.safeParse({ ...req.body, proprietarioId: userId, enviadoParaPipeline: true });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lawyer = await storage.createLawyer(parsed.data);
      await aggregationCache.invalidate('lawyers-with-lawsuits');
      
      const lead = await storage.createLead({
        titulo: lawyer.nome,
        tipoPipeline: 'advogados',
        etapa: 'novo_lead',
        valor: null,
        proprietarioId: userId,
        vendedorId: userId,
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
      const partial = insertAdvogadoSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const lawyer = await storage.updateLawyer(id, userId, partial.data);
      if (!lawyer) {
        res.status(404).json({ message: "Lawyer not found" });
        return;
      }
      await aggregationCache.invalidate('lawyers-with-lawsuits');
      res.json(lawyer);
    } catch (error) {
      logger.error("updating lawyer", error as Error);
      res.status(500).json({ message: "Failed to update lawyer" });
    }
  });

  app.delete("/api/todos-advogados-infos/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const id = parseInt(getParam(req.params.id), 10);
      const deleted = await storage.deleteLawyer(id, userId);
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

  // Sync lawyers to leads
  app.post("/api/sync-advogados-to-leads", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const result = await storage.syncLawyersToLeads(userId);
      
      for (const lead of result.leads) {
        wsManager.broadcastLeadCreated(lead);
      }
      
      res.json({ synced: result.synced, skipped: result.skipped });
    } catch (error) {
      logger.error("syncing lawyers to leads", error as Error);
      res.status(500).json({ message: "Failed to sync lawyers to leads" });
    }
  });

  app.post("/api/sync-processos-to-leads", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const result = await storage.syncLawsuitsToLeads(userId);
      
      for (const lead of result.leads) {
        wsManager.broadcastLeadCreated(lead);
      }
      
      res.json({ synced: result.synced, skipped: result.skipped });
    } catch (error) {
      logger.error("syncing lawsuits to leads", error as Error);
      res.status(500).json({ message: "Failed to sync lawsuits to leads" });
    }
  });

  // Law Firms (Escritórios)
  app.get("/api/law-firms", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lawFirms = await storage.getLawFirms(userId);
      res.json(lawFirms);
    } catch (error) {
      logger.error("fetching law firms", error as Error);
      res.status(500).json({ message: "Failed to fetch law firms" });
    }
  });

  app.get("/api/law-firms/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lawFirm = await storage.getLawFirm(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertEscritorioSchema.safeParse({ ...req.body, proprietarioId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lawFirm = await storage.createLawFirm(parsed.data);
      await aggregationCache.invalidate('law-firms-with-lawsuits');
      res.status(201).json(lawFirm);
    } catch (error) {
      logger.error("creating law firm", error as Error);
      res.status(500).json({ message: "Failed to create law firm" });
    }
  });

  app.patch("/api/law-firms/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertEscritorioSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const lawFirm = await storage.updateLawFirm(getParam(req.params.id), userId, partial.data);
      if (!lawFirm) {
        res.status(404).json({ message: "Law firm not found" });
        return;
      }
      await aggregationCache.invalidate('law-firms-with-lawsuits');
      res.json(lawFirm);
    } catch (error) {
      logger.error("updating law firm", error as Error);
      res.status(500).json({ message: "Failed to update law firm" });
    }
  });

  app.delete("/api/law-firms/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteLawFirm(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const lawFirm = await storage.getLawFirm(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const lawFirm = await storage.getLawFirm(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const lawFirm = await storage.getLawFirm(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const lawFirms = await storage.getLawFirms(userId);
      res.json(lawFirms);
    } catch (error) {
      logger.error("fetching law firms", error as Error);
      res.status(500).json({ message: "Failed to fetch law firms" });
    }
  });

  app.get("/api/escritorios/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lawFirm = await storage.getLawFirm(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertEscritorioSchema.safeParse({ ...req.body, proprietarioId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lawFirm = await storage.createLawFirm(parsed.data);
      await aggregationCache.invalidate('law-firms-with-lawsuits');
      res.status(201).json(lawFirm);
    } catch (error) {
      logger.error("creating law firm", error as Error);
      res.status(500).json({ message: "Failed to create law firm" });
    }
  });

  app.patch("/api/escritorios/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertEscritorioSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const lawFirm = await storage.updateLawFirm(getParam(req.params.id), userId, partial.data);
      if (!lawFirm) {
        res.status(404).json({ message: "Law firm not found" });
        return;
      }
      await aggregationCache.invalidate('law-firms-with-lawsuits');
      res.json(lawFirm);
    } catch (error) {
      logger.error("updating law firm", error as Error);
      res.status(500).json({ message: "Failed to update law firm" });
    }
  });

  app.delete("/api/escritorios/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteLawFirm(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const claimants = await storage.getClaimants(userId);
      res.json(claimants);
    } catch (error) {
      logger.error("fetching claimants", error as Error);
      res.status(500).json({ message: "Failed to fetch claimants" });
    }
  });

  app.get("/api/claimants/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const claimant = await storage.getClaimant(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertReclamanteSchema.safeParse({ ...req.body, proprietarioId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const claimant = await storage.createClaimant(parsed.data);
      await aggregationCache.invalidate('claimants-with-lawsuits');
      res.status(201).json(claimant);
    } catch (error) {
      logger.error("creating claimant", error as Error);
      res.status(500).json({ message: "Failed to create claimant" });
    }
  });

  app.patch("/api/claimants/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertReclamanteSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const claimant = await storage.updateClaimant(getParam(req.params.id), userId, partial.data);
      if (!claimant) {
        res.status(404).json({ message: "Claimant not found" });
        return;
      }
      await aggregationCache.invalidate('claimants-with-lawsuits');
      res.json(claimant);
    } catch (error) {
      logger.error("updating claimant", error as Error);
      res.status(500).json({ message: "Failed to update claimant" });
    }
  });

  app.delete("/api/claimants/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteClaimant(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const claimants = await storage.getClaimants(userId);
      res.json(claimants);
    } catch (error) {
      logger.error("fetching claimants", error as Error);
      res.status(500).json({ message: "Failed to fetch claimants" });
    }
  });

  app.get("/api/reclamantes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const claimant = await storage.getClaimant(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertReclamanteSchema.safeParse({ ...req.body, proprietarioId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const claimant = await storage.createClaimant(parsed.data);
      await aggregationCache.invalidate('claimants-with-lawsuits');
      res.status(201).json(claimant);
    } catch (error) {
      logger.error("creating claimant", error as Error);
      res.status(500).json({ message: "Failed to create claimant" });
    }
  });

  app.patch("/api/reclamantes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertReclamanteSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const claimant = await storage.updateClaimant(getParam(req.params.id), userId, partial.data);
      if (!claimant) {
        res.status(404).json({ message: "Claimant not found" });
        return;
      }
      await aggregationCache.invalidate('claimants-with-lawsuits');
      res.json(claimant);
    } catch (error) {
      logger.error("updating claimant", error as Error);
      res.status(500).json({ message: "Failed to update claimant" });
    }
  });

  app.delete("/api/reclamantes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteClaimant(getParam(req.params.id), userId);
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

  // Sync claimants to leads
  app.post("/api/sync-reclamantes-to-leads", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const result = await storage.syncClaimantsToLeads(userId);
      
      for (const lead of result.leads) {
        wsManager.broadcastLeadCreated(lead);
      }
      
      res.json({ synced: result.synced, skipped: result.skipped });
    } catch (error) {
      logger.error("syncing claimants to leads", error as Error);
      res.status(500).json({ message: "Failed to sync claimants to leads" });
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

  // Leads (dados públicos - sem filtro por ownerId)
  app.get("/api/leads", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const pipelineType = req.query.pipelineType as string | undefined;
      const leads = await storage.getLeads(pipelineType);
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
      const parsed = insertLeadSchema.safeParse({ ...req.body, proprietarioId: userId, vendedorId: userId });
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

  // Lead Assignments (1:1)
  app.get("/api/leads/:id/assignments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const assignments = await storage.getLeadAssignments(getParam(req.params.id));
      res.json(assignments || {});
    } catch (error) {
      logger.error("fetching lead assignments", error as Error);
      res.status(500).json({ message: "Failed to fetch lead assignments" });
    }
  });

  app.put("/api/leads/:id/assignments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leadId = getParam(req.params.id);
      const lead = await storage.getLead(leadId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const parsed = insertLeadResponsaveisSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const assignments = await storage.upsertLeadAssignments(leadId, parsed.data);
      res.json(assignments);
    } catch (error) {
      logger.error("updating lead assignments", error as Error);
      res.status(500).json({ message: "Failed to update lead assignments" });
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
        vendedorId: userId,
        proprietarioId: userId,
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
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteInteraction(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const products = await storage.getProducts(userId);
      res.json(products);
    } catch (error) {
      logger.error("fetching products", error as Error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const product = await storage.getProduct(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertProdutoSchema.safeParse({ ...req.body, proprietarioId: userId });
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
      const userId = (req as AuthRequest).user!.id;
      const partial = insertProdutoSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const product = await storage.updateProduct(getParam(req.params.id), userId, partial.data);
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
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteProduct(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const activities = await storage.getActivities(userId);
      res.json(activities);
    } catch (error) {
      logger.error("fetching activities", error as Error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.get("/api/activities/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const activity = await storage.getActivity(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const body = { ...req.body, proprietarioId: userId };
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
      const activity = await storage.updateActivity(getParam(req.params.id), userId, partial.data);
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
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteActivity(getParam(req.params.id), userId);
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
      const userId = (req as AuthRequest).user!.id;
      const proposals = await storage.getProposals(userId);
      res.json(proposals);
    } catch (error) {
      logger.error("fetching proposals", error as Error);
      res.status(500).json({ message: "Failed to fetch proposals" });
    }
  });

  app.get("/api/proposals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const proposal = await storage.getProposal(getParam(req.params.id), userId);
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
      const parsed = insertPropostaSchema.safeParse({ ...req.body, proprietarioId: userId });
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
      const proposal = await storage.updateProposal(getParam(req.params.id), userId, partial.data);
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
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteProposal(getParam(req.params.id), userId);
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
      const proposal = await storage.getProposal(getParam(req.params.id), userId);
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
      const proposal = await storage.getProposal(getParam(req.params.id), userId);
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

  return httpServer;
}
