"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusColor, statusLabel } from "@/lib/utils";
import type { RequestItem, SessionUser } from "@/lib/types";

export default function LowConfidencePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [faculty, setFaculty] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<RequestItem | null>(null);
  const [assignFaculty, setAssignFaculty] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    loadData();
  }, []);

  async function loadData() {
    const [reqRes, facRes] = await Promise.all([
      fetch("/api/requests"),
      fetch("/api/faculty"),
    ]);
    const reqData = await reqRes.json();
    const facData = await facRes.json();
    setRequests(
      (reqData.requests || []).filter(
        (r: RequestItem) => r.lowConfidence || r.status === "pending_routing"
      )
    );
    setFaculty(facData.faculty || []);
  }

  async function reassign() {
    if (!selected || !assignFaculty) return;
    await fetch(`/api/requests/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reassign", assignedFacultyId: assignFaculty }),
    });
    setSelected(null);
    setAssignFaculty("");
    loadData();
  }

  if (!user) return null;

  return (
    <DashboardLayout
      role="admin"
      userName={user.name}
      title="Low Confidence Matches"
      subtitle="Review and manually route requests where RAG similarity was below threshold"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Needs Manual Routing</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {requests.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No low-confidence requests pending.
              </p>
            ) : (
              requests.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                    selected?.id === r.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{r.studentName}</span>
                    <Badge className={statusColor(r.status)}>
                      {statusLabel(r.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{r.rawQuery}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    Confidence: {r.confidence ? `${(r.confidence * 100).toFixed(0)}%` : "N/A"}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader><CardTitle>Reassign Request</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">Query</p>
                <p className="text-sm bg-gray-50 rounded-lg p-3">{selected.rawQuery}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Matched Workflow</p>
                <p className="font-medium">{selected.templateName || "None"}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Assign to Faculty</label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={assignFaculty}
                  onChange={(e) => setAssignFaculty(e.target.value)}
                >
                  <option value="">Select faculty member</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <Button onClick={reassign} disabled={!assignFaculty}>
                Reassign & Route
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
