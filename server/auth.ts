import { Request, Response, NextFunction, Express, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { usuarios, loginSchema, registerSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET || "hermes-crm-secret-key";
const JWT_EXPIRES_IN = "7d";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    papel: string;
  };
}

export const isAuthenticated: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string; papel: string };
    (req as AuthRequest).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
    return;
  }
};

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }

      const { nome, email, senha } = parsed.data;

      const existingUser = await db.select().from(usuarios).where(eq(usuarios.email, email));
      if (existingUser.length > 0) {
        res.status(400).json({ message: "Email já cadastrado" });
        return;
      }

      const hashedPassword = await bcrypt.hash(senha, 10);

      const [newUser] = await db.insert(usuarios).values({
        nome,
        email,
        senha: hashedPassword,
      }).returning();

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, name: newUser.nome, papel: newUser.papel || 'funcionario' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({
        user: { id: newUser.id, name: newUser.nome, email: newUser.email, papel: newUser.papel || 'funcionario' },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Falha ao registrar" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
        return;
      }

      const { email, senha } = parsed.data;

      const [user] = await db.select().from(usuarios).where(eq(usuarios.email, email));
      if (!user) {
        res.status(401).json({ message: "Credenciais inválidas" });
        return;
      }

      const validPassword = await bcrypt.compare(senha, user.senha);
      if (!validPassword) {
        res.status(401).json({ message: "Credenciais inválidas" });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.nome, papel: user.papel || 'funcionario' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        user: { id: user.id, name: user.nome, email: user.email, papel: user.papel || 'funcionario' },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Falha ao fazer login" });
    }
  });

  app.get("/api/auth/me", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const [user] = await db.select().from(usuarios).where(eq(usuarios.id, authReq.user.id));
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.json({ id: user.id, name: user.nome, email: user.email, papel: user.papel || 'funcionario', preferences: user.preferencias ? JSON.parse(user.preferencias) : {} });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.get("/api/auth/preferences", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const [user] = await db.select().from(usuarios).where(eq(usuarios.id, authReq.user!.id));
      if (!user) { res.status(404).json({ message: "User not found" }); return; }
      res.json(user.preferencias ? JSON.parse(user.preferencias) : {});
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ message: "Failed to get preferences" });
    }
  });

  app.put("/api/auth/preferences", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const [user] = await db.select().from(usuarios).where(eq(usuarios.id, authReq.user!.id));
      if (!user) { res.status(404).json({ message: "User not found" }); return; }
      const currentPrefs = user.preferencias ? JSON.parse(user.preferencias) : {};
      const merged = { ...currentPrefs, ...req.body };
      await db.update(usuarios).set({ preferencias: JSON.stringify(merged) }).where(eq(usuarios.id, authReq.user!.id));
      res.json(merged);
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });
}
