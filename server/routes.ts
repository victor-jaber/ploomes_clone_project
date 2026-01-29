import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated, registerAuthRoutes, AuthRequest } from "./auth";
import {
  insertClientSchema,
  insertProductSchema,
  insertOpportunitySchema,
  insertActivitySchema,
  insertProposalSchema,
  insertContactSchema,
  insertProposalItemSchema,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAuthRoutes(app);

  // Clients
  app.get("/api/clients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const clients = await storage.getClients(userId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const client = await storage.getClient(req.params.id, userId);
      if (!client) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertClientSchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const client = await storage.createClient(parsed.data);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertClientSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const client = await storage.updateClient(req.params.id, userId, partial.data);
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

  // Contacts (verify client ownership)
  app.get("/api/clients/:clientId/contacts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const client = await storage.getClient(req.params.clientId, userId);
      if (!client) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      const contacts = await storage.getContacts(req.params.clientId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertContactSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const client = await storage.getClient(parsed.data.clientId, userId);
      if (!client) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      const contact = await storage.createContact(parsed.data);
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const existingContact = await storage.getContact(req.params.id);
      if (!existingContact) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }
      const client = await storage.getClient(existingContact.clientId, userId);
      if (!client) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }
      const partial = insertContactSchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const contact = await storage.updateContact(req.params.id, partial.data);
      res.json(contact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const existingContact = await storage.getContact(req.params.id);
      if (!existingContact) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }
      const client = await storage.getClient(existingContact.clientId, userId);
      if (!client) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }
      await storage.deleteContact(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
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

  // Opportunities
  app.get("/api/opportunities", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const opportunities = await storage.getOpportunities(userId);
      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      res.status(500).json({ message: "Failed to fetch opportunities" });
    }
  });

  app.get("/api/opportunities/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const opportunity = await storage.getOpportunity(req.params.id, userId);
      if (!opportunity) {
        res.status(404).json({ message: "Opportunity not found" });
        return;
      }
      res.json(opportunity);
    } catch (error) {
      console.error("Error fetching opportunity:", error);
      res.status(500).json({ message: "Failed to fetch opportunity" });
    }
  });

  app.post("/api/opportunities", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const parsed = insertOpportunitySchema.safeParse({ ...req.body, ownerId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }
      const opportunity = await storage.createOpportunity(parsed.data);
      res.status(201).json(opportunity);
    } catch (error) {
      console.error("Error creating opportunity:", error);
      res.status(500).json({ message: "Failed to create opportunity" });
    }
  });

  app.patch("/api/opportunities/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user!.id;
      const partial = insertOpportunitySchema.partial().safeParse(req.body);
      if (!partial.success) {
        res.status(400).json({ message: "Invalid data", errors: partial.error.errors });
        return;
      }
      const opportunity = await storage.updateOpportunity(req.params.id, userId, partial.data);
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

  // Proposal Items (verify proposal ownership)
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

  return httpServer;
}
