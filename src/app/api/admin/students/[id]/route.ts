import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(["admin"]);
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const updates: {
    name?: string;
    email?: string;
    department?: string;
    studentId?: string;
    joiningYear?: number;
    yearOfStudy?: number;
  } = {};
  for (const field of ["name", "email", "department", "studentId"] as const) {
    if (typeof body[field] === "string") updates[field] = body[field].trim();
  }
  for (const field of ["joiningYear", "yearOfStudy"] as const) {
    if (Number.isInteger(body[field])) updates[field] = body[field];
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning({ id: users.id, name: users.name, email: users.email, department: users.department, studentId: users.studentId, joiningYear: users.joiningYear, yearOfStudy: users.yearOfStudy });
  if (!updated) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  return NextResponse.json({ student: updated });
}
