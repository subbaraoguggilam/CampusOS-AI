"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Bell,
  Users,
  BarChart3,
  LogOut,
  GraduationCap,
  CreditCard,
  UserRound,
  Route,
  ClipboardCheck,
  WalletCards,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: "student" | "faculty" | "hod" | "admin";
  userName: string;
}

const NAV: Record<string, { href: string; label: string; icon: React.ElementType }[]> = {
  student: [
    { href: "/student", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/profile", label: "My Profile", icon: UserRound },
    { href: "/student/academic-journey", label: "Academic Journey", icon: Route },
    { href: "/student/attendance", label: "Attendance", icon: ClipboardCheck },
    { href: "/student/new-request", label: "New Request", icon: MessageSquare },
    { href: "/student/requests", label: "My Requests", icon: FileText },
    { href: "/student/notifications", label: "Notifications", icon: Bell },
    { href: "/student/payments", label: "Payments", icon: WalletCards },
  ],
  faculty: [
    { href: "/faculty", label: "Dashboard", icon: LayoutDashboard },
    { href: "/faculty/queue", label: "Request Queue", icon: FileText },
    { href: "/faculty/academic-records", label: "Attendance & Marks", icon: ClipboardList },
    { href: "/faculty/notifications", label: "Notifications", icon: Bell },
  ],
  hod: [
    { href: "/faculty", label: "HOD Dashboard", icon: LayoutDashboard },
    { href: "/faculty/queue", label: "Department Queue", icon: FileText },
    { href: "/faculty/academic-records", label: "Attendance & Marks", icon: ClipboardList },
    { href: "/faculty/notifications", label: "Notifications", icon: Bell },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/requests", label: "All Requests", icon: FileText },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/low-confidence", label: "Low Confidence", icon: Users },
    { href: "/admin/metrics", label: "Metrics", icon: BarChart3 },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
  ],
};

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const links = NAV[role] || [];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-campus-950 text-white">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-campus-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-campus-600">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{role === "student" ? "Swarnandhra College" : "CampusOS AI"}</p>
          <p className="text-xs text-campus-300">{role === "hod" ? "Head of Department" : `${role} Portal`}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === href
                ? "bg-campus-700 text-white"
                : "text-campus-200 hover:bg-campus-800 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-campus-800 px-4 py-4">
        <p className="text-sm font-medium truncate">{userName}</p>
        <button
          onClick={logout}
          className="mt-2 flex items-center gap-2 text-xs text-campus-300 hover:text-white transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
