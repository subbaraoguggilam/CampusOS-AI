"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RagChat } from "@/components/rag-chat";

export default function NewRequestPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  async function handleSubmit(
    query: string,
    fieldData: Record<string, string>,
    templateId?: string
  ) {
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, fieldData, templateId }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.status === "collecting_fields") {
        setMessage(`Please fill in: ${(data.missingFields || []).map((field: string) => field.replace(/_/g, " ")).join(", ")}.`);
        return;
      }
      if (!res.ok) {
        setMessage(data.error || "Unable to submit request. Please try again.");
        return;
      }
      if (data.id) {
        setMessage(data.message || "Request submitted successfully.");
        setTimeout(() => router.push("/student/requests"), 1200);
      }
    } catch {
      setMessage("Unable to reach the request service. Please check the server and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <DashboardLayout
      role="student"
      userName={user.name}
      title="New Request"
      subtitle="Describe your need — our AI orchestrator will analyze, check policy, and route it"
    >
      {message && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}
      {submitting && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          Submitting your request...
        </div>
      )}
      <RagChat onSubmitRequest={handleSubmit} />
    </DashboardLayout>
  );
}
