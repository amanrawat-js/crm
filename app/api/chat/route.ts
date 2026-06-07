import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ChatResponse {
  answer: string;
  metric?: string;
  comparison?: string;
  details?: string[];
}

function getDateRange(period: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;
  let prevStart: Date;
  let prevEnd: Date;

  switch (period) {
    case "today": {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 1);
      prevEnd = new Date(start);
      break;
    }
    case "week": {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday start
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd = new Date(start);
      break;
    }
    case "month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(start);
      break;
    }
    case "year": {
      start = new Date(now.getFullYear(), 0, 1);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(start);
      break;
    }
    default: {
      // Default to this week
      const d = now.getDay();
      const dd = d === 0 ? 6 : d - 1;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dd);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd = new Date(start);
      break;
    }
  }

  return { start, end, prevStart, prevEnd };
}

function detectPeriod(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("today")) return "today";
  if (lower.includes("this week") || lower.includes("week")) return "week";
  if (lower.includes("this month") || lower.includes("month")) return "month";
  if (lower.includes("this year") || lower.includes("year")) return "year";
  return "week"; // default
}

function detectIntent(message: string): string {
  const lower = message.toLowerCase();

  // Leads related
  if (lower.includes("lead") && (lower.includes("add") || lower.includes("new") || lower.includes("creat") || lower.includes("how many"))) {
    return "leads_added";
  }
  if (lower.includes("lead") && (lower.includes("total") || lower.includes("all") || lower.includes("count"))) {
    return "leads_total";
  }
  if (lower.includes("lead") && lower.includes("stage")) {
    return "leads_by_stage";
  }
  if (lower.includes("lead") && lower.includes("source")) {
    return "leads_by_source";
  }

  // Pipeline
  if (lower.includes("pipeline") || lower.includes("value") || lower.includes("revenue") || lower.includes("worth")) {
    return "pipeline_value";
  }

  // Conversion
  if (lower.includes("conversion") || lower.includes("convert") || lower.includes("won")) {
    return "conversion_rate";
  }

  // Follow-ups
  if (lower.includes("follow") || lower.includes("pending") || lower.includes("upcoming") || lower.includes("overdue") || lower.includes("task")) {
    return "follow_ups";
  }

  // Activities
  if (lower.includes("activit") || lower.includes("call") || lower.includes("meeting") || lower.includes("email sent")) {
    return "activities";
  }

  // Top / best performing
  if (lower.includes("top") || lower.includes("best") || lower.includes("performer")) {
    return "top_agents";
  }

  // General overview / summary
  if (lower.includes("summary") || lower.includes("overview") || lower.includes("how are") || lower.includes("status") || lower.includes("dashboard")) {
    return "summary";
  }

  // Greeting
  if (/^(hi|hello|hey|good morning|good evening|good afternoon)/i.test(lower.trim())) {
    return "greeting";
  }

  return "unknown";
}

