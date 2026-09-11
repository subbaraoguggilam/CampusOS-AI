import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth(["admin"]);
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const students = await db.select({ id: users.id, name: users.name, email: users.email, department: users.department, studentId: users.studentId, joiningYear: users.joiningYear, yearOfStudy: users.yearOfStudy }).from(users).where(eq(users.role, "student"));
  return NextResponse.json({ students });
}
