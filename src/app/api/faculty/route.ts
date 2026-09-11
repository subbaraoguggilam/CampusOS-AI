import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth(["admin"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const faculty = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      department: users.department,
    })
    .from(users)
    .where(eq(users.role, "faculty"));

  return NextResponse.json({ faculty });
}
