"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { statusColor, statusLabel, formatDate } from "@/lib/utils";
import { DocumentPanel } from "@/components/document-panel";
import { AgentActivityPanel } from "@/components/agent-activity-panel";
import { AiRecommendationBanner } from "@/components/ai-recommendation-banner";
import { RequestTimeline } from "@/components/request-timeline";
import type { RequestItem, SessionUser, ApprovalItem } from "@/lib/types";

export default function FacultyQueuePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selected, setSelected] = useState<RequestItem | null>(null);
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalItem[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    loadRequests();
  }, []);

  async function loadRequests() {
    const res = await fetch("/api/requests");
    const data = await res.json();
    setRequests(data.requests || []);
  }

  async function selectRequest(request: RequestItem) {
    setSelected(request);
    const response = await fetch(`/api/requests/${request.id}`);
    const data = await response.json();
    setApprovalHistory(data.approvals || []);
    setSelected((prev) => (prev && prev.id === request.id ? { ...prev, ...data } : prev));
  }

  async function handleAction(action: string) {
    if (!selected) return;
    if (action === "request_more_info" && !remarks.trim()) {
      alert("Please add a remark describing what information is needed.");
      return;
    }
    setActionLoading(true);
    const res = await fetch(`/api/requests/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, remarks }),
    });
    setActionLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "That action isn't allowed for this request right now.");
      return;
    }
    setRemarks("");
    setSelected(null);
    setApprovalHistory([]);
    loadRequests();
  }

  if (!user) return null;

  return (
    <DashboardLayout role={user.role} userName={user.name} title={user.role === "hod" ? "Department Queue" : "Request Queue"}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>{user.role === "hod" ? "Department Requests" : "Assigned Requests"}</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[700px] overflow-y-auto">
            {requests.map((r) => (
              <button
                key={r.id}
                onClick={() => selectRequest(r)}
                className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                  selected?.id === r.id ? "border-campus-500 bg-campus-50" : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{r.studentName}</p>
                    <p className="text-xs text-gray-500">{r.templateName || "Pending"}</p>
                  </div>
                  <Badge className={statusColor(r.status)}>
                    {statusLabel(r.status)}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-1 truncate">{r.rawQuery}</p>
              </button>
            ))}
          </CardContent>
        </Card>
        {selected ? (
          <Card>
            <CardHeader><CardTitle>Review Request</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Student</p>
                  <p className="font-medium">{selected.studentName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Workflow</p>
                  <p className="font-medium">{selected.templateName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Confidence</p>
                  <p className="font-medium">
                    {selected.confidence
                      ? `${(selected.confidence * 100).toFixed(0)}%`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Submitted</p>
                  <p className="font-medium">{formatDate(selected.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Original Query</p>
                <p className="text-sm bg-gray-50 rounded-lg p-3">{selected.rawQuery}</p>
              </div>

              {selected.aiRecommendation && (
                <AiRecommendationBanner
                  decision={selected.aiRecommendation}
                  reason={selected.aiRecommendationReason}
                  confidence={selected.confidence}
                />
              )}

              {selected.agentSteps && selected.agentSteps.length > 0 && (
                <AgentActivityPanel steps={selected.agentSteps} />
              )}

              <RequestTimeline request={selected} approvals={approvalHistory} />

              <div>
                <p className="text-xs text-gray-500 mb-2">Pre-filled Fields (RAG extracted)</p>
                <div className="space-y-1 bg-gray-50 rounded-lg p-3">
                  {Object.entries(selected.fieldData || {}).map(
                    ([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-gray-500 capitalize">{k.replace(/_/g, " ")}</span>
                        <span>{v}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <DocumentPanel requestId={selected.id} currentUserId={user.id} />

              {approvalHistory.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Approval history</p>
                  <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                    {approvalHistory.map((approval) => (
                      <div key={approval.id} className="flex items-start justify-between gap-3 text-xs">
                        <span className="font-medium capitalize">{approval.decision} by {approval.approverRole}</span>
                        <span className="text-gray-500">{approval.remarks || "No remarks"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-500">Remarks</label>
                <Input
                  className="mt-1"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add remarks for the student..."
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {!["in_review"].includes(selected.status) && (
                  <Button size="sm" variant="outline" onClick={() => handleAction("start_review")} disabled={actionLoading}>
                    Start Review
                  </Button>
                )}
                <Button size="sm" onClick={() => handleAction("approve")} disabled={actionLoading}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleAction("reject")} disabled={actionLoading}>
                  Reject
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleAction("request_more_info")} disabled={actionLoading}>
                  Request More Information
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleAction("escalate")} disabled={actionLoading}>
                  Escalate
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAction("resolve")} disabled={actionLoading}>
                  Resolve & Close
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Select a request to review
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
