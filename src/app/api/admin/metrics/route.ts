import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments, requests, users, workflowTemplates } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth(["admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allRequests = await db.select().from(requests);
  const allUsers = await db.select().from(users);
  const templates = await db.select().from(workflowTemplates);

  const byStatus: Record<string, number> = {};
  for (const r of allRequests) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }

  const resolved = allRequests.filter(
    (r) => r.resolvedAt && ["approved", "resolved", "closed"].includes(r.status)
  );

  let avgTurnaround = 0;
  if (resolved.length > 0) {
    const totalMs = resolved.reduce((sum, r) => {
      return sum + (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime());
    }, 0);
    avgTurnaround = Math.round(totalMs / resolved.length / (1000 * 60 * 60));
  }

  const lowConfidence = allRequests.filter((r) => r.lowConfidence && r.status === "pending_routing");

  const byTemplate: Record<string, number> = {};
  for (const r of allRequests) {
    if (r.templateId) {
      byTemplate[r.templateId] = (byTemplate[r.templateId] || 0) + 1;
    }
  }

  const templateStats = templates.map((t) => ({
    name: t.name,
    count: byTemplate[t.id] || 0,
  }));

  const departmentStats = (await db.select().from(departments)).map((department) => ({
    id: department.id,
    name: department.name,
    code: department.code,
    students: allUsers.filter((user) => user.role === "student" && user.department === department.id).length,
    requests: allRequests.filter((request) => request.departmentId === department.id).length,
    pending: allRequests.filter((request) => request.departmentId === department.id && ["routed", "in_review", "pending_routing", "escalated"].includes(request.status)).length,
  }));

  return NextResponse.json({
    totalRequests: allRequests.length,
    pendingRequests: allRequests.filter((r) =>
      ["routed", "in_review", "pending_routing", "escalated"].includes(r.status)
    ).length,
    resolvedRequests: resolved.length,
    lowConfidenceCount: lowConfidence.length,
    avgTurnaroundHours: avgTurnaround,
    byStatus,
    templateStats,
    userCounts: {
      students: allUsers.filter((u) => u.role === "student").length,
      faculty: allUsers.filter((u) => u.role === "faculty").length,
      admins: allUsers.filter((u) => u.role === "admin").length,
      hods: allUsers.filter((u) => u.role === "hod").length,
    },
    departmentStats,
  });
}
