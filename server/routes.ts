import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { isAuthenticated, registerAuthRoutes, AuthRequest } from "./auth";
import { wsManager } from "./websocket";
import {
  insertLawyerSchema,
  insertLawFirmSchema,
  insertClaimantSchema,
  insertLeadSchema,
  insertProductSchema,
  insertActivitySchema,
  insertProposalSchema,
  insertProposalItemSchema,
  insertInteractionSchema,
  type Lead,
  type Lawyer,
  type LawFirm,
  type Claimant,
  type Lawsuit,
} from "@shared/schema";

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private ttl: number; // TTL in milliseconds

  constructor(ttlSeconds: number = 30) {
    this.ttl = ttlSeconds * 1000;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Cache for aggregated data (30 second TTL)
const aggregationCache = new SimpleCache(30);

// Backward compatibility aliases
const insertTodosAdvogadosInfosSchema = insertLawyerSchema;
const insertEscritorioSchema = insertLawFirmSchema;
const insertReclamanteSchema = insertClaimantSchema;
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
      console.error("Error fetching lawyers:", error);
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
      console.error("Error fetching lawyer:", error);
      res.status(500).json({ message: "Failed to fetch lawyer" });
    }
  });

  app.post("/api/lawyers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertLawyerSchema.safeParse({ ...req.body, ownerId: userId, enviadoParaPipeline: true });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lawyer = await storage.createLawyer(parsed.data);
      aggregationCache.invalidate('lawyers-with-lawsuits');
      
      const titulo = `${lawyer.nome} - ${lawyer.cpf || 'Sem CPF'}`;
      const lead = await storage.createLead({
        titulo,
        pipelineType: 'advogados',
        stage: 'novo_lead',
        valor: lawyer.valorCausa,
        ownerId: userId,
        vendedorId: userId,
      });
      wsManager.broadcastLeadCreated(lead);
      
      res.status(201).json(lawyer);
    } catch (error) {
      console.error("Error creating lawyer:", error);
      res.status(500).json({ message: "Failed to create lawyer" });
    }
  });

  app.patch("/api/lawyers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const id = parseInt(getParam(req.params.id), 10);
      const partial = insertLawyerSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const lawyer = await storage.updateLawyer(id, userId, partial.data);
      if (!lawyer) {
        res.status(404).json({ message: "Lawyer not found" });
        return;
      }
      aggregationCache.invalidate('lawyers-with-lawsuits');
      res.json(lawyer);
    } catch (error) {
      console.error("Error updating lawyer:", error);
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
      aggregationCache.invalidate('lawyers-with-lawsuits');
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lawyer:", error);
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
      console.error("Error fetching lawyers:", error);
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
      console.error("Error fetching lawyer:", error);
      res.status(500).json({ message: "Failed to fetch lawyer" });
    }
  });

  app.post("/api/todos-advogados-infos", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertLawyerSchema.safeParse({ ...req.body, ownerId: userId, enviadoParaPipeline: true });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lawyer = await storage.createLawyer(parsed.data);
      aggregationCache.invalidate('lawyers-with-lawsuits');
      
      const titulo = `${lawyer.nome} - ${lawyer.cpf || 'Sem CPF'}`;
      const lead = await storage.createLead({
        titulo,
        pipelineType: 'advogados',
        stage: 'novo_lead',
        valor: lawyer.valorCausa,
        ownerId: userId,
        vendedorId: userId,
      });
      wsManager.broadcastLeadCreated(lead);
      
      res.status(201).json(lawyer);
    } catch (error) {
      console.error("Error creating lawyer:", error);
      res.status(500).json({ message: "Failed to create lawyer" });
    }
  });

  app.patch("/api/todos-advogados-infos/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const id = parseInt(getParam(req.params.id), 10);
      const partial = insertLawyerSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const lawyer = await storage.updateLawyer(id, userId, partial.data);
      if (!lawyer) {
        res.status(404).json({ message: "Lawyer not found" });
        return;
      }
      aggregationCache.invalidate('lawyers-with-lawsuits');
      res.json(lawyer);
    } catch (error) {
      console.error("Error updating lawyer:", error);
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
      aggregationCache.invalidate('lawyers-with-lawsuits');
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lawyer:", error);
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
      console.error("Error syncing lawyers to leads:", error);
      res.status(500).json({ message: "Failed to sync lawyers to leads" });
    }
  });

  // Law Firms (Escritórios)
  app.get("/api/law-firms", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lawFirms = await storage.getLawFirms(userId);
      res.json(lawFirms);
    } catch (error) {
      console.error("Error fetching law firms:", error);
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
      console.error("Error fetching law firm:", error);
      res.status(500).json({ message: "Failed to fetch law firm" });
    }
  });

  app.post("/api/law-firms", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertLawFirmSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lawFirm = await storage.createLawFirm(parsed.data);
      aggregationCache.invalidate('law-firms-with-lawsuits');
      res.status(201).json(lawFirm);
    } catch (error) {
      console.error("Error creating law firm:", error);
      res.status(500).json({ message: "Failed to create law firm" });
    }
  });

  app.patch("/api/law-firms/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertLawFirmSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const lawFirm = await storage.updateLawFirm(getParam(req.params.id), userId, partial.data);
      if (!lawFirm) {
        res.status(404).json({ message: "Law firm not found" });
        return;
      }
      aggregationCache.invalidate('law-firms-with-lawsuits');
      res.json(lawFirm);
    } catch (error) {
      console.error("Error updating law firm:", error);
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
      aggregationCache.invalidate('law-firms-with-lawsuits');
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting law firm:", error);
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
      console.error("Error fetching law firm lawyers:", error);
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
      console.error("Error adding lawyer to law firm:", error);
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
      console.error("Error removing lawyer from law firm:", error);
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
      console.error("Error fetching law firms:", error);
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
      console.error("Error fetching law firm:", error);
      res.status(500).json({ message: "Failed to fetch law firm" });
    }
  });

  app.post("/api/escritorios", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertLawFirmSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lawFirm = await storage.createLawFirm(parsed.data);
      aggregationCache.invalidate('law-firms-with-lawsuits');
      res.status(201).json(lawFirm);
    } catch (error) {
      console.error("Error creating law firm:", error);
      res.status(500).json({ message: "Failed to create law firm" });
    }
  });

  app.patch("/api/escritorios/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertLawFirmSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const lawFirm = await storage.updateLawFirm(getParam(req.params.id), userId, partial.data);
      if (!lawFirm) {
        res.status(404).json({ message: "Law firm not found" });
        return;
      }
      aggregationCache.invalidate('law-firms-with-lawsuits');
      res.json(lawFirm);
    } catch (error) {
      console.error("Error updating law firm:", error);
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
      aggregationCache.invalidate('law-firms-with-lawsuits');
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting law firm:", error);
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
      console.error("Error fetching claimants:", error);
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
      console.error("Error fetching claimant:", error);
      res.status(500).json({ message: "Failed to fetch claimant" });
    }
  });

  app.post("/api/claimants", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertClaimantSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const claimant = await storage.createClaimant(parsed.data);
      aggregationCache.invalidate('claimants-with-lawsuits');
      res.status(201).json(claimant);
    } catch (error) {
      console.error("Error creating claimant:", error);
      res.status(500).json({ message: "Failed to create claimant" });
    }
  });

  app.patch("/api/claimants/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertClaimantSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const claimant = await storage.updateClaimant(getParam(req.params.id), userId, partial.data);
      if (!claimant) {
        res.status(404).json({ message: "Claimant not found" });
        return;
      }
      aggregationCache.invalidate('claimants-with-lawsuits');
      res.json(claimant);
    } catch (error) {
      console.error("Error updating claimant:", error);
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
      aggregationCache.invalidate('claimants-with-lawsuits');
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting claimant:", error);
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
      console.error("Error fetching claimants:", error);
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
      console.error("Error fetching claimant:", error);
      res.status(500).json({ message: "Failed to fetch claimant" });
    }
  });

  app.post("/api/reclamantes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertClaimantSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const claimant = await storage.createClaimant(parsed.data);
      aggregationCache.invalidate('claimants-with-lawsuits');
      res.status(201).json(claimant);
    } catch (error) {
      console.error("Error creating claimant:", error);
      res.status(500).json({ message: "Failed to create claimant" });
    }
  });

  app.patch("/api/reclamantes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertClaimantSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const claimant = await storage.updateClaimant(getParam(req.params.id), userId, partial.data);
      if (!claimant) {
        res.status(404).json({ message: "Claimant not found" });
        return;
      }
      aggregationCache.invalidate('claimants-with-lawsuits');
      res.json(claimant);
    } catch (error) {
      console.error("Error updating claimant:", error);
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
      aggregationCache.invalidate('claimants-with-lawsuits');
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting claimant:", error);
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
      console.error("Error syncing claimants to leads:", error);
      res.status(500).json({ message: "Failed to sync claimants to leads" });
    }
  });

  // Sync Lawsuits from external API
  app.post("/api/sync-lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const result = await storage.syncLawsuitsFromApi(userId);
      // Invalidate all aggregation caches after sync
      aggregationCache.invalidate();
      res.json(result);
    } catch (error) {
      console.error("Error syncing lawsuits:", error);
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
      console.error("Error fetching lawyer lawsuits:", error);
      res.status(500).json({ message: "Failed to fetch lawyer lawsuits" });
    }
  });

  // Get lawsuits by claimant
  app.get("/api/claimants/:id/lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitsData = await storage.getLawsuitsByClaimant(req.params.id as string);
      res.json(lawsuitsData);
    } catch (error) {
      console.error("Error fetching claimant lawsuits:", error);
      res.status(500).json({ message: "Failed to fetch claimant lawsuits" });
    }
  });

  // Get lawsuits by law firm
  app.get("/api/law-firms/:id/lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitsData = await storage.getLawsuitsByLawFirm(req.params.id as string);
      res.json(lawsuitsData);
    } catch (error) {
      console.error("Error fetching law firm lawsuits:", error);
      res.status(500).json({ message: "Failed to fetch law firm lawsuits" });
    }
  });

  // Link lawyer to lawsuit
  app.post("/api/lawsuits/:lawsuitId/lawyers/:lawyerId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitId = req.params.lawsuitId as string;
      const lawyerId = parseInt(req.params.lawyerId as string);
      const link = await storage.addLawyerToLawsuit(lawsuitId, lawyerId);
      aggregationCache.invalidate('lawyers-with-lawsuits');
      res.status(201).json(link);
    } catch (error) {
      console.error("Error linking lawyer to lawsuit:", error);
      res.status(500).json({ message: "Failed to link lawyer to lawsuit" });
    }
  });

  // Unlink lawyer from lawsuit
  app.delete("/api/lawsuits/:lawsuitId/lawyers/:lawyerId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitId = req.params.lawsuitId as string;
      const lawyerId = parseInt(req.params.lawyerId as string);
      const removed = await storage.removeLawyerFromLawsuit(lawsuitId, lawyerId);
      aggregationCache.invalidate('lawyers-with-lawsuits');
      res.json({ removed });
    } catch (error) {
      console.error("Error unlinking lawyer from lawsuit:", error);
      res.status(500).json({ message: "Failed to unlink lawyer from lawsuit" });
    }
  });

  // Link claimant to lawsuit
  app.post("/api/lawsuits/:lawsuitId/claimants/:claimantId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitId = req.params.lawsuitId as string;
      const claimantId = req.params.claimantId as string;
      const link = await storage.addClaimantToLawsuit(lawsuitId, claimantId);
      aggregationCache.invalidate('claimants-with-lawsuits');
      res.status(201).json(link);
    } catch (error) {
      console.error("Error linking claimant to lawsuit:", error);
      res.status(500).json({ message: "Failed to link claimant to lawsuit" });
    }
  });

  // Unlink claimant from lawsuit
  app.delete("/api/lawsuits/:lawsuitId/claimants/:claimantId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitId = req.params.lawsuitId as string;
      const claimantId = req.params.claimantId as string;
      const removed = await storage.removeClaimantFromLawsuit(lawsuitId, claimantId);
      aggregationCache.invalidate('claimants-with-lawsuits');
      res.json({ removed });
    } catch (error) {
      console.error("Error unlinking claimant from lawsuit:", error);
      res.status(500).json({ message: "Failed to unlink claimant from lawsuit" });
    }
  });

  // Link law firm to lawsuit
  app.post("/api/lawsuits/:lawsuitId/law-firms/:lawFirmId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitId = req.params.lawsuitId as string;
      const lawFirmId = req.params.lawFirmId as string;
      const link = await storage.addLawFirmToLawsuit(lawsuitId, lawFirmId);
      aggregationCache.invalidate('law-firms-with-lawsuits');
      res.status(201).json(link);
    } catch (error) {
      console.error("Error linking law firm to lawsuit:", error);
      res.status(500).json({ message: "Failed to link law firm to lawsuit" });
    }
  });

  // Unlink law firm from lawsuit
  app.delete("/api/lawsuits/:lawsuitId/law-firms/:lawFirmId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lawsuitId = req.params.lawsuitId as string;
      const lawFirmId = req.params.lawFirmId as string;
      const removed = await storage.removeLawFirmFromLawsuit(lawsuitId, lawFirmId);
      aggregationCache.invalidate('law-firms-with-lawsuits');
      res.json({ removed });
    } catch (error) {
      console.error("Error unlinking law firm from lawsuit:", error);
      res.status(500).json({ message: "Failed to unlink law firm from lawsuit" });
    }
  });

  // === Aggregated data for pipeline (entities with their lawsuits) ===
  
  // Get lawyers with their linked lawsuits (aggregated for pipeline cards) - CACHED
  app.get("/api/lawyers-with-lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const cacheKey = `lawyers-with-lawsuits:${userId}`;
      
      // Try cache first
      const cached = aggregationCache.get<(Lawyer & { lawsuits: Lawsuit[] })[]>(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const lawyersWithLawsuits = await storage.getLawyersWithLawsuits(userId);
      aggregationCache.set(cacheKey, lawyersWithLawsuits);
      res.json(lawyersWithLawsuits);
    } catch (error) {
      console.error("Error fetching lawyers with lawsuits:", error);
      res.status(500).json({ message: "Failed to fetch lawyers with lawsuits" });
    }
  });

  // Get claimants with their linked lawsuits (aggregated for pipeline cards) - CACHED
  app.get("/api/claimants-with-lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const cacheKey = `claimants-with-lawsuits:${userId}`;
      
      // Try cache first
      const cached = aggregationCache.get<(Claimant & { lawsuits: Lawsuit[] })[]>(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const claimantsWithLawsuits = await storage.getClaimantsWithLawsuits(userId);
      aggregationCache.set(cacheKey, claimantsWithLawsuits);
      res.json(claimantsWithLawsuits);
    } catch (error) {
      console.error("Error fetching claimants with lawsuits:", error);
      res.status(500).json({ message: "Failed to fetch claimants with lawsuits" });
    }
  });

  // Get law firms with their linked lawsuits (aggregated for pipeline cards) - CACHED
  app.get("/api/law-firms-with-lawsuits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const cacheKey = `law-firms-with-lawsuits:${userId}`;
      
      // Try cache first
      const cached = aggregationCache.get<(LawFirm & { lawsuits: Lawsuit[] })[]>(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      const lawFirmsWithLawsuits = await storage.getLawFirmsWithLawsuits(userId);
      aggregationCache.set(cacheKey, lawFirmsWithLawsuits);
      res.json(lawFirmsWithLawsuits);
    } catch (error) {
      console.error("Error fetching law firms with lawsuits:", error);
      res.status(500).json({ message: "Failed to fetch law firms with lawsuits" });
    }
  });

  // Leads
  app.get("/api/leads", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const pipelineType = req.query.pipelineType as string | undefined;
      const leads = await storage.getLeads(userId, pipelineType);
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lead = await storage.getLead(getParam(req.params.id), userId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertLeadSchema.safeParse({ ...req.body, ownerId: userId, vendedorId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lead = await storage.createLead(parsed.data);
      wsManager.broadcastLeadCreated(lead);
      res.status(201).json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertLeadSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const lead = await storage.updateLead(getParam(req.params.id), userId, partial.data);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      wsManager.broadcastLeadUpdate(lead);
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteLead(getParam(req.params.id), userId);
      if (!deleted) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      wsManager.broadcastLeadDeleted(getParam(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Lead Interactions
  app.get("/api/leads/:id/interactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lead = await storage.getLead(getParam(req.params.id), userId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const interactions = await storage.getInteractions(getParam(req.params.id));
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  app.post("/api/leads/:id/interactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lead = await storage.getLead(getParam(req.params.id), userId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const parsed = insertInteractionSchema.safeParse({
        ...req.body,
        leadId: getParam(req.params.id),
        vendedorId: userId,
        ownerId: userId,
      });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const interaction = await storage.createInteraction(parsed.data);
      res.status(201).json(interaction);
    } catch (error) {
      console.error("Error creating interaction:", error);
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
      console.error("Error deleting interaction:", error);
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
      console.error("Error fetching products:", error);
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
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertProductSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const product = await storage.createProduct(parsed.data);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertProductSchema.partial().safeParse(req.body);
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
      console.error("Error updating product:", error);
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
      console.error("Error deleting product:", error);
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
      console.error("Error fetching activities:", error);
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
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.post("/api/activities", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertActivitySchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const activity = await storage.createActivity(parsed.data);
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  app.patch("/api/activities/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertActivitySchema.partial().safeParse(req.body);
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
      console.error("Error updating activity:", error);
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
      console.error("Error deleting activity:", error);
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
      console.error("Error fetching proposals:", error);
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
      console.error("Error fetching proposal:", error);
      res.status(500).json({ message: "Failed to fetch proposal" });
    }
  });

  app.post("/api/proposals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertProposalSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const proposal = await storage.createProposal(parsed.data);
      res.status(201).json(proposal);
    } catch (error) {
      console.error("Error creating proposal:", error);
      res.status(500).json({ message: "Failed to create proposal" });
    }
  });

  app.patch("/api/proposals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertProposalSchema.partial().safeParse(req.body);
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
      console.error("Error updating proposal:", error);
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
      console.error("Error deleting proposal:", error);
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
      console.error("Error fetching proposal items:", error);
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
      const parsed = insertProposalItemSchema.safeParse({
        ...req.body,
        proposalId: getParam(req.params.id),
      });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const item = await storage.createProposalItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating proposal item:", error);
      res.status(500).json({ message: "Failed to create proposal item" });
    }
  });

  app.patch("/api/proposal-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const partial = insertProposalItemSchema.partial().safeParse(req.body);
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
      console.error("Error updating proposal item:", error);
      res.status(500).json({ message: "Failed to update proposal item" });
    }
  });

  app.delete("/api/proposal-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteProposalItem(getParam(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting proposal item:", error);
      res.status(500).json({ message: "Failed to delete proposal item" });
    }
  });

  // Users list (for internal use)
  app.get("/api/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  return httpServer;
}
