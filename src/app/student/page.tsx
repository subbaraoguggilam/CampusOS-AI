"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, MessageSquare, Bell, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusColor, statusLabel, formatDate } from "@/lib/utils";
import type { RequestItem, SessionUser } from "@/lib/types";
import { COLLEGE } from "@/lib/scet";

export default function StudentDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [departments, setDepartments] = useState<Array<{ id: string; code: string; name: string }>>([]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    fetch("/api/requests").then((r) => r.json()).then((d) => setRequests(d.requests?.slice(0, 5) || []));
    fetch("/api/notifications").then((r) => r.json()).then((d) => {
      setNotifCount(d.notifications?.filter((n: { read: boolean }) => !n.read).length || 0);
    });
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments(d.departments || []));
  }, []);

  if (!user) return null;

  return (
    <DashboardLayout
      role="student"
      userName={user.name}
      title="Student Dashboard"
      subtitle="Track your campus requests and get AI-guided help"
    >
      <div className="mb-8 rounded-xl border border-campus-100 bg-campus-50/70 px-5 py-4">
        <p className="text-sm font-semibold text-campus-950">{COLLEGE.legalName}</p>
        <p className="mt-1 text-xs text-campus-700">{COLLEGE.affiliation} · College code {COLLEGE.code}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {departments.map((department) => (
            <span key={department.id} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-campus-800 border border-campus-100">
              {department.code}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-campus-50">
                <FileText className="h-6 w-6 text-campus-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{requests.length}</p>
                <p className="text-sm text-gray-500">Recent Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <Link href="/student/new-request" className="text-sm font-medium text-campus-600 hover:underline">
                  New AI Request →
                </Link>
                <p className="text-sm text-gray-500">Offline RAG Assistant</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
                <Bell className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifCount}</p>
                <p className="text-sm text-gray-500">Unread Notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Requests</CardTitle>
          <Link href="/student/requests" className="text-sm text-campus-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">
              No requests yet.{" "}
              <Link href="/student/new-request" className="text-campus-600 hover:underline">
                Submit your first request
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {r.templateName || "Pending Match"}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-md">
                      {r.rawQuery}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColor(r.status)}>
                      {statusLabel(r.status)}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {formatDate(r.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
