import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(departments).orderBy(asc(departments.code));
  return NextResponse.json({ departments: rows });
}