function formatPercentChange(current: number, previous: number): string | undefined {
  if (previous === 0) {
    return current > 0 ? "New this period (no prior data)" : undefined;
  }
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(0)}% compared to last period`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const userId = session.user.id;
    const leadWhere = isAdmin ? {} : { assignedToId: userId };

    const intent = detectIntent(message);
    const period = detectPeriod(message);
    const { start, end, prevStart, prevEnd } = getDateRange(period);

    const periodLabel = period === "today" ? "today" : period === "week" ? "this week" : period === "month" ? "this month" : "this year";

    let response: ChatResponse;

    switch (intent) {
      case "greeting": {
        const userName = session.user.name?.split(" ")[0] || "there";
        response = {
          answer: `Hey ${userName}! 👋 I'm your CRM assistant. Ask me about leads, pipeline, follow-ups, activities, or anything else about your dashboard.`,
        };
        break;
      }

      case "leads_added": {
        const current = await prisma.lead.count({
          where: { ...leadWhere, createdAt: { gte: start, lte: end } },
        });
        const previous = await prisma.lead.count({
          where: { ...leadWhere, createdAt: { gte: prevStart, lt: prevEnd } },
        });
        response = {
          answer: `${current} lead${current !== 1 ? "s" : ""} added ${periodLabel}.`,
          metric: current.toString(),
          comparison: formatPercentChange(current, previous),
        };
        break;
      }

      case "leads_total": {
        const total = await prisma.lead.count({ where: leadWhere });
        response = {
          answer: `You have ${total} total lead${total !== 1 ? "s" : ""} in the system.`,
          metric: total.toString(),
        };
        break;
      }

      case "leads_by_stage": {
        const stages = await prisma.lead.groupBy({
          by: ["stage"],
          _count: { id: true },
          where: leadWhere,
        });
        const details = stages.map((s) => `${s.stage}: ${s._count.id}`);
        response = {
          answer: "Here's the breakdown by pipeline stage:",
          details,
        };
        break;
      }

      case "leads_by_source": {
        const sources = await prisma.lead.groupBy({
          by: ["source"],
          _count: { id: true },
          where: leadWhere,
        });
        const details = sources.map((s) => `${s.source.replace(/_/g, " ")}: ${s._count.id}`);
        response = {
          answer: "Lead sources breakdown:",
          details,
        };
        break;
      }

      case "pipeline_value": {
        const currentVal = await prisma.lead.aggregate({
          _sum: { budget: true },
          where: { ...leadWhere, stage: { notIn: ["WON", "LOST"] }, createdAt: { gte: start, lte: end } },
        });
        const totalVal = await prisma.lead.aggregate({
          _sum: { budget: true },
          where: { ...leadWhere, stage: { notIn: ["WON", "LOST"] } },
        });
        const val = totalVal._sum.budget || 0;
        const newVal = currentVal._sum.budget || 0;
        response = {
          answer: `Total pipeline value is ₹${val.toLocaleString("en-IN")}. ₹${newVal.toLocaleString("en-IN")} added ${periodLabel}.`,
          metric: `₹${val.toLocaleString("en-IN")}`,
        };
        break;
      }

      case "conversion_rate": {
        const totalLeads = await prisma.lead.count({ where: leadWhere });
        const wonLeads = await prisma.lead.count({ where: { ...leadWhere, stage: "WON" } });
        const rate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0.0";
        response = {
          answer: `Conversion rate is ${rate}%. ${wonLeads} out of ${totalLeads} leads converted to Won.`,
          metric: `${rate}%`,
        };
        break;
      }

      case "follow_ups": {
        const now = new Date();
        const pending = await prisma.followUp.count({
          where: {
            ...(isAdmin ? {} : { assignedToId: userId }),
            completed: false,
          },
        });
        const overdue = await prisma.followUp.count({
          where: {
            ...(isAdmin ? {} : { assignedToId: userId }),
            completed: false,
            dueDate: { lt: now },
          },
        });
        const upcoming = await prisma.followUp.findMany({
          where: {
            ...(isAdmin ? {} : { assignedToId: userId }),
            completed: false,
            dueDate: { gte: now },
          },
          orderBy: { dueDate: "asc" },
          take: 3,
          include: { lead: { select: { name: true } } },
        });
        const details = upcoming.map((f) => `• ${f.title} — ${f.lead.name} (due ${new Date(f.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`);
        response = {
          answer: `${pending} pending follow-up${pending !== 1 ? "s" : ""}${overdue > 0 ? `, ${overdue} overdue ⚠️` : ""}.`,
          metric: pending.toString(),
          details: details.length > 0 ? details : undefined,
        };
        break;
      }

      case "activities": {
        const activityCounts = await prisma.activity.groupBy({
          by: ["type"],
          _count: { id: true },
          where: {
            ...(isAdmin ? {} : { createdById: userId }),
            createdAt: { gte: start, lte: end },
          },
        });
        const total = activityCounts.reduce((sum, a) => sum + a._count.id, 0);
        const details = activityCounts.map((a) => `${a.type.replace(/_/g, " ")}: ${a._count.id}`);
        response = {
          answer: `${total} activit${total !== 1 ? "ies" : "y"} logged ${periodLabel}.`,
          metric: total.toString(),
          details: details.length > 0 ? details : undefined,
        };
        break;
      }

      case "top_agents": {
        if (!isAdmin) {
          response = {
            answer: "Agent performance data is only available to admins.",
          };
          break;
        }
        const topAgents = await prisma.lead.groupBy({
          by: ["assignedToId"],
          _count: { id: true },
          where: { assignedToId: { not: null } },
          orderBy: { _count: { id: "desc" } },
          take: 3,
        });
        const agentIds = topAgents.map((a) => a.assignedToId).filter(Boolean) as string[];
        const agents = await prisma.user.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, name: true },
        });
        const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));
        const details = topAgents.map((a, i) => `${i + 1}. ${agentMap[a.assignedToId!] || "Unknown"} — ${a._count.id} leads`);
        response = {
          answer: "Top performing agents by lead count:",
          details,
        };
        break;
      }

      case "summary": {
        const totalLeads = await prisma.lead.count({ where: leadWhere });
        const newThisPeriod = await prisma.lead.count({
          where: { ...leadWhere, createdAt: { gte: start, lte: end } },
        });
        const pipelineVal = await prisma.lead.aggregate({
          _sum: { budget: true },
          where: { ...leadWhere, stage: { notIn: ["WON", "LOST"] } },
        });
        const pendingFU = await prisma.followUp.count({
          where: { ...(isAdmin ? {} : { assignedToId: userId }), completed: false },
        });
        response = {
          answer: `Here's your quick summary:`,
          details: [
            `📊 ${totalLeads} total leads (${newThisPeriod} new ${periodLabel})`,
            `💰 ₹${(pipelineVal._sum.budget || 0).toLocaleString("en-IN")} pipeline value`,
            `📅 ${pendingFU} pending follow-ups`,
          ],
        };
        break;
      }

      default: {
        response = {
          answer: `I'm not sure I understood that. Try asking me about:\n• Leads added this week\n• Pipeline value\n• Conversion rate\n• Follow-ups status\n• Activity summary\n• Dashboard overview`,
        };
        break;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { answer: "Sorry, something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
