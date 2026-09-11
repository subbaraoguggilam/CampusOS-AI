"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricsData, SessionUser } from "@/lib/types";

export default function AdminMetricsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    fetch("/api/admin/metrics").then((r) => r.json()).then(setMetrics);
  }, []);

  if (!user || !metrics) return null;

  const byStatus = metrics.byStatus || {};
  const templateStats = metrics.templateStats || [];
  const maxCount = Math.max(...templateStats.map((t) => t.count), 1);

  return (
    <DashboardLayout
      role="admin"
      userName={user.name}
      title="Resolution Metrics"
      subtitle="Volume, turnaround time, and bottleneck analysis"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Requests", value: metrics.totalRequests },
          { label: "Pending", value: metrics.pendingRequests },
          { label: "Resolved", value: metrics.resolvedRequests },
          { label: "Avg Turnaround", value: `${metrics.avgTurnaroundHours}h` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-campus-700">{value}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Requests by Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize">{status.replace(/_/g, " ")}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-campus-500 rounded-full"
                    style={{
                      width: `${(count / (metrics.totalRequests || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Requests by Workflow</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {templateStats.map(({ name, count }) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{name}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
