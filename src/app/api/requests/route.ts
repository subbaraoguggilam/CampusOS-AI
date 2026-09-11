import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { requests, workflowTemplates, users, departments } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { runOrchestrator } from "@/lib/agent/orchestrator";
import { createNotification } from "@/lib/notifications";
import { emitAutomationEvent } from "@/lib/automation";

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rows;
  if (session.role === "student") {
    rows = await db
      .select()
      .from(requests)
      .where(eq(requests.studentId, session.id))
      .orderBy(desc(requests.createdAt));
  } else if (session.role === "faculty") {
    rows = await db
      .select()
      .from(requests)
      .where(eq(requests.assignedFacultyId, session.id))
      .orderBy(desc(requests.createdAt));
  } else if (session.role === "hod") {
    rows = await db
      .select()
      .from(requests)
      .where(eq(requests.departmentId, session.department || ""))
      .orderBy(desc(requests.createdAt));
  } else {
    rows = await db.select().from(requests).orderBy(desc(requests.createdAt));
  }

  const enriched = await Promise.all(
    rows.map(async (r) => {
      const [tmpl] = r.templateId
        ? await db
            .select()
            .from(workflowTemplates)
            .where(eq(workflowTemplates.id, r.templateId))
        : [null];
      const [student] = await db
        .select()
        .from(users)
        .where(eq(users.id, r.studentId));
      const [dept] = r.departmentId
        ? await db
            .select()
            .from(departments)
            .where(eq(departments.id, r.departmentId))
        : [null];
      return {
        ...r,
        fieldData: JSON.parse(r.fieldData || "{}"),
        templateName: tmpl?.name,
        studentName: student?.name,
        departmentName: dept?.name,
      };
    })
  );

  return NextResponse.json({ requests: enriched });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(["student"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query, fieldData, templateId } = await req.json();
  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const [matchedTemplate] = templateId
    ? await db.select().from(workflowTemplates).where(eq(workflowTemplates.id, templateId))
    : [null];

  // Run the full AI Orchestrator (Request -> Policy -> Document -> Workflow
  // -> Approval agents) so the request is created with a reasoning trace and
  // a human-in-the-loop recommendation attached, not just a bare RAG match.
  const agentResult = await runOrchestrator(query.trim(), session, {
    fieldData,
    templateMeta: matchedTemplate
      ? { minYear: matchedTemplate.minYear ?? null, requiresDocument: !!matchedTemplate.requiresDocument }
      : undefined,
  });
  const match = agentResult.bestMatch;
  const now = new Date().toISOString();
  const mergedFields = agentResult.extractedFields;
  const missing = agentResult.missingFields;

  if (missing.length > 0) {
    return NextResponse.json({
      status: "collecting_fields",
      missingFields: missing,
      extractedFields: mergedFields,
      match,
      guidance: agentResult.guidance,
      agentSteps: agentResult.steps,
    });
  }

  // Use the Workflow Agent's own routing decision (already applies the
  // "long leave / Internship NOC -> HOD" policy) instead of recomputing
  // department staff lookup here, so routing stays consistent with what the
  // AI Agent Activity trace told the student would happen.
  const assignedFaculty = agentResult.routing.assignedFacultyId
    ? { id: agentResult.routing.assignedFacultyId }
    : null;

  const requestId = uuid();
  // A request is routed straight to faculty only when the RAG confidence is
  // high AND the Policy Agent found the student eligible. Otherwise it goes
  // to admin for manual routing/triage — this is the Policy Agent's veto.
  const policyBlocked = !agentResult.policy.eligible;
  const status = match?.lowConfidence || policyBlocked ? "pending_routing" : "routed";

  await db.insert(requests).values({
    id: requestId,
    studentId: session.id,
    templateId: templateId || match?.templateId,
    rawQuery: query.trim(),
    status,
    confidence: match?.confidence ?? 0,
    lowConfidence: match?.lowConfidence ?? true,
    assignedFacultyId: status === "routed" ? assignedFaculty?.id : null,
    departmentId: match?.departmentId,
    fieldData: JSON.stringify(mergedFields),
    agentTrace: JSON.stringify(agentResult.steps),
    aiRecommendation: agentResult.recommendation.decision,
    aiRecommendationReason: agentResult.recommendation.reason,
    policyEligible: agentResult.policy.eligible,
    createdAt: now,
    updatedAt: now,
  });

  if (assignedFaculty && status === "routed") {
    await createNotification(
      assignedFaculty.id,
      "New Request Assigned",
      `${session.name} submitted: "${query.slice(0, 80)}..." — AI recommendation: ${agentResult.recommendation.decision.toUpperCase()}.`,
      requestId
    );
  }

  const admins = await db.select().from(users).where(eq(users.role, "admin"));
  if (status === "pending_routing") {
    const reason = policyBlocked
      ? `Policy check failed: ${agentResult.policy.reasons.join(" ")}`
      : "Low confidence RAG match";
    for (const admin of admins) {
      await createNotification(
        admin.id,
        "Needs Manual Routing",
        `${reason} — "${query.slice(0, 80)}..."`,
        requestId
      );
    }
  }

  await createNotification(
    session.id,
    "Request Submitted",
    `Your request has been ${status === "pending_routing" ? "submitted for admin review" : "routed to faculty"}.`,
    requestId
  );

  await emitAutomationEvent("request.created", requestId, {
    requestId,
    studentId: session.id,
    studentName: session.name,
    departmentId: match?.departmentId || null,
    assignedFacultyId: status === "routed" ? assignedFaculty?.id || null : null,
    templateId: templateId || match?.templateId || null,
    status,
    query: query.trim(),
    aiRecommendation: agentResult.recommendation.decision,
  });

  return NextResponse.json({
    id: requestId,
    status,
    lowConfidence: match?.lowConfidence,
    aiRecommendation: agentResult.recommendation.decision,
    message:
      status === "pending_routing"
        ? policyBlocked
          ? "Request submitted for admin review — the AI policy check flagged an eligibility issue."
          : "Request submitted for admin review due to low confidence match."
        : "Request routed to faculty successfully.",
  });
}
