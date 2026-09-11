// Shared config + validation for request document attachments (ID proofs,
// bonafide supporting letters, fee receipts, etc). Kept deliberately strict:
// a small allow-list of mime types and a hard size cap, both enforced
// server-side (client-side checks in the UI are a UX nicety only, never
// trusted on their own).

import type { Request as RequestRow } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/types";

export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isAllowedDocumentType(mimeType: string): boolean {
  return mimeType in ALLOWED_DOCUMENT_TYPES;
}

export function sanitizeFileName(name: string): string {
  const trimmed = name.trim().slice(0, 150);
  // Strip path separators and anything that isn't a common filename
  // character, to keep the stored name safe to render and to prevent
  // header-injection style tricks when it's echoed back as an attachment
  // filename on download.
  return trimmed.replace(/[^a-zA-Z0-9._\- ]/g, "_") || "document";
}

/**
 * A user may view/attach documents on a request if they're the student who
 * owns it, the faculty member currently assigned to it, or any admin
 * (management needs full visibility for low-confidence review and audit).
 */
export function canAccessRequestDocuments(
  session: SessionUser,
  request: RequestRow
): boolean {
  if (session.role === "admin") return true;
  if (session.role === "student") return request.studentId === session.id;
  if (session.role === "faculty") return request.assignedFacultyId === session.id;
  if (session.role === "hod") return request.departmentId === session.department;
  return false;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
