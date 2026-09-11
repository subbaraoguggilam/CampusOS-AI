import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return NextResponse.json({ notifications: rows });
}

export async function PATCH(req: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, markAllRead } = await req.json();

  if (markAllRead) {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, session.id));
    for (const n of rows) {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, n.id));
    }
    return NextResponse.json({ success: true });
  }

  if (id) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  return NextResponse.json({ success: true });
}
