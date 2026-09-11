"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, UserRound } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STUDENT_PROFILE } from "@/lib/scet";

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button className="flex w-full items-center justify-between px-5 py-4 text-left" onClick={() => setOpen((value) => !value)}>
        <CardTitle className="text-base">{title}</CardTitle>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <CardContent className="border-t border-gray-100 pt-5">{children}</CardContent>}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] font-medium text-gray-500">{label}</p><div className="mt-1 min-h-9 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">{value || "Not provided"}</div></div>;
}

export default function StudentProfilePage() {
  return (
    <DashboardLayout role="student" userName={STUDENT_PROFILE.name} title="My Profile" subtitle="Student Workspace  /  My Profile">
      <div className="mx-auto max-w-6xl space-y-5">
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-campus-100 text-campus-700"><UserRound className="h-8 w-8" /></div>
              <div>
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-gray-900">{STUDENT_PROFILE.name}</h2><Badge className="bg-green-100 text-green-800">{STUDENT_PROFILE.status}</Badge></div>
                <p className="text-xs text-gray-500">{STUDENT_PROFILE.rollNumber}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600"><span>{STUDENT_PROFILE.programme}</span><span>{STUDENT_PROFILE.branch}</span><span>Batch {STUDENT_PROFILE.batch}</span><span>Year {STUDENT_PROFILE.currentYear} · Sem {STUDENT_PROFILE.currentSemester}</span></div>
              </div>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-200 text-center text-[10px] text-gray-400">No signature<br />available</div>
          </CardContent>
        </Card>

        <Section title="Admission Details">
          <div className="mb-5 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-xs text-cyan-900">Admission details are managed by your institution. Contact the academic office for corrections.</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Admission ID" value={STUDENT_PROFILE.admissionId} /><Field label="Enrollment Number" value={STUDENT_PROFILE.enrollmentNumber} /><Field label="Roll Number" value={STUDENT_PROFILE.rollNumber} /><Field label="Level" value="Under Graduate" /><Field label="Degree" value={STUDENT_PROFILE.programme} /><Field label="Program" value={STUDENT_PROFILE.branch} /><Field label="Admitted Batch" value={STUDENT_PROFILE.batch} /><Field label="Current Year" value={STUDENT_PROFILE.currentYear} /><Field label="Current Semester" value={STUDENT_PROFILE.currentSemester} /><Field label="Status" value="ADMITTED · ACTIVE" /></div>
        </Section>

        <Section title="Personal Details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="First Name" value={STUDENT_PROFILE.firstName} /><Field label="Middle Name" value={STUDENT_PROFILE.middleName} /><Field label="Last Name" value={STUDENT_PROFILE.lastName} /><Field label="Name as per Aadhaar" value={STUDENT_PROFILE.name} /><Field label="Email" value={STUDENT_PROFILE.email} /><Field label="Mobile" value={STUDENT_PROFILE.mobile} /><Field label="Date of Birth" value={STUDENT_PROFILE.dateOfBirth} /><Field label="Gender" value={STUDENT_PROFILE.gender} /><Field label="Nationality" value={STUDENT_PROFILE.nationality} /></div>
        </Section>

        <Section title="Parent & Guardian Details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Father Name" value={STUDENT_PROFILE.fatherName} /><Field label="Father Occupation" value={STUDENT_PROFILE.fatherOccupation} /><Field label="Father Mobile" value={STUDENT_PROFILE.mobile} /><Field label="Mother Name" value="Not provided" /><Field label="Mother Occupation" value="Not provided" /><Field label="Guardian Relation" value="Not provided" /></div>
        </Section>

        <Section title="Qualifying Examination Details" defaultOpen={false}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Entrance Examination" value="AP EAMCET" /><Field label="Hall Ticket Number" value={STUDENT_PROFILE.rollNumber} /><Field label="Rank" value="Not provided" /></div></Section>
        <Section title="Educational Qualifications" defaultOpen={false}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="SSC / 10th" value="Completed" /><Field label="Intermediate / 12th" value="Completed" /><Field label="Board" value="Not provided" /><Field label="Year of Passing" value="2023" /></div></Section>
      </div>
    </DashboardLayout>
  );
}
