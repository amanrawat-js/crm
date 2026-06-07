import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leadsToCsv } from "@/lib/leads-import-export";

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

    const isAdmin = session.user.role === "ADMIN";
    const userId = session.user.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (!isAdmin) {
      where.assignedToId = userId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { propertyInterest: { contains: search, mode: "insensitive" } },
      ];
    }

    if (stage) where.stage = stage;
    if (source) where.source = source;

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: { select: { name: true, email: true } },
      },
    });

    const csv = leadsToCsv(leads);
    const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Leads export error:", error);
    return NextResponse.json({ error: "Failed to export leads" }, { status: 500 });
  }
}
