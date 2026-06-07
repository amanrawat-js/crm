import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseSpreadsheetBuffer,
  validateAndParseRows,
  getTemplateCsv,
} from "@/lib/leads-import-export";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csv = getTemplateCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leads-import-template.csv"',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    if (!filename.endsWith(".csv") && !filename.endsWith(".xlsx") && !filename.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a .csv, .xlsx, or .xls file." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const records = parseSpreadsheetBuffer(buffer, file.name);

    if (records.length === 0) {
      return NextResponse.json({ error: "File is empty or has no data rows" }, { status: 400 });
    }

    const { rows, errors } = validateAndParseRows(records);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", created: 0, failed: errors.length, errors },
        { status: 400 }
      );
    }

    const isAdmin = session.user.role === "ADMIN";
    const userId = session.user.id;

    let userByEmail = new Map<string, string>();
    if (isAdmin) {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, email: true },
      });
      userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
    }

    let created = 0;
    const importErrors: { row: number; message: string }[] = [];

    for (const row of rows) {
      let assignedToId = userId;

      if (isAdmin && row.assignedToEmail) {
        const assigneeId = userByEmail.get(row.assignedToEmail);
        if (!assigneeId) {
          importErrors.push({
            row: row.rowNumber,
            message: `Unknown assignee email: "${row.assignedToEmail}"`,
          });
          continue;
        }
        assignedToId = assigneeId;
      }

      try {
        await prisma.lead.create({
          data: {
            name: row.name,
            email: row.email,
            phone: row.phone,
            source: row.source,
            stage: row.stage,
            propertyInterest: row.propertyInterest,
            budget: row.budget,
            location: row.location,
            notes: row.notes,
            assignedToId,
          },
        });
        created++;
      } catch {
        importErrors.push({
          row: row.rowNumber,
          message: "Failed to create lead",
        });
      }
    }

    return NextResponse.json({
      created,
      failed: importErrors.length,
      errors: importErrors,
    });
  } catch (error) {
    console.error("Leads import error:", error);
    return NextResponse.json({ error: "Failed to import leads" }, { status: 500 });
  }
}
