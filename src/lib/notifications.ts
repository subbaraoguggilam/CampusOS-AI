import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  requestId?: string
) {
  await db.insert(notifications).values({
    id: uuid(),
    userId,
    requestId: requestId || null,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
}
