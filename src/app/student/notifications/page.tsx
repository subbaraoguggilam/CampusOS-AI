"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { NotificationItem, SessionUser } from "@/lib/types";

export default function StudentNotificationsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user));
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setNotifications(data.notifications || []);
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    loadNotifications();
  }

  if (!user) return null;

  return (
    <DashboardLayout role="student" userName={user.name} title="Notifications">
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={markAllRead}>
          Mark all read
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Updates</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No notifications.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-lg border px-4 py-3 ${
                  !n.read ? "border-campus-200 bg-campus-50" : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-4">
                    {formatDate(n.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
