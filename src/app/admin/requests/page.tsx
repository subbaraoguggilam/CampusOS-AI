"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusColor, statusLabel, formatDate } from "@/lib/utils";
import { DocumentPanel } from "@/components/document-panel";
import type { RequestItem, SessionUser } from "@/lib/types";

export default function AdminRequestsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selected, setSelected] = useState<RequestItem | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    fetch("/api/requests").then((r) => r.json()).then((d) => setRequests(d.requests || []));
  }, []);

  if (!user) return null;

  return (
    <DashboardLayout role="admin" userName={user.name} title="All Requests">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Cross-Department View</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Workflow</th>
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Confidence</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors ${
                        selected?.id === r.id ? "bg-campus-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="py-3">{r.studentName}</td>
                      <td className="py-3">{r.templateName || "—"}</td>
                      <td className="py-3">{r.departmentName || "—"}</td>
                      <td className="py-3">
                        <Badge className={statusColor(r.status)}>
                          {statusLabel(r.status)}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {r.confidence
                          ? `${(r.confidence * 100).toFixed(0)}%`
                          : "—"}
                        {r.lowConfidence ? (
                          <span className="text-orange-500 ml-1">⚠</span>
                        ) : null}
                      </td>
                      <td className="py-3 text-gray-400">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {selected ? (
          <Card>
            <CardHeader><CardTitle>Request Detail</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">Student</p>
                <p className="font-medium">{selected.studentName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Query</p>
                <p className="text-sm bg-gray-50 rounded-lg p-3">{selected.rawQuery}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Submitted Fields</p>
                <div className="space-y-1">
                  {Object.entries(selected.fieldData || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-500 capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              {selected.facultyRemarks && (
                <div>
                  <p className="text-xs text-gray-500">Faculty Remarks</p>
                  <p className="text-sm bg-gray-50 rounded-lg p-3">{selected.facultyRemarks}</p>
                </div>
              )}
              <DocumentPanel requestId={selected.id} currentUserId={user.id} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Select a request to view details & documents
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
