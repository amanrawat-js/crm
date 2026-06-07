import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const userId = session.user.id;

    // Build where clause based on role
    const leadWhere = isAdmin ? {} : { assignedToId: userId };

    // Get lead counts by stage
    const stageCounts = await prisma.lead.groupBy({
      by: ["stage"],
      _count: { id: true },
      where: leadWhere,
    });

    // Total leads
    const totalLeads = await prisma.lead.count({ where: leadWhere });

    // Won leads (for conversion rate)
    const wonLeads = await prisma.lead.count({
      where: { ...leadWhere, stage: "WON" },
    });

    // Total pipeline value (sum of budgets for active leads)
    const pipelineValue = await prisma.lead.aggregate({
      _sum: { budget: true },
      where: {
        ...leadWhere,
        stage: { notIn: ["WON", "LOST"] },
      },
    });

    // Upcoming follow-ups (next 7 days)
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingFollowUps = await prisma.followUp.count({
      where: {
        ...(isAdmin ? {} : { assignedToId: userId }),
        completed: false,
        dueDate: { lte: weekFromNow },
      },
    });

    // Overdue follow-ups
    const overdueFollowUps = await prisma.followUp.count({
      where: {
        ...(isAdmin ? {} : { assignedToId: userId }),
        completed: false,
        dueDate: { lt: now },
      },
    });

    // Recent leads
    const recentLeads = await prisma.lead.findMany({
      where: leadWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Lead source distribution
    const sourceCounts = await prisma.lead.groupBy({
      by: ["source"],
      _count: { id: true },
      where: leadWhere,
    });

    // Recent activities
    const recentActivities = await prisma.activity.findMany({
      where: isAdmin ? {} : { createdById: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        lead: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Upcoming follow-ups list
    const upcomingFollowUpsList = await prisma.followUp.findMany({
      where: {
        ...(isAdmin ? {} : { assignedToId: userId }),
        completed: false,
        dueDate: { gte: now },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: {
        lead: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0.0";

    return NextResponse.json({
      kpis: {
        totalLeads,
        pipelineValue: pipelineValue._sum.budget || 0,
        conversionRate,
        upcomingFollowUps,
        overdueFollowUps,
      },
      stageCounts: stageCounts.map((s) => ({
        stage: s.stage,
        count: s._count.id,
      })),
      sourceCounts: sourceCounts.map((s) => ({
        source: s.source,
        count: s._count.id,
      })),
      recentLeads,
      recentActivities,
      upcomingFollowUpsList,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
