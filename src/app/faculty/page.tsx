"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusColor, statusLabel } from "@/lib/utils";
import type { RequestItem, SessionUser } from "@/lib/types";

export default function FacultyDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    fetch("/api/requests").then((r) => r.json()).then((d) => setRequests(d.requests || []));
  }, []);

  if (!user) return null;

  const pending = requests.filter((r) => ["routed", "in_review", "escalated"].includes(r.status));
  const resolved = requests.filter((r) => ["approved", "resolved", "closed"].includes(r.status));

  return (
    <DashboardLayout
      role={user.role}
      userName={user.name}
      title={user.role === "hod" ? "HOD Dashboard" : "Faculty Dashboard"}
      subtitle={user.role === "hod" ? "Approve and oversee requests for your department" : "Review and process routed student requests"}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pending.length}</p>
              <p className="text-sm text-gray-500">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resolved.length}</p>
              <p className="text-sm text-gray-500">Resolved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-campus-50">
              <FileText className="h-6 w-6 text-campus-600" />
            </div>
            <div>
              <Link href="/faculty/queue" className="text-sm font-medium text-campus-600 hover:underline">
                Open Queue →
              </Link>
              <p className="text-sm text-gray-500">Process requests</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Queue</CardTitle>
          <Link href="/faculty/queue" className="text-sm text-campus-600 flex items-center gap-1 hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No requests assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{r.studentName}</p>
                    <p className="text-xs text-gray-500">{r.templateName || "Unknown"}</p>
                  </div>
                  <Badge className={statusColor(r.status)}>
                    {statusLabel(r.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
