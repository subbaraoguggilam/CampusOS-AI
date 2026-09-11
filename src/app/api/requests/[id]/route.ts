import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { approvals, documents, requests, users, workflowTemplates } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { emitAutomationEvent } from "@/lib/automation";
import { canTransition } from "@/lib/workflow/state-machine";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [request] = await db.select().from(requests).where(eq(requests.id, id));
  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canView =
    session.role === "admin" ||
    (session.role === "student" && request.studentId === session.id) ||
    (session.role === "faculty" && request.assignedFacultyId === session.id) ||
    (session.role === "hod" && request.departmentId === session.department);
  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [student] = await db
    .select()
    .from(users)
    .where(eq(users.id, request.studentId));
  const [tmpl] = request.templateId
    ? await db
        .select()
        .from(workflowTemplates)
        .where(eq(workflowTemplates.id, request.templateId))
    : [null];
  const [assignedFaculty] = request.assignedFacultyId
    ? await db.select().from(users).where(eq(users.id, request.assignedFacultyId))
    : [null];

  const attachedDocuments = await db.select().from(documents).where(eq(documents.requestId, id));

  const approvalRows = await db.select().from(approvals).where(eq(approvals.requestId, id));
  // Small demo dataset — look up each distinct approver's name individually
  // rather than pulling in an `inArray` import just for this.
  const approverNameById = new Map<string, string>();
  for (const approverId of new Set(approvalRows.map((a) => a.approverId))) {
    const [u] = await db.select().from(users).where(eq(users.id, approverId));
    if (u) approverNameById.set(approverId, u.name);
  }
  const approvalsWithNames = approvalRows.map((a) => ({
    ...a,
    approverName: approverNameById.get(a.approverId) || "Unknown",
  }));

  return NextResponse.json({
    ...request,
    fieldData: JSON.parse(request.fieldData || "{}"),
    studentName: student?.name,
    assignedFacultyName: assignedFaculty?.name,
    assignedFacultyRole: assignedFaculty?.role,
    templateName: tmpl?.name,
    guideSteps: tmpl ? JSON.parse(tmpl.guideSteps) : [],
    approvals: approvalsWithNames,
    // AI Orchestrator output, for the "AI Agent Activity" panel and the
    // human-in-the-loop recommendation banner in the review UI.
    agentSteps: request.agentTrace ? JSON.parse(request.agentTrace) : [],
    documentCheck: {
      required: !!tmpl?.requiresDocument,
      satisfied: !tmpl?.requiresDocument || attachedDocuments.length > 0,
      detail: !tmpl?.requiresDocument
        ? "No supporting document required for this workflow."
        : attachedDocuments.length > 0
        ? `${attachedDocuments.length} document(s) attached.`
        : "Required document not yet uploaded.",
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(["faculty", "hod", "admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action, remarks, assignedFacultyId, templateId, departmentId } = body;

  const [request] = await db.select().from(requests).where(eq(requests.id, id));
  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    (session.role === "faculty" && request.assignedFacultyId !== session.id) ||
    (session.role === "hod" && request.departmentId !== session.department)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Enforce the explicit workflow state machine: which roles may trigger
  // which action, and from which current statuses. This is what stops e.g.
  // a faculty member closing a request that hasn't been resolved yet, or
  // anyone but an admin reassigning a low-confidence match.
  const transition = canTransition(action, session.role as "faculty" | "hod" | "admin", request.status);
  if (!transition.ok) {
    return NextResponse.json({ error: transition.reason || "Invalid transition" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const newStatus = transition.toStatus!;
  const updates: Record<string, unknown> = { updatedAt: now, status: newStatus, facultyRemarks: remarks };

  if (action === "approve" || action === "reject") {
    updates.resolvedAt = now;
  }
  if (action === "resolve") {
    updates.resolvedAt = now;
  }
  if (action === "reassign") {
    updates.assignedFacultyId = assignedFacultyId;
    updates.lowConfidence = false;
    if (templateId) updates.templateId = templateId;
    if (departmentId) updates.departmentId = departmentId;
  }

  await db.update(requests).set(updates).where(eq(requests.id, id));

  await emitAutomationEvent("request.status_changed", id, {
    requestId: id,
    previousStatus: request.status,
    status: newStatus,
    action,
    actorId: session.id,
    actorRole: session.role,
    remarks: remarks || null,
  });

  if (["approve", "reject", "escalate"].includes(action)) {
    await db.insert(approvals).values({
      id: uuid(),
      requestId: id,
      approverId: session.id,
      approverRole: session.role as "faculty" | "hod" | "admin",
      decision: action === "approve" ? "approved" : action === "reject" ? "rejected" : "escalated",
      remarks: remarks || null,
      createdAt: now,
    });
    await emitAutomationEvent("approval.recorded", id, {
      requestId: id,
      decision: action === "approve" ? "approved" : action === "reject" ? "rejected" : "escalated",
      approverId: session.id,
      approverRole: session.role,
      remarks: remarks || null,
    });
  }

  const statusMessages: Record<string, string> = {
    approved: "Your request has been approved!",
    rejected: "Your request has been rejected.",
    escalated: "Your request has been escalated for further review.",
    resolved: "Your request has been resolved.",
    closed: "Your request has been closed.",
    routed: "Your request has been reassigned and routed.",
    in_review: "Your request is now under review.",
    collecting_fields: "The reviewer needs more information from you before this can proceed.",
  };

  if (statusMessages[newStatus]) {
    await createNotification(
      request.studentId,
      `Request ${newStatus.replace(/_/g, " ")}`,
      `${statusMessages[newStatus]}${remarks ? ` Remarks: ${remarks}` : ""}`,
      id
    );
  }

  if (action === "reassign" && assignedFacultyId) {
    await createNotification(
      assignedFacultyId,
      "Request Reassigned",
      `Admin assigned a request to you for review.`,
      id
    );
  }

  return NextResponse.json({ success: true, status: newStatus });
}
