import { Request, Response, NextFunction, Express, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users, loginSchema, registerSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET || "hermes-crm-secret-key";
const JWT_EXPIRES_IN = "7d";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
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
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string };
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

      const { name, email, password } = parsed.data;

      const existingUser = await db.select().from(users).where(eq(users.email, email));
      if (existingUser.length > 0) {
        res.status(400).json({ message: "Email já cadastrado" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [newUser] = await db.insert(users).values({
        name,
        email,
        password: hashedPassword,
      }).returning();

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, name: newUser.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({
        user: { id: newUser.id, name: newUser.name, email: newUser.email },
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

      const { email, password } = parsed.data;

      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) {
        res.status(401).json({ message: "Credenciais inválidas" });
        return;
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        res.status(401).json({ message: "Credenciais inválidas" });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        user: { id: user.id, name: user.name, email: user.email },
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

      const [user] = await db.select().from(users).where(eq(users.id, authReq.user.id));
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });
}
