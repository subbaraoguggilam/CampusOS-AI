import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflowTemplates, departments } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth(["admin", "faculty"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await db.select().from(workflowTemplates);
  const depts = await db.select().from(departments);

  const enriched = templates.map((t) => ({
    ...t,
    requiredFields: JSON.parse(t.requiredFields),
    guideSteps: JSON.parse(t.guideSteps),
    departmentName: depts.find((d) => d.id === t.departmentId)?.name,
  }));

  return NextResponse.json({ workflows: enriched });
}
