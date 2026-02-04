import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { isAuthenticated, registerAuthRoutes, AuthRequest } from "./auth";
import { wsManager } from "./websocket";
import {
  insertTodosAdvogadosInfosSchema,
  insertEscritorioSchema,
  insertReclamanteSchema,
  insertCaseSchema,
  insertProcessoSchema,
  insertResultadoSchema,
  insertProductSchema,
  insertActivitySchema,
  insertProposalSchema,
  insertProposalItemSchema,
  insertPipelineTriggerSchema,
  insertInteractionSchema,
  insertLembreteSchema,
  type Case,
  type TodosAdvogadosInfos,
  type Escritorio,
  type Reclamante,
} from "@shared/schema";

// Backward compatibility
const insertLeadSchema = insertCaseSchema;
type Lead = Case;

// Helper to extract params
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || '';
};

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

  // Advogados
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
      const id = parseInt(getParam(req.params.id) as string, 10);
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
      const id = parseInt(getParam(req.params.id) as string, 10);
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
      const id = parseInt(getParam(req.params.id) as string, 10);
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

  app.post("/api/sync-reclamantes-to-leads", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const result = await storage.syncReclamantesToLeads(userId);
      
      for (const lead of result.leads) {
        wsManager.broadcastLeadCreated(lead);
      }
      
      res.json({ synced: result.synced, skipped: result.skipped });
    } catch (error) {
      console.error("Error syncing reclamantes to leads:", error);
      res.status(500).json({ message: "Failed to sync reclamantes to leads" });
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
      const escritorio = await storage.getEscritorio(getParam(req.params.id), userId);
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
      const escritorio = await storage.updateEscritorio(getParam(req.params.id), userId, partial.data);
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
      const deleted = await storage.deleteEscritorio(getParam(req.params.id), userId);
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
      const reclamante = await storage.getReclamante(getParam(req.params.id), userId);
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
      const reclamante = await storage.updateReclamante(getParam(req.params.id), userId, partial.data);
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
      const deleted = await storage.deleteReclamante(getParam(req.params.id), userId);
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

  // Processos
  app.get("/api/processos", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const processos = await storage.getProcessos(userId);
      res.json(processos);
    } catch (error) {
      console.error("Error fetching processos:", error);
      res.status(500).json({ message: "Failed to fetch processos" });
    }
  });

  app.get("/api/processos/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const processo = await storage.getProcesso(getParam(req.params.id), userId);
      if (!processo) {
        res.status(404).json({ message: "Processo not found" });
        return;
      }
      res.json(processo);
    } catch (error) {
      console.error("Error fetching processo:", error);
      res.status(500).json({ message: "Failed to fetch processo" });
    }
  });

  app.post("/api/processos", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertProcessoSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const processo = await storage.createProcesso(parsed.data);
      res.status(201).json(processo);
    } catch (error) {
      console.error("Error creating processo:", error);
      res.status(500).json({ message: "Failed to create processo" });
    }
  });

  app.patch("/api/processos/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertProcessoSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const processo = await storage.updateProcesso(getParam(req.params.id), userId, partial.data);
      if (!processo) {
        res.status(404).json({ message: "Processo not found" });
        return;
      }
      res.json(processo);
    } catch (error) {
      console.error("Error updating processo:", error);
      res.status(500).json({ message: "Failed to update processo" });
    }
  });

  app.delete("/api/processos/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteProcesso(getParam(req.params.id), userId);
      if (!deleted) {
        res.status(404).json({ message: "Processo not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting processo:", error);
      res.status(500).json({ message: "Failed to delete processo" });
    }
  });

  // Processo-Advogado N:N
  const addAdvogadoSchema = z.object({ advogadoId: z.number().int().positive() });
  
  app.get("/api/processos/:id/advogados", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const processo = await storage.getProcesso(getParam(req.params.id), userId);
      if (!processo) {
        res.status(404).json({ message: "Processo not found" });
        return;
      }
      const advogados = await storage.getProcessoAdvogados(getParam(req.params.id));
      res.json(advogados);
    } catch (error) {
      console.error("Error fetching processo advogados:", error);
      res.status(500).json({ message: "Failed to fetch processo advogados" });
    }
  });

  app.post("/api/processos/:id/advogados", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const processo = await storage.getProcesso(getParam(req.params.id), userId);
      if (!processo) {
        res.status(404).json({ message: "Processo not found" });
        return;
      }
      const parsed = addAdvogadoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const relation = await storage.addAdvogadoToProcesso(getParam(req.params.id), parsed.data.advogadoId);
      res.status(201).json(relation);
    } catch (error) {
      console.error("Error adding advogado to processo:", error);
      res.status(500).json({ message: "Failed to add advogado to processo" });
    }
  });

  app.delete("/api/processos/:id/advogados/:advogadoId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const processo = await storage.getProcesso(getParam(req.params.id), userId);
      if (!processo) {
        res.status(404).json({ message: "Processo not found" });
        return;
      }
      const advogadoId = parseInt(getParam(req.params.advogadoId), 10);
      const deleted = await storage.removeAdvogadoFromProcesso(getParam(req.params.id), advogadoId);
      if (!deleted) {
        res.status(404).json({ message: "Relation not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error removing advogado from processo:", error);
      res.status(500).json({ message: "Failed to remove advogado from processo" });
    }
  });

  // Processo-Reclamante N:N
  const addReclamanteSchema = z.object({ reclamanteId: z.string().uuid() });

  app.get("/api/processos/:id/reclamantes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const processo = await storage.getProcesso(getParam(req.params.id), userId);
      if (!processo) {
        res.status(404).json({ message: "Processo not found" });
        return;
      }
      const reclamantes = await storage.getProcessoReclamantes(getParam(req.params.id));
      res.json(reclamantes);
    } catch (error) {
      console.error("Error fetching processo reclamantes:", error);
      res.status(500).json({ message: "Failed to fetch processo reclamantes" });
    }
  });

  app.post("/api/processos/:id/reclamantes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const processo = await storage.getProcesso(getParam(req.params.id), userId);
      if (!processo) {
        res.status(404).json({ message: "Processo not found" });
        return;
      }
      const parsed = addReclamanteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const relation = await storage.addReclamanteToProcesso(getParam(req.params.id), parsed.data.reclamanteId);
      res.status(201).json(relation);
    } catch (error) {
      console.error("Error adding reclamante to processo:", error);
      res.status(500).json({ message: "Failed to add reclamante to processo" });
    }
  });

  app.delete("/api/processos/:id/reclamantes/:reclamanteId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const processo = await storage.getProcesso(getParam(req.params.id), userId);
      if (!processo) {
        res.status(404).json({ message: "Processo not found" });
        return;
      }
      const deleted = await storage.removeReclamanteFromProcesso(getParam(req.params.id), getParam(req.params.reclamanteId));
      if (!deleted) {
        res.status(404).json({ message: "Relation not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error removing reclamante from processo:", error);
      res.status(500).json({ message: "Failed to remove reclamante from processo" });
    }
  });

  // Resultados
  app.get("/api/resultados", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const resultados = await storage.getResultados(userId);
      res.json(resultados);
    } catch (error) {
      console.error("Error fetching resultados:", error);
      res.status(500).json({ message: "Failed to fetch resultados" });
    }
  });

  app.get("/api/resultados/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const resultado = await storage.getResultado(getParam(req.params.id), userId);
      if (!resultado) {
        res.status(404).json({ message: "Resultado not found" });
        return;
      }
      res.json(resultado);
    } catch (error) {
      console.error("Error fetching resultado:", error);
      res.status(500).json({ message: "Failed to fetch resultado" });
    }
  });

  app.post("/api/resultados", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertResultadoSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const resultado = await storage.createResultado(parsed.data);
      res.status(201).json(resultado);
    } catch (error) {
      console.error("Error creating resultado:", error);
      res.status(500).json({ message: "Failed to create resultado" });
    }
  });

  app.patch("/api/resultados/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertResultadoSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const resultado = await storage.updateResultado(getParam(req.params.id), userId, partial.data);
      if (!resultado) {
        res.status(404).json({ message: "Resultado not found" });
        return;
      }
      res.json(resultado);
    } catch (error) {
      console.error("Error updating resultado:", error);
      res.status(500).json({ message: "Failed to update resultado" });
    }
  });

  app.delete("/api/resultados/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteResultado(getParam(req.params.id), userId);
      if (!deleted) {
        res.status(404).json({ message: "Resultado not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting resultado:", error);
      res.status(500).json({ message: "Failed to delete resultado" });
    }
  });

  // Cases (Leads - backward compatible)
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
      
      const currentLead = await storage.getLead(getParam(req.params.id), userId);
      if (!currentLead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      
      const fromStage = currentLead.stage;
      const toStage = partial.data.stage;
      
      const lead = await storage.updateLead(getParam(req.params.id), userId, partial.data);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      
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

  // Case-Processo N:N
  const addProcessoSchema = z.object({ processoId: z.string().uuid() });

  app.get("/api/leads/:id/processos", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lead = await storage.getLead(getParam(req.params.id), userId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const processos = await storage.getCaseProcessos(getParam(req.params.id));
      res.json(processos);
    } catch (error) {
      console.error("Error fetching case processos:", error);
      res.status(500).json({ message: "Failed to fetch case processos" });
    }
  });

  app.post("/api/leads/:id/processos", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lead = await storage.getLead(getParam(req.params.id), userId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const parsed = addProcessoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const relation = await storage.addProcessoToCase(getParam(req.params.id), parsed.data.processoId);
      res.status(201).json(relation);
    } catch (error) {
      console.error("Error adding processo to case:", error);
      res.status(500).json({ message: "Failed to add processo to case" });
    }
  });

  app.delete("/api/leads/:id/processos/:processoId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lead = await storage.getLead(getParam(req.params.id), userId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const deleted = await storage.removeProcessoFromCase(getParam(req.params.id), getParam(req.params.processoId));
      if (!deleted) {
        res.status(404).json({ message: "Relation not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error removing processo from case:", error);
      res.status(500).json({ message: "Failed to remove processo from case" });
    }
  });

  // Case-Escritório N:N
  const addEscritorioSchema = z.object({ escritorioId: z.string().uuid() });

  app.get("/api/leads/:id/escritorios", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lead = await storage.getLead(getParam(req.params.id), userId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const escritorios = await storage.getCaseEscritorios(getParam(req.params.id));
      res.json(escritorios);
    } catch (error) {
      console.error("Error fetching case escritorios:", error);
      res.status(500).json({ message: "Failed to fetch case escritorios" });
    }
  });

  app.post("/api/leads/:id/escritorios", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lead = await storage.getLead(getParam(req.params.id), userId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const parsed = addEscritorioSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const relation = await storage.addEscritorioToCase(getParam(req.params.id), parsed.data.escritorioId);
      res.status(201).json(relation);
    } catch (error) {
      console.error("Error adding escritorio to case:", error);
      res.status(500).json({ message: "Failed to add escritorio to case" });
    }
  });

  app.delete("/api/leads/:id/escritorios/:escritorioId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lead = await storage.getLead(getParam(req.params.id), userId);
      if (!lead) {
        res.status(404).json({ message: "Lead not found" });
        return;
      }
      const deleted = await storage.removeEscritorioFromCase(getParam(req.params.id), getParam(req.params.escritorioId));
      if (!deleted) {
        res.status(404).json({ message: "Relation not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error removing escritorio from case:", error);
      res.status(500).json({ message: "Failed to remove escritorio from case" });
    }
  });

  // Interactions
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
        caseId: getParam(req.params.id),
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

  // Lembretes
  app.get("/api/lembretes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const lembretes = await storage.getLembretes(userId);
      res.json(lembretes);
    } catch (error) {
      console.error("Error fetching lembretes:", error);
      res.status(500).json({ message: "Failed to fetch lembretes" });
    }
  });

  app.post("/api/lembretes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertLembreteSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const lembrete = await storage.createLembrete(parsed.data);
      res.status(201).json(lembrete);
    } catch (error) {
      console.error("Error creating lembrete:", error);
      res.status(500).json({ message: "Failed to create lembrete" });
    }
  });

  app.patch("/api/lembretes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertLembreteSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const lembrete = await storage.updateLembrete(getParam(req.params.id), userId, partial.data);
      if (!lembrete) {
        res.status(404).json({ message: "Lembrete not found" });
        return;
      }
      res.json(lembrete);
    } catch (error) {
      console.error("Error updating lembrete:", error);
      res.status(500).json({ message: "Failed to update lembrete" });
    }
  });

  app.delete("/api/lembretes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const deleted = await storage.deleteLembrete(getParam(req.params.id), userId);
      if (!deleted) {
        res.status(404).json({ message: "Lembrete not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lembrete:", error);
      res.status(500).json({ message: "Failed to delete lembrete" });
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
      const parsed = insertProposalItemSchema.safeParse({ ...req.body, proposalId: getParam(req.params.id) });
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

  app.get("/api/pipeline-triggers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const trigger = await storage.getPipelineTrigger(getParam(req.params.id), userId);
      if (!trigger) {
        res.status(404).json({ message: "Pipeline trigger not found" });
        return;
      }
      res.json(trigger);
    } catch (error) {
      console.error("Error fetching pipeline trigger:", error);
      res.status(500).json({ message: "Failed to fetch pipeline trigger" });
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
      const trigger = await storage.updatePipelineTrigger(getParam(req.params.id), userId, partial.data);
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
      const deleted = await storage.deletePipelineTrigger(getParam(req.params.id), userId);
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

  // Users management
  app.get("/api/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteUser(getParam(req.params.id));
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
