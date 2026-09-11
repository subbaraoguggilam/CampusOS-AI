"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  formatFileSize,
} from "@/lib/documents";
import { formatDate } from "@/lib/utils";
import type { DocumentItem } from "@/lib/types";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix — we send raw base64.
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function DocumentPanel({
  requestId,
  currentUserId,
}: {
  requestId: string;
  currentUserId: string;
}) {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/requests/${requestId}/documents`);
    const data = await res.json();
    setDocs(data.documents || []);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");

    if (!(file.type in ALLOWED_DOCUMENT_TYPES)) {
      setError("Unsupported file type. Use PDF, JPG, PNG, or WEBP.");
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setError("File is larger than the 5 MB limit.");
      return;
    }

    setUploading(true);
    try {
      const data = await fileToBase64(file);
      const res = await fetch(`/api/requests/${requestId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          data,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Upload failed.");
      } else {
        await load();
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string) {
    await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== docId));
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
        <Paperclip className="h-3.5 w-3.5" /> Documents
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-400 py-1">No documents attached yet.</p>
      ) : (
        <div className="space-y-1.5 mb-3">
          {docs.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <a
                  href={`/api/documents/${d.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-campus-700 hover:underline flex items-center gap-1 truncate"
                >
                  <Download className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{d.fileName}</span>
                </a>
                <p className="text-xs text-gray-400">
                  {formatFileSize(d.sizeBytes)} · {d.uploadedByName || d.uploadedByRole} ·{" "}
                  {formatDate(d.createdAt)}
                </p>
              </div>
              {(d.uploadedById === currentUserId) && (
                <button
                  onClick={() => handleDelete(d.id)}
                  className="text-gray-300 hover:text-red-500 shrink-0 ml-2"
                  aria-label="Remove document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 cursor-pointer hover:border-campus-400 hover:text-campus-600 transition-colors">
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <UploadCloud className="h-4 w-4" /> Attach a document (PDF/JPG/PNG, max 5 MB)
          </>
        )}
        <input
          type="file"
          className="hidden"
          disabled={uploading}
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
