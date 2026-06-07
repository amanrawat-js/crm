import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public lead intake endpoint for external forms / landing pages.
 * Auth: API key via `Authorization: Bearer <key>` or `x-api-key: <key>` header.
 *
 * POST /api/leads/external
 * Body: { name, email?, phone?, budget?, location?, propertyInterest?, notes? }
 * Auto-sets: source = "WEBSITE", stage = "NEW"
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

function validateApiKey(req: NextRequest): boolean {
  const apiKey = process.env.LEADS_API_KEY;
  if (!apiKey) {
    console.error("LEADS_API_KEY environment variable is not set");
    return false;
  }

  // Check Authorization: Bearer <token>
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const [scheme, token] = authHeader.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token === apiKey) {
      return true;
    }
  }

  // Check x-api-key header
  const xApiKey = req.headers.get("x-api-key");
  if (xApiKey === apiKey) {
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth: API key check ──
    if (!validateApiKey(req)) {
      return NextResponse.json(
        { error: "Unauthorized. Provide a valid API key via `Authorization: Bearer <key>` or `x-api-key` header." },
        { status: 401, headers: corsHeaders }
      );
    }

    // ── Parse body ──
    const body = await req.json();
    const { name, email, phone, budget, location, propertyInterest, notes } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Lead name is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // ── Round-robin assignment to an active agent ──
    // Pick the active agent with the fewest assigned leads
    const leastBusyAgent = await prisma.user.findFirst({
      where: { isActive: true },
      orderBy: { assignedLeads: { _count: "asc" } },
      select: { id: true },
    });

    // ── Create lead ──
    const lead = await prisma.lead.create({
      data: {
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        source: "WEBSITE",
        stage: "NEW",
        propertyInterest: propertyInterest || null,
        budget: budget ? parseFloat(budget) : null,
        location: location || null,
        notes: notes || null,
        assignedToId: leastBusyAgent?.id || null,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Lead created successfully",
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          stage: lead.stage,
          source: lead.source,
          assignedTo: lead.assignedTo?.name || null,
        },
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("External lead intake error:", error);
    return NextResponse.json(
      { error: "Failed to create lead. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ── CORS: Allow cross-origin requests from external forms ──
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
      "Access-Control-Max-Age": "86400",
    },
  });
}
