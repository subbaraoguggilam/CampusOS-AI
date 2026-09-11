"use client";

import { Sidebar } from "./sidebar";
import { COLLEGE } from "@/lib/scet";

interface DashboardLayoutProps {
  role: "student" | "faculty" | "hod" | "admin";
  userName: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function DashboardLayout({
  role,
  userName,
  title,
  subtitle,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={role} userName={userName} />
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-5 py-4 md:px-8 md:py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-campus-600 font-semibold">{COLLEGE.name}</p>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
            </div>
            <span className="hidden sm:block text-xs text-gray-400">{COLLEGE.location}</span>
          </div>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </header>
        <div className="p-5 md:p-8">{children}</div>
      </main>
    </div>
  );
}
