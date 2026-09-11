import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowTemplates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { runOrchestrator } from "@/lib/agent/orchestrator";

export async function POST(req: NextRequest) {
  const session = await requireAuth(["student", "faculty", "hod", "admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query, fieldData } = await req.json();
  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  // Orchestrator run #1: matches intent so we know which template's policy
  // metadata (min year / document requirement) to feed back in on run #2.
  const preliminary = await runOrchestrator(query.trim(), session, { fieldData });
  let templateMeta: { minYear: number | null; requiresDocument: boolean } | undefined;
  if (preliminary.bestMatch) {
    const [tmpl] = await db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, preliminary.bestMatch.templateId));
    if (tmpl) {
      templateMeta = { minYear: tmpl.minYear ?? null, requiresDocument: !!tmpl.requiresDocument };
    }
  }

  const result = templateMeta
    ? await runOrchestrator(query.trim(), session, { fieldData, templateMeta })
    : preliminary;

  return NextResponse.json({
    // Legacy fields the existing chat UI already expects.
    matches: result.rag.matches,
    bestMatch: result.bestMatch,
    knowledgeMatches: result.rag.knowledgeMatches,
    extractedFields: result.extractedFields,
    missingFields: result.missingFields,
    guidance: result.guidance,
    // New agentic fields.
    agentSteps: result.steps,
    policy: result.policy,
    documentCheck: result.documentCheck,
    routing: result.routing,
    recommendation: result.recommendation,
  });
}
