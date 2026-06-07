import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Simulated AI analysis helpers
const propertyTypes = ["2BHK apartment", "3BHK apartment", "4BHK villa", "studio apartment", "penthouse", "duplex", "independent house", "plot"];
const loanStatuses = ["Needs home loan assistance", "Pre-approved for home loan", "Self-funded, no loan required", "Exploring loan options"];
const timelines = ["Within 1 month", "Within 3 months", "Within 6 months", "By end of year", "Flexible timeline"];
const sentiments = ["Highly interested, ready to proceed", "Interested but comparing options", "Exploring early stage", "Warm lead, needs follow-up"];
const tones = ["Positive and enthusiastic", "Professional and direct", "Cautious but engaged", "Neutral, seeking information"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatBudget(budget: number | null): string {
  if (!budget) {
    const randomBudgets = ["₹40L - ₹60L", "₹60L - ₹80L", "₹80L - ₹1.2Cr", "₹1Cr - ₹1.5Cr", "₹50L - ₹70L"];
    return pickRandom(randomBudgets);
  }
  if (budget >= 10000000) {
    return `₹${(budget / 10000000).toFixed(1)}Cr`;
  }
  if (budget >= 100000) {
    return `₹${(budget / 100000).toFixed(0)}L`;
  }
  return `₹${budget.toLocaleString("en-IN")}`;
}

function generateCallSummary(lead: {
  name: string;
  propertyInterest: string | null;
  budget: number | null;
  location: string | null;
}): string {
  const property = lead.propertyInterest || pickRandom(propertyTypes);
  const budget = formatBudget(lead.budget);
  const location = lead.location || pickRandom(["Whitefield", "Koramangala", "HSR Layout", "Indiranagar", "Electronic City", "Sarjapur Road"]);
  const loan = pickRandom(loanStatuses);
  const timeline = pickRandom(timelines);
  const sentiment = pickRandom(sentiments);
  const tone = pickRandom(tones);
  const date = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return [
    `📞 AI Call Analysis`,
    `━━━━━━━━━━━━━━━━━━━`,
    `Summary: Interested in ${property}.`,
    `Budget: ${budget}.`,
    `${loan}.`,
    `Preferred location: ${location}.`,
    `Timeline: ${timeline}.`,
    `Sentiment: ${sentiment}.`,
    `Tone: ${tone}.`,
    `━━━━━━━━━━━━━━━━━━━`,
    `Analyzed on: ${date}`,
  ].join("\n");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validate that a recording file was provided in the multipart form
    const formData = await req.formData();
    const recording = formData.get("recording");
    if (!recording || !(recording instanceof File)) {
      return NextResponse.json(
        { error: "No audio recording provided. Please upload a file in the 'recording' field." },
        { status: 400 }
      );
    }

    // Fetch the lead
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Access check: agents can only analyze calls for their own leads
    if (session.user.role !== "ADMIN" && lead.assignedToId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate the simulated AI call summary
    const summary = generateCallSummary(lead);

    // Append the summary to existing notes (don't overwrite)
    const updatedNotes = lead.notes
      ? `${lead.notes}\n\n${summary}`
      : summary;

    // Update lead notes and create activity in a transaction
    const [updatedLead] = await prisma.$transaction([
      prisma.lead.update({
        where: { id },
        data: { notes: updatedNotes },
      }),
      prisma.activity.create({
        data: {
          type: "CALL",
          title: "AI Call Analysis",
          description: summary,
          leadId: id,
          createdById: session.user.id,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      summary,
      updatedNotes: updatedLead.notes,
    });
  } catch (error) {
    console.error("Analyze call error:", error);
    return NextResponse.json(
      { error: "Failed to analyze call recording" },
      { status: 500 }
    );
  }
}
