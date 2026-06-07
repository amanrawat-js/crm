import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function debug() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, passwordHash: true, role: true, isActive: true }
  });

  console.log("Total users:", users.length);

  for (const u of users) {
    console.log(`\nUser: ${u.email} | Role: ${u.role} | Active: ${u.isActive}`);
    console.log(`Hash: ${u.passwordHash}`);
    
    const matchAdmin = await bcrypt.compare("admin123", u.passwordHash);
    const matchAgent = await bcrypt.compare("agent123", u.passwordHash);
    console.log(`Matches 'admin123': ${matchAdmin}`);
    console.log(`Matches 'agent123': ${matchAgent}`);
  }

  await prisma.$disconnect();
}

debug().catch(console.error);
