"use client";

import { Circle, GraduationCap } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACADEMIC_JOURNEY, STUDENT_PROFILE } from "@/lib/scet";

export default function AcademicJourneyPage() {
  return (
    <DashboardLayout role="student" userName={STUDENT_PROFILE.name} title="Academic Journey" subtitle="Student Workspace  /  My Profile  /  Academic Journey">
      <div className="mx-auto max-w-5xl">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-campus-100 text-campus-700"><GraduationCap className="h-5 w-5" /></div><div><CardTitle className="text-base">Academic Journey</CardTitle><p className="mt-1 text-xs text-gray-500">{STUDENT_PROFILE.batch} · Programme: {STUDENT_PROFILE.branch}</p></div></CardHeader>
          <CardContent><div className="relative ml-2 border-l border-gray-200 pl-8">{ACADEMIC_JOURNEY.map((item, index) => <div key={item.semester} className="relative pb-8 last:pb-1"><span className={`absolute -left-[43px] top-0 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white ${index === 0 ? 'bg-campus-700 text-white' : 'bg-gray-100 text-gray-500'}`}><Circle className="h-2.5 w-2.5 fill-current" /></span><div className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-gray-900">{item.semester}</h3>{index === 0 && <Badge className="bg-campus-100 text-campus-800">Current</Badge>}</div><p className="mt-1 text-xs text-gray-500">{item.status}</p></div><div className="flex flex-wrap gap-2 text-[11px] text-gray-600"><span className="rounded bg-white px-2 py-1">Batch: {STUDENT_PROFILE.batch}</span><span className="rounded bg-white px-2 py-1">Programme: {item.course}</span><span className="rounded bg-white px-2 py-1">{item.result}</span></div></div></div>)}</div></CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
