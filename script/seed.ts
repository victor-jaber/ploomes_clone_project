import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const adminEmail = "admin@hermes.com";
  const adminPassword = "admin123";
  const adminName = "Admin";

  const existingUser = await db.select().from(users).where(eq(users.email, adminEmail));
  
  if (existingUser.length > 0) {
    console.log("Admin user already exists, skipping...");
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    await db.insert(users).values({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
    });
    
    console.log(`Admin user created: ${adminEmail}`);
  }

  console.log("Seed completed!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed error:", error);
  process.exit(1);
});
