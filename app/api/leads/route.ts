import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const stage = searchParams.get("stage") || "";
    const source = searchParams.get("source") || "";
    const assignedTo = searchParams.get("assignedTo") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const isAdmin = session.user.role === "ADMIN";
    const userId = session.user.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Role-based filtering
    if (!isAdmin) {
      where.assignedToId = userId;
    }

    // Search
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { propertyInterest: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filters
    if (stage) where.stage = stage;
    if (source) where.source = source;
    if (assignedTo) where.assignedToId = assignedTo;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          _count: { select: { activities: true, followUps: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Leads GET error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone, source, stage, propertyInterest, budget, location, notes, assignedToId } = body;

    if (!name) {
      return NextResponse.json({ error: "Lead name is required" }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        source: source || "OTHER",
        stage: stage || "NEW",
        propertyInterest: propertyInterest || null,
        budget: budget ? parseFloat(budget) : null,
        location: location || null,
        notes: notes || null,
        assignedToId: assignedToId || session.user.id,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Lead POST error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
