"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, GraduationCap } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SessionUser } from "@/lib/types";

type Student = { id: string; name: string; rollNumber: string | null; joiningYear: number | null; yearOfStudy: number | null };
type Subject = { id: string; name: string; semester: number; facultyId: string };
type TimetableSlot = { id: string; subjectId: string; dayOfWeek: number; periodNumber: number; startTime: string; endTime: string; room: string | null };
export default function AcademicRecordsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState<"attendance" | "marks">("attendance");
  const [subject, setSubject] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [periodNumber, setPeriodNumber] = useState("1");
  const [assessment, setAssessment] = useState("Internal Assessment");
  const [attended, setAttended] = useState("0");
  const [total, setTotal] = useState("0");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [rollSearch, setRollSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState("0");
  const [maxScore, setMaxScore] = useState("100");
  const [message, setMessage] = useState("");
  const [branch, setBranch] = useState<{ name: string } | null>(null);

  useEffect(() => { fetch("/api/auth/me").then((r) => r.json()).then((d) => { setUser(d.user); return fetch("/api/departments").then((response) => response.json()).then((departmentsData) => setBranch((departmentsData.departments || []).find((department: { id: string }) => department.id === d.user?.department) || null)); }); fetch("/api/faculty/academic-records").then((r) => r.json()).then((d) => { const roster = d.students || []; setStudents(roster); setAttendanceMap(Object.fromEntries(roster.map((student: Student) => [student.id, true]))); setSubjects(d.subjects || []); setTimetable(d.timetable || []); if (d.subjects?.[0]) { setSubjectId(d.subjects[0].id); setSubject(d.subjects[0].name); } }); }, []);
  const selectedDay = new Date(`${attendanceDate}T00:00:00Z`).getUTCDay();
  const availablePeriods = timetable.filter((slot) => slot.dayOfWeek === selectedDay && (!subjectId || slot.subjectId === subjectId));
  useEffect(() => { const periodsForDate = timetable.filter((slot) => slot.dayOfWeek === new Date(`${attendanceDate}T00:00:00Z`).getUTCDay() && (!subjectId || slot.subjectId === subjectId)); if (periodsForDate.length && !periodsForDate.some((slot) => String(slot.periodNumber) === periodNumber)) setPeriodNumber(String(periodsForDate[0].periodNumber)); }, [attendanceDate, periodNumber, subjectId, timetable]);
  const visibleStudents = students.filter((student) => (yearFilter === "all" || String(student.yearOfStudy) === yearFilter) && ((student.rollNumber || "").toLowerCase().includes(rollSearch.toLowerCase()) || student.name.toLowerCase().includes(rollSearch.toLowerCase())));
  async function save() {
    if ((type === "marks" && !studentId) || !subject) return setMessage(type === "attendance" ? "Enter a subject and mark the branch roster." : "Select a student and enter a subject.");
    const body = type === "attendance" ? { type, subject, subjectId, periodNumber: Number(periodNumber), attendanceDate, entries: Object.entries(attendanceMap).map(([selectedStudentId, present]) => ({ studentId: selectedStudentId, present })), semester: subjects.find((item) => item.id === subjectId)?.semester || 7 } : { type, studentId, subject, subjectId, assessment, score: Number(score), maxScore: Number(maxScore), semester: 7 };
    const response = await fetch("/api/faculty/academic-records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json(); setMessage(response.ok ? "Academic record saved." : data.error || "Unable to save record.");
  }
  if (!user) return null;
  return <DashboardLayout role={user.role} userName={user.name} title="Attendance & Marks" subtitle="Faculty entry is restricted to your department students.">
    <div className="mx-auto max-w-3xl"><Card className="mb-5 border-campus-100 bg-campus-50/50"><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-campus-600">Active branch</p><p className="mt-1 font-semibold text-campus-950">{branch?.name || user.department}</p><p className="mt-1 text-xs text-campus-700">Only students in this branch are listed, ordered by roll number.</p></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-campus-600" /> Update Academic Record</CardTitle></CardHeader><CardContent className="space-y-5">
      <div className="flex gap-2"><Button variant={type === "attendance" ? "primary" : "outline"} onClick={() => setType("attendance")}>Attendance</Button><Button variant={type === "marks" ? "primary" : "outline"} onClick={() => setType("marks")}>Marks</Button></div>
      {type === "attendance" ? <div className="space-y-3"><div className="grid gap-4 sm:grid-cols-4"><Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} /><select className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setSubject(subjects.find((item) => item.id === e.target.value)?.name || ""); }}><option value="">Select subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm" value={periodNumber} onChange={(e) => setPeriodNumber(e.target.value)}><option value="">Select period</option>{availablePeriods.map((slot) => <option key={slot.id} value={slot.periodNumber}>Period {slot.periodNumber} · {slot.startTime}-{slot.endTime}</option>)}</select><select className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}><option value="all">All years</option><option value="1">1st Year · 2026</option><option value="2">2nd Year · 2025</option><option value="3">3rd Year · 2024</option><option value="4">4th Year · 2023</option></select></div><Input placeholder="Search roll number" value={rollSearch} onChange={(e) => setRollSearch(e.target.value)} /><p className="text-xs text-gray-500">Only timetable periods for the selected date and subject can be recorded.</p><div className="rounded-lg border border-gray-200"><div className="grid grid-cols-[1fr_auto] border-b bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500"><span>Student / Roll Number</span><span>Present</span></div><div className="max-h-80 overflow-y-auto">{visibleStudents.map((student) => <label key={student.id} className="grid cursor-pointer grid-cols-[1fr_auto] items-center border-b border-gray-100 px-4 py-3 text-sm last:border-0"><span><span className="font-medium">{student.rollNumber}</span><span className="ml-2 text-gray-500">{student.name} · Year {student.yearOfStudy}</span></span><input type="checkbox" checked={attendanceMap[student.id] ?? true} onChange={(e) => setAttendanceMap((current) => ({ ...current, [student.id]: e.target.checked }))} /></label>)}{visibleStudents.length === 0 && <p className="p-4 text-sm text-gray-500">No students found in your branch.</p>}</div></div></div> : <div><label className="text-xs text-gray-500">Student</label><select className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm" value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">Select student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.rollNumber} · {student.name}</option>)}</select></div>}
      {type === "marks" && <div className="grid gap-4 sm:grid-cols-2"><div><label className="text-xs text-gray-500">Subject</label><select className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setSubject(subjects.find((item) => item.id === e.target.value)?.name || ""); }}><option value="">Select subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><label className="text-xs text-gray-500">Assessment</label><Input className="mt-1" placeholder="Internal Assessment" value={assessment} onChange={(e) => setAssessment(e.target.value)} /></div></div>}
      {type === "marks" && <div className="grid gap-4 sm:grid-cols-2"><div><label className="text-xs text-gray-500">Obtained marks (x)</label><Input className="mt-1" type="number" min="0" step="0.01" placeholder="0" value={score} onChange={(e) => setScore(e.target.value)} /></div><div><label className="text-xs text-gray-500">Total marks (y)</label><Input className="mt-1" type="number" min="0.01" step="0.01" placeholder="100" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} /></div></div>}
      <Button onClick={save}><GraduationCap className="h-4 w-4" /> Save Record</Button>{message && <p className="text-sm text-gray-600">{message}</p>}
    </CardContent></Card></div>
  </DashboardLayout>;
}
