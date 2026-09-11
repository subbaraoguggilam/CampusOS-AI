"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { NotificationItem, SessionUser } from "@/lib/types";

export default function FacultyNotificationsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    fetch("/api/notifications").then((r) => r.json()).then((d) => setNotifications(d.notifications || []));
  }, []);

  if (!user) return null;

  return (
    <DashboardLayout role={user.role} userName={user.name} title="Notifications">
      <Card>
        <CardHeader><CardTitle>Updates</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No notifications.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`rounded-lg border px-4 py-3 ${!n.read ? "border-campus-200 bg-campus-50" : "border-gray-100"}`}>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-sm text-gray-600">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
