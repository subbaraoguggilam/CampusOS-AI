import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    collecting_fields: "bg-yellow-100 text-yellow-800",
    pending_routing: "bg-orange-100 text-orange-800",
    routed: "bg-blue-100 text-blue-800",
    in_review: "bg-indigo-100 text-indigo-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    escalated: "bg-purple-100 text-purple-800",
    resolved: "bg-emerald-100 text-emerald-800",
    closed: "bg-slate-100 text-slate-600",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}

export function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
