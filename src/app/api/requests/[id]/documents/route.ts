import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { documents, requests, users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import {
  MAX_DOCUMENT_SIZE_BYTES,
  canAccessRequestDocuments,
  isAllowedDocumentType,
  sanitizeFileName,
} from "@/lib/documents";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [request] = await db.select().from(requests).where(eq(requests.id, id));
  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canAccessRequestDocuments(session, request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: documents.id,
      requestId: documents.requestId,
      uploadedById: documents.uploadedById,
      uploadedByRole: documents.uploadedByRole,
      fileName: documents.fileName,
      mimeType: documents.mimeType,
      sizeBytes: documents.sizeBytes,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.requestId, id));

  const uploaderIds = Array.from(new Set(rows.map((r) => r.uploadedById)));
  const uploaders = uploaderIds.length
    ? await db.select().from(users)
    : [];
  const nameById = new Map(uploaders.map((u) => [u.id, u.name]));

  return NextResponse.json({
    documents: rows.map((r) => ({
      ...r,
      uploadedByName: nameById.get(r.uploadedById),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [request] = await db.select().from(requests).where(eq(requests.id, id));
  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canAccessRequestDocuments(session, request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { fileName, mimeType, sizeBytes, data } = body || {};

  if (!fileName || !mimeType || !data || typeof sizeBytes !== "number") {
    return NextResponse.json(
      { error: "fileName, mimeType, sizeBytes, and data are required" },
      { status: 400 }
    );
  }

  if (!isAllowedDocumentType(mimeType)) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: PDF, JPG, PNG, WEBP." },
      { status: 415 }
    );
  }

  if (sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File exceeds the 5 MB limit." },
      { status: 413 }
    );
  }

  // Reject a size claim that doesn't roughly match the base64 payload —
  // a cheap guard against a client lying about sizeBytes to slip past the
  // check above.
  const approxDecodedBytes = Math.floor((data.length * 3) / 4);
  if (Math.abs(approxDecodedBytes - sizeBytes) > sizeBytes * 0.1 + 1024) {
    return NextResponse.json({ error: "File data is inconsistent with declared size." }, { status: 400 });
  }

  const documentId = uuid();
  const now = new Date().toISOString();

  await db.insert(documents).values({
    id: documentId,
    requestId: id,
    uploadedById: session.id,
    uploadedByRole: session.role,
    fileName: sanitizeFileName(fileName),
    mimeType,
    sizeBytes,
    data,
    createdAt: now,
  });

  // Notify the other side of the conversation that a new document landed.
  if (session.role === "student" && request.assignedFacultyId) {
    await createNotification(
      request.assignedFacultyId,
      "Document Attached",
      `${session.name} attached a document to their request.`,
      id
    );
  } else if (session.role !== "student") {
    await createNotification(
      request.studentId,
      "Document Attached",
      `${session.name} attached a document to your request.`,
      id
    );
  }

  return NextResponse.json({
    id: documentId,
    fileName: sanitizeFileName(fileName),
    mimeType,
    sizeBytes,
    createdAt: now,
  });
}
