import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import { attendanceRecords, marks, subjects, timetable, users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const session = await requireAuth(["faculty", "hod"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const students = await db.select({ id: users.id, name: users.name, rollNumber: users.studentId, department: users.department, joiningYear: users.joiningYear, yearOfStudy: users.yearOfStudy })
    .from(users).where(and(eq(users.role, "student"), eq(users.department, session.department || ""))).orderBy(asc(users.studentId));
  const attendance = await db.select().from(attendanceRecords).where(eq(attendanceRecords.facultyId, session.id));
  const studentMarks = await db.select().from(marks).where(eq(marks.facultyId, session.id));
  const departmentSubjects = await db.select().from(subjects).where(eq(subjects.departmentId, session.department || ""));
  const departmentTimetable = await db.select().from(timetable).where(eq(timetable.departmentId, session.department || ""));
  return NextResponse.json({ students, attendance, marks: studentMarks, subjects: departmentSubjects, timetable: departmentTimetable });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth(["faculty", "hod"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const now = new Date().toISOString();
  if (body.type === "attendance") {
    const entries = Array.isArray(body.entries)
      ? body.entries
      : [{ studentId: body.studentId, present: body.present }];
    if (!body.subject || !body.attendanceDate || entries.length === 0) {
      return NextResponse.json({ error: "Branch, subject, date, and attendance entries are required" }, { status: 400 });
    }
    const semester = Number(body.semester);
    const periodNumber = Number(body.periodNumber);
    const date = typeof body.attendanceDate === "string" ? new Date(`${body.attendanceDate}T00:00:00Z`) : null;
    if (!body.subjectId || !Number.isInteger(semester) || semester < 1 || semester > 8 || !Number.isInteger(periodNumber) || !date || Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Select a valid subject, semester, date, and period" }, { status: 400 });
    }
    const [selectedSubject] = await db.select().from(subjects).where(and(eq(subjects.id, body.subjectId), eq(subjects.departmentId, session.department || "")));
    if (!selectedSubject || selectedSubject.name !== body.subject || selectedSubject.semester !== semester || (session.role === "faculty" && selectedSubject.facultyId !== session.id)) {
      return NextResponse.json({ error: "This subject is not assigned to you in your department" }, { status: 403 });
    }
    const [scheduledPeriod] = await db.select().from(timetable).where(and(
      eq(timetable.departmentId, session.department || ""),
      eq(timetable.subjectId, selectedSubject.id),
      eq(timetable.periodNumber, periodNumber),
      eq(timetable.dayOfWeek, date.getUTCDay()),
    ));
    if (!scheduledPeriod) {
      return NextResponse.json({ error: `${selectedSubject.name} is not scheduled for Period ${periodNumber} on this date.` }, { status: 400 });
    }
    const studentIds = entries.map((entry: { studentId: string }) => entry.studentId);
    if (new Set(studentIds).size !== studentIds.length || entries.some((entry: { studentId?: string; present?: unknown }) => !entry.studentId || typeof entry.present !== "boolean")) {
      return NextResponse.json({ error: "Each student must have one Present or Absent value" }, { status: 400 });
    }
    const departmentStudents = await db.select().from(users).where(and(eq(users.role, "student"), eq(users.department, session.department || "")));
    const allowedIds = new Set(departmentStudents.map((student) => student.id));
    if (studentIds.some((studentId: string) => !allowedIds.has(studentId))) {
      return NextResponse.json({ error: "Attendance can only be taken for students in your department" }, { status: 403 });
    }
    for (const entry of entries as { studentId: string; present: boolean }[]) {
      await db.delete(attendanceRecords).where(and(
        eq(attendanceRecords.studentId, entry.studentId),
        eq(attendanceRecords.subjectId, selectedSubject.id),
        eq(attendanceRecords.attendanceDate, body.attendanceDate),
        eq(attendanceRecords.periodNumber, periodNumber),
      ));
      await db.insert(attendanceRecords).values({
        id: uuid(), studentId: entry.studentId, facultyId: session.id, subjectId: selectedSubject.id, subject: selectedSubject.name,
        periodNumber, attendedClasses: entry.present ? 1 : 0, totalClasses: 1, semester,
        attendanceDate: body.attendanceDate, present: entry.present, updatedAt: now,
      });
    }
  } else if (body.type === "marks") {
    const [student] = await db.select().from(users).where(eq(users.id, body.studentId));
    if (!student || student.role !== "student" || student.department !== session.department) {
      return NextResponse.json({ error: "Student is outside your department" }, { status: 403 });
    }
    const obtainedMarks = Number(body.score);
    const totalMarks = Number(body.maxScore);
    const [selectedSubject] = await db.select().from(subjects).where(and(eq(subjects.id, body.subjectId), eq(subjects.departmentId, session.department || "")));
    if (!selectedSubject || selectedSubject.name !== body.subject || (session.role === "faculty" && selectedSubject.facultyId !== session.id)) {
      return NextResponse.json({ error: "This subject is not assigned to you in your department" }, { status: 403 });
    }
    if (!body.assessment || !Number.isFinite(obtainedMarks) || !Number.isFinite(totalMarks) || totalMarks <= 0 || obtainedMarks < 0 || obtainedMarks > totalMarks) {
      return NextResponse.json({ error: "Obtained marks (x) must be between 0 and total marks (y), and x cannot be greater than y" }, { status: 400 });
    }
    await db.insert(marks).values({ id: uuid(), studentId: student.id, facultyId: session.id, subject: selectedSubject.name, assessment: body.assessment, score: obtainedMarks, maxScore: totalMarks, semester: selectedSubject.semester, updatedAt: now });
  } else return NextResponse.json({ error: "Record type must be attendance or marks" }, { status: 400 });
  return NextResponse.json({ success: true });
}
