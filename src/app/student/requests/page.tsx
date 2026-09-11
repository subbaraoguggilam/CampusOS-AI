"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusColor, statusLabel, formatDate } from "@/lib/utils";
import { DocumentPanel } from "@/components/document-panel";
import { RequestTimeline } from "@/components/request-timeline";
import type { RequestItem, SessionUser, ApprovalItem } from "@/lib/types";

export default function StudentRequestsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selected, setSelected] = useState<RequestItem | null>(null);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    fetch("/api/requests").then((r) => r.json()).then((d) => setRequests(d.requests || []));
  }, []);

  async function selectRequest(request: RequestItem) {
    setSelected(request);
    setApprovals([]);
    const res = await fetch(`/api/requests/${request.id}`);
    const data = await res.json();
    setApprovals(data.approvals || []);
    setSelected((prev) => (prev && prev.id === request.id ? { ...prev, ...data } : prev));
  }

  if (!user) return null;

  return (
    <DashboardLayout role="student" userName={user.name} title="My Requests">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>All Requests</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {requests.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No requests yet.</p>
            ) : (
              requests.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectRequest(r)}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                    selected?.id === r.id
                      ? "border-campus-500 bg-campus-50"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {r.templateName || "Pending"}
                    </span>
                    <Badge className={statusColor(r.status)}>
                      {statusLabel(r.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{r.rawQuery}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(r.createdAt)}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {selected && (
          <div className="space-y-4">
          <RequestTimeline request={selected} approvals={approvals} />
          <Card>
            <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">Workflow</p>
                <p className="font-medium">{selected.templateName || "Pending Match"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Your Query</p>
                <p className="text-sm">{selected.rawQuery}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Submitted Fields</p>
                <div className="space-y-1">
                  {Object.entries(selected.fieldData || {}).map(
                    ([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-gray-500 capitalize">{k.replace(/_/g, " ")}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
              {selected.confidence != null && (
                <div>
                  <p className="text-xs text-gray-500">RAG Confidence</p>
                  <p className="text-sm font-medium">
                    {(selected.confidence * 100).toFixed(0)}%
                    {selected.lowConfidence ? (
                      <span className="text-orange-600 ml-2">(Admin review)</span>
                    ) : null}
                  </p>
                </div>
              )}
              {selected.facultyRemarks && (
                <div>
                  <p className="text-xs text-gray-500">Faculty Remarks</p>
                  <p className="text-sm bg-gray-50 rounded-lg p-3">{selected.facultyRemarks}</p>
                </div>
              )}
              <DocumentPanel requestId={selected.id} currentUserId={user.id} />
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
