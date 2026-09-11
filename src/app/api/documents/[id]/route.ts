import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, requests } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { canAccessRequestDocuments } from "@/lib/documents";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [request] = await db
    .select()
    .from(requests)
    .where(eq(requests.id, doc.requestId));
  if (!request || !canAccessRequestDocuments(session, request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bytes = Buffer.from(doc.data, "base64");
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(bytes.length),
      // Documents may contain personal/academic data — never let a shared
      // cache or the browser's disk cache retain them.
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only the original uploader or an admin can remove a document — a
  // faculty reviewer shouldn't be able to delete a student's evidence, and
  // vice versa.
  const isOwner = doc.uploadedById === session.id;
  if (!isOwner && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(documents).where(eq(documents.id, id));
  return NextResponse.json({ success: true });
}
