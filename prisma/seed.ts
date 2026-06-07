import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@estateflow.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@estateflow.com",
      passwordHash: adminHash,
      role: "ADMIN",
      phone: "+91 98765 43210",
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // Create agent users
  const agentHash = await bcrypt.hash("agent123", 12);
  const agent1 = await prisma.user.upsert({
    where: { email: "rahul@estateflow.com" },
    update: {},
    create: {
      name: "Rahul Sharma",
      email: "rahul@estateflow.com",
      passwordHash: agentHash,
      role: "AGENT",
      phone: "+91 98765 43211",
    },
  });

  const agent2 = await prisma.user.upsert({
    where: { email: "priya@estateflow.com" },
    update: {},
    create: {
      name: "Priya Patel",
      email: "priya@estateflow.com",
      passwordHash: agentHash,
      role: "AGENT",
      phone: "+91 98765 43212",
    },
  });
  console.log("✅ Agent users created");

  // Create sample leads
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        name: "Vikram Mehta", email: "vikram@gmail.com", phone: "+91 99887 76655",
        source: "WEBSITE", stage: "NEW", propertyInterest: "3BHK Apartment",
        budget: 8500000, location: "Mumbai, Andheri West", assignedToId: agent1.id,
        notes: "Looking for a spacious apartment near metro station",
      },
    }),
    prisma.lead.create({
      data: {
        name: "Anita Desai", email: "anita.d@gmail.com", phone: "+91 88776 65544",
        source: "REFERRAL", stage: "CONTACTED", propertyInterest: "2BHK Flat",
        budget: 5500000, location: "Pune, Hinjewadi", assignedToId: agent1.id,
        notes: "Referred by existing client Mr. Kulkarni",
      },
    }),
    prisma.lead.create({
      data: {
        name: "Sanjay Gupta", email: "sanjay.g@outlook.com", phone: "+91 77665 54433",
        source: "WALK_IN", stage: "QUALIFIED", propertyInterest: "Commercial Office Space",
        budget: 25000000, location: "Bangalore, Whitefield", assignedToId: agent2.id,
        notes: "Needs 2000 sq ft office space for IT startup",
      },
    }),
    prisma.lead.create({
      data: {
        name: "Meera Joshi", email: "meera.j@yahoo.com", phone: "+91 66554 43322",
        source: "SOCIAL_MEDIA", stage: "PROPOSAL", propertyInterest: "Villa",
        budget: 15000000, location: "Goa, Panjim", assignedToId: agent2.id,
        notes: "Looking for a vacation villa with sea view",
      },
    }),
    prisma.lead.create({
      data: {
        name: "Arjun Reddy", email: "arjun.r@gmail.com", phone: "+91 55443 32211",
        source: "PROPERTY_PORTAL", stage: "NEGOTIATION", propertyInterest: "Penthouse",
        budget: 35000000, location: "Hyderabad, Banjara Hills", assignedToId: agent1.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Pooja Singh", email: "pooja.s@gmail.com", phone: "+91 44332 21100",
        source: "COLD_CALL", stage: "WON", propertyInterest: "3BHK Apartment",
        budget: 9200000, location: "Delhi, Dwarka", assignedToId: agent2.id,
        notes: "Deal closed! Registration pending.",
      },
    }),
    prisma.lead.create({
      data: {
        name: "Karan Malhotra", email: "karan.m@gmail.com", phone: "+91 33221 10099",
        source: "WEBSITE", stage: "LOST", propertyInterest: "Plot",
        budget: 12000000, location: "Noida, Sector 150", assignedToId: agent1.id,
        notes: "Went with competitor offer",
      },
    }),
  ]);
  console.log(`✅ ${leads.length} sample leads created`);

  // Create activities
  await Promise.all([
    prisma.activity.create({
      data: { type: "CALL", title: "Initial discovery call", description: "Discussed requirements and budget", leadId: leads[0].id, createdById: agent1.id },
    }),
    prisma.activity.create({
      data: { type: "EMAIL", title: "Sent property brochure", description: "Shared 3 property options via email", leadId: leads[1].id, createdById: agent1.id },
    }),
    prisma.activity.create({
      data: { type: "SITE_VISIT", title: "Property site visit", description: "Client visited Whitefield office space", leadId: leads[2].id, createdById: agent2.id },
    }),
    prisma.activity.create({
      data: { type: "MEETING", title: "Proposal discussion", description: "Presented villa options in Panjim", leadId: leads[3].id, createdById: agent2.id },
    }),
    prisma.activity.create({
      data: { type: "NOTE", title: "Client feedback", description: "Client wants to negotiate 5% discount", leadId: leads[4].id, createdById: agent1.id },
    }),
  ]);
  console.log("✅ Sample activities created");

  // Create follow-ups
  const now = new Date();
  await Promise.all([
    prisma.followUp.create({
      data: { title: "Send property comparison sheet", dueDate: new Date(now.getTime()+2*86400000), leadId: leads[0].id, assignedToId: agent1.id },
    }),
    prisma.followUp.create({
      data: { title: "Schedule site visit", dueDate: new Date(now.getTime()+1*86400000), leadId: leads[1].id, assignedToId: agent1.id },
    }),
    prisma.followUp.create({
      data: { title: "Send revised quote", dueDate: new Date(now.getTime()-1*86400000), leadId: leads[2].id, assignedToId: agent2.id, description: "Client requested updated pricing" },
    }),
    prisma.followUp.create({
      data: { title: "Follow up on proposal", dueDate: new Date(now.getTime()+3*86400000), leadId: leads[3].id, assignedToId: agent2.id },
    }),
    prisma.followUp.create({
      data: { title: "Finalize negotiation terms", dueDate: new Date(now.getTime()+5*86400000), leadId: leads[4].id, assignedToId: agent1.id },
    }),
  ]);
  console.log("✅ Sample follow-ups created");

  console.log("\n🎉 Seeding complete!");
  console.log("📧 Admin login: admin@estateflow.com / admin123");
  console.log("📧 Agent login: rahul@estateflow.com / agent123");
  console.log("📧 Agent login: priya@estateflow.com / agent123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
