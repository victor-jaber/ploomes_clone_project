import bcrypt from "bcryptjs";
import { db } from "./db";
import { usuarios } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedUsers() {
  const [existing] = await db.select().from(usuarios).where(eq(usuarios.email, "admin@hermes.com"));
  if (existing) return;

  const senhaHash = await bcrypt.hash("admin123", 10);

  await db.insert(usuarios).values({
    nome: "Administrador",
    email: "admin@hermes.com",
    senha: senhaHash,
    preferencias: JSON.stringify({ tema: "escuro", idioma: "pt-BR" }),
  });

  console.log("Usuário admin criado: admin@hermes.com / admin123");
}
