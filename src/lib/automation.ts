import crypto from "crypto";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { automationEvents } from "@/lib/db/schema";

export type AutomationEventType =
  | "request.created"
  | "request.status_changed"
  | "approval.recorded"
  | "document.uploaded";

function signPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Sends an event to n8n when configured. The database event is written first,
 * so a temporary n8n outage never loses the campus workflow event.
 */
export async function emitAutomationEvent(
  eventType: AutomationEventType,
  aggregateId: string,
  data: Record<string, unknown>
) {
  const event = {
    id: uuid(),
    eventType,
    aggregateId,
    data,
    occurredAt: new Date().toISOString(),
  };
  const payload = JSON.stringify(event);

  await db.insert(automationEvents).values({
    id: event.id,
    eventType,
    aggregateId,
    payload,
    status: "pending",
    attempts: 0,
    createdAt: event.occurredAt,
  });

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!webhookUrl || !webhookSecret) return event.id;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CampusOS-Event": eventType,
        "X-CampusOS-Signature": signPayload(payload, webhookSecret),
      },
      body: payload,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`n8n returned HTTP ${response.status}`);
    await db.update(automationEvents).set({ status: "sent", attempts: 1, sentAt: new Date().toISOString() }).where(eq(automationEvents.id, event.id));
  } catch (error) {
    await db.update(automationEvents).set({ status: "failed", attempts: 1, lastError: error instanceof Error ? error.message : "Unknown n8n error" }).where(eq(automationEvents.id, event.id));
    console.error("n8n automation event failed", { eventId: event.id, eventType, error });
  }
  return event.id;
}