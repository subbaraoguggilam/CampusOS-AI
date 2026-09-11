import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { automationEvents } from "@/lib/db/schema";
import { emitAutomationEvent } from "@/lib/automation";

export async function POST(req: Request) {
  const authorization = req.headers.get("authorization");
  if (!process.env.AUTOMATION_RETRY_SECRET || authorization !== `Bearer ${process.env.AUTOMATION_RETRY_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const failed = await db.select().from(automationEvents).where(and(eq(automationEvents.status, "failed"), lt(automationEvents.attempts, 5)));
  let retried = 0;
  for (const event of failed) {
    const parsed = JSON.parse(event.payload) as { eventType: "request.created" | "request.status_changed" | "approval.recorded" | "document.uploaded"; data: Record<string, unknown> };
    await emitAutomationEvent(parsed.eventType, event.aggregateId, parsed.data);
    await db.update(automationEvents).set({ attempts: event.attempts + 1 }).where(eq(automationEvents.id, event.id));
    retried++;
  }
  return NextResponse.json({ retried });
}