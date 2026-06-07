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
    const status = searchParams.get("status") || ""; // pending, completed, overdue
    const leadId = searchParams.get("leadId") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const isAdmin = session.user.role === "ADMIN";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (!isAdmin) where.assignedToId = session.user.id;
    if (leadId) where.leadId = leadId;

    const now = new Date();
    if (status === "pending") {
      where.completed = false;
      where.dueDate = { gte: now };
    } else if (status === "completed") {
      where.completed = true;
    } else if (status === "overdue") {
      where.completed = false;
      where.dueDate = { lt: now };
    }

    const [followUps, total] = await Promise.all([
      prisma.followUp.findMany({
        where,
        orderBy: { dueDate: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          lead: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      }),
      prisma.followUp.count({ where }),
    ]);

    return NextResponse.json({
      followUps,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Follow-ups GET error:", error);
    return NextResponse.json({ error: "Failed to fetch follow-ups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, dueDate, leadId, assignedToId } = body;

    if (!title || !dueDate || !leadId) {
      return NextResponse.json(
        { error: "Title, dueDate, and leadId are required" },
        { status: 400 }
      );
    }

    const followUp = await prisma.followUp.create({
      data: {
        title,
        description: description || null,
        dueDate: new Date(dueDate),
        leadId,
        assignedToId: assignedToId || session.user.id,
      },
      include: {
        lead: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(followUp, { status: 201 });
  } catch (error) {
    console.error("Follow-up POST error:", error);
    return NextResponse.json({ error: "Failed to create follow-up" }, { status: 500 });
  }
}
