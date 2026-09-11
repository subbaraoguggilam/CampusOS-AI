"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SessionUser } from "@/lib/types";

type Student = { id: string; name: string; email: string; department: string | null; studentId: string | null };
export default function AdminStudentsPage() {
  const [user, setUser] = useState<SessionUser | null>(null); const [students, setStudents] = useState<Student[]>([]); const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]); const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user)); fetch("/api/requests").then(() => {}).catch(() => {}); }, []);
  useEffect(() => { fetch("/api/admin/students").then((r) => r.json()).then((d) => setStudents(d.students || [])); fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments(d.departments || [])); }, []);
  async function save(student: Student) { const response = await fetch(`/api/admin/students/${student.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(student) }); setMessage(response.ok ? "Student details updated." : "Unable to update student."); }
  if (!user) return null;
  return <DashboardLayout role="admin" userName={user.name} title="Student Management" subtitle="Only administrators can update student details, roll numbers, and departments."><Card><CardHeader><CardTitle>Student Records</CardTitle></CardHeader><CardContent className="space-y-3">{students.map((student) => <div key={student.id} className="grid gap-2 rounded-lg border border-gray-100 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"><Input value={student.name} onChange={(e) => setStudents((items) => items.map((item) => item.id === student.id ? { ...item, name: e.target.value } : item))} /><Input value={student.email} onChange={(e) => setStudents((items) => items.map((item) => item.id === student.id ? { ...item, email: e.target.value } : item))} /><Input value={student.studentId || ""} onChange={(e) => setStudents((items) => items.map((item) => item.id === student.id ? { ...item, studentId: e.target.value } : item))} /><select className="h-10 rounded-md border border-gray-200 px-3 text-sm" value={student.department || ""} onChange={(e) => setStudents((items) => items.map((item) => item.id === student.id ? { ...item, department: e.target.value } : item))}>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><Button size="sm" onClick={() => save(student)}><Save className="h-4 w-4" /></Button></div>)}{message && <p className="text-sm text-gray-600">{message}</p>}</CardContent></Card></DashboardLayout>;
}
