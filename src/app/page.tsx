import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  Brain,
  Workflow,
  Shield,
  Bell,
  BarChart3,
  Users,
} from "lucide-react";
import { COLLEGE } from "@/lib/scet";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";

export default async function HomePage() {
  noStore();
  const branchMaster = await db.select().from(departments).orderBy(asc(departments.code));
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-campus-600">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900">{COLLEGE.name}</span>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">CampusOS AI portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-campus-600 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-campus-600 px-4 py-2 text-sm font-medium text-white hover:bg-campus-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <section className="gradient-hero px-8 py-24 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm mb-6">
            <Brain className="h-4 w-4" />
            Offline RAG • Workflow Automation • Phase 1 + 2
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Swarnandhra College
            <br />
            Student Workspace
          </h1>
          <p className="text-lg text-campus-100 mb-8 max-w-2xl mx-auto">
            CampusOS AI for {COLLEGE.legalName} understands student requests in plain English, matches them to the
            right workflow using offline RAG, collects required information, routes to
            faculty, and tracks every request until resolution.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-campus-800 hover:bg-campus-50 transition-colors"
            >
              Launch Platform <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-white px-8 py-12">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-600">Academic Departments</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">Connected academic branches</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {branchMaster.map((department) => <div key={department.id} className="rounded-xl border border-gray-200 p-5 text-left"><p className="text-sm font-bold text-campus-700">{department.code} · {department.shortName}</p><p className="mt-1 text-sm text-gray-600">{department.name}</p></div>)}
          </div>
        </div>
      </section>

      <section className="px-8 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Complete Request-to-Resolution Flow
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
            From student submission to faculty action to resolution — with management oversight at every step.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { step: "1", label: "Student Submits", color: "bg-green-500" },
              { step: "2", label: "RAG Matches", color: "bg-purple-500" },
              { step: "3", label: "Workflow Routes", color: "bg-indigo-500" },
              { step: "4", label: "Faculty Acts", color: "bg-orange-500" },
              { step: "5", label: "Notifies Student", color: "bg-amber-600" },
              { step: "6", label: "Resolved & Closed", color: "bg-emerald-600" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div
                  className={`${s.color} text-white rounded-xl py-4 px-3 text-sm font-semibold mb-2`}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-8 py-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Brain,
              title: "Offline RAG Engine",
              desc: "Local vector search matches student queries to workflow templates — no external API needed.",
            },
            {
              icon: Workflow,
              title: "Smart Workflow Routing",
              desc: "Auto-routes requests to the right department and faculty. Low-confidence matches flagged for admin.",
            },
            {
              icon: Shield,
              title: "Role-Based Access",
              desc: "Dedicated portals for students, faculty, and management with secure JWT authentication.",
            },
            {
              icon: Bell,
              title: "Real-time Notifications",
              desc: "In-app notifications keep students and staff updated on every status change.",
            },
            {
              icon: BarChart3,
              title: "Admin Analytics",
              desc: "Resolution metrics, turnaround times, and bottleneck analysis for management.",
            },
            {
              icon: Users,
              title: "8+ Workflows",
              desc: "Bonafide, TC, Leave, Revaluation, Library, Internship NOC, Fee Concession, Hostel.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-campus-50 mb-4">
                <Icon className="h-6 w-6 text-campus-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-100 px-8 py-8 text-center text-sm text-gray-400">
        CampusOS AI — Swarnandhra College Hackathon 2026 • Problem Statement 4
      </footer>
    </div>
  );
}
