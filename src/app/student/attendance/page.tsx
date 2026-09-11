"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ATTENDANCE, STUDENT_PROFILE } from "@/lib/scet";

export default function AttendancePage() {
  const [semester, setSemester] = useState(7);
  return (
    <DashboardLayout role="student" userName={STUDENT_PROFILE.name} title="Attendance" subtitle="Student Workspace  /  My Profile  /  Attendance">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Semester attendance">
          {Array.from({ length: 7 }, (_, index) => index + 1).map((item) => <button key={item} onClick={() => setSemester(item)} className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${semester === item ? "bg-campus-700 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-campus-300"}`}>Semester {item}</button>)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[['Final Attendance', `${ATTENDANCE.final}%`], ['Primary Attendance', `${ATTENDANCE.primary}%`], ['Class Average', `${ATTENDANCE.classAverage}%`], ['Total Classes', `${ATTENDANCE.attended}/${ATTENDANCE.total}`]].map(([label, value]) => <Card key={label}><CardContent className="p-5"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900">{value}</p></CardContent></Card>)}
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <Card><CardHeader><CardTitle className="text-base">Subject Attendance · Semester {semester}</CardTitle></CardHeader><CardContent className="space-y-4">{ATTENDANCE.subjects.map((subject) => <div key={subject.name}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="text-gray-700">{subject.name}</span><span className="font-semibold text-gray-600">{subject.value}%</span></div><div className="h-2 rounded-full bg-gray-100"><div className={`h-2 rounded-full ${subject.tone}`} style={{ width: `${subject.value}%` }} /></div></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Attendance Calendar</CardTitle></CardHeader><CardContent><div className="mb-4 flex items-center justify-between text-sm font-medium"><span>September 2026</span><CalendarDays className="h-4 w-4 text-campus-600" /></div><div className="grid grid-cols-7 gap-2 text-center text-[10px] text-gray-400">{['S','M','T','W','T','F','S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}{Array.from({ length: 30 }, (_, index) => <span key={index} className={`flex h-7 items-center justify-center rounded-full ${index % 5 === 0 ? 'bg-orange-100 text-orange-700' : index % 7 === 0 ? 'bg-purple-100 text-purple-700' : 'text-gray-600'}`}>{index + 1}</span>)}</div><div className="mt-5 space-y-2 text-xs text-gray-500"><p className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Present</p><p className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-orange-500" /> Absent</p><p className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-purple-500" /> Partially Present</p></div></CardContent></Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
