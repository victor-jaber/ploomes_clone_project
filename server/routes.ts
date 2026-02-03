import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated, registerAuthRoutes, AuthRequest } from "./auth";
import { wsManager } from "./websocket";
import {
  insertTodosAdvogadosInfosSchema,
  insertEscritorioSchema,
  insertReclamanteSchema,
  insertLeadSchema,
  insertProductSchema,
  insertActivitySchema,
  insertProposalSchema,
  insertProposalItemSchema,
  insertPipelineTriggerSchema,
  insertInteractionSchema,
  insertClientSchema,
  insertOpportunitySchema,
  type Lead,
  type TodosAdvogadosInfos,
  type Escritorio,
  type Reclamante,
} from "@shared/schema";

// Helper function to fire webhook triggers asynchronously
async function fireWebhookTriggers(
  ownerId: string,
  pipelineType: string,
  fromStage: string | null,
  toStage: string,
  lead: Lead,
  entity?: TodosAdvogadosInfos | Escritorio | Reclamante
) {
  try {
    const triggers = await storage.getMatchingTriggers(ownerId, pipelineType, fromStage, toStage);
    
    for (const trigger of triggers) {
      try {
        let headers: Record<string, string> = { "Content-Type": "application/json" };
        if (trigger.headers) {
          try {
            headers = { ...headers, ...JSON.parse(trigger.headers) };
          } catch (e) {
            console.error("Invalid headers JSON for trigger:", trigger.id);
          }
        }
        
        let body: string | undefined;
        if (trigger.bodyTemplate) {
          body = trigger.bodyTemplate
            .replace(/\{\{lead\.id\}\}/g, lead.id)
            .replace(/\{\{lead\.titulo\}\}/g, lead.titulo)
            .replace(/\{\{lead\.valor\}\}/g, String(lead.valor || 0))
            .replace(/\{\{lead\.stage\}\}/g, lead.stage || "")
            .replace(/\{\{lead\.pipelineType\}\}/g, lead.pipelineType || "")
            .replace(/\{\{fromStage\}\}/g, fromStage || "")
            .replace(/\{\{toStage\}\}/g, toStage);
        } else {
          body = JSON.stringify({
            event: "lead_stage_changed",
            pipelineType,
            fromStage,
            toStage,
            lead: {
              id: lead.id,
              titulo: lead.titulo,
              valor: lead.valor,
              stage: lead.stage,
              pipelineType: lead.pipelineType,
            },
            entity: entity ? { id: (entity as any).id, nome: (entity as any).nome } : null,
            timestamp: new Date().toISOString(),
          });
        }
        
        const fetchOptions: RequestInit = {
          method: trigger.httpMethod || "POST",
          headers,
        };
        
        if (trigger.httpMethod !== "GET") {
          fetchOptions.body = body;
        }
        
        const response = await fetch(trigger.webhookUrl, fetchOptions);
        console.log(`Trigger "${trigger.name}" fired: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.error(`Error firing trigger "${trigger.name}":`, error);
      }
    }
  } catch (error) {
    console.error("Error fetching triggers:", error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  wsManager.initialize(httpServer);
  registerAuthRoutes(app);

  // Todos Advogados Infos - Dados compartilhados entre todos os usuários
  app.get("/api/todos-advogados-infos", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const infos = await storage.getTodosAdvogadosInfos();
      res.json(infos);
    } catch (error) {
      console.error("Error fetching todos advogados infos:", error);
      res.status(500).json({ message: "Failed to fetch todos advogados infos" });
    }
  });

  app.get("/api/todos-advogados-infos/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const info = await storage.getTodosAdvogadosInfo(id);
      if (!info) {
        res.status(404).json({ message: "Todos advogados info not found" });
        return;
      }
      res.json(info);
    } catch (error) {
      console.error("Error fetching todos advogados info:", error);
      res.status(500).json({ message: "Failed to fetch todos advogados info" });
    }
  });

  app.post("/api/todos-advogados-infos", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertTodosAdvogadosInfosSchema.safeParse({ ...req.body, ownerId: userId, enviadoParaPipeline: true });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const info = await storage.createTodosAdvogadosInfo(parsed.data);
      
      const titulo = `${info.nome} - ${info.cpf || 'Sem CPF'}`;
      const lead = await storage.createLead({
        titulo,
        pipelineType: 'advogados',
        stage: 'novo_lead',
        todosAdvogadosInfosId: info.id,
        valor: info.valorCausa,
        ownerId: userId,
        vendedorId: userId,
      });
      wsManager.broadcastLeadCreated(lead);
      
      res.status(201).json(info);
    } catch (error) {
      console.error("Error creating todos advogados info:", error);
      res.status(500).json({ message: "Failed to create todos advogados info" });
    }
  });

  app.patch("/api/todos-advogados-infos/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const partial = insertTodosAdvogadosInfosSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const info = await storage.updateTodosAdvogadosInfo(id, partial.data);
      if (!info) {
        res.status(404).json({ message: "Todos advogados info not found" });
        return;
      }
      res.json(info);
    } catch (error) {
      console.error("Error updating todos advogados info:", error);
      res.status(500).json({ message: "Failed to update todos advogados info" });
    }
  });

  app.delete("/api/todos-advogados-infos/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const deleted = await storage.deleteTodosAdvogadosInfo(id);
      if (!deleted) {
        res.status(404).json({ message: "Todos advogados info not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting todos advogados info:", error);
      res.status(500).json({ message: "Failed to delete todos advogados info" });
    }
  });

  app.post("/api/sync-advogados-to-leads", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const result = await storage.syncAdvogadosToLeads(userId);
      
      for (const lead of result.leads) {
        wsManager.broadcastLeadCreated(lead);
      }
      
      res.json({ synced: result.synced, skipped: result.skipped });
    } catch (error) {
      console.error("Error syncing advogados to leads:", error);
      res.status(500).json({ message: "Failed to sync advogados to leads" });
    }
  });

  // Escritórios
  app.get("/api/escritorios", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const escritorios = await storage.getEscritorios(userId);
      res.json(escritorios);
    } catch (error) {
      console.error("Error fetching escritorios:", error);
      res.status(500).json({ message: "Failed to fetch escritorios" });
    }
  });

  app.get("/api/escritorios/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const escritorio = await storage.getEscritorio(req.params.id, userId);
      if (!escritorio) {
        res.status(404).json({ message: "Escritório not found" });
        return;
      }
      res.json(escritorio);
    } catch (error) {
      console.error("Error fetching escritorio:", error);
      res.status(500).json({ message: "Failed to fetch escritorio" });
    }
  });

  app.post("/api/escritorios", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertEscritorioSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const escritorio = await storage.createEscritorio(parsed.data);
      res.status(201).json(escritorio);
    } catch (error) {
      console.error("Error creating escritorio:", error);
      res.status(500).json({ message: "Failed to create escritorio" });
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
      const escritorio = await storage.updateEscritorio(req.params.id, userId, partial.data);
      if (!escritorio) {
        res.status(404).json({ message: "Escritório not found" });
        return;
      }
      res.json(escritorio);
    } catch (error) {
      console.error("Error updating escritorio:", error);
      res.status(500).json({ message: "Failed to update escritorio" });
    }
  });

  app.delete("/api/escritorios/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteEscritorio(req.params.id, userId);
      if (!deleted) {
        res.status(404).json({ message: "Escritório not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting escritorio:", error);
      res.status(500).json({ message: "Failed to delete escritorio" });
    }
  });

  // Reclamantes
  app.get("/api/reclamantes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const reclamantes = await storage.getReclamantes(userId);
      res.json(reclamantes);
    } catch (error) {
      console.error("Error fetching reclamantes:", error);
      res.status(500).json({ message: "Failed to fetch reclamantes" });
    }
  });

  app.get("/api/reclamantes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const reclamante = await storage.getReclamante(req.params.id, userId);
      if (!reclamante) {
        res.status(404).json({ message: "Reclamante not found" });
        return;
      }
      res.json(reclamante);
    } catch (error) {
      console.error("Error fetching reclamante:", error);
      res.status(500).json({ message: "Failed to fetch reclamante" });
    }
  });

  app.post("/api/reclamantes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertReclamanteSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const reclamante = await storage.createReclamante(parsed.data);
      res.status(201).json(reclamante);
    } catch (error) {
      console.error("Error creating reclamante:", error);
      res.status(500).json({ message: "Failed to create reclamante" });
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
      const reclamante = await storage.updateReclamante(req.params.id, userId, partial.data);
      if (!reclamante) {
        res.status(404).json({ message: "Reclamante not found" });
        return;
      }
      res.json(reclamante);
    } catch (error) {
      console.error("Error updating reclamante:", error);
      res.status(500).json({ message: "Failed to update reclamante" });
    }
  });

  app.delete("/api/reclamantes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteReclamante(req.params.id, userId);
      if (!deleted) {
        res.status(404).json({ message: "Reclamante not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting reclamante:", error);
      res.status(500).json({ message: "Failed to delete reclamante" });
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
      const lead = await storage.getLead(req.params.id, userId);
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
      
      const currentLead = await storage.getLead(req.params.id, userId);
      if (!currentLead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      
      const fromStage = currentLead.stage;
      const toStage = partial.data.stage;
      
      const lead = await storage.updateLead(req.params.id, userId, partial.data);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      
      // Fire triggers if stage changed
      if (toStage && fromStage !== toStage) {
        setImmediate(() => {
          fireWebhookTriggers(userId, lead.pipelineType, fromStage, toStage, lead);
        });
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
      const deleted = await storage.deleteLead(req.params.id, userId);
      if (!deleted) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      wsManager.broadcastLeadDeleted(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
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
      const product = await storage.getProduct(req.params.id, userId);
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
      const product = await storage.updateProduct(req.params.id, userId, partial.data);
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
      const deleted = await storage.deleteProduct(req.params.id, userId);
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
      const activity = await storage.getActivity(req.params.id, userId);
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
      const activity = await storage.updateActivity(req.params.id, userId, partial.data);
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
      const deleted = await storage.deleteActivity(req.params.id, userId);
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
      const proposal = await storage.getProposal(req.params.id, userId);
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
      const proposal = await storage.updateProposal(req.params.id, userId, partial.data);
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
      const deleted = await storage.deleteProposal(req.params.id, userId);
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
  app.get("/api/proposals/:proposalId/items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const proposal = await storage.getProposal(req.params.proposalId, userId);
      if (!proposal) {
        res.status(404).json({ message: "Proposal not found" });
        return;
      }
      const items = await storage.getProposalItems(req.params.proposalId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching proposal items:", error);
      res.status(500).json({ message: "Failed to fetch proposal items" });
    }
  });

  app.post("/api/proposal-items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertProposalItemSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const proposal = await storage.getProposal(parsed.data.proposalId, userId);
      if (!proposal) {
        res.status(404).json({ message: "Proposal not found" });
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
      const userId = (req as AuthRequest).user!.id;
      const existingItem = await storage.getProposalItem(req.params.id);
      if (!existingItem) {
        res.status(404).json({ message: "Proposal item not found" });
        return;
      }
      const proposal = await storage.getProposal(existingItem.proposalId, userId);
      if (!proposal) {
        res.status(404).json({ message: "Proposal item not found" });
        return;
      }
      const partial = insertProposalItemSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const item = await storage.updateProposalItem(req.params.id, partial.data);
      res.json(item);
    } catch (error) {
      console.error("Error updating proposal item:", error);
      res.status(500).json({ message: "Failed to update proposal item" });
    }
  });

  app.delete("/api/proposal-items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const existingItem = await storage.getProposalItem(req.params.id);
      if (!existingItem) {
        res.status(404).json({ message: "Proposal item not found" });
        return;
      }
      const proposal = await storage.getProposal(existingItem.proposalId, userId);
      if (!proposal) {
        res.status(404).json({ message: "Proposal item not found" });
        return;
      }
      await storage.deleteProposalItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting proposal item:", error);
      res.status(500).json({ message: "Failed to delete proposal item" });
    }
  });

  // Pipeline Triggers
  app.get("/api/pipeline-triggers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const triggers = await storage.getPipelineTriggers(userId);
      res.json(triggers);
    } catch (error) {
      console.error("Error fetching pipeline triggers:", error);
      res.status(500).json({ message: "Failed to fetch pipeline triggers" });
    }
  });

  app.post("/api/pipeline-triggers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertPipelineTriggerSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const trigger = await storage.createPipelineTrigger(parsed.data);
      res.status(201).json(trigger);
    } catch (error) {
      console.error("Error creating pipeline trigger:", error);
      res.status(500).json({ message: "Failed to create pipeline trigger" });
    }
  });

  app.patch("/api/pipeline-triggers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertPipelineTriggerSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const trigger = await storage.updatePipelineTrigger(req.params.id, userId, partial.data);
      if (!trigger) {
        res.status(404).json({ message: "Pipeline trigger not found" });
        return;
      }
      res.json(trigger);
    } catch (error) {
      console.error("Error updating pipeline trigger:", error);
      res.status(500).json({ message: "Failed to update pipeline trigger" });
    }
  });

  app.delete("/api/pipeline-triggers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deletePipelineTrigger(req.params.id, userId);
      if (!deleted) {
        res.status(404).json({ message: "Pipeline trigger not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pipeline trigger:", error);
      res.status(500).json({ message: "Failed to delete pipeline trigger" });
    }
  });

  // Interactions
  app.get("/api/leads/:leadId/interactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lead = await storage.getLead(req.params.leadId, userId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const interactions = await storage.getInteractions(req.params.leadId);
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  app.post("/api/interactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const userName = (req as AuthRequest).user!.name;
      const parsed = insertInteractionSchema.safeParse({ ...req.body, ownerId: userId, vendedorId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lead = await storage.getLead(parsed.data.leadId, userId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const interaction = await storage.createInteraction(parsed.data);
      const interactionWithName = { ...interaction, vendedorName: userName };
      wsManager.broadcastInteractionCreated(interactionWithName);
      res.status(201).json(interactionWithName);
    } catch (error) {
      console.error("Error creating interaction:", error);
      res.status(500).json({ message: "Failed to create interaction" });
    }
  });

  app.delete("/api/interactions/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteInteraction(req.params.id, userId);
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

  // Clients routes
  app.get("/api/clients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const clientsList = await storage.getClients(userId);
      res.json(clientsList);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const validated = insertClientSchema.parse({ ...req.body, ownerId: userId });
      const client = await storage.createClient(validated);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const client = await storage.updateClient(req.params.id, req.body, userId);
      if (!client) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteClient(req.params.id, userId);
      if (!deleted) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Opportunities routes
  app.get("/api/opportunities", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const opportunitiesList = await storage.getOpportunities(userId);
      res.json(opportunitiesList);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      res.status(500).json({ message: "Failed to fetch opportunities" });
    }
  });

  app.post("/api/opportunities", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const validated = insertOpportunitySchema.parse({ ...req.body, ownerId: userId });
      const opportunity = await storage.createOpportunity(validated);
      res.status(201).json(opportunity);
    } catch (error) {
      console.error("Error creating opportunity:", error);
      res.status(500).json({ message: "Failed to create opportunity" });
    }
  });

  app.patch("/api/opportunities/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const opportunity = await storage.updateOpportunity(req.params.id, req.body, userId);
      if (!opportunity) {
        res.status(404).json({ message: "Opportunity not found" });
        return;
      }
      res.json(opportunity);
    } catch (error) {
      console.error("Error updating opportunity:", error);
      res.status(500).json({ message: "Failed to update opportunity" });
    }
  });

  app.delete("/api/opportunities/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteOpportunity(req.params.id, userId);
      if (!deleted) {
        res.status(404).json({ message: "Opportunity not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      res.status(500).json({ message: "Failed to delete opportunity" });
    }
  });

  // Users management
  app.get("/api/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const usersList = await storage.getUsers();
      res.json(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        res.status(400).json({ message: "Name, email and password are required" });
        return;
      }
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ message: "Email already in use" });
        return;
      }
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await storage.createUser({ name, email, password: hashedPassword });
      res.status(201).json({ id: newUser.id, name: newUser.name, email: newUser.email, createdAt: newUser.createdAt });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  return httpServer;
}
