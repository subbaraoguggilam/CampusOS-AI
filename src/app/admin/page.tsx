"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, AlertTriangle, CheckCircle, Clock, Users, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricsData, SessionUser } from "@/lib/types";

export default function AdminDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    fetch("/api/admin/metrics").then((r) => r.json()).then(setMetrics);
  }, []);

  if (!user) return null;

  const userCounts = metrics?.userCounts || { students: 0, faculty: 0, admins: 0 };

  return (
    <DashboardLayout
      role="admin"
      userName={user.name}
      title="Management Dashboard"
      subtitle="Oversight across all requests, departments, and resolution metrics"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Requests", value: metrics?.totalRequests ?? 0, icon: FileText, color: "bg-campus-50 text-campus-600" },
          { label: "Pending", value: metrics?.pendingRequests ?? 0, icon: Clock, color: "bg-orange-50 text-orange-600" },
          { label: "Low Confidence", value: metrics?.lowConfidenceCount ?? 0, icon: AlertTriangle, color: "bg-red-50 text-red-600" },
          { label: "Resolved", value: metrics?.resolvedRequests ?? 0, icon: CheckCircle, color: "bg-green-50 text-green-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/low-confidence" className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 hover:bg-orange-100 transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium">Review Low Confidence Matches</span>
              </div>
              <ArrowRight className="h-4 w-4 text-orange-600" />
            </Link>
            <Link href="/admin/requests" className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-campus-600" />
                <span className="text-sm font-medium">View All Requests</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </Link>
            <Link href="/admin/metrics" className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-campus-600" />
                <span className="text-sm font-medium">Resolution Metrics</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Platform Overview</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Students</span>
              <span className="font-medium">{userCounts.students ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Faculty</span>
              <span className="font-medium">{userCounts.faculty ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Admins</span>
              <span className="font-medium">{userCounts.admins ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-3">
              <span className="text-gray-500">Avg Turnaround</span>
              <span className="font-medium">{metrics?.avgTurnaroundHours ?? 0}h</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
