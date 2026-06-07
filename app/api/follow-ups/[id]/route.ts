import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && existing.assignedToId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const followUp = await prisma.followUp.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        description: body.description ?? existing.description,
        dueDate: body.dueDate ? new Date(body.dueDate) : existing.dueDate,
        completed: body.completed ?? existing.completed,
        assignedToId: body.assignedToId ?? existing.assignedToId,
      },
      include: {
        lead: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(followUp);
  } catch (error) {
    console.error("Follow-up PUT error:", error);
    return NextResponse.json({ error: "Failed to update follow-up" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && existing.assignedToId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.followUp.delete({ where: { id } });

    return NextResponse.json({ message: "Follow-up deleted" });
  } catch (error) {
    console.error("Follow-up DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete follow-up" }, { status: 500 });
  }
}
